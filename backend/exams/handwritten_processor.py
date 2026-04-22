"""
Process handwritten answer sheets using Claude Vision API.
Reads both the question paper and student's handwritten answers,
grades each answer, and returns per-question analysis.
"""
import base64
import json
import logging
import mimetypes

from django.conf import settings

from .models import HandwrittenExam

logger = logging.getLogger(__name__)


def _encode_file(file_field):
    """Read a file and return (raw_bytes, media_type)."""
    path = file_field.path
    mime, _ = mimetypes.guess_type(path)
    if not mime:
        mime = 'application/octet-stream'
    with open(path, 'rb') as f:
        data = f.read()
    return data, mime


def _build_document_block(data, media_type):
    """Build a Gemini API dict for a document or image."""
    return {"mime_type": media_type, "data": data}


def process_handwritten_exam(handwritten_exam_id, include_analysis=False):
    """
    Grade a handwritten answer sheet against a question paper using Claude Vision.

    1. Load HandwrittenExam, set status PROCESSING
    2. Encode both files as base64
    3. Send to Claude Vision API
    4. Parse JSON response, save grading_data
    5. Calculate obtained_marks and percentage
    6. Set status GRADED (or FAILED)
    """
    try:
        exam = HandwrittenExam.objects.get(id=handwritten_exam_id)
    except HandwrittenExam.DoesNotExist:
        logger.error(f"HandwrittenExam {handwritten_exam_id} not found")
        return

    exam.status = 'PROCESSING'
    exam.error_message = ''
    exam.save()

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        exam.status = 'FAILED'
        exam.error_message = 'Gemini API key not configured.'
        exam.save()
        return

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-1.5-flash')

        # Encode both files
        qp_data, qp_mime = _encode_file(exam.question_paper)
        ans_data, ans_mime = _encode_file(exam.answer_sheet)

        if include_analysis:
            prompt_text = f"""You are an expert exam grader. You have been given two documents:

1. DOCUMENT 1: The question paper / answer key
2. DOCUMENT 2: A student's handwritten answer sheet

Your task:
- Read the question paper to identify all questions and their correct answers.
- Read the handwritten answer sheet carefully and transcribe the student's answers.
- Grade each answer against the correct answer/key.
- Provide detailed analysis of the student's performance.
- Total marks for this exam: {exam.total_marks}

Return ONLY valid JSON (no markdown, no code fences):
{{
  "questions": [
    {{
      "question_number": 1,
      "question_text": "The question as written on the paper",
      "max_marks": 5,
      "student_answer": "Transcribed handwritten answer from the student",
      "correct_answer": "The correct/expected answer",
      "marks_awarded": 4,
      "feedback": "Detailed feedback explaining why marks were awarded or deducted"
    }}
  ],
  "total_obtained": 42,
  "total_possible": {exam.total_marks},
  "overall_feedback": "Detailed overall assessment of the student's performance",
  "strengths": ["List of areas where the student performed well"],
  "weaknesses": ["List of areas needing improvement"],
  "recommendations": ["Specific study recommendations for the student"]
}}

IMPORTANT:
- Transcribe the student's handwriting as accurately as possible
- Award partial marks where the answer is partially correct
- Be fair but strict in grading
- If you cannot read certain handwriting, note it in the feedback
- Ensure total_obtained equals the sum of all marks_awarded
- Provide meaningful strengths, weaknesses, and actionable recommendations"""
        else:
            prompt_text = f"""You are an expert exam grader. You have been given two documents:

1. DOCUMENT 1: The question paper / answer key
2. DOCUMENT 2: A student's handwritten answer sheet

Your task:
- Read the question paper to identify all questions and their correct answers.
- Read the handwritten answer sheet carefully and transcribe the student's answers.
- Grade each answer against the correct answer/key.
- Total marks for this exam: {exam.total_marks}

Return ONLY valid JSON (no markdown, no code fences):
{{
  "questions": [
    {{
      "question_number": 1,
      "question_text": "The question as written on the paper",
      "max_marks": 5,
      "student_answer": "Transcribed handwritten answer from the student",
      "correct_answer": "The correct/expected answer",
      "marks_awarded": 4,
      "feedback": "Brief feedback on the answer"
    }}
  ],
  "total_obtained": 42,
  "total_possible": {exam.total_marks},
  "overall_feedback": "Brief overall assessment of the student's performance"
}}

IMPORTANT:
- Transcribe the student's handwriting as accurately as possible
- Award partial marks where the answer is partially correct
- Be fair but strict in grading
- If you cannot read certain handwriting, note it in the feedback
- Ensure total_obtained equals the sum of all marks_awarded"""

        content = [
            _build_document_block(qp_data, qp_mime),
            "Above is the QUESTION PAPER / ANSWER KEY.",
            _build_document_block(ans_data, ans_mime),
            "Above is the STUDENT'S HANDWRITTEN ANSWER SHEET.",
            prompt_text,
        ]

        response = model.generate_content(content)

        response_text = response.text.strip()
        # Strip markdown code fences e.g. ```json ... ```
        if response_text.startswith('```'):
            # Remove opening fence + optional language tag
            response_text = response_text[response_text.find('\n') + 1:]
            # Remove closing fence
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        result = json.loads(response_text)

        # Save grading data
        exam.grading_data = result
        total_obtained = result.get('total_obtained', 0)
        total_possible = result.get('total_possible', exam.total_marks)

        exam.obtained_marks = float(total_obtained)
        exam.percentage = round(
            (float(total_obtained) / float(total_possible) * 100) if total_possible > 0 else 0,
            1,
        )
        exam.status = 'GRADED'
        exam.error_message = ''
        exam.save()
        logger.info(f"Graded handwritten exam {handwritten_exam_id}: {total_obtained}/{total_possible}")

    except json.JSONDecodeError as e:
        exam.status = 'FAILED'
        exam.error_message = f'Failed to parse AI response: {e}'
        exam.save()
        logger.error(f"JSON parse error for handwritten exam {handwritten_exam_id}: {e}")
    except Exception as e:
        exam.status = 'FAILED'
        exam.error_message = f'Grading failed: {str(e)}'
        exam.save()
        logger.error(f"Handwritten grading failed for {handwritten_exam_id}: {e}")
