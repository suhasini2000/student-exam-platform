from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils import timezone
from django.db.models import Count
from .models import ExamType, Subject, Chapter, Question, UserExam, UserAnswer
import random

def home(request):
    """Home page"""
    exam_types = ExamType.objects.filter(is_active=True)
    return render(request, 'exams/home.html', {'exam_types': exam_types})

@login_required
def dashboard(request):
    """User dashboard showing exam history"""
    user_exams = UserExam.objects.filter(user=request.user).select_related('subject__exam_type')
    exam_types = ExamType.objects.filter(is_active=True).prefetch_related('subjects')
    
    context = {
        'user_exams': user_exams,
        'exam_types': exam_types,
    }
    return render(request, 'exams/dashboard.html', context)

@login_required
def select_exam_type(request):
    """Select exam type (NEET, JEE, etc.)"""
    exam_types = ExamType.objects.filter(is_active=True).annotate(
        subject_count=Count('subjects')
    )
    return render(request, 'exams/select_exam_type.html', {'exam_types': exam_types})

@login_required
def select_subject(request, exam_type_id):
    """Select subject/paper for the chosen exam type"""
    exam_type = get_object_or_404(ExamType, id=exam_type_id, is_active=True)
    subjects = Subject.objects.filter(exam_type=exam_type, is_active=True).annotate(
        question_count=Count('questions')
    )
    
    context = {
        'exam_type': exam_type,
        'subjects': subjects,
    }
    return render(request, 'exams/select_subject.html', context)

@login_required
def select_chapter(request, subject_id):
    """Select chapter for the chosen subject"""
    subject = get_object_or_404(Subject, id=subject_id, is_active=True)
    chapters = Chapter.objects.filter(subject=subject, is_active=True).annotate(
        question_count=Count('questions')
    )
    
    # Check if there are chapters available
    if not chapters.exists():
        # If no chapters, start exam with all questions
        return redirect('exams:start_exam', subject_id=subject_id)
    
    context = {
        'subject': subject,
        'chapters': chapters,
        'exam_type': subject.exam_type,
    }
    return render(request, 'exams/select_chapter.html', context)

@login_required
def start_exam(request, subject_id, chapter_id=None):
    """Start a new exam"""
    subject = get_object_or_404(Subject, id=subject_id, is_active=True)
    chapter = None
    
    # Get questions based on chapter selection
    if chapter_id:
        chapter = get_object_or_404(Chapter, id=chapter_id, subject=subject, is_active=True)
        questions = list(Question.objects.filter(chapter=chapter, is_active=True))
    else:
        questions = list(Question.objects.filter(subject=subject, is_active=True))
    
    if not questions:
        messages.error(request, 'No questions available for this chapter/subject.')
        if chapter:
            return redirect('exams:select_chapter', subject_id=subject.id)
        return redirect('exams:select_subject', exam_type_id=subject.exam_type.id)
    
    # Randomize question order for each exam attempt
    random.shuffle(questions)
    
    # Limit to a reasonable number of questions if there are too many
    max_questions = min(len(questions), 50)  # Limit to 50 questions per exam
    questions = questions[:max_questions]
    
    # Calculate total time: 30 seconds per question
    total_time_seconds = len(questions) * 30
    
    # Create a new exam attempt
    user_exam = UserExam.objects.create(
        user=request.user,
        subject=subject,
        chapter=chapter,
        status='IN_PROGRESS',
        started_at=timezone.now(),
        total_questions=len(questions),
        total_time_seconds=total_time_seconds
    )
    
    # Store question IDs in session for this exam
    request.session[f'exam_{user_exam.id}_questions'] = [q.id for q in questions]
    request.session[f'exam_{user_exam.id}_current'] = 0
    
    time_minutes = total_time_seconds // 60
    messages.success(request, f'Exam started! You have {time_minutes} minutes ({len(questions)} questions × 30 seconds each).')
    return redirect('exams:take_exam', user_exam_id=user_exam.id)

@login_required
def take_exam(request, user_exam_id):
    """Take the exam - display questions one by one"""
    user_exam = get_object_or_404(UserExam, id=user_exam_id, user=request.user)
    
    if user_exam.status == 'COMPLETED':
        messages.info(request, 'This exam has already been completed.')
        return redirect('exams:exam_result', user_exam_id=user_exam.id)
    
    # Get question IDs from session
    question_ids = request.session.get(f'exam_{user_exam.id}_questions', [])
    current_index = request.session.get(f'exam_{user_exam.id}_current', 0)
    
    if current_index >= len(question_ids):
        return redirect('exams:submit_exam', user_exam_id=user_exam.id)
    
    question = get_object_or_404(Question, id=question_ids[current_index])
    
    # Get existing answer if any
    existing_answer = UserAnswer.objects.filter(
        user_exam=user_exam, 
        question=question
    ).first()
    
    if request.method == 'POST':
        selected_answer = request.POST.get('answer')
        
        if selected_answer:
            # Check if answer is correct
            is_correct = selected_answer == question.correct_answer
            marks = question.marks if is_correct else -question.negative_marks
            
            # Save or update answer
            UserAnswer.objects.update_or_create(
                user_exam=user_exam,
                question=question,
                defaults={
                    'selected_answer': selected_answer,
                    'is_correct': is_correct,
                    'marks_obtained': marks,
                }
            )
        
        # Move to next question
        action = request.POST.get('action')
        if action == 'next':
            request.session[f'exam_{user_exam.id}_current'] = current_index + 1
        elif action == 'previous' and current_index > 0:
            request.session[f'exam_{user_exam.id}_current'] = current_index - 1
        elif action == 'submit':
            return redirect('exams:submit_exam', user_exam_id=user_exam.id)
        
        return redirect('exams:take_exam', user_exam_id=user_exam.id)
    
    context = {
        'user_exam': user_exam,
        'question': question,
        'current_index': current_index,
        'total_questions': len(question_ids),
        'existing_answer': existing_answer,
    }
    return render(request, 'exams/take_exam.html', context)

@login_required
def submit_exam(request, user_exam_id):
    """Submit exam and calculate score"""
    user_exam = get_object_or_404(UserExam, id=user_exam_id, user=request.user)
    
    if user_exam.status == 'COMPLETED':
        return redirect('exams:exam_result', user_exam_id=user_exam.id)
    
    # Calculate results
    answers = UserAnswer.objects.filter(user_exam=user_exam)
    
    correct_count = answers.filter(is_correct=True).count()
    wrong_count = answers.filter(is_correct=False, selected_answer__isnull=False).count()
    answered_count = answers.filter(selected_answer__isnull=False).count()
    unanswered = user_exam.total_questions - answered_count
    
    # Calculate total score
    total_score = sum(answer.marks_obtained for answer in answers)
    percentage = (total_score / user_exam.subject.total_marks) * 100 if user_exam.subject.total_marks > 0 else 0
    
    # Update user exam
    user_exam.status = 'COMPLETED'
    user_exam.completed_at = timezone.now()
    user_exam.answered_questions = answered_count
    user_exam.correct_answers = correct_count
    user_exam.wrong_answers = wrong_count
    user_exam.unanswered = unanswered
    user_exam.score = total_score
    user_exam.percentage = percentage
    user_exam.save()
    
    # Clear session data
    request.session.pop(f'exam_{user_exam.id}_questions', None)
    request.session.pop(f'exam_{user_exam.id}_current', None)
    
    messages.success(request, 'Exam submitted successfully!')
    return redirect('exams:exam_result', user_exam_id=user_exam.id)

@login_required
def exam_result(request, user_exam_id):
    """Display exam results"""
    user_exam = get_object_or_404(UserExam, id=user_exam_id, user=request.user)
    answers = UserAnswer.objects.filter(user_exam=user_exam).select_related('question')
    
    context = {
        'user_exam': user_exam,
        'answers': answers,
    }
    return render(request, 'exams/exam_result.html', context)

@login_required
def exam_history(request):
    """View all past exams"""
    user_exams = UserExam.objects.filter(
        user=request.user,
        status='COMPLETED'
    ).select_related('subject__exam_type').order_by('-completed_at')
    
    return render(request, 'exams/exam_history.html', {'user_exams': user_exams})
