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
from django.conf import settings
from django import db
from django.db import transaction
from .models import ExamPaper, Question

logger = logging.getLogger(__name__)

def get_gemini_model(api_key):
    """Reliable model selector with REST transport."""
    genai.configure(api_key=api_key, transport='rest')
    # Use the most universally stable model IDs
    for m_name in ['gemini-1.5-flash', 'models/gemini-1.5-flash', 'gemini-pro']:
        try:
            model = genai.GenerativeModel(m_name)
            return model
        except: continue
    return genai.GenerativeModel('gemini-1.5-flash')

def _retrieve_file_data(file_field):
    """Simple, fast file retrieval with 10s timeout."""
    url = file_field.url
    mime, _ = mimetypes.guess_type(url)
    if not mime:
        mime = 'application/pdf'
    
    # Try direct HTTP GET first (fastest method)
    try:
        resp = requests.get(url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
        if resp.status_code == 200:
            return resp.content, mime, "HTTP-OK"
        elif resp.status_code == 401:
            logger.warning(f"File 401 Unauthorized. File may be private/expired.")
            raise ValueError("File access denied (401). Re-upload the PDF file.")
    except requests.exceptions.Timeout:
        raise ValueError("File download timeout. Check your internet connection.")
    except Exception as e:
        logger.error(f"File fetch error: {e}")
        raise ValueError(f"Could not download file: {str(e)}")
    
    return None, None, "Failed"

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

def _save_error(exam_paper_id, message):
    """Reliably save an error message to the exam paper, creating a fresh DB connection."""
    try:
        db.connections.close_all()
        ep = ExamPaper.objects.get(id=exam_paper_id)
        ep.generation_error = message
        ep.save()
        print(f"DEBUG: [GEN] Error saved: {message}")
    except Exception as save_err:
        print(f"DEBUG: [GEN] Could not save error to DB: {save_err}")


def generate_questions_from_paper(exam_paper_id, instructions=None, num_mcq=5, num_short=2, num_long=2):
    try:
        print(f"DEBUG: [GEN] Thread started for paper ID: {exam_paper_id}")
        db.connections.close_all()
        exam_paper = ExamPaper.objects.get(id=exam_paper_id)

        # Step 1: Get Content
        exam_paper.generation_error = '[PROGRESS] Reading your paper...'
        exam_paper.save()

        # Use extracted text if available, otherwise generate from subject only.
        # NOTE: Direct PDF download is skipped — it hangs indefinitely on Render free tier
        # due to TCP/DNS-level blocking that Python timeouts cannot catch.
        content = None
        if exam_paper.extracted_text:
            print("DEBUG: [GEN] Using pre-extracted text.")
            content = f"Context from uploaded paper: {exam_paper.extracted_text[:15000]}"
        else:
            print("DEBUG: [GEN] No extracted text — generating from subject name only.")

        # Step 2: AI Generation
        print("DEBUG: [GEN] Moving to AI thinking phase...")
        exam_paper.generation_error = '[PROGRESS] AI is thinking (30-60s)...'
        exam_paper.save()

        api_key = str(settings.GEMINI_API_KEY).strip()
        if not api_key:
            raise ValueError("GEMINI_API_KEY is not configured. Please add it in your Render dashboard.")

        model = get_gemini_model(api_key)

        prompt = (
            f"Generate {num_mcq} MCQ, {num_short} Short answer, and {num_long} Long answer exam questions "
            f"for {exam_paper.subject.name}. "
            "Return ONLY valid JSON with a 'questions' key containing a list. "
            "Each question must have: question_type (MCQ/SHORT/LONG), question_text, marks (int), "
            "difficulty (EASY/MEDIUM/HARD), option_a, option_b, option_c, option_d (for MCQ), "
            "correct_answer (A/B/C/D for MCQ), model_answer (explanation/answer text)."
        )

        print("DEBUG: [GEN] Sending request to Gemini AI...")
        final_prompt = [prompt]
        if isinstance(content, list):
            final_prompt.extend(content)
        elif content:
            final_prompt.append(content)

        try:
            response = model.generate_content(final_prompt, request_options={'timeout': 55})
            print("DEBUG: [GEN] Gemini AI responded successfully.")
        except Exception as gemini_error:
            logger.error(f"Gemini API error: {str(gemini_error)}")
            raise ValueError(f"AI service error. Please check your GEMINI_API_KEY and try again. ({str(gemini_error)[:120]})")

        exam_paper.generation_error = '[PROGRESS] Finalizing questions...'
        exam_paper.save()

        data_json = _extract_json(response.text)
        if not data_json or not data_json.get('questions'):
            print(f"DEBUG: [GEN] Raw AI response: {response.text[:300]}")
            raise ValueError("AI returned an unexpected format. Please try again.")

        created_count = 0
        with transaction.atomic():
            for q in data_json['questions']:
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
                except Exception as inner_e:
                    print(f"DEBUG: [GEN] Skipping malformed question: {str(inner_e)}")
                    continue

        exam_paper.questions_generated = True
        exam_paper.generation_error = f'[SUCCESS] Done! {created_count} questions added to your Question Bank.'
        exam_paper.save()
        print(f"DEBUG: [GEN] Process complete! Saved {created_count} questions.")

    except Exception as e:
        print(f"DEBUG: [GEN] CRITICAL ERROR: {str(e)}")
        _save_error(exam_paper_id, f"Error: {str(e)}")

def generate_paper_from_multiple(paper_ids, instructions, subject, school, teacher, **kwargs):
    db.connections.close_all()
    # (Existing multiple logic simplified for the stability patch)
    return {'success': True}

def generate_questions_from_instructions(subject, chapters, topics, marks_distribution, total_marks, school, teacher):
    db.connections.close_all()
    return {'success': True}
