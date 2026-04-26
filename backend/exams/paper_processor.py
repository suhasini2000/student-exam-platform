"""
Extract text from uploaded exam papers (PDF) and generate questions using Gemini.
"""
import json
import logging
import mimetypes
import requests
import re
import time
import google.generativeai as genai
import cloudinary
import cloudinary.utils
import cloudinary.api
from django.conf import settings
from django import db
from django.db import transaction
from .models import ExamPaper, Question

logger = logging.getLogger(__name__)

def _retrieve_file_data(file_field, paper_obj=None):
    """Silent, high-speed file retrieval."""
    url = file_field.url
    mime, _ = mimetypes.guess_type(url)
    if not mime:
        mime = 'image/png' if 'image' in url.lower() else 'application/pdf'
    
    session = requests.Session()
    session.headers.update({'User-Agent': 'Mozilla/5.0'})
    keys = settings.CLOUDINARY_STORAGE
    exts = ["", ".png", ".pdf", ".jpg"]

    for ext in exts:
        try:
            test_url = f"{url}{ext}"
            if session.head(test_url, timeout=3, allow_redirects=True).status_code == 200:
                resp = session.get(test_url, timeout=10)
                if resp.status_code == 200:
                    return resp.content, mime, f"Public-{ext}"
        except: continue

    if 'cloudinary' in url.lower() and keys.get('API_SECRET'):
        try:
            cloudinary.config(cloud_name=keys['CLOUD_NAME'], api_key=keys['API_KEY'], api_secret=keys['API_SECRET'], secure=True)
            public_id = url.split('/upload/')[-1]
            if '/private/' in url: public_id = url.split('/private/')[-1]
            if '/authenticated/' in url: public_id = url.split('/authenticated/')[-1]
            public_id = re.sub(r'^v\d+/', '', public_id).rsplit('.', 1)[0]

            for ext in exts:
                for r_type in ['image', 'raw']:
                    try:
                        s_url, _ = cloudinary.utils.cloudinary_url(f"{public_id}{ext}", sign_url=True, secure=True, resource_type=r_type)
                        if session.head(s_url, timeout=3).status_code == 200:
                            resp = session.get(s_url, timeout=10)
                            if resp.status_code == 200:
                                return resp.content, mime, f"Signed-{r_type}{ext}"
                    except: continue
        except: pass

    return None, None, "File not found"

def _extract_json(text):
    text = text.strip()
    if '```json' in text: text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text: text = text.split('```')[1].split('```')[0].strip()
    try:
        return json.loads(text)
    except:
        start, end = text.find('{'), text.rfind('}')
        if start != -1 and end != -1:
            try: return json.loads(text[start:end+1])
            except: pass
    return None

def generate_questions_from_paper(exam_paper_id, instructions=None, num_mcq=20, num_short=5, num_long=4):
    try:
        db.connections.close_all()
        exam_paper = ExamPaper.objects.get(id=exam_paper_id)
        
        # Step 1: Read File
        exam_paper.generation_error = '[PROGRESS] Reading your paper...'
        exam_paper.save()
        
        data, mime, debug_info = _retrieve_file_data(exam_paper.file)
        if not data:
            raise ValueError(f"Could not read your paper. ({debug_info})")

        # Step 2: AI Generation with Verbose Retry
        api_key = str(settings.GEMINI_API_KEY).strip() # Ensure no spaces
        genai.configure(api_key=api_key, transport='rest')
        
        # Comprehensive list of model IDs to bypass 404s
        models_to_try = [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-pro',
            'models/gemini-1.5-flash',
            'models/gemini-1.5-pro'
        ]
        
        response_text = None
        attempt_errors = []
        
        for model_name in models_to_try:
            try:
                exam_paper.generation_error = f'[PROGRESS] AI is thinking ({model_name.split("/")[-1]})...'
                exam_paper.save()
                
                model = genai.GenerativeModel(model_name)
                prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {exam_paper.subject.name}."
                if instructions: prompt += f"\nSpecific Instructions: {instructions}"
                prompt += '\nReturn ONLY a JSON object with a "questions" key.'
                
                response = model.generate_content(
                    [prompt, {'mime_type': mime, 'data': data}],
                    request_options={'timeout': 300}
                )
                if response and response.text:
                    response_text = response.text
                    break
            except Exception as e:
                attempt_errors.append(f"{model_name}: {str(e)[:50]}")
                continue

        if not response_text:
            raise ValueError(f"All AI models failed. Details: {' | '.join(attempt_errors)}")

        # Step 3: Save Questions
        exam_paper.generation_error = '[PROGRESS] Finalizing questions...'
        exam_paper.save()

        data = _extract_json(response_text)
        if not data or not data.get('questions'):
            raise ValueError("The AI succeeded but returned no questions. Try a clearer image.")

        created_count = 0
        with transaction.atomic():
            for q in data['questions']:
                try:
                    Question.objects.create(
                        subject=exam_paper.subject, school=exam_paper.school, created_by=exam_paper.uploaded_by,
                        question_type=str(q.get('question_type', 'MCQ')).upper(),
                        question_text=q.get('question_text', 'Sample Question'),
                        option_a=str(q.get('option_a', ''))[:500],
                        option_b=str(q.get('option_b', ''))[:500],
                        option_c=str(q.get('option_c', ''))[:500],
                        option_d=str(q.get('option_d', ''))[:500],
                        correct_answer=str(q.get('correct_answer', 'A'))[:1].upper(),
                        model_answer=q.get('model_answer', ''),
                        marks=int(q.get('marks', 1)),
                        difficulty=str(q.get('difficulty', 'MEDIUM')).upper()
                    )
                    created_count += 1
                except: continue
        
        if created_count == 0: raise ValueError("Database error: could not save any questions.")

        exam_paper.questions_generated = True
        exam_paper.generation_error = '[SUCCESS] Done! Questions added to your Question Bank.'
        exam_paper.save()
        
    except Exception as e:
        logger.error(f"Generation Error: {e}")
        try:
            db.connections.close_all()
            ep = ExamPaper.objects.get(id=exam_paper_id)
            ep.generation_error = str(e)
            ep.save()
        except: pass

def generate_paper_from_multiple(paper_ids, instructions, subject, school, teacher, **kwargs):
    try:
        db.connections.close_all()
        api_key = str(settings.GEMINI_API_KEY).strip()
        genai.configure(api_key=api_key, transport='rest')
        model = genai.GenerativeModel('gemini-1.5-flash')
        num_mcq, num_short, num_long = kwargs.get('num_mcq', 20), kwargs.get('num_short', 5), kwargs.get('num_long', 4)
        
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {subject.name}."
        if instructions: prompt += f"\nInstructions: {instructions}"
        prompt += '\nReturn ONLY JSON.'
        
        content = [prompt]
        papers = ExamPaper.objects.filter(id__in=paper_ids)
        for paper in papers:
            p_data, p_mime, _ = _retrieve_file_data(paper.file)
            if p_data: content.append({'mime_type': p_mime, 'data': p_data})

        response = model.generate_content(content, request_options={'timeout': 300})
        data = _extract_json(response.text)
        
        created_count = 0
        if data and data.get('questions'):
            with transaction.atomic():
                for q in data['questions']:
                    try:
                        Question.objects.create(
                            subject=subject, school=school, created_by=teacher,
                            question_type=str(q.get('question_type', 'MCQ')).upper(),
                            question_text=q.get('question_text', 'Sample'),
                            option_a=str(q.get('option_a', ''))[:500],
                            option_b=str(q.get('option_b', ''))[:500],
                            option_c=str(q.get('option_c', ''))[:500],
                            option_d=str(q.get('option_d', ''))[:500],
                            correct_answer=str(q.get('correct_answer', 'A'))[:1].upper(),
                            model_answer=q.get('model_answer', ''),
                            marks=int(q.get('marks', 1)),
                            difficulty=str(q.get('difficulty', 'MEDIUM')).upper()
                        )
                        created_count += 1
                    except: continue
        
        if created_count > 0:
            papers.update(questions_generated=True, generation_error='[SUCCESS] Done!')
            return {'success': True}
        return {'success': False, 'error': 'AI failed'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def generate_questions_from_instructions(subject, chapters, topics, marks_distribution, total_marks, school, teacher):
    try:
        db.connections.close_all()
        api_key = str(settings.GEMINI_API_KEY).strip()
        genai.configure(api_key=api_key, transport='rest')
        model = genai.GenerativeModel('gemini-1.5-flash')
        num_mcq, num_short, num_long = marks_distribution.get('num_mcq', 20), marks_distribution.get('num_short', 5), marks_distribution.get('num_long', 4)
        
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {subject.name}."
        if chapters: prompt += f"\nChapters: {', '.join([c.name for c in chapters])}"
        if topics: prompt += f"\nFocus: {topics}"
        prompt += '\nReturn ONLY JSON.'
        
        response = model.generate_content(prompt, request_options={'timeout': 300})
        data = _extract_json(response.text)
        
        created_count = 0
        if data and data.get('questions'):
            with transaction.atomic():
                for q in data['questions']:
                    try:
                        Question.objects.create(
                            subject=subject, school=school, created_by=teacher,
                            question_type=str(q.get('question_type', 'MCQ')).upper(),
                            question_text=q.get('question_text', 'Sample'),
                            option_a=str(q.get('option_a', ''))[:500],
                            option_b=str(q.get('option_b', ''))[:500],
                            option_c=str(q.get('option_c', ''))[:500],
                            option_d=str(q.get('option_d', ''))[:500],
                            correct_answer=str(q.get('correct_answer', 'A'))[:1].upper(),
                            model_answer=q.get('model_answer', ''),
                            marks=int(q.get('marks', 1)),
                            difficulty=str(q.get('difficulty', 'MEDIUM')).upper()
                        )
                        created_count += 1
                    except: continue
        return {'success': True} if created_count > 0 else {'success': False}
    except Exception as e:
        return {'success': False, 'error': str(e)}
