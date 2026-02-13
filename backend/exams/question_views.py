from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Subject, Question
from .question_fetchers import get_fetcher


@login_required
def refresh_questions(request, subject_id):
    """Manually refresh questions for a subject"""
    subject = get_object_or_404(Subject, id=subject_id)
    
    if request.method == 'POST':
        source = request.POST.get('source', 'opentrivia')
        amount = int(request.POST.get('amount', 20))
        replace_old = request.POST.get('replace_old') == 'on'
        
        try:
            fetcher = get_fetcher(source)
            
            # Delete old questions if requested
            if replace_old:
                old_count = Question.objects.filter(subject=subject).count()
                Question.objects.filter(subject=subject).delete()
                messages.info(request, f'Deleted {old_count} old questions')
            
            # Fetch new questions
            if source == 'opentrivia':
                questions_data = fetcher.fetch_questions(amount=amount, difficulty='medium')
            else:
                messages.error(request, 'Only API sources supported for refresh')
                return redirect('exams:select_subject', exam_type_id=subject.exam_type.id)
            
            # Save questions
            created_count = 0
            for q_data in questions_data:
                try:
                    # Check for duplicates
                    exists = Question.objects.filter(
                        subject=subject,
                        question_text=q_data['question_text']
                    ).exists()
                    
                    if not exists:
                        Question.objects.create(
                            subject=subject,
                            question_text=q_data['question_text'],
                            option_a=q_data['option_a'],
                            option_b=q_data['option_b'],
                            option_c=q_data['option_c'],
                            option_d=q_data['option_d'],
                            correct_answer=q_data['correct_answer'],
                            explanation=q_data.get('explanation', ''),
                            difficulty='MEDIUM',
                            marks=q_data.get('marks', 1),
                            negative_marks=q_data.get('negative_marks', 0.0),
                        )
                        created_count += 1
                except:
                    continue
            
            messages.success(request, f'Successfully added {created_count} new questions!')
            
        except Exception as e:
            messages.error(request, f'Error refreshing questions: {str(e)}')
        
        return redirect('exams:select_subject', exam_type_id=subject.exam_type.id)
    
    return render(request, 'exams/refresh_questions.html', {
        'subject': subject
    })


@login_required  
def delete_old_questions(request, subject_id):
    """Delete old questions for a subject"""
    if request.method == 'POST':
        subject = get_object_or_404(Subject, id=subject_id)
        
        # Delete questions older than the newest 50
        total = Question.objects.filter(subject=subject).count()
        if total > 50:
            delete_count = total - 50
            old_questions = Question.objects.filter(subject=subject).order_by('created_at')[:delete_count]
            deleted = old_questions.delete()[0]
            messages.success(request, f'Deleted {deleted} old questions')
        else:
            messages.info(request, 'No old questions to delete')
        
        return redirect('exams:select_subject', exam_type_id=subject.exam_type.id)
    
    return redirect('exams:dashboard')
