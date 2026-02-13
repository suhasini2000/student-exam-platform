"""
AI grading module using Anthropic Claude API.
MCQs are auto-graded instantly. SHORT/LONG answers are graded via Claude Sonnet.
"""
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def grade_mcq(user_answer):
    """Instantly grade an MCQ answer."""
    question = user_answer.question
    if user_answer.selected_answer and user_answer.selected_answer == question.correct_answer:
        user_answer.is_correct = True
        user_answer.marks_obtained = question.marks
    else:
        user_answer.is_correct = False
        user_answer.marks_obtained = 0
    user_answer.grading_status = 'GRADED'
    user_answer.save()


def grade_descriptive_with_ai(user_answer):
    """Grade a SHORT or LONG answer using Claude Sonnet."""
    question = user_answer.question

    if not user_answer.text_answer.strip():
        user_answer.marks_obtained = 0
        user_answer.ai_score = 0
        user_answer.ai_feedback = 'No answer provided.'
        user_answer.grading_status = 'GRADED'
        user_answer.save()
        return

    api_key = settings.ANTHROPIC_API_KEY
    if not api_key:
        # Fallback: give partial marks based on answer length
        _fallback_grade(user_answer)
        return

    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)

        max_marks = question.marks
        prompt = f"""You are grading a student's answer for a 10th standard exam.

Question: {question.question_text}
Maximum Marks: {max_marks}
Question Type: {question.question_type}

Model Answer: {question.model_answer or 'Not provided'}
Grading Rubric: {question.grading_rubric or 'Grade based on accuracy, completeness, and clarity'}

Student's Answer: {user_answer.text_answer}

Grade this answer and respond with ONLY valid JSON:
{{
    "score": <number between 0 and {max_marks}>,
    "feedback": "<constructive feedback explaining the grade>",
    "key_points_covered": ["<list of key points the student covered>"],
    "key_points_missed": ["<list of key points the student missed>"]
}}"""

        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=500,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = message.content[0].text.strip()
        # Parse JSON from response
        result = json.loads(response_text)

        score = min(float(result.get('score', 0)), max_marks)
        feedback = result.get('feedback', '')
        key_covered = result.get('key_points_covered', [])
        key_missed = result.get('key_points_missed', [])

        user_answer.ai_score = score
        user_answer.marks_obtained = score
        user_answer.is_correct = score >= max_marks * 0.5
        user_answer.ai_feedback = f"{feedback}\n\nKey points covered: {', '.join(key_covered)}\nKey points missed: {', '.join(key_missed)}"
        user_answer.grading_status = 'GRADED'
        user_answer.save()

    except Exception as e:
        logger.error(f"AI grading failed for answer {user_answer.id}: {e}")
        _fallback_grade(user_answer)


def _fallback_grade(user_answer):
    """Fallback grading when AI is unavailable."""
    question = user_answer.question
    answer_len = len(user_answer.text_answer.strip())
    max_marks = question.marks

    if answer_len > 200:
        score = max_marks * 0.6
    elif answer_len > 100:
        score = max_marks * 0.4
    elif answer_len > 30:
        score = max_marks * 0.2
    else:
        score = 0

    user_answer.ai_score = score
    user_answer.marks_obtained = score
    user_answer.is_correct = score >= max_marks * 0.5
    user_answer.ai_feedback = 'Graded using fallback method (AI unavailable). Score is approximate.'
    user_answer.grading_status = 'GRADED'
    user_answer.save()


def grade_exam_async(user_exam_id):
    """Grade an entire exam. Called in a background thread."""
    from .models import UserExam, UserAnswer
    from .analysis import generate_analysis

    try:
        user_exam = UserExam.objects.get(id=user_exam_id)

        # Phase 1: Grade MCQs
        user_exam.grading_status = 'GRADING_MCQ'
        user_exam.save()

        answers = UserAnswer.objects.filter(user_exam=user_exam).select_related('question')
        mcq_answers = [a for a in answers if a.question.question_type == 'MCQ']
        descriptive_answers = [a for a in answers if a.question.question_type in ('SHORT', 'LONG')]

        for answer in mcq_answers:
            grade_mcq(answer)

        # Phase 2: Grade descriptive answers with AI
        if descriptive_answers:
            user_exam.grading_status = 'GRADING_DESCRIPTIVE'
            user_exam.save()

            for answer in descriptive_answers:
                grade_descriptive_with_ai(answer)

        # Calculate totals
        answers = UserAnswer.objects.filter(user_exam=user_exam).select_related('question')
        total_score = sum(a.marks_obtained for a in answers)
        mcq_score = sum(a.marks_obtained for a in answers if a.question.question_type == 'MCQ')
        short_score = sum(a.marks_obtained for a in answers if a.question.question_type == 'SHORT')
        long_score = sum(a.marks_obtained for a in answers if a.question.question_type == 'LONG')
        correct_count = sum(1 for a in answers if a.is_correct)
        answered_count = sum(1 for a in answers if a.selected_answer or a.text_answer.strip())
        wrong_count = answered_count - correct_count

        total_possible = sum(a.question.marks for a in answers)
        percentage = (total_score / total_possible * 100) if total_possible > 0 else 0

        user_exam.score = total_score
        user_exam.percentage = round(percentage, 1)
        user_exam.mcq_score = mcq_score
        user_exam.short_answer_score = short_score
        user_exam.long_answer_score = long_score
        user_exam.correct_answers = correct_count
        user_exam.wrong_answers = wrong_count
        user_exam.answered_questions = answered_count
        user_exam.unanswered = user_exam.total_questions - answered_count

        # Phase 3: Generate analysis
        user_exam.grading_status = 'ANALYZING'
        user_exam.save()

        generate_analysis(user_exam)

        user_exam.grading_status = 'COMPLETED'
        user_exam.save()

    except Exception as e:
        logger.error(f"Grading failed for exam {user_exam_id}: {e}")
        try:
            user_exam = UserExam.objects.get(id=user_exam_id)
            user_exam.grading_status = 'FAILED'
            user_exam.save()
        except Exception:
            pass
