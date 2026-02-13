from django.contrib import admin
from django import forms
from django.shortcuts import render, redirect
from django.urls import path
from django.contrib import messages
from .models import ExamType, Subject, Chapter, Question, UserExam, UserAnswer, ExamPaper, AssignedExam, TeacherAssignment
from .question_fetchers import get_fetcher


class QuestionImportForm(forms.Form):
    """Form for importing questions"""
    source = forms.ChoiceField(
        choices=[
            ('opentrivia', 'Open Trivia Database (API)'),
            ('json', 'JSON File'),
            ('csv', 'CSV File'),
        ],
        help_text='Select the source to import questions from'
    )
    file = forms.FileField(
        required=False,
        help_text='Upload JSON or CSV file (required for file sources)'
    )
    amount = forms.IntegerField(
        initial=10,
        min_value=1,
        max_value=50,
        help_text='Number of questions to fetch (for API sources)'
    )
    difficulty = forms.ChoiceField(
        choices=[('easy', 'Easy'), ('medium', 'Medium'), ('hard', 'Hard')],
        initial='medium',
        help_text='Question difficulty level'
    )
    category = forms.CharField(
        required=False,
        help_text='Category or tags (for API sources)'
    )


@admin.register(ExamType)
class ExamTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code']

@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'exam_type', 'code', 'duration_minutes', 'total_marks', 'is_active']
    list_filter = ['exam_type', 'is_active']
    search_fields = ['name', 'code']

@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ['name', 'subject', 'code', 'order', 'is_active']
    list_filter = ['subject__exam_type', 'subject', 'is_active']
    search_fields = ['name', 'code']
    list_editable = ['order']

@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ['id', 'subject', 'chapter', 'school', 'question_type', 'difficulty', 'marks', 'correct_answer', 'is_active']
    list_filter = ['subject__exam_type', 'subject', 'chapter', 'school', 'question_type', 'difficulty', 'is_active']
    search_fields = ['question_text']
    readonly_fields = ['created_at']

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('import-questions/<int:subject_id>/',
                 self.admin_site.admin_view(self.import_questions_view),
                 name='exams_question_import'),
        ]
        return custom_urls + urls

    def import_questions_view(self, request, subject_id):
        """View for importing questions"""
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            messages.error(request, 'Subject not found')
            return redirect('..')

        if request.method == 'POST':
            form = QuestionImportForm(request.POST, request.FILES)
            if form.is_valid():
                source = form.cleaned_data['source']
                amount = form.cleaned_data['amount']
                difficulty = form.cleaned_data['difficulty']
                category = form.cleaned_data.get('category', '')
                file_obj = request.FILES.get('file')

                try:
                    fetcher = get_fetcher(source)
                    questions_data = []

                    if source in ['json', 'csv']:
                        if not file_obj:
                            messages.error(request, 'File is required for this source')
                            return render(request, 'admin/question_import.html', {
                                'form': form,
                                'subject': subject,
                            })

                        import tempfile
                        import os
                        with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{source}') as tmp:
                            for chunk in file_obj.chunks():
                                tmp.write(chunk)
                            tmp_path = tmp.name

                        questions_data = fetcher.fetch_questions(tmp_path)
                        os.unlink(tmp_path)

                    elif source == 'opentrivia':
                        questions_data = fetcher.fetch_questions(
                            category=category,
                            amount=amount,
                            difficulty=difficulty
                        )

                    created_count = 0
                    for q_data in questions_data:
                        try:
                            difficulty_map = {'EASY': 'EASY', 'MEDIUM': 'MEDIUM', 'HARD': 'HARD'}
                            Question.objects.create(
                                subject=subject,
                                question_text=q_data['question_text'],
                                option_a=q_data['option_a'],
                                option_b=q_data['option_b'],
                                option_c=q_data['option_c'],
                                option_d=q_data['option_d'],
                                correct_answer=q_data['correct_answer'],
                                explanation=q_data.get('explanation', ''),
                                difficulty=difficulty_map.get(q_data.get('difficulty', 'MEDIUM'), 'MEDIUM'),
                                marks=q_data.get('marks', 1),
                                negative_marks=q_data.get('negative_marks', 0.0),
                            )
                            created_count += 1
                        except Exception:
                            continue

                    messages.success(request, f'Successfully imported {created_count} questions')
                    return redirect('..')

                except Exception as e:
                    messages.error(request, f'Error importing questions: {str(e)}')
        else:
            form = QuestionImportForm()

        return render(request, 'admin/question_import.html', {
            'form': form,
            'subject': subject,
            'title': f'Import Questions for {subject.name}',
        })

@admin.register(UserExam)
class UserExamAdmin(admin.ModelAdmin):
    list_display = ['user', 'subject', 'school', 'status', 'score', 'percentage', 'completed_at']
    list_filter = ['status', 'school', 'subject__exam_type', 'created_at']
    search_fields = ['user__username', 'user__email']
    readonly_fields = ['created_at']

@admin.register(UserAnswer)
class UserAnswerAdmin(admin.ModelAdmin):
    list_display = ['user_exam', 'question', 'selected_answer', 'is_correct', 'marks_obtained', 'teacher_reviewed', 'teacher_score']
    list_filter = ['is_correct', 'teacher_reviewed', 'user_exam__subject']
    search_fields = ['user_exam__user__username']

@admin.register(ExamPaper)
class ExamPaperAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'school', 'uploaded_by', 'questions_generated', 'created_at']
    list_filter = ['school', 'subject', 'questions_generated']
    search_fields = ['title']

@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'subject', 'school', 'created_at']
    list_filter = ['school', 'subject']
    filter_horizontal = ['students']

@admin.register(AssignedExam)
class AssignedExamAdmin(admin.ModelAdmin):
    list_display = ['title', 'subject', 'school', 'teacher', 'is_active', 'total_marks', 'created_at']
    list_filter = ['school', 'is_active', 'subject']
    search_fields = ['title']
    filter_horizontal = ['assigned_to', 'chapters']
