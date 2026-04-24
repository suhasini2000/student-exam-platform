from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    ExamType, Subject, Chapter, Question, UserExam, UserAnswer,
    ExamAnalysis, ExamPaper, AssignedExam, TeacherAssignment,
    HandwrittenExam,
)

User = get_user_model()


class ExamTypeSerializer(serializers.ModelSerializer):
    subject_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ExamType
        fields = ['id', 'name', 'code', 'description', 'subject_count']


class SubjectSerializer(serializers.ModelSerializer):
    exam_type_name = serializers.CharField(source='exam_type.name', read_only=True)
    chapter_count = serializers.IntegerField(read_only=True, default=0)
    question_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Subject
        fields = [
            'id', 'name', 'code', 'grade', 'description', 'duration_minutes',
            'total_marks', 'exam_type', 'exam_type_name',
            'chapter_count', 'question_count',
        ]


class ChapterSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    question_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = Chapter
        fields = [
            'id', 'name', 'code', 'description', 'order',
            'subject', 'subject_name', 'question_count',
        ]


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = [
            'id', 'question_type', 'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'marks', 'difficulty', 'time_per_question_seconds',
        ]


class QuestionDetailSerializer(serializers.ModelSerializer):
    """Full question details including answers (for result review)"""
    class Meta:
        model = Question
        fields = [
            'id', 'question_type', 'question_text',
            'option_a', 'option_b', 'option_c', 'option_d',
            'correct_answer', 'model_answer', 'explanation',
            'marks', 'difficulty',
        ]


class UserAnswerSerializer(serializers.ModelSerializer):
    question = QuestionSerializer(read_only=True)

    class Meta:
        model = UserAnswer
        fields = [
            'id', 'question', 'selected_answer', 'text_answer',
            'is_correct', 'marks_obtained', 'ai_score', 'ai_feedback',
            'grading_status', 'time_taken_seconds',
            'teacher_reviewed', 'teacher_score', 'teacher_feedback',
        ]


class UserAnswerReviewSerializer(serializers.ModelSerializer):
    """For reviewing answers after exam - includes correct answers"""
    question = QuestionDetailSerializer(read_only=True)

    class Meta:
        model = UserAnswer
        fields = [
            'id', 'question', 'selected_answer', 'text_answer',
            'is_correct', 'marks_obtained', 'ai_score', 'ai_feedback',
            'grading_status', 'time_taken_seconds',
            'teacher_reviewed', 'teacher_score', 'teacher_feedback',
        ]


class SubmitAnswerSerializer(serializers.Serializer):
    question_id = serializers.IntegerField()
    selected_answer = serializers.CharField(max_length=1, required=False, allow_blank=True)
    text_answer = serializers.CharField(required=False, allow_blank=True)
    time_taken_seconds = serializers.IntegerField(default=0)


class GenerateExamSerializer(serializers.Serializer):
    subject_id = serializers.IntegerField()
    chapter_id = serializers.IntegerField(required=False)
    assigned_exam_id = serializers.IntegerField(required=False)


class ExamAnalysisSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamAnalysis
        fields = [
            'question_type_breakdown', 'difficulty_breakdown',
            'time_analysis', 'strengths', 'weaknesses',
            'recommendations', 'percentile',
        ]


class UserExamListSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='subject.exam_type.name', read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', read_only=True, default=None)
    student_name = serializers.SerializerMethodField()

    class Meta:
        model = UserExam
        fields = [
            'id', 'subject_name', 'exam_type_name', 'chapter_name',
            'status', 'grading_status', 'score', 'percentage',
            'total_questions', 'mcq_score', 'short_answer_score',
            'long_answer_score', 'started_at', 'completed_at',
            'student_name',
        ]

    def get_student_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class UserExamDetailSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    exam_type_name = serializers.CharField(source='subject.exam_type.name', read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', read_only=True, default=None)
    answers = UserAnswerReviewSerializer(many=True, read_only=True)
    analysis = ExamAnalysisSerializer(read_only=True)

    class Meta:
        model = UserExam
        fields = [
            'id', 'subject_name', 'exam_type_name', 'chapter_name',
            'status', 'grading_status', 'score', 'percentage',
            'total_questions', 'answered_questions',
            'correct_answers', 'wrong_answers', 'unanswered',
            'mcq_score', 'short_answer_score', 'long_answer_score',
            'total_time_seconds', 'analysis_data', 'suggestions',
            'started_at', 'completed_at', 'answers', 'analysis',
        ]


# --- ExamPaper serializers ---

class ExamPaperSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', read_only=True, default=None)
    uploaded_by_name = serializers.SerializerMethodField()

    class Meta:
        model = ExamPaper
        fields = [
            'id', 'title', 'subject', 'subject_name', 'chapter', 'chapter_name',
            'total_marks', 'questions_generated', 'generation_error',
            'uploaded_by_name', 'file', 'created_at',
        ]
        read_only_fields = ['id', 'questions_generated', 'generation_error', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() or obj.uploaded_by.username


class ExamPaperUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExamPaper
        fields = ['id', 'title', 'subject', 'chapter', 'total_marks', 'file']
        read_only_fields = ['id']


# --- Question browse serializer (for manual selection) ---

class QuestionBrowseSerializer(serializers.ModelSerializer):
    chapter_name = serializers.CharField(source='chapter.name', read_only=True, default=None)

    class Meta:
        model = Question
        fields = [
            'id', 'question_type', 'question_text', 'marks', 'difficulty',
            'option_a', 'option_b', 'option_c', 'option_d', 'chapter_name',
        ]


# --- AssignedExam serializers ---

class AssignedExamSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    student_count = serializers.SerializerMethodField()
    completed_count = serializers.SerializerMethodField()
    exam_category_display = serializers.CharField(source='get_exam_category_display', read_only=True)

    class Meta:
        model = AssignedExam
        fields = [
            'id', 'title', 'subject', 'subject_name', 'teacher_name',
            'num_mcq', 'num_short', 'num_long', 'total_marks', 'duration_minutes',
            'exam_category', 'exam_category_display',
            'is_active', 'start_time', 'end_time', 'created_at',
            'student_count', 'completed_count',
        ]

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def get_student_count(self, obj):
        return obj.assigned_to.count()

    def get_completed_count(self, obj):
        return obj.user_exams.filter(status='COMPLETED').count()


class AssignedExamCreateSerializer(serializers.ModelSerializer):
    student_ids = serializers.ListField(child=serializers.IntegerField(), write_only=True)
    chapter_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    question_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)

    class Meta:
        model = AssignedExam
        fields = [
            'title', 'subject', 'chapter_ids', 'selection_mode',
            'num_mcq', 'num_short', 'num_long',
            'total_marks', 'duration_minutes', 'student_ids',
            'question_ids', 'start_time', 'end_time', 'exam_category',
        ]

    def create(self, validated_data):
        student_ids = validated_data.pop('student_ids', [])
        chapter_ids = validated_data.pop('chapter_ids', [])
        question_ids = validated_data.pop('question_ids', [])
        teacher = self.context['request'].user
        school = teacher.school if teacher.role == 'teacher' else teacher

        assigned_exam = AssignedExam.objects.create(
            **validated_data,
            school=school,
            teacher=teacher,
        )
        if chapter_ids:
            assigned_exam.chapters.set(chapter_ids)
        if student_ids:
            students = User.objects.filter(id__in=student_ids, school=school, role='student')
            assigned_exam.assigned_to.set(students)
        if question_ids and validated_data.get('selection_mode') == 'manual':
            questions = Question.objects.filter(id__in=question_ids)
            assigned_exam.selected_questions.set(questions)
        return assigned_exam


class StudentAssignedExamSerializer(serializers.ModelSerializer):
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    teacher_name = serializers.SerializerMethodField()
    my_attempt = serializers.SerializerMethodField()
    exam_category_display = serializers.CharField(source='get_exam_category_display', read_only=True)

    class Meta:
        model = AssignedExam
        fields = [
            'id', 'title', 'subject', 'subject_name', 'teacher_name',
            'num_mcq', 'num_short', 'num_long', 'total_marks', 'duration_minutes',
            'exam_category', 'exam_category_display',
            'is_active', 'start_time', 'end_time', 'created_at',
            'my_attempt',
        ]

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def get_my_attempt(self, obj):
        user = self.context['request'].user
        attempt = obj.user_exams.filter(user=user).first()
        if attempt:
            return {
                'exam_id': attempt.id,
                'status': attempt.status,
                'grading_status': attempt.grading_status,
                'score': attempt.score,
                'percentage': attempt.percentage,
            }
        return None


class TeacherReviewSerializer(serializers.Serializer):
    answer_id = serializers.IntegerField()
    teacher_score = serializers.FloatField()
    teacher_feedback = serializers.CharField(required=False, allow_blank=True, default='')


class CreatePaperFromPapersSerializer(serializers.Serializer):
    paper_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    instructions = serializers.CharField()
    subject = serializers.IntegerField()
    total_marks = serializers.IntegerField(default=50)
    num_mcq = serializers.IntegerField(default=20)
    num_short = serializers.IntegerField(default=5)
    num_long = serializers.IntegerField(default=4)


# --- TeacherAssignment serializers ---

class TeacherAssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    student_count = serializers.SerializerMethodField()
    grade_display = serializers.SerializerMethodField()

    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'teacher', 'teacher_name', 'subject', 'subject_name',
            'grade', 'section', 'grade_display', 'student_count', 'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def get_student_count(self, obj):
        if obj.pk and obj.students.exists():
            return obj.students.count()
        return obj.get_students().count()

    def get_grade_display(self, obj):
        if obj.grade and obj.grade != '-':
            return f"Class {obj.grade}{obj.section}"
        return "Specific Students (No Class Filter)"


class TeacherAssignmentCreateSerializer(serializers.Serializer):
    teacher_id = serializers.IntegerField()
    subject_id = serializers.IntegerField()
    grade = serializers.CharField(max_length=2, required=False, default='')
    section = serializers.CharField(max_length=1, required=False, default='')
    student_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=list
    )


# --- HandwrittenExam serializers ---

class HandwrittenExamSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    student_display_name = serializers.SerializerMethodField()
    subject_name = serializers.CharField(source='subject.name', read_only=True)

    exam_category_display = serializers.CharField(source='get_exam_category_display', read_only=True)

    class Meta:
        model = HandwrittenExam
        fields = [
            'id', 'title', 'subject', 'subject_name',
            'teacher', 'teacher_name',
            'student', 'student_name', 'student_display_name',
            'answer_sheet', 'question_paper',
            'exam_category', 'exam_category_display',
            'total_marks', 'obtained_marks', 'percentage',
            'status', 'grading_data', 'error_message',
            'created_at',
        ]
        read_only_fields = [
            'id', 'teacher', 'obtained_marks', 'percentage',
            'status', 'grading_data', 'error_message', 'created_at',
        ]

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def get_student_display_name(self, obj):
        if obj.student:
            return obj.student.get_full_name() or obj.student.username
        return obj.student_name or 'Unknown'


class HandwrittenExamUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = HandwrittenExam
        fields = ['title', 'subject', 'student', 'student_name', 'answer_sheet', 'question_paper', 'total_marks', 'exam_category']
