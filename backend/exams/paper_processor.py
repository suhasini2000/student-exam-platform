"""
Extract text from uploaded exam papers (PDF) and generate questions using Gemini.
"""
import json
import logging
import mimetypes
import requests
import re
import google.generativeai as genai
import cloudinary
import cloudinary.utils
import cloudinary.api
from django.conf import settings
from django import db
from django.db import transaction
from .models import ExamPaper, Question

logger = logging.getLogger(__name__)

def get_gemini_model(api_key):
    genai.configure(api_key=api_key)
    models_to_try = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-flash-latest']
    for model_name in models_to_try:
        try:
            return genai.GenerativeModel(model_name)
        except: continue
    return genai.GenerativeModel('gemini-1.5-flash')

def _retrieve_file_data(file_field):
    """Safely and FASTly retrieve file content."""
    url = file_field.url
    mime, _ = mimetypes.guess_type(url)
    if not mime:
        mime = 'image/png' if 'image' in url.lower() else 'application/pdf'
    
    debug_log = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    }

    # 1. Try Direct HTTP with Browser Headers (Fastest)
    try:
        resp = requests.get(url, headers=headers, timeout=10, allow_redirects=True)
        if resp.status_code == 200:
            return resp.content, mime, "HTTP-Public"
        debug_log.append(f"Public-HTTP: {resp.status_code}")
    except Exception as e:
        debug_log.append(f"Public-HTTP-Err: {str(e)[:30]}")

    # 2. Try Authenticated HTTP (Basic Auth) - Most Robust for Cloudinary
    if 'cloudinary' in url.lower():
        try:
            from requests.auth import HTTPBasicAuth
            auth = HTTPBasicAuth(
                settings.CLOUDINARY_STORAGE['API_KEY'], 
                settings.CLOUDINARY_STORAGE['API_SECRET']
            )
            resp = requests.get(url, auth=auth, headers=headers, timeout=10)
            if resp.status_code == 200:
                return resp.content, mime, "HTTP-Auth"
            debug_log.append(f"Auth-HTTP: {resp.status_code}")
        except Exception as e:
            debug_log.append(f"Auth-HTTP-Err: {str(e)[:30]}")

    # 3. Try Native Open (Django Storage fallback)
    try:
        file_field.open('rb')
        data = file_field.read()
        file_field.close()
        if data: return data, mime, "Native"
    except Exception as e:
        debug_log.append(f"Native-Err: {str(e)[:30]}")

    return None, None, " | ".join(debug_log)

def _extract_json(text):
    text = text.strip()
    if '```json' in text: text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text: text = text.split('```')[1].split('```')[0].strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find('{'), text.rfind('}')
        if start != -1 and end != -1:
            try: return json.loads(text[start:end+1])
            except: pass
    return None

def generate_questions_from_paper(exam_paper_id, instructions=None, num_mcq=20, num_short=5, num_long=4):
    try:
        db.connections.close_all()
        exam_paper = ExamPaper.objects.get(id=exam_paper_id)
        
        exam_paper.generation_error = '[PROGRESS] Reading your paper...'
        exam_paper.save()

        api_key = settings.GEMINI_API_KEY
        data, mime, debug_info = _retrieve_file_data(exam_paper.file)
        if not data: raise ValueError(f"File access failed. Details: {debug_info}")

        exam_paper.generation_error = '[PROGRESS] AI is thinking (30s)...'
        exam_paper.save()

        model = get_gemini_model(api_key)
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {exam_paper.subject.name}."
        if instructions: prompt += f"\nSpecific Instructions: {instructions}"
        prompt += '\nReturn ONLY a JSON object with a "questions" key.'
        
        response = model.generate_content([prompt, {'mime_type': mime, 'data': data}])
        
        exam_paper.generation_error = '[PROGRESS] Saving questions...'
        exam_paper.save()

        data = _extract_json(response.text)
        if not data or not data.get('questions'):
            raise ValueError("AI returned no questions. Please check the document content.")

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
        
        exam_paper.questions_generated = (created_count > 0)
        exam_paper.generation_error = '[SUCCESS] Done! Questions are saved to your Question Bank.' if created_count > 0 else 'Failed to save questions.'
        exam_paper.save()
        
    except Exception as e:
        try:
            db.connections.close_all()
            ep = ExamPaper.objects.get(id=exam_paper_id)
            ep.generation_error = str(e)
            ep.save()
        except: pass
        raise e

def generate_paper_from_multiple(paper_ids, instructions, subject, school, teacher, **kwargs):
    try:
        db.connections.close_all()
        api_key = settings.GEMINI_API_KEY
        model = get_gemini_model(api_key)
        num_mcq, num_short, num_long = kwargs.get('num_mcq', 20), kwargs.get('num_short', 5), kwargs.get('num_long', 4)
        
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {subject.name}."
        if instructions: prompt += f"\nInstructions: {instructions}"
        prompt += '\nReturn ONLY JSON with a "questions" key.'
        
        content = [prompt]
        papers = ExamPaper.objects.filter(id__in=paper_ids)
        for paper in papers:
            if paper.extracted_text: content.append(f"Context: {paper.extracted_text[:5000]}")
            else:
                p_data, p_mime, _ = _retrieve_file_data(paper.file)
                if p_data: content.append({'mime_type': p_mime, 'data': p_data})

        response = model.generate_content(content)
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
            papers.update(questions_generated=True, generation_error='[SUCCESS] Done! Questions added to Question Bank.')
            return {'success': True}
        return {'success': False, 'error': 'No questions saved'}
    except Exception as e:
        return {'success': False, 'error': str(e)}

def generate_questions_from_instructions(subject, chapters, topics, marks_distribution, total_marks, school, teacher):
    try:
        db.connections.close_all()
        api_key = settings.GEMINI_API_KEY
        model = get_gemini_model(api_key)
        num_mcq, num_short, num_long = marks_distribution.get('num_mcq', 20), marks_distribution.get('num_short', 5), marks_distribution.get('num_long', 4)
        
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {subject.name}."
        if chapters: prompt += f"\nChapters: {', '.join([c.name for c in chapters])}"
        if topics: prompt += f"\nFocus: {topics}"
        prompt += '\nReturn ONLY JSON with a "questions" key.'
        
        response = model.generate_content(prompt)
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
