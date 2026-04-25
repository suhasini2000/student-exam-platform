"""
Extract text from uploaded exam papers (PDF) and generate questions using Gemini.
"""
import json
import logging
import mimetypes
import requests
import google.generativeai as genai
from django.conf import settings
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
        mime = 'application/pdf'  # Default fallback
        
    # TRY 1: Native Django file open
    try:
        file_field.open('rb')
        pdf_data = file_field.read()
        file_field.close()
        if pdf_data:
            return pdf_data, mime
    except Exception as e:
        logger.warning(f"Native open failed for {url}: {e}")

    # TRY 2: Cloudinary SDK fetch (if applicable)
    if 'cloudinary' in url:
        try:
            import cloudinary
            import cloudinary.uploader
            
            # Ensure Cloudinary is configured
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_STORAGE['CLOUD_NAME'],
                api_key=settings.CLOUDINARY_STORAGE['API_KEY'],
                api_secret=settings.CLOUDINARY_STORAGE['API_SECRET']
            )
            
            # Use the SDK to fetch the data directly (this handles signed requests)
            # We can use the public URL but force a signed download if possible
            # Or just use requests with auth if Cloudinary supports it (usually it requires a signature)
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                return response.content, mime
            
            # If simple request fails, try to generate a signed URL
            public_id = url.split('/')[-1].split('.')[0] # Basic public_id extraction
            # Try to get the resource info to verify access
            import cloudinary.api
            resource = cloudinary.api.resource(public_id)
            if 'secure_url' in resource:
                res = requests.get(resource['secure_url'])
                if res.status_code == 200:
                    return res.content, mime
                    
        except Exception as e:
            logger.warning(f"Cloudinary SDK retrieval failed: {e}")

    # TRY 3: Simple HTTP request (fallback)
    if url.startswith('http'):
        try:
            # Add a generic User-Agent to avoid being blocked
            headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
            response = requests.get(url, timeout=30, allow_redirects=True, headers=headers)
            if response.status_code == 200:
                return response.content, mime
            elif response.status_code == 401:
                logger.error(f"HTTP 401 Unauthorized fetching {url}")
                raise ValueError(f"Access denied to Cloudinary file (401). Check if the file is 'Public' or if API keys are valid. URL: {url}")
            elif response.status_code == 404:
                logger.error(f"HTTP 404 Not Found fetching {url}")
                raise ValueError(f"File not found on storage (404): {url}")
            else:
                logger.error(f"HTTP {response.status_code} fetching {url}")
                raise ValueError(f"HTTP {response.status_code}: Unable to access document")
        except requests.exceptions.RequestException as req_err:
            logger.error(f"Network error downloading file from {url}: {req_err}")
            raise ValueError(f"Network error: Could not download file. Check server internet connection.")

    return None, None

def generate_questions_from_paper(exam_paper_id, instructions=None, num_mcq=20, num_short=5, num_long=4):
    try:
        exam_paper = ExamPaper.objects.get(id=exam_paper_id)
        api_key = settings.GEMINI_API_KEY
        if not api_key: 
            logger.error("GEMINI_API_KEY not configured")
            raise ValueError("Gemini API key not configured. Please contact administrator.")
        
        if api_key.startswith('sk-ant-'):
            logger.error("Anthropic API key provided instead of Gemini key")
            raise ValueError("Invalid API key format: You have provided an Anthropic (Claude) key starting with 'sk-ant-'. Please provide a Google Gemini API key (starting with 'AIza').")

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
                raise ValueError("Could not retrieve document data. Check storage settings and file permissions.")
        else:
            raise ValueError("No text or file available for processing")

        response = model.generate_content(content)
        
        # Safety check for response
        try:
            text = response.text.strip()
        except Exception as e:
            if hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if candidate.finish_reason != 1:
                    raise ValueError(f"AI generation failed (Reason: {candidate.finish_reason}). Try simplifying your instructions.")
            raise ValueError(f"AI generation error: {str(e)}")
        
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
            
        try:
            data = json.loads(text)
        except json.JSONDecodeError:
            # Fallback: try to find first { and last }
            start = text.find('{')
            end = text.rfind('}')
            if start != -1 and end != -1:
                data = json.loads(text[start:end+1])
            else:
                raise ValueError("Failed to parse AI response. Please try again.")

        questions_list = data.get('questions', [])
        if not questions_list:
            raise ValueError("AI did not generate any questions. Please try again with different instructions.")
        
        created_count = 0
        for q in questions_list:
            Question.objects.create(
                subject=exam_paper.subject,
                school=exam_paper.school,
                created_by=exam_paper.uploaded_by,
                question_type=str(q.get('question_type', 'MCQ')).upper(),
                question_text=q.get('question_text', 'Sample Question'),
                option_a=q.get('option_a', 'Option A'),
                option_b=q.get('option_b', 'Option B'),
                option_c=q.get('option_c', 'Option C'),
                option_d=q.get('option_d', 'Option D'),
                correct_answer=str(q.get('correct_answer', 'A'))[:1].upper(),
                model_answer=q.get('model_answer', ''),
                marks=int(q.get('marks', 1)),
                difficulty=str(q.get('difficulty', 'MEDIUM')).upper()
            )
            created_count += 1
            
        exam_paper.questions_generated = True
        exam_paper.generation_error = ''
        exam_paper.save()
        logger.info(f"Saved {created_count} questions for {exam_paper.school}")
        
    except Exception as e:
        # Re-fetch paper to avoid stale state if it was modified elsewhere
        try:
            ep = ExamPaper.objects.get(id=exam_paper_id)
            ep.generation_error = str(e)
            ep.save()
        except: pass
        logger.error(f"Generation Error: {e}")
        raise e

def generate_paper_from_multiple(paper_ids, instructions, subject, school, teacher, **kwargs):
    """Generate ONE paper from multiple sources."""
    papers = ExamPaper.objects.filter(id__in=paper_ids)
    try:
        api_key = settings.GEMINI_API_KEY
        if not api_key: 
            raise ValueError("Gemini API key not configured")
            
        if api_key.startswith('sk-ant-'):
            raise ValueError("Invalid API key format: An Anthropic key was provided instead of a Gemini key.")

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

        response = model.generate_content(content)
        text = response.text.strip()
        
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
            
        data = json.loads(text)
        questions_list = data.get('questions', [])
        
        created_count = 0
        for q in questions_list:
            Question.objects.create(
                subject=subject,
                school=school,
                created_by=teacher,
                question_type=str(q.get('question_type', 'MCQ')).upper(),
                question_text=q.get('question_text', 'Sample Question'),
                option_a=q.get('option_a', 'Option A'),
                option_b=q.get('option_b', 'Option B'),
                option_c=q.get('option_c', 'Option C'),
                option_d=q.get('option_d', 'Option D'),
                correct_answer=str(q.get('correct_answer', 'A'))[:1].upper(),
                model_answer=q.get('model_answer', ''),
                marks=int(q.get('marks', 1)),
                difficulty=str(q.get('difficulty', 'MEDIUM')).upper()
            )
            created_count += 1
            
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
        if not api_key: 
            raise ValueError("Gemini API key not configured")
            
        if api_key.startswith('sk-ant-'):
            raise ValueError("Invalid API key format: An Anthropic key was provided instead of a Gemini key.")

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
        text = response.text.strip()
        
        if '```json' in text:
            text = text.split('```json')[1].split('```')[0].strip()
        elif '```' in text:
            text = text.split('```')[1].split('```')[0].strip()
            
        data = json.loads(text)
        questions_list = data.get('questions', [])
        
        created_count = 0
        for q in questions_list:
            Question.objects.create(
                subject=subject,
                school=school,
                created_by=teacher,
                question_type=str(q.get('question_type', 'MCQ')).upper(),
                question_text=q.get('question_text', 'Sample Question'),
                option_a=q.get('option_a', 'Option A'),
                option_b=q.get('option_b', 'Option B'),
                option_c=q.get('option_c', 'Option C'),
                option_d=q.get('option_d', 'Option D'),
                correct_answer=str(q.get('correct_answer', 'A'))[:1].upper(),
                model_answer=q.get('model_answer', ''),
                marks=int(q.get('marks', 1)),
                difficulty=str(q.get('difficulty', 'MEDIUM')).upper()
            )
            created_count += 1
            
        return {'success': True, 'questions_count': created_count}
    except Exception as e:
        logger.error(f"Instruction Generation Error: {e}")
        # For instructions, there's no ExamPaper to update unless we create one.
        # But we want to at least log it.
        return {'success': False, 'error': str(e)}
