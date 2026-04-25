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
from .models import ExamPaper, Question

logger = logging.getLogger(__name__)

def get_gemini_model(api_key):
    genai.configure(api_key=api_key)
    # Try models in order of stability and availability
    models_to_try = [
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-flash-latest',
        'gemini-pro'
    ]
    for model_name in models_to_try:
        try:
            model = genai.GenerativeModel(model_name)
            return model
        except: continue
    return genai.GenerativeModel('gemini-1.5-flash')

def _retrieve_file_data(file_field):
    """Safely retrieve file content. Returns (data, mime_type, debug_info)."""
    url = file_field.url
    mime, _ = mimetypes.guess_type(url)
    if not mime:
        mime = 'image/png' if 'image' in url.lower() else 'application/pdf'
    
    debug_log = []

    # TRY 1: Native Django file open
    try:
        file_field.open('rb')
        data = file_field.read()
        file_field.close()
        if data:
            return data, mime, "Success (Native)"
    except Exception as e:
        debug_log.append(f"Native: {str(e)}")

    # TRY 2: Authenticated Cloudinary SDK Fetch
    if 'cloudinary' in url.lower():
        try:
            keys = settings.CLOUDINARY_STORAGE
            if not keys.get('API_SECRET'):
                debug_log.append("Cloudinary: API_SECRET missing")
            else:
                cloudinary.config(
                    cloud_name=keys['CLOUD_NAME'],
                    api_key=keys['API_KEY'],
                    api_secret=keys['API_SECRET'],
                    secure=True
                )
                
                # Robust Public ID Extraction
                public_id = url.split('/upload/')[-1]
                if '/private/' in url: public_id = url.split('/private/')[-1]
                if '/authenticated/' in url: public_id = url.split('/authenticated/')[-1]
                public_id = re.sub(r'^v\d+/', '', public_id).rsplit('.', 1)[0]
                
                # Try image then raw (PDF)
                for r_type in ['image', 'raw']:
                    for d_type in ['upload', 'private', 'authenticated']:
                        try:
                            signed_url, _ = cloudinary.utils.cloudinary_url(
                                public_id, sign_url=True, secure=True,
                                resource_type=r_type, type=d_type
                            )
                            resp = requests.get(signed_url, timeout=10)
                            if resp.status_code == 200:
                                return resp.content, mime, f"Success (SDK {r_type}/{d_type})"
                        except: continue
                debug_log.append(f"Cloudinary: ID '{public_id}' failed all combinations")
        except Exception as e:
            debug_log.append(f"Cloudinary Logic: {str(e)}")

    # TRY 3: Standard HTTP Fallback
    if url.startswith('http'):
        try:
            resp = requests.get(url, timeout=10, allow_redirects=True)
            if resp.status_code == 200:
                return resp.content, mime, "Success (HTTP)"
            debug_log.append(f"HTTP: Error {resp.status_code}")
        except Exception as e:
            debug_log.append(f"HTTP: {str(e)}")

    return None, None, " | ".join(debug_log)

def _extract_json(text):
    """Robustly extract JSON from AI response text."""
    text = text.strip()
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0].strip()
    elif '```' in text:
        text = text.split('```')[1].split('```')[0].strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1:
            try:
                return json.loads(text[start:end+1])
            except: pass
    return None

def generate_questions_from_paper(exam_paper_id, instructions=None, num_mcq=20, num_short=5, num_long=4):
    try:
        exam_paper = ExamPaper.objects.get(id=exam_paper_id)
        
        # Live Progress Update
        exam_paper.generation_error = 'Step 1/3: Reading document...'
        exam_paper.save()

        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key.startswith('sk-ant-'):
            raise ValueError("Invalid Gemini API Key. Provide a key starting with 'AIza'.")

        model = get_gemini_model(api_key)
        
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {exam_paper.subject.name}."
        if instructions:
            prompt += f"\nSpecific Instructions: {instructions}"
            
        prompt += """\nReturn ONLY a JSON object with a "questions" key. 
        Each question must have: question_type (MCQ/SHORT/LONG), question_text, marks, difficulty, option_a, option_b, option_c, option_d, correct_answer (A/B/C/D), model_answer."""
        
        content = [prompt]
        
        if exam_paper.extracted_text:
            content.append(f"Context: {exam_paper.extracted_text[:15000]}")
        elif exam_paper.file:
            data, mime, debug_info = _retrieve_file_data(exam_paper.file)
            if data:
                content.append({'mime_type': mime, 'data': data})
            else:
                raise ValueError(f"File Retrieval Failed. Details: {debug_info}")
        else:
            raise ValueError("No content to process.")

        # Live Progress Update
        exam_paper.generation_error = 'Step 2/3: AI is processing (30-60s)...'
        exam_paper.save()

        logger.info(f"Requesting Gemini for paper {exam_paper_id}...")
        response = model.generate_content(content)
        
        try:
            text = response.text.strip()
        except Exception as e:
            raise ValueError(f"AI generation error: {str(e)}")
        
        # Live Progress Update
        exam_paper.generation_error = 'Step 3/3: Saving generated questions...'
        exam_paper.save()

        data = _extract_json(text)
        if not data or not data.get('questions'):
            raise ValueError("AI returned no questions. Try simpler instructions.")

        created_count = 0
        for q in data['questions']:
            try:
                Question.objects.create(
                    subject=exam_paper.subject,
                    school=exam_paper.school,
                    created_by=exam_paper.uploaded_by,
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
            
        if created_count == 0:
            raise ValueError("Failed to save questions.")

        exam_paper.questions_generated = True
        exam_paper.generation_error = ''
        exam_paper.save()
        
    except Exception as e:
        logger.error(f"Generation Error: {e}")
        try:
            # Clear local DB connection cache to ensure we can save the error
            db.connections.close_all()
            ep = ExamPaper.objects.get(id=exam_paper_id)
            ep.generation_error = str(e)
            ep.save()
        except: pass
        raise e

def generate_paper_from_multiple(paper_ids, instructions, subject, school, teacher, **kwargs):
    """Generate ONE paper from multiple sources."""
    papers = ExamPaper.objects.filter(id__in=paper_ids)
    try:
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key.startswith('sk-ant-'):
            raise ValueError("Invalid Gemini API Key")

        model = get_gemini_model(api_key)
        
        num_mcq = kwargs.get('num_mcq', 20)
        num_short = kwargs.get('num_short', 5)
        num_long = kwargs.get('num_long', 4)
        
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {subject.name}."
        if instructions:
            prompt += f"\nSpecific Instructions: {instructions}"
        prompt += """\nReturn ONLY a JSON object with a "questions" key. 
        Each question must have: question_type (MCQ/SHORT/LONG), question_text, marks, difficulty, option_a, option_b, option_c, option_d, correct_answer (A/B/C/D), model_answer."""
        
        content = [prompt]
        
        for paper in papers:
            if paper.extracted_text:
                content.append(f"Context from {paper.title}: {paper.extracted_text[:5000]}")
            elif paper.file:
                p_data, p_mime, _ = _retrieve_file_data(paper.file)
                if p_data:
                    content.append({'mime_type': p_mime, 'data': p_data})
                    content.append(f"Above is context from paper: {paper.title}")

        response = model.generate_content(content)
        try:
            text = response.text.strip()
        except Exception as e:
            raise ValueError(f"AI generation failed: {str(e)}")
        
        data = _extract_json(text)
        if not data:
            raise ValueError("Failed to parse AI response.")

        questions_list = data.get('questions', [])
        
        created_count = 0
        for q in questions_list:
            try:
                Question.objects.create(
                    subject=subject,
                    school=school,
                    created_by=teacher,
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
            
        if created_count == 0:
            raise ValueError("No questions could be saved.")

        papers.update(questions_generated=True, generation_error='')
        return {'success': True, 'questions_count': created_count}
    except Exception as e:
        logger.error(f"Combined Generation Error: {e}")
        papers.update(generation_error=str(e))
        return {'success': False, 'error': str(e)}

def generate_questions_from_instructions(subject, chapters, topics, marks_distribution, total_marks, school, teacher):
    try:
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key.startswith('sk-ant-'):
            raise ValueError("Invalid Gemini API Key")

        model = get_gemini_model(api_key)
        
        num_mcq = marks_distribution.get('num_mcq', 20)
        num_short = marks_distribution.get('num_short', 5)
        num_long = marks_distribution.get('num_long', 4)
        
        chapter_names = ", ".join([c.name for c in chapters])
        
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {subject.name}."
        if chapter_names:
            prompt += f"\nChapters: {chapter_names}"
        if topics:
            prompt += f"\nFocus Topics: {topics}"
            
        prompt += """\nReturn ONLY a JSON object with a "questions" key. 
        Each question must have: question_type (MCQ/SHORT/LONG), question_text, marks, difficulty, option_a, option_b, option_c, option_d, correct_answer (A/B/C/D), model_answer."""
        
        response = model.generate_content(prompt)
        try:
            text = response.text.strip()
        except Exception as e:
            raise ValueError(f"AI generation failed: {str(e)}")
            
        data = _extract_json(text)
        if not data:
            raise ValueError("Failed to parse AI response.")

        questions_list = data.get('questions', [])
        
        created_count = 0
        for q in questions_list:
            try:
                Question.objects.create(
                    subject=subject,
                    school=school,
                    created_by=teacher,
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
            
        return {'success': True, 'questions_count': created_count}
    except Exception as e:
        logger.error(f"Instruction Generation Error: {e}")
        return {'success': False, 'error': str(e)}
