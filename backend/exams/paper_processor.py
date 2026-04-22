"""
Extract text from uploaded exam papers (PDF) and generate questions using Claude API.
Supports both text-based and scanned/image-based PDFs via Claude's vision API.
"""
import base64
import json
import logging

from django.conf import settings

from .models import ExamPaper, Question, AssignedExam

logger = logging.getLogger(__name__)


def extract_text_from_file(file_path):
    """Extract text from a PDF file using pdfplumber."""
    try:
        import pdfplumber
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return '\n\n'.join(text_parts)
    except ImportError:
        logger.warning("pdfplumber not installed, trying basic text read")
        try:
            with open(file_path, 'r', errors='ignore') as f:
                return f.read()
        except Exception as e:
            logger.error(f"Failed to read file: {e}")
            return ''
    except Exception as e:
        logger.error(f"PDF extraction failed: {e}")
        return ''


def generate_questions_from_paper(exam_paper_id):
    """
    Generate questions from an uploaded exam paper using Claude API.
    Creates: 20 MCQ (1 mark) + 5 SHORT (2 marks) + 4 LONG (5 marks) = 50 marks.
    """
    try:
        exam_paper = ExamPaper.objects.get(id=exam_paper_id)
    except ExamPaper.DoesNotExist:
        logger.error(f"ExamPaper {exam_paper_id} not found")
        return

    # Extract text if not already done
    if not exam_paper.extracted_text:
        text = extract_text_from_file(exam_paper.file.path)
        if text.strip() and len(text.strip()) > 50:
            exam_paper.extracted_text = text
            exam_paper.save()

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        exam_paper.generation_error = 'Gemini API key not configured.'
        exam_paper.save()
        return

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-1.5-flash')

        prompt_text = f"""You are a question paper generator for 10th standard students.

Based on the exam paper provided, generate questions in the exact JSON format below.

Subject: {exam_paper.subject.name}
Total Marks: {exam_paper.total_marks}

Generate exactly:
- 20 MCQ questions (1 mark each = 20 marks)
- 5 Short Answer questions (2 marks each = 10 marks)
- 4 Long Answer questions (5 marks each = 20 marks)

For each question, provide appropriate difficulty (EASY/MEDIUM/HARD).
Distribution: 30% EASY, 50% MEDIUM, 20% HARD.

Respond with ONLY valid JSON (no markdown):
{{
  "questions": [
    {{
      "question_type": "MCQ",
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "A",
      "explanation": "...",
      "model_answer": "",
      "difficulty": "MEDIUM",
      "marks": 1
    }},
    {{
      "question_type": "SHORT",
      "question_text": "...",
      "option_a": null,
      "option_b": null,
      "option_c": null,
      "option_d": null,
      "correct_answer": "",
      "explanation": "...",
      "model_answer": "Expected answer text...",
      "difficulty": "MEDIUM",
      "marks": 2
    }},
    {{
      "question_type": "LONG",
      "question_text": "...",
      "option_a": null,
      "option_b": null,
      "option_c": null,
      "option_d": null,
      "correct_answer": "",
      "explanation": "...",
      "model_answer": "Detailed expected answer...",
      "difficulty": "HARD",
      "marks": 5
    }}
  ]
}}"""

        # Build message content — use PDF directly if text extraction failed
        if exam_paper.extracted_text and len(exam_paper.extracted_text.strip()) > 50:
            # Text-based PDF: send extracted text
            content = [f"Exam Paper Content:\n---\n{exam_paper.extracted_text[:8000]}\n---\n\n{prompt_text}"]
        else:
            # Scanned/image PDF: send PDF directly
            with open(exam_paper.file.path, 'rb') as f:
                pdf_data = f.read()
            content = [
                {'mime_type': 'application/pdf', 'data': pdf_data},
                prompt_text,
            ]

        response = model.generate_content(content)

        response_text = response.text.strip()
        if response_text.startswith('```'):
            response_text = response_text[response_text.find('\n') + 1:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        result = json.loads(response_text)
        questions_data = result.get('questions', [])

        created_count = 0
        for q_data in questions_data:
            try:
                Question.objects.create(
                    subject=exam_paper.subject,
                    chapter=exam_paper.chapter,
                    school=exam_paper.school,
                    question_type=q_data['question_type'],
                    question_text=q_data['question_text'],
                    option_a=q_data.get('option_a') or '',
                    option_b=q_data.get('option_b') or '',
                    option_c=q_data.get('option_c') or '',
                    option_d=q_data.get('option_d') or '',
                    correct_answer=q_data.get('correct_answer', ''),
                    explanation=q_data.get('explanation', ''),
                    model_answer=q_data.get('model_answer', ''),
                    difficulty=q_data.get('difficulty', 'MEDIUM'),
                    marks=q_data.get('marks', 1),
                    time_per_question_seconds=60 if q_data['question_type'] == 'MCQ' else 180 if q_data['question_type'] == 'SHORT' else 600,
                )
                created_count += 1
            except Exception as e:
                logger.error(f"Failed to create question: {e}")

        exam_paper.questions_generated = True
        exam_paper.generation_error = ''
        exam_paper.save()
        logger.info(f"Generated {created_count} questions from paper {exam_paper_id}")

    except json.JSONDecodeError as e:
        exam_paper.generation_error = f'Failed to parse AI response: {e}'
        exam_paper.save()
    except Exception as e:
        exam_paper.generation_error = f'AI generation failed: {str(e)}'
        exam_paper.save()
        logger.error(f"Question generation failed for paper {exam_paper_id}: {e}")


def generate_paper_from_multiple(paper_ids, instructions, subject, school, teacher,
                                  total_marks=50, num_mcq=20, num_short=5, num_long=4):
    """
    Generate a new question paper by analyzing multiple uploaded old papers
    and following the teacher's custom instructions.

    Returns dict: {'success': True, 'questions_count': N} or {'success': False, 'error': '...'}
    """
    papers = ExamPaper.objects.filter(id__in=paper_ids, school=school)
    if not papers.exists():
        return {'success': False, 'error': 'No valid papers found.'}

    # Extract text from all papers and collect PDF data for scanned ones
    all_texts = []
    pdf_documents = []
    for paper in papers:
        if not paper.extracted_text:
            text = extract_text_from_file(paper.file.path)
            if text.strip() and len(text.strip()) > 50:
                paper.extracted_text = text
                paper.save()
        if paper.extracted_text and len(paper.extracted_text.strip()) > 50:
            all_texts.append(f"--- Paper: {paper.title} ---\n{paper.extracted_text}")
        else:
            # Scanned PDF: read as binary
            try:
                with open(paper.file.path, 'rb') as f:
                    pdf_data = f.read()
                pdf_documents.append({'title': paper.title, 'data': pdf_data})
            except Exception as e:
                logger.error(f"Failed to read PDF {paper.title}: {e}")

    if not all_texts and not pdf_documents:
        return {'success': False, 'error': 'Could not process any of the uploaded papers.'}

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return {'success': False, 'error': 'Gemini API key not configured.'}

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-1.5-flash')

        prompt_text = f"""You are an expert question paper creator for 10th standard students.

A teacher has uploaded old question papers for reference. Based on these papers and the teacher's instructions below, create a NEW question paper.

=== TEACHER'S INSTRUCTIONS ===
{instructions}

=== PAPER SPECIFICATIONS ===
Subject: {subject.name}
Total Marks: {total_marks}
Generate exactly:
- {num_mcq} MCQ questions (1 mark each = {num_mcq} marks)
- {num_short} Short Answer questions (2 marks each = {num_short * 2} marks)
- {num_long} Long Answer questions (5 marks each = {num_long * 5} marks)

IMPORTANT:
- Create ORIGINAL questions inspired by the old papers, NOT exact copies
- Follow the teacher's instructions carefully for topic focus, difficulty, etc.
- Provide proper answers and explanations for all questions
- Difficulty distribution: 30% EASY, 50% MEDIUM, 20% HARD

Respond with ONLY valid JSON (no markdown):
{{
  "questions": [
    {{
      "question_type": "MCQ",
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "A",
      "explanation": "...",
      "model_answer": "",
      "difficulty": "MEDIUM",
      "marks": 1
    }},
    {{
      "question_type": "SHORT",
      "question_text": "...",
      "option_a": null,
      "option_b": null,
      "option_c": null,
      "option_d": null,
      "correct_answer": "",
      "explanation": "...",
      "model_answer": "Expected answer text...",
      "difficulty": "MEDIUM",
      "marks": 2
    }},
    {{
      "question_type": "LONG",
      "question_text": "...",
      "option_a": null,
      "option_b": null,
      "option_c": null,
      "option_d": null,
      "correct_answer": "",
      "explanation": "...",
      "model_answer": "Detailed expected answer...",
      "difficulty": "HARD",
      "marks": 5
    }}
  ]
}}"""

        # Build message content with PDFs and/or extracted text
        content = []
        for doc in pdf_documents:
            content.append({'mime_type': 'application/pdf', 'data': doc['data']})
        if all_texts:
            combined_text = '\n\n'.join(all_texts)
            if len(combined_text) > 15000:
                per_paper = 15000 // len(all_texts)
                combined_text = '\n\n'.join(t[:per_paper] for t in all_texts)
            content.append(f"=== EXTRACTED TEXT FROM PAPERS ===\n{combined_text}")
        content.append(prompt_text)

        response = model.generate_content(content)

        response_text = response.text.strip()
        if response_text.startswith('```'):
            response_text = response_text[response_text.find('\n') + 1:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        result = json.loads(response_text)
        questions_data = result.get('questions', [])

        created_count = 0
        for q_data in questions_data:
            try:
                Question.objects.create(
                    subject=subject,
                    chapter=None,
                    school=school,
                    question_type=q_data['question_type'],
                    question_text=q_data['question_text'],
                    option_a=q_data.get('option_a') or '',
                    option_b=q_data.get('option_b') or '',
                    option_c=q_data.get('option_c') or '',
                    option_d=q_data.get('option_d') or '',
                    correct_answer=q_data.get('correct_answer', ''),
                    explanation=q_data.get('explanation', ''),
                    model_answer=q_data.get('model_answer', ''),
                    difficulty=q_data.get('difficulty', 'MEDIUM'),
                    marks=q_data.get('marks', 1),
                    time_per_question_seconds=60 if q_data['question_type'] == 'MCQ' else 180 if q_data['question_type'] == 'SHORT' else 600,
                )
                created_count += 1
            except Exception as e:
                logger.error(f"Failed to create question from multi-paper: {e}")

        # Mark source papers as used for generation
        papers.filter(questions_generated=False).update(questions_generated=True)

        logger.info(f"Generated {created_count} questions from {len(all_texts)} papers")
        return {'success': True, 'questions_count': created_count}

    except json.JSONDecodeError as e:
        return {'success': False, 'error': f'Failed to parse AI response: {e}'}
    except Exception as e:
        logger.error(f"Multi-paper generation failed: {e}")
        return {'success': False, 'error': f'AI generation failed: {str(e)}'}


def generate_questions_from_instructions(subject, chapters, topics, marks_distribution,
                                         total_marks, school, teacher):
    """
    Generate questions from teacher-provided instructions (subject, chapters, topics,
    marks distribution) using Claude API -- no uploaded papers needed.

    Parameters:
        subject      – Subject model instance
        chapters     – list of Chapter model instances
        topics       – string describing the topics the teacher wants covered
        marks_distribution – dict with keys: num_mcq, num_short, num_long
        total_marks  – int total marks for the paper
        school       – school User instance
        teacher      – teacher User instance

    Returns dict: {'success': True, 'questions_count': N} or {'success': False, 'error': '...'}
    """
    num_mcq = marks_distribution.get('num_mcq', 20)
    num_short = marks_distribution.get('num_short', 5)
    num_long = marks_distribution.get('num_long', 4)

    chapter_names = ', '.join(ch.name for ch in chapters) if chapters else 'All chapters'

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return {'success': False, 'error': 'Gemini API key not configured.'}

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('models/gemini-1.5-flash')

        prompt = f"""You are an expert question paper creator for 10th standard students.

A teacher has requested a new question paper based on the following instructions. Generate original, high-quality questions.

=== PAPER SPECIFICATIONS ===
Subject: {subject.name}
Chapters: {chapter_names}
Topics specified by teacher: {topics}
Total Marks: {total_marks}

Generate exactly:
- {num_mcq} MCQ questions (1 mark each = {num_mcq} marks)
- {num_short} Short Answer questions (2 marks each = {num_short * 2} marks)
- {num_long} Long Answer questions (5 marks each = {num_long * 5} marks)

IMPORTANT:
- Focus questions on the specified chapters and topics
- Create ORIGINAL questions appropriate for 10th standard students
- Provide proper answers and explanations for all questions
- For MCQs, provide four options (A, B, C, D) with one correct answer
- For Short Answer questions, provide a concise model answer
- For Long Answer questions, provide a detailed model answer
- Difficulty distribution: 30% EASY, 50% MEDIUM, 20% HARD

Respond with ONLY valid JSON (no markdown):
{{
  "questions": [
    {{
      "question_type": "MCQ",
      "question_text": "...",
      "option_a": "...",
      "option_b": "...",
      "option_c": "...",
      "option_d": "...",
      "correct_answer": "A",
      "explanation": "...",
      "model_answer": "",
      "difficulty": "MEDIUM",
      "marks": 1
    }},
    {{
      "question_type": "SHORT",
      "question_text": "...",
      "option_a": null,
      "option_b": null,
      "option_c": null,
      "option_d": null,
      "correct_answer": "",
      "explanation": "...",
      "model_answer": "Expected answer text...",
      "difficulty": "MEDIUM",
      "marks": 2
    }},
    {{
      "question_type": "LONG",
      "question_text": "...",
      "option_a": null,
      "option_b": null,
      "option_c": null,
      "option_d": null,
      "correct_answer": "",
      "explanation": "...",
      "model_answer": "Detailed expected answer...",
      "difficulty": "HARD",
      "marks": 5
    }}
  ]
}}"""

        response = model.generate_content(prompt)

        response_text = response.text.strip()
        if response_text.startswith('```'):
            response_text = response_text[response_text.find('\n') + 1:]
            if response_text.endswith('```'):
                response_text = response_text[:-3]
            response_text = response_text.strip()
        result = json.loads(response_text)
        questions_data = result.get('questions', [])

        # Assign chapter: use first chapter if only one provided, otherwise None
        chapter_obj = chapters[0] if len(chapters) == 1 else None

        created_count = 0
        for q_data in questions_data:
            try:
                Question.objects.create(
                    subject=subject,
                    chapter=chapter_obj,
                    school=school,
                    question_type=q_data['question_type'],
                    question_text=q_data['question_text'],
                    option_a=q_data.get('option_a') or '',
                    option_b=q_data.get('option_b') or '',
                    option_c=q_data.get('option_c') or '',
                    option_d=q_data.get('option_d') or '',
                    correct_answer=q_data.get('correct_answer', ''),
                    explanation=q_data.get('explanation', ''),
                    model_answer=q_data.get('model_answer', ''),
                    difficulty=q_data.get('difficulty', 'MEDIUM'),
                    marks=q_data.get('marks', 1),
                    time_per_question_seconds=60 if q_data['question_type'] == 'MCQ' else 180 if q_data['question_type'] == 'SHORT' else 600,
                )
                created_count += 1
            except Exception as e:
                logger.error(f"Failed to create question from instructions: {e}")

        logger.info(f"Generated {created_count} questions from instructions for {subject.name}")
        return {'success': True, 'questions_count': created_count}

    except json.JSONDecodeError as e:
        return {'success': False, 'error': f'Failed to parse AI response: {e}'}
    except Exception as e:
        logger.error(f"Instruction-based generation failed: {e}")
        return {'success': False, 'error': f'AI generation failed: {str(e)}'}
