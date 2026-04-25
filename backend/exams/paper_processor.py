"""
Extract text from uploaded exam papers (PDF) and generate questions using Gemini.
"""
import json
import logging
import mimetypes
import requests
from requests.auth import HTTPBasicAuth
import google.generativeai as genai
from django.conf import settings
import cloudinary
import cloudinary.api
from .models import ExamPaper, Question

logger = logging.getLogger(__name__)

def get_gemini_model(api_key):
    genai.configure(api_key=api_key)
    for model_name in ['gemini-1.5-flash', 'gemini-2.0-flash', 'gemini-flash-latest']:
        try:
            model = genai.GenerativeModel(model_name)
            return model
        except: continue
    return genai.GenerativeModel('gemini-1.5-flash')

def _retrieve_file_data(file_field):
    """Safely retrieve file content from local storage or Cloudinary. Returns (data, mime_type)."""
    url = file_field.url
    mime, _ = mimetypes.guess_type(url)
    if not mime:
        mime = 'image/png' if 'image' in url.lower() else 'application/pdf'
        
    # TRY 1: Native Django file open
    try:
        file_field.open('rb')
        data = file_field.read()
        file_field.close()
        if data:
            return data, mime
    except Exception as e:
        logger.warning(f"Native open failed: {e}")

    # TRY 2: Cloudinary API Fetch (High Privilege)
    if 'cloudinary' in url.lower():
        try:
            import cloudinary
            import cloudinary.api
            import re
            
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
                api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
                api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
            )
            
            # Extract Public ID correctly
            public_id = url
            if '/upload/' in url:
                path_after_upload = url.split('/upload/')[-1]
                path_no_version = re.sub(r'^v\d+/', '', path_after_upload)
                public_id = path_no_version.rsplit('.', 1)[0]
            
            # Use the API to get the secure content
            # Cloudinary 'image' and 'raw' (PDF) resources are in different buckets
            for r_type in ['image', 'raw']:
                try:
                    # Get resource info
                    res_info = cloudinary.api.resource(public_id, resource_type=r_type)
                    if res_info.get('secure_url'):
                        # Fetch the file using Basic Auth on the secure URL
                        from requests.auth import HTTPBasicAuth
                        auth = HTTPBasicAuth(
                            settings.CLOUDINARY_STORAGE['API_KEY'], 
                            settings.CLOUDINARY_STORAGE['API_SECRET']
                        )
                        resp = requests.get(res_info['secure_url'], auth=auth, timeout=30)
                        if resp.status_code == 200:
                            logger.info(f"Fetched {public_id} via {r_type} API")
                            return resp.content, mime
                except: continue
                
        except Exception as e:
            logger.warning(f"Cloudinary API retrieval failed: {e}")

    # TRY 3: Simple HTTP request (Final Fallback)
    if url.startswith('http'):
        try:
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                return response.content, mime
        except: pass

    return None, None

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
        # Final fallback: find the first { and last }
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
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key.startswith('sk-ant-'):
            raise ValueError("Invalid or missing Gemini API Key (starts with AIza).")

        model = get_gemini_model(api_key)
        
        # Build prompt
        prompt = f"Generate {num_mcq} MCQ, {num_short} Short, and {num_long} Long questions for Class 10 {exam_paper.subject.name}."
        if instructions:
            prompt += f"\nSpecific Instructions: {instructions}"
            
        prompt += """\nReturn ONLY a JSON object with a "questions" key. 
        Each question must have: question_type (MCQ/SHORT/LONG), question_text, marks, difficulty, option_a, option_b, option_c, option_d, correct_answer (A/B/C/D), model_answer."""
        
        content = [prompt]
        
        if exam_paper.extracted_text:
            content.append(f"Context: {exam_paper.extracted_text[:15000]}")
        elif exam_paper.file:
            pdf_data, mime = _retrieve_file_data(exam_paper.file)
            if pdf_data:
                content.append({'mime_type': mime, 'data': pdf_data})
            else:
                raise ValueError("Cloudinary access denied. Check API credentials or file permissions.")
        else:
            raise ValueError("No text or file available for processing")

        logger.info(f"Sending request to Gemini for paper {exam_paper_id}...")
        response = model.generate_content(content)
        
        try:
            text = response.text.strip()
        except Exception as e:
            logger.error(f"Gemini Response Error: {e}")
            raise ValueError(f"AI generation error: {str(e)}")
        
        data = _extract_json(text)
        if not data:
            logger.error(f"JSON Parsing failed. Raw response: {text}")
            raise ValueError("Failed to parse AI response. Try again.")

        questions_list = data.get('questions', [])
        if not questions_list:
            raise ValueError("AI returned no questions. Try simpler instructions.")
        
        created_count = 0
        for q in questions_list:
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
            raise ValueError("No valid questions saved to database.")

        exam_paper.questions_generated = True
        exam_paper.generation_error = ''
        exam_paper.save()
        logger.info(f"Successfully saved {created_count} questions for paper {exam_paper_id}")
        
    except Exception as e:
        logger.error(f"Generation Error: {e}")
        try:
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
                p_data, p_mime = _retrieve_file_data(paper.file)
                if p_data:
                    content.append({'mime_type': p_mime, 'data': p_data})
                    content.append(f"Above is context from paper: {paper.title}")

        logger.info(f"Sending request to Gemini for multiple papers...")
        response = model.generate_content(content)
        try:
            text = response.text.strip()
        except Exception as e:
            logger.error(f"Gemini Response Error: {e}")
            raise ValueError(f"AI generation failed: {str(e)}")
        
        data = _extract_json(text)
        if not data:
            logger.error(f"JSON Parsing failed for multiple papers. Raw response: {text}")
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
            raise ValueError("No questions could be saved from the AI response.")

        # Update status for all source papers
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
            logger.error(f"Gemini Response Error (Instructions): {e}")
            raise ValueError(f"AI generation failed: {str(e)}")
            
        data = _extract_json(text)
        if not data:
            logger.error(f"JSON Parsing failed for instructions. Raw response: {text}")
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
