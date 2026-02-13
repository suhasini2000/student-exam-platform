"""
Post-exam analysis: question-type breakdown, difficulty breakdown,
time analysis, strengths, weaknesses, recommendations.
"""
from .models import UserExam, UserAnswer, ExamAnalysis


def generate_analysis(user_exam):
    """Generate comprehensive post-exam analysis."""
    answers = UserAnswer.objects.filter(user_exam=user_exam).select_related('question')

    # Question type breakdown
    type_breakdown = {}
    for qtype in ['MCQ', 'SHORT', 'LONG']:
        type_answers = [a for a in answers if a.question.question_type == qtype]
        if type_answers:
            total_marks = sum(a.question.marks for a in type_answers)
            obtained = sum(a.marks_obtained for a in type_answers)
            type_breakdown[qtype] = {
                'total_questions': len(type_answers),
                'total_marks': total_marks,
                'marks_obtained': round(obtained, 1),
                'percentage': round(obtained / total_marks * 100, 1) if total_marks > 0 else 0,
                'correct': sum(1 for a in type_answers if a.is_correct),
            }

    # Difficulty breakdown
    diff_breakdown = {}
    for diff in ['EASY', 'MEDIUM', 'HARD']:
        diff_answers = [a for a in answers if a.question.difficulty == diff]
        if diff_answers:
            total = sum(a.question.marks for a in diff_answers)
            obtained = sum(a.marks_obtained for a in diff_answers)
            diff_breakdown[diff] = {
                'total_questions': len(diff_answers),
                'total_marks': total,
                'marks_obtained': round(obtained, 1),
                'percentage': round(obtained / total * 100, 1) if total > 0 else 0,
            }

    # Time analysis
    total_time_used = sum(a.time_taken_seconds for a in answers)
    avg_time = total_time_used / len(answers) if answers else 0
    time_analysis = {
        'total_time_allocated': user_exam.total_time_seconds,
        'total_time_used': total_time_used,
        'average_time_per_question': round(avg_time, 1),
        'time_efficiency': round(total_time_used / user_exam.total_time_seconds * 100, 1) if user_exam.total_time_seconds > 0 else 0,
    }

    # Strengths and weaknesses
    strengths = []
    weaknesses = []
    recommendations = []

    for qtype, data in type_breakdown.items():
        pct = data['percentage']
        type_label = {'MCQ': 'Multiple Choice', 'SHORT': 'Short Answer', 'LONG': 'Long Answer'}.get(qtype, qtype)
        if pct >= 70:
            strengths.append(f'Strong performance in {type_label} ({pct}%)')
        elif pct < 40:
            weaknesses.append(f'Needs improvement in {type_label} ({pct}%)')
            recommendations.append(f'Practice more {type_label} questions')

    for diff, data in diff_breakdown.items():
        pct = data['percentage']
        if diff == 'EASY' and pct < 70:
            weaknesses.append(f'Struggling with easy questions ({pct}%)')
            recommendations.append('Review fundamental concepts thoroughly')
        elif diff == 'HARD' and pct >= 60:
            strengths.append(f'Good performance on hard questions ({pct}%)')

    if user_exam.percentage >= 80:
        strengths.append('Excellent overall performance')
        recommendations.append('Challenge yourself with harder practice papers')
    elif user_exam.percentage >= 50:
        recommendations.append('Focus on weak areas to improve overall score')
    else:
        recommendations.append('Revisit chapter material and practice regularly')

    # Percentile (simple estimation based on existing exam scores)
    from django.db.models import Count
    all_exams = UserExam.objects.filter(
        subject=user_exam.subject, status='COMPLETED'
    ).exclude(id=user_exam.id)
    below_count = all_exams.filter(percentage__lt=user_exam.percentage).count()
    total_count = all_exams.count() + 1
    percentile = round(below_count / total_count * 100, 1) if total_count > 0 else 50.0

    # Save analysis
    analysis_data = {
        'question_type_breakdown': type_breakdown,
        'difficulty_breakdown': diff_breakdown,
        'time_analysis': time_analysis,
    }
    user_exam.analysis_data = analysis_data
    user_exam.suggestions = '\n'.join(recommendations)
    user_exam.save()

    ExamAnalysis.objects.update_or_create(
        user_exam=user_exam,
        defaults={
            'question_type_breakdown': type_breakdown,
            'difficulty_breakdown': diff_breakdown,
            'time_analysis': time_analysis,
            'strengths': strengths,
            'weaknesses': weaknesses,
            'recommendations': recommendations,
            'percentile': percentile,
        },
    )
