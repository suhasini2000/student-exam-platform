"""
Process handwritten answer sheets using Anthropic Claude Vision API.
Reads both the question paper and student's handwritten answers,
grades each answer, and returns per-question analysis.
"""
import base64
import json
import logging
import mimetypes
import requests

from django.conf import settings

from .models import HandwrittenExam

logger = logging.getLogger(__name__)


_ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif', 'image/webp'}


def _detect_mime(url, content_type_header, data):
    """Determine correct MIME type from multiple sources."""
    # 1. Use response Content-Type header (most reliable for Cloudinary)
    if content_type_header:
        ct = content_type_header.split(';')[0].strip().lower()
        if ct in _ALLOWED_IMAGE_TYPES or ct == 'application/pdf':
            return ct

    # 2. Sniff PDF magic bytes
    if data and data[:4] == b'%PDF':
        return 'application/pdf'

    # 3. Guess from URL path
    mime, _ = mimetypes.guess_type(url)
    if mime in _ALLOWED_IMAGE_TYPES or mime == 'application/pdf':
        return mime

    # 4. Default — treat as PDF (handwritten exams are almost always PDF/image)
    return 'application/pdf'


def _encode_file(file_field):
    """Read a file and return (raw_bytes, media_type)."""
    url = file_field.url

    # 1. Native Django file open (local storage)
    try:
        file_field.open('rb')
        data = file_field.read()
        file_field.close()
        if data:
            mime = _detect_mime(url, None, data)
            logger.info(f"Opened file locally, mime={mime}")
            return data, mime
    except Exception as e:
        logger.warning(f"Native open failed: {e}")

    # 2. HTTP download (Cloudinary)
    if url.startswith('http'):
        try:
            response = requests.get(url, timeout=60, allow_redirects=True)
            if response.status_code == 200:
                ct = response.headers.get('Content-Type', '')
                mime = _detect_mime(url, ct, response.content)
                logger.info(f"Downloaded from {url}, mime={mime}")
                return response.content, mime
            elif response.status_code == 401:
                raise ValueError("File access denied (401). Check Cloudinary permissions.")
            else:
                raise ValueError(f"Could not fetch file (HTTP {response.status_code})")
        except requests.exceptions.Timeout:
            raise ValueError("File download timeout. The file may be too large.")
        except ValueError:
            raise
        except requests.exceptions.RequestException as e:
            raise ValueError(f"Network error: {str(e)}")

    raise ValueError(f"Could not read document at {url}")


def _build_content_block(data, media_type):
    """Build an Anthropic API content block for a document or image."""
    b64 = base64.b64encode(data).decode('utf-8')
    if media_type == 'application/pdf':
        return {
            "type": "document",
            "source": {
                "type": "base64",
                "media_type": "application/pdf",
                "data": b64,
            }
        }
    # Claude only accepts these image types
    image_type = media_type if media_type in _ALLOWED_IMAGE_TYPES else 'image/jpeg'
    return {
        "type": "image",
        "source": {
            "type": "base64",
            "media_type": image_type,
            "data": b64,
        }
    }


def process_handwritten_exam(handwritten_exam_id, include_analysis=False):
    """
    Grade a handwritten answer sheet against a question paper using Claude Vision.
    """
    try:
        exam = HandwrittenExam.objects.get(id=handwritten_exam_id)
    except HandwrittenExam.DoesNotExist:
        logger.error(f"HandwrittenExam {handwritten_exam_id} not found")
        return

    exam.status = 'PROCESSING'
    exam.error_message = ''
    exam.save()

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        exam.status = 'FAILED'
        exam.error_message = 'Anthropic API key not configured.'
        exam.save()
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        qp_data, qp_mime = _encode_file(exam.question_paper)
        ans_data, ans_mime = _encode_file(exam.answer_sheet)

        prompt_text = (
            f"You are an expert exam grader. Grade this student's handwritten answer sheet "
            f"against the provided question paper/answer key.\n"
            f"Total marks: {exam.total_marks}\n"
            f"Return ONLY valid JSON with a \"questions\" list and \"total_obtained\" key. "
            f"Each question should have: question_number, question_text, student_answer, "
            f"correct_answer, marks_awarded, max_marks, feedback."
        )

        content = [
            _build_content_block(qp_data, qp_mime),
            {"type": "text", "text": "Above is the QUESTION PAPER / ANSWER KEY."},
            _build_content_block(ans_data, ans_mime),
            {"type": "text", "text": "Above is the STUDENT'S HANDWRITTEN ANSWER SHEET."},
            {"type": "text", "text": prompt_text},
        ]

        use_pdf_beta = qp_mime == 'application/pdf' or ans_mime == 'application/pdf'

        if use_pdf_beta:
            response = client.beta.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=4096,
                betas=['pdfs-2024-09-25'],
                messages=[{'role': 'user', 'content': content}]
            )
        else:
            response = client.messages.create(
                model='claude-sonnet-4-6',
                max_tokens=4096,
                messages=[{'role': 'user', 'content': content}]
            )

        response_text = response.content[0].text.strip()

        if '```json' in response_text:
            response_text = response_text.split('```json')[1].split('```')[0].strip()
        elif '```' in response_text:
            response_text = response_text.split('```')[1].split('```')[0].strip()

        result = json.loads(response_text)

        exam.grading_data = result
        total_obtained = result.get('total_obtained', 0)
        exam.obtained_marks = float(total_obtained)
        exam.percentage = round((float(total_obtained) / float(exam.total_marks) * 100), 1)
        exam.status = 'GRADED'
        exam.save()

    except Exception as e:
        exam.status = 'FAILED'
        exam.error_message = f'Grading failed: {str(e)}'
        exam.save()
        logger.error(f"Handwritten grading failed for {handwritten_exam_id}: {e}")
