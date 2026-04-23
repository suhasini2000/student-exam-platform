import threading
from django.conf import settings

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Count, Q, Avg, Min, Max
from django.db.models.functions import TruncDay, TruncWeek, TruncMonth
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from .models import (
    ExamType, Subject, Chapter, Question, UserExam, UserAnswer,
    ExamPaper, AssignedExam, TeacherAssignment, HandwrittenExam,
)
from .serializers import (
    ExamTypeSerializer, SubjectSerializer, ChapterSerializer,
    QuestionSerializer, UserExamListSerializer, UserExamDetailSerializer,
    GenerateExamSerializer, SubmitAnswerSerializer,
    ExamPaperSerializer, ExamPaperUploadSerializer,
    AssignedExamSerializer, AssignedExamCreateSerializer,
    StudentAssignedExamSerializer, TeacherReviewSerializer,
    UserAnswerReviewSerializer, CreatePaperFromPapersSerializer,
    TeacherAssignmentSerializer, TeacherAssignmentCreateSerializer,
    HandwrittenExamSerializer, HandwrittenExamUploadSerializer,
    QuestionBrowseSerializer,
)
from .paper_generator import generate_paper
from .grading import grade_exam_async
from accounts.permissions import IsSchoolOrTeacher, IsTeacherUser, IsSchoolUser

User = get_user_model()


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def trigger_data_cleanup(request):
    """Trigger the removal of global sample data via URL."""
    from .models import Question, Chapter, Subject, UserAnswer
    
    global_subjects = Subject.objects.filter(school__isnull=True)
    global_sub_ids = list(global_subjects.values_list('id', flat=True))
    
    # 1. Delete dependent data
    ua_count = UserAnswer.objects.filter(question__subject_id__in=global_sub_ids).delete()[0]
    q_count = Question.objects.filter(subject_id__in=global_sub_ids).delete()[0]
    c_count = Chapter.objects.filter(subject_id__in=global_sub_ids).delete()[0]
    
    # 2. Delete Subjects
    s_names = list(global_subjects.values_list('name', flat=True))
    global_subjects.delete()

    return Response({
        "status": "Cleanup Successful",
        "deleted": {
            "user_answers": ua_count,
            "questions": q_count,
            "chapters": c_count,
            "subjects": s_names
        }
    })


# ============================================================
# Existing views (updated with school-aware filtering)
# ============================================================

class ExamTypeListView(generics.ListAPIView):
    serializer_class = ExamTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        school = user if user.role == 'school' else user.school
        qs = ExamType.objects.filter(is_active=True)
        if school:
            qs = qs.filter(subjects__school=school).distinct()
        return qs.annotate(
            subject_count=Count('subjects', filter=Q(subjects__school=school) if school else Q())
        )


class SubjectListView(generics.ListAPIView):
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        school = user if user.role == 'school' else user.school
        qs = Subject.objects.filter(is_active=True).annotate(
            chapter_count=Count('chapters'),
            question_count=Count('questions'),
        )
        # Show school's own subjects AND global ones (to allow matching)
        if school:
            qs = qs.filter(Q(school=school) | Q(school__isnull=True))
        exam_type = self.request.query_params.get('exam_type')
        if exam_type:
            qs = qs.filter(exam_type_id=exam_type)
        return qs


class ChapterListView(generics.ListAPIView):
    serializer_class = ChapterSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Chapter.objects.filter(is_active=True).annotate(
            question_count=Count('questions'),
        )
        subject = self.request.query_params.get('subject')
        if subject:
            qs = qs.filter(subject_id=subject)
        return qs


# ============================================================
# Subject & Chapter Management (School admin)
# ============================================================

class SubjectCreateView(APIView):
    """School creates a subject (and its exam type if needed)."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def post(self, request):
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip().upper()
        grade = request.data.get('grade', '').strip()
        if not name or not code:
            return Response({'error': 'Name and code are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Use school's board as exam type, or create one
        board = request.user.board or 'CBSE'
        is_coaching = request.user.org_type == 'coaching'
        if is_coaching:
            et_code = board
            et_name = dict(request.user.BOARD_CHOICES).get(board, board)
        else:
            et_code = f'{board}{grade}' if grade else f'{board}10'
            et_name = f'{board} Class {grade}' if grade else f'{board} Class 10'
        exam_type, _ = ExamType.objects.get_or_create(
            code=et_code,
            defaults={'name': et_name, 'is_active': True},
        )

        if Subject.objects.filter(exam_type=exam_type, code=code, school=request.user).exists():
            return Response({'error': f'Subject with code {code} already exists'}, status=status.HTTP_400_BAD_REQUEST)

        subject = Subject.objects.create(
            exam_type=exam_type,
            school=request.user,
            name=name,
            code=code,
            grade=grade,
            description=request.data.get('description', ''),
            duration_minutes=int(request.data.get('duration_minutes', 90)),
            total_marks=int(request.data.get('total_marks', 50)),
        )
        return Response({
            'id': subject.id, 'name': subject.name, 'code': subject.code,
            'grade': subject.grade,
            'message': 'Subject created successfully',
        }, status=status.HTTP_201_CREATED)


class SubjectUpdateView(APIView):
    """School updates a subject."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def patch(self, request, pk):
        try:
            subject = Subject.objects.get(pk=pk, school=request.user)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)
        for field in ('name', 'code', 'description', 'duration_minutes', 'total_marks'):
            if field in request.data:
                setattr(subject, field, request.data[field])
        subject.save()
        return Response({'id': subject.id, 'name': subject.name, 'message': 'Subject updated'})


class SubjectDeleteView(APIView):
    """School deletes a subject."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def delete(self, request, pk):
        try:
            subject = Subject.objects.get(pk=pk, school=request.user)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)
        subject.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ChapterCreateView(APIView):
    """School creates a chapter under a subject."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def post(self, request):
        subject_id = request.data.get('subject')
        name = request.data.get('name', '').strip()
        code = request.data.get('code', '').strip().upper()
        if not subject_id or not name or not code:
            return Response({'error': 'Subject, name and code are required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

        if Chapter.objects.filter(subject=subject, code=code).exists():
            return Response({'error': f'Chapter with code {code} already exists for this subject'}, status=status.HTTP_400_BAD_REQUEST)

        order = Chapter.objects.filter(subject=subject).count() + 1
        chapter = Chapter.objects.create(
            subject=subject,
            name=name,
            code=code,
            description=request.data.get('description', ''),
            order=order,
        )
        return Response({
            'id': chapter.id, 'name': chapter.name, 'code': chapter.code,
            'message': 'Chapter created successfully',
        }, status=status.HTTP_201_CREATED)


class ChapterUpdateView(APIView):
    """School updates a chapter."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def patch(self, request, pk):
        try:
            chapter = Chapter.objects.get(pk=pk)
        except Chapter.DoesNotExist:
            return Response({'error': 'Chapter not found'}, status=status.HTTP_404_NOT_FOUND)
        for field in ('name', 'code', 'description'):
            if field in request.data:
                setattr(chapter, field, request.data[field])
        chapter.save()
        return Response({'id': chapter.id, 'name': chapter.name, 'message': 'Chapter updated'})


class ChapterDeleteView(APIView):
    """School deletes a chapter."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def delete(self, request, pk):
        try:
            chapter = Chapter.objects.get(pk=pk)
        except Chapter.DoesNotExist:
            return Response({'error': 'Chapter not found'}, status=status.HTTP_404_NOT_FOUND)
        chapter.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================================
# Exam generation & taking
# ============================================================

@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def generate_exam(request):
    """Generate a 50-mark exam paper"""
    serializer = GenerateExamSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    subject_id = serializer.validated_data['subject_id']
    chapter_id = serializer.validated_data.get('chapter_id')
    assigned_exam_id = serializer.validated_data.get('assigned_exam_id')

    try:
        subject = Subject.objects.get(id=subject_id, is_active=True)
    except Subject.DoesNotExist:
        return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

    chapter = None
    if chapter_id:
        try:
            chapter = Chapter.objects.get(id=chapter_id, subject=subject, is_active=True)
        except Chapter.DoesNotExist:
            return Response({'error': 'Chapter not found'}, status=status.HTTP_404_NOT_FOUND)

    # Link to assigned exam if provided
    assigned_exam = None
    if assigned_exam_id:
        try:
            assigned_exam = AssignedExam.objects.get(
                id=assigned_exam_id, assigned_to=request.user, is_active=True,
            )
            # Check if student already has an attempt for this assigned exam
            existing = UserExam.objects.filter(
                user=request.user, assigned_exam=assigned_exam,
            ).first()
            if existing:
                return Response({
                    'exam_id': existing.id,
                    'message': 'You already have an attempt for this exam',
                }, status=status.HTTP_200_OK)
        except AssignedExam.DoesNotExist:
            return Response({'error': 'Assigned exam not found'}, status=status.HTTP_404_NOT_FOUND)

    # Get school context for question filtering
    school = request.user.get_school_account() if hasattr(request.user, 'get_school_account') else None

    # Check if assigned exam uses manual question selection
    if assigned_exam and assigned_exam.selection_mode == 'manual' and assigned_exam.selected_questions.exists():
        questions = list(assigned_exam.selected_questions.all())
        for q in questions:
            if q.question_type == 'MCQ':
                q.marks = 1
            elif q.question_type == 'SHORT':
                q.marks = 2
            else:
                q.marks = 5
    else:
        # Get question counts from assigned exam or use defaults
        num_mcq = assigned_exam.num_mcq if assigned_exam else 20
        num_short = assigned_exam.num_short if assigned_exam else 5
        num_long = assigned_exam.num_long if assigned_exam else 4

        # Generate paper with configured question counts
        questions = generate_paper(
            subject, chapter, school=school,
            num_mcq=num_mcq, num_short=num_short, num_long=num_long,
        )

    if not questions:
        return Response(
            {'error': 'Not enough questions available to generate an exam'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Use assigned exam duration if available, otherwise calculate from per-question time
    if assigned_exam:
        total_time = assigned_exam.duration_minutes * 60
    else:
        total_time = sum(q.time_per_question_seconds for q in questions)

    # Calculate actual total marks from selected questions
    total_marks = sum(q.marks for q in questions)

    # Create UserExam
    user_exam = UserExam.objects.create(
        user=request.user,
        subject=subject,
        chapter=chapter,
        school=school,
        assigned_exam=assigned_exam,
        status='IN_PROGRESS',
        started_at=timezone.now(),
        total_questions=len(questions),
        total_time_seconds=total_time,
    )

    # Pre-create UserAnswer entries
    for q in questions:
        UserAnswer.objects.create(user_exam=user_exam, question=q)

    # Return exam data
    question_data = QuestionSerializer(questions, many=True).data
    return Response({
        'exam_id': user_exam.id,
        'subject': subject.name,
        'chapter': chapter.name if chapter else None,
        'total_questions': len(questions),
        'total_marks': total_marks,
        'total_time_seconds': total_time,
        'questions': question_data,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def save_answer(request, exam_id):
    """Save a single answer during exam"""
    try:
        user_exam = UserExam.objects.get(id=exam_id, user=request.user, status='IN_PROGRESS')
    except UserExam.DoesNotExist:
        return Response({'error': 'Exam not found or already submitted'}, status=status.HTTP_404_NOT_FOUND)

    serializer = SubmitAnswerSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    question_id = serializer.validated_data['question_id']
    selected_answer = serializer.validated_data.get('selected_answer', '')
    text_answer = serializer.validated_data.get('text_answer', '')
    time_taken = serializer.validated_data.get('time_taken_seconds', 0)

    try:
        user_answer = UserAnswer.objects.get(user_exam=user_exam, question_id=question_id)
    except UserAnswer.DoesNotExist:
        return Response({'error': 'Question not part of this exam'}, status=status.HTTP_400_BAD_REQUEST)

    user_answer.selected_answer = selected_answer if selected_answer else None
    user_answer.text_answer = text_answer
    user_answer.time_taken_seconds = time_taken
    user_answer.save()

    return Response({'message': 'Answer saved'})


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def submit_exam(request, exam_id):
    """Submit exam and trigger grading"""
    try:
        user_exam = UserExam.objects.get(id=exam_id, user=request.user, status='IN_PROGRESS')
    except UserExam.DoesNotExist:
        return Response({'error': 'Exam not found or already submitted'}, status=status.HTTP_404_NOT_FOUND)

    user_exam.status = 'COMPLETED'
    user_exam.completed_at = timezone.now()
    user_exam.grading_status = 'PENDING_REVIEW'
    user_exam.save()

    return Response({'message': 'Exam submitted. Your teacher will review and grade it.', 'exam_id': user_exam.id})


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def grading_status(request, exam_id):
    """Poll grading status"""
    try:
        user_exam = UserExam.objects.get(id=exam_id, user=request.user)
    except UserExam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

    return Response({
        'grading_status': user_exam.grading_status,
        'score': user_exam.score,
        'percentage': user_exam.percentage,
    })


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def exam_result(request, exam_id):
    """Get full exam result with analysis"""
    # Allow teacher/school to view their school's student exams
    user = request.user
    try:
        qs = UserExam.objects.select_related(
            'subject__exam_type', 'chapter'
        ).prefetch_related('answers__question', 'analysis')

        if user.role in ('school', 'teacher'):
            school = user if user.role == 'school' else user.school
            user_exam = qs.filter(
                Q(user=user) | Q(school=school)
            ).get(id=exam_id)
        else:
            user_exam = qs.get(id=exam_id, user=user)
    except UserExam.DoesNotExist:
        return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

    # Students can only see results after teacher has graded
    if user.role not in ('school', 'teacher') and user_exam.grading_status not in ('COMPLETED',):
        return Response({
            'id': user_exam.id,
            'grading_status': user_exam.grading_status,
            'subject_name': user_exam.subject.name if user_exam.subject else '',
            'message': 'Your exam is pending teacher review. Results will be available after grading.',
        })

    serializer = UserExamDetailSerializer(user_exam)
    return Response(serializer.data)


class ExamHistoryView(generics.ListAPIView):
    serializer_class = UserExamListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = UserExam.objects.filter(
            user=self.request.user,
            status='COMPLETED',
        ).select_related('subject__exam_type', 'chapter').order_by('-completed_at')
        # Students only see fully graded exams
        if self.request.user.role not in ('school', 'teacher'):
            qs = qs.filter(grading_status='COMPLETED')
        return qs


# ============================================================
# Exam Paper Upload & AI Generation (Teacher)
# ============================================================

class ExamPaperUploadView(generics.CreateAPIView):
    serializer_class = ExamPaperUploadSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        user = self.request.user
        school = user if user.role == 'school' else user.school
        serializer.save(school=school, uploaded_by=user)


class ExamPaperListView(generics.ListAPIView):
    serializer_class = ExamPaperSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get_queryset(self):
        user = self.request.user
        school = user if user.role == 'school' else user.school
        return ExamPaper.objects.filter(school=school)


class ExamPaperDeleteView(generics.DestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get_queryset(self):
        user = self.request.user
        school = user if user.role == 'school' else user.school
        return ExamPaper.objects.filter(school=school)

    def perform_destroy(self, instance):
        if instance.file:
            instance.file.delete(save=False)
        instance.delete()


class GenerateQuestionsFromPaperView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def post(self, request, pk):
        user = request.user
        school = user if user.role == 'school' else user.school
        try:
            paper = ExamPaper.objects.get(pk=pk, school=school)
        except ExamPaper.DoesNotExist:
            return Response({'error': 'Paper not found'}, status=status.HTTP_404_NOT_FOUND)

        if paper.questions_generated:
            return Response({'error': 'Questions already generated for this paper'}, status=status.HTTP_400_BAD_REQUEST)

        # Run generation (waiting for result to ensure completion on Free Tier)
        from .paper_processor import generate_questions_from_paper
        generate_questions_from_paper(paper.id)

        # Refresh paper to check for errors
        paper.refresh_from_db()
        if paper.generation_error:
            return Response({'error': paper.generation_error}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({'message': 'Question generation completed successfully', 'paper_id': paper.id})


# ============================================================
# Create Paper from Multiple Uploaded Papers (Teacher)
# ============================================================

class CreatePaperFromPapersView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def post(self, request):
        serializer = CreatePaperFromPapersSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        school = user if user.role == 'school' else user.school

        try:
            subject = Subject.objects.get(id=serializer.validated_data['subject'])
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

        from .paper_processor import generate_paper_from_multiple
        result = generate_paper_from_multiple(
            paper_ids=serializer.validated_data['paper_ids'],
            instructions=serializer.validated_data['instructions'],
            subject=subject,
            school=school,
            teacher=user,
            total_marks=serializer.validated_data.get('total_marks', 50),
            num_mcq=serializer.validated_data.get('num_mcq', 20),
            num_short=serializer.validated_data.get('num_short', 5),
            num_long=serializer.validated_data.get('num_long', 4),
        )

        if not result.get('success'):
            return Response({'error': result.get('error')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': 'Question generation from papers completed',
            'questions_count': result.get('questions_count'),
            'subject': subject.name,
        }, status=status.HTTP_201_CREATED)


# ============================================================
# Generate Questions from Instructions (no uploaded papers)
# ============================================================

class GenerateFromInstructionsView(APIView):
    """
    Generate questions from teacher-provided instructions: subject, chapters,
    topics, and marks distribution.  Runs AI generation in a background thread
    and returns an immediate acknowledgement.
    """
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def post(self, request):
        # --- validate required fields ---
        subject_id = request.data.get('subject')
        chapter_ids = request.data.get('chapter_ids', [])
        topics = request.data.get('topics', '')
        total_marks = int(request.data.get('total_marks', 50))
        num_mcq = int(request.data.get('num_mcq', 20))
        num_short = int(request.data.get('num_short', 5))
        num_long = int(request.data.get('num_long', 4))

        if not subject_id:
            return Response({'error': 'subject is required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

        chapters = list(Chapter.objects.filter(id__in=chapter_ids)) if chapter_ids else []

        user = request.user
        school = user if user.role == 'school' else user.school

        marks_distribution = {
            'num_mcq': num_mcq,
            'num_short': num_short,
            'num_long': num_long,
        }

        # Run generation (waiting for result to ensure completion on Free Tier)
        from .paper_processor import generate_questions_from_instructions
        result = generate_questions_from_instructions(
            subject, chapters, topics, marks_distribution, total_marks, school, user
        )

        if not result.get('success'):
            return Response({'error': result.get('error')}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        return Response({
            'message': 'Question generation from instructions completed',
            'questions_count': result.get('questions_count'),
            'subject': subject.name,
        }, status=status.HTTP_201_CREATED)


# ============================================================
# Question Browsing (Teacher selects questions for manual mode)
# ============================================================

class TeacherQuestionListView(generics.ListAPIView):
    """Browse questions for manual selection when creating exams."""
    serializer_class = QuestionBrowseSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get_queryset(self):
        user = self.request.user
        school = user if user.role == 'school' else user.school

        subject_id = self.request.query_params.get('subject')
        if not subject_id:
            return Question.objects.none()

        # Get the subject name to allow matching global questions
        try:
            target_subject = Subject.objects.get(id=subject_id)
            subject_name = target_subject.name
        except Subject.DoesNotExist:
            return Question.objects.none()

        # Match by specific ID OR by subject name (to include global questions)
        qs = Question.objects.filter(
            Q(subject_id=subject_id) | Q(subject__name=subject_name),
            is_active=True,
        ).filter(
            Q(school=school) | Q(school__isnull=True) | Q(created_by=user)
        ).select_related('chapter')

        chapter = self.request.query_params.get('chapter')
        if chapter:
            qs = qs.filter(chapter_id=chapter)

        question_type = self.request.query_params.get('question_type')
        if question_type:
            qs = qs.filter(question_type=question_type)

        difficulty = self.request.query_params.get('difficulty')
        if difficulty:
            qs = qs.filter(difficulty=difficulty)

        ids = self.request.query_params.get('ids')
        if ids:
            id_list = [i.strip() for i in ids.split(',') if i.strip().isdigit()]
            qs = qs.filter(id__in=id_list)

        return qs


# ============================================================
# Assigned Exams (Teacher creates, Student takes)
# ============================================================

class AssignedExamCreateView(generics.CreateAPIView):
    serializer_class = AssignedExamCreateSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]


class AssignedExamListView(generics.ListAPIView):
    serializer_class = AssignedExamSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'school':
            return AssignedExam.objects.filter(school=user)
        # Teacher sees their own assigned exams
        return AssignedExam.objects.filter(teacher=user)


class AssignedExamDeleteView(APIView):
    """Teacher/school deletes or updates an assigned exam."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def _get_exam(self, request, pk):
        user = request.user
        try:
            if user.role == 'school':
                return AssignedExam.objects.get(pk=pk, school=user)
            return AssignedExam.objects.get(pk=pk, teacher=user)
        except AssignedExam.DoesNotExist:
            return None

    def get(self, request, pk):
        """Get full exam details for editing."""
        exam = self._get_exam(request, pk)
        if not exam:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

        def serialize_question(q):
            return {
                'id': q.id,
                'question_text': q.question_text,
                'question_type': q.question_type,
                'difficulty': q.difficulty,
                'chapter_name': q.chapter.name if q.chapter else '',
                'marks': q.marks,
                'option_a': q.option_a,
                'option_b': q.option_b,
                'option_c': q.option_c,
                'option_d': q.option_d,
                'correct_answer': q.correct_answer,
                'model_answer': q.model_answer,
            }

        questions_data = []
        questions_source = 'manual'

        if exam.selection_mode == 'manual' and exam.selected_questions.exists():
            # Manual exam: use pre-selected questions
            for q in exam.selected_questions.select_related('chapter').order_by('question_type', 'id'):
                questions_data.append(serialize_question(q))
        else:
            # Random exam: get questions from the first completed student attempt
            first_attempt = (
                UserExam.objects
                .filter(assigned_exam=exam, status='COMPLETED')
                .prefetch_related('answers__question__chapter')
                .order_by('completed_at')
                .first()
            )
            if first_attempt:
                seen_ids = set()
                qs = sorted(
                    first_attempt.answers.select_related('question__chapter').all(),
                    key=lambda a: (a.question.question_type, a.question.id)
                )
                for ans in qs:
                    q = ans.question
                    if q.id not in seen_ids:
                        seen_ids.add(q.id)
                        questions_data.append(serialize_question(q))
                questions_source = 'attempt'

        data = {
            'id': exam.id,
            'title': exam.title,
            'subject': exam.subject_id,
            'subject_name': exam.subject.name,
            'chapter_ids': list(exam.chapters.values_list('id', flat=True)),
            'selection_mode': exam.selection_mode,
            'questions_source': questions_source,
            'num_mcq': exam.num_mcq,
            'num_short': exam.num_short,
            'num_long': exam.num_long,
            'total_marks': exam.total_marks,
            'duration_minutes': exam.duration_minutes,
            'exam_category': exam.exam_category,
            'start_time': exam.start_time.isoformat() if exam.start_time else '',
            'end_time': exam.end_time.isoformat() if exam.end_time else '',
            'student_ids': list(exam.assigned_to.values_list('id', flat=True)),
            'question_ids': list(exam.selected_questions.values_list('id', flat=True)),
            'questions': questions_data,
        }
        return Response(data)

    def delete(self, request, pk):
        exam = self._get_exam(request, pk)
        if not exam:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)
        exam.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    def patch(self, request, pk):
        """Update an assigned exam's fields."""
        exam = self._get_exam(request, pk)
        if not exam:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

        scalar_fields = [
            'title', 'duration_minutes', 'total_marks',
            'num_mcq', 'num_short', 'num_long',
            'exam_category', 'start_time', 'end_time', 'is_active',
        ]
        updated_fields = []
        for field in scalar_fields:
            if field in request.data:
                setattr(exam, field, request.data[field] or None if field in ('start_time', 'end_time') and request.data[field] == '' else request.data[field])
                updated_fields.append(field)
        if updated_fields:
            exam.save(update_fields=updated_fields)

        if 'chapter_ids' in request.data:
            exam.chapters.set(request.data['chapter_ids'])
        if 'student_ids' in request.data:
            school = exam.school
            students = User.objects.filter(id__in=request.data['student_ids'], school=school, role='student')
            exam.assigned_to.set(students)
        if 'question_ids' in request.data:
            from .models import Question as QuestionModel
            questions = QuestionModel.objects.filter(id__in=request.data['question_ids'])
            exam.selected_questions.set(questions)

        return Response({'id': exam.id, 'message': 'Exam updated successfully'})


class StudentAssignedExamsView(generics.ListAPIView):
    serializer_class = StudentAssignedExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return AssignedExam.objects.filter(
            assigned_to=self.request.user,
            is_active=True,
        )

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx


# ============================================================
# Assigned Exam Submissions List
# ============================================================

class AssignedExamSubmissionsView(APIView):
    """List all student submissions for a given AssignedExam."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get(self, request, pk):
        user = request.user
        school = user if user.role == 'school' else user.school
        try:
            assigned_exam = AssignedExam.objects.select_related('subject').get(
                id=pk, school=school,
            )
        except AssignedExam.DoesNotExist:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

        # All students assigned to this exam
        assigned_students = list(assigned_exam.assigned_to.all())

        # All UserExam attempts for this exam
        attempts = {
            ue.user_id: ue
            for ue in UserExam.objects.filter(
                assigned_exam=assigned_exam,
            ).select_related('user')
        }

        rows = []
        for student in assigned_students:
            ue = attempts.get(student.id)
            rows.append({
                'student_id': student.id,
                'student_name': student.get_full_name() or student.username,
                'profile_photo': student.profile_photo.url if student.profile_photo else None,
                'user_exam_id': ue.id if ue else None,
                'status': ue.status if ue else 'NOT_STARTED',
                'grading_status': ue.grading_status if ue else None,
                'score': ue.score if ue else None,
                'total_marks': sum(a.question.marks for a in ue.answers.select_related('question').all()) if ue else None,
                'percentage': ue.percentage if ue else None,
                'completed_at': ue.completed_at if ue else None,
            })

        return Response({
            'exam_id': assigned_exam.id,
            'exam_title': assigned_exam.title,
            'subject': assigned_exam.subject.name if assigned_exam.subject else '',
            'submissions': rows,
        })


# ============================================================
# Teacher Review
# ============================================================

class TeacherReviewView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get(self, request, exam_id):
        """Get exam detail for teacher review."""
        user = request.user
        school = user if user.role == 'school' else user.school
        try:
            user_exam = UserExam.objects.select_related(
                'subject', 'chapter', 'user'
            ).prefetch_related(
                'answers__question'
            ).get(id=exam_id, school=school)
        except UserExam.DoesNotExist:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

        data = UserExamDetailSerializer(user_exam).data
        data['student_name'] = user_exam.user.get_full_name() or user_exam.user.username
        data['student_username'] = user_exam.user.username
        data['profile_photo'] = user_exam.user.profile_photo.url if user_exam.user.profile_photo else None
        data['assigned_exam_id'] = user_exam.assigned_exam_id
        return Response(data)

    def patch(self, request, exam_id):
        """Teacher overrides scores on individual answers."""
        user = request.user
        school = user if user.role == 'school' else user.school
        try:
            user_exam = UserExam.objects.get(id=exam_id, school=school)
        except UserExam.DoesNotExist:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TeacherReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        answer_id = serializer.validated_data['answer_id']
        teacher_score = serializer.validated_data['teacher_score']
        teacher_feedback = serializer.validated_data.get('teacher_feedback', '')

        try:
            answer = UserAnswer.objects.get(id=answer_id, user_exam=user_exam)
        except UserAnswer.DoesNotExist:
            return Response({'error': 'Answer not found'}, status=status.HTTP_404_NOT_FOUND)

        # Validate score doesn't exceed max marks
        if teacher_score > answer.question.marks:
            return Response(
                {'error': f'Score cannot exceed {answer.question.marks} marks'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        answer.teacher_reviewed = True
        answer.teacher_score = teacher_score
        answer.teacher_feedback = teacher_feedback
        answer.marks_obtained = teacher_score
        answer.is_correct = teacher_score >= answer.question.marks * 0.5
        answer.save()

        # Recalculate exam totals
        answers = UserAnswer.objects.filter(user_exam=user_exam).select_related('question')
        total_score = sum(a.marks_obtained for a in answers)
        total_possible = sum(a.question.marks for a in answers)
        user_exam.score = total_score
        user_exam.percentage = round(total_score / total_possible * 100, 1) if total_possible > 0 else 0
        user_exam.mcq_score = sum(a.marks_obtained for a in answers if a.question.question_type == 'MCQ')
        user_exam.short_answer_score = sum(a.marks_obtained for a in answers if a.question.question_type == 'SHORT')
        user_exam.long_answer_score = sum(a.marks_obtained for a in answers if a.question.question_type == 'LONG')
        user_exam.save()

        return Response({'message': 'Score updated', 'new_total': total_score})


# ============================================================
# Teacher Assignments (School maps teacher → subject → students)
# ============================================================

class TeacherAssignmentListView(generics.ListAPIView):
    """School views all teacher assignments."""
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def get_queryset(self):
        qs = TeacherAssignment.objects.filter(
            school=self.request.user,
        ).select_related('teacher', 'subject')
        teacher_id = self.request.query_params.get('teacher')
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        return qs


class TeacherAssignmentCreateView(APIView):
    """School creates a teacher-subject-class/section mapping."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def post(self, request):
        serializer = TeacherAssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        school = request.user
        teacher_id = serializer.validated_data['teacher_id']
        subject_id = serializer.validated_data['subject_id']
        grade = serializer.validated_data.get('grade', '')
        section = serializer.validated_data.get('section', '')
        student_ids = serializer.validated_data.get('student_ids', [])

        # Coaching centres don't use grade/section — default to '-' (all students)
        if getattr(request.user, 'org_type', '') == 'coaching':
            grade = grade or '-'
            section = section or '-'

        # Validate teacher belongs to school
        try:
            teacher = User.objects.get(id=teacher_id, school=school, role='teacher')
        except User.DoesNotExist:
            return Response({'error': 'Teacher not found in your school'}, status=status.HTTP_404_NOT_FOUND)

        # Validate subject exists
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            return Response({'error': 'Subject not found'}, status=status.HTTP_404_NOT_FOUND)

        # Create or get assignment
        assignment, created = TeacherAssignment.objects.get_or_create(
            school=school,
            teacher=teacher,
            subject=subject,
            grade=grade,
            section=section,
        )

        # Save selected students to M2M
        if student_ids:
            students = User.objects.filter(id__in=student_ids, school=school, role='student')
            assignment.students.set(students)

        data = TeacherAssignmentSerializer(assignment).data
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class TeacherAssignmentDeleteView(APIView):
    """School deletes a teacher assignment."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def delete(self, request, pk):
        try:
            assignment = TeacherAssignment.objects.get(pk=pk, school=request.user)
        except TeacherAssignment.DoesNotExist:
            return Response({'error': 'Assignment not found'}, status=status.HTTP_404_NOT_FOUND)
        assignment.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class TeacherMyAssignmentsView(generics.ListAPIView):
    """Teacher views their own subject+class/section assignments."""
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherUser]

    def get_queryset(self):
        return TeacherAssignment.objects.filter(
            teacher=self.request.user,
        ).select_related('teacher', 'subject')


# ============================================================
# Dashboard Stats
# ============================================================

class TeacherDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get(self, request):
        user = request.user
        school = user if user.role == 'school' else user.school

        papers_count = ExamPaper.objects.filter(school=school).count()
        assigned_count = AssignedExam.objects.filter(
            teacher=user
        ).count() if user.role == 'teacher' else AssignedExam.objects.filter(school=school).count()
        if user.role == 'teacher':
            student_ids = set()
            # From explicit teacher assignments (grade/section based)
            for a in TeacherAssignment.objects.filter(teacher=user):
                student_ids.update(a.students.values_list('id', flat=True))
            # From assigned exams created by this teacher
            for ae in AssignedExam.objects.filter(teacher=user).prefetch_related('assigned_to'):
                student_ids.update(ae.assigned_to.values_list('id', flat=True))
            # From handwritten exams uploaded by this teacher
            hw_ids = HandwrittenExam.objects.filter(
                teacher=user, student__isnull=False
            ).values_list('student_id', flat=True)
            student_ids.update(hw_ids)
            students_count = len(student_ids)
        else:
            students_count = User.objects.filter(school=school, role='student').count()
        pending_reviews = UserExam.objects.filter(
            school=school,
            status='COMPLETED',
            grading_status='PENDING_REVIEW',
        ).count()
        handwritten_graded = HandwrittenExam.objects.filter(school=school, status='GRADED').count()

        # Recent online exams
        online_exams = UserExam.objects.filter(
            school=school, status='COMPLETED',
        ).select_related('user', 'subject').order_by('-completed_at')[:10]

        recent_data = [{
            'id': e.id,
            'type': 'online',
            'student': e.user.get_full_name() or e.user.username,
            'student_id': e.user.id,
            'subject': e.subject.name,
            'score': e.score,
            'total_marks': e.subject.total_marks if e.subject else 50,
            'percentage': e.percentage,
            'completed_at': e.completed_at,
        } for e in online_exams]

        # Recent handwritten exams (all statuses)
        hw_exams = HandwrittenExam.objects.filter(
            school=school,
        ).select_related('subject', 'student').order_by('-created_at')[:10]

        for h in hw_exams:
            student_name = h.student_name or (h.student.get_full_name() if h.student else 'Unknown')
            recent_data.append({
                'id': h.id,
                'type': 'handwritten',
                'hw_status': h.status,
                'student': student_name,
                'student_id': h.student_id,
                'subject': h.subject.name if h.subject else '',
                'score': h.obtained_marks,
                'total_marks': h.total_marks,
                'percentage': h.percentage,
                'completed_at': h.created_at,
            })

        # Sort combined list by date, take top 10
        recent_data.sort(key=lambda x: x['completed_at'] or '', reverse=True)
        recent_data = recent_data[:10]

        # Assigned subjects for this teacher
        assigned_subjects = []
        if user.role == 'teacher':
            seen = set()
            for a in TeacherAssignment.objects.filter(teacher=user).select_related('subject'):
                if a.subject.name not in seen:
                    seen.add(a.subject.name)
                    assigned_subjects.append({'id': a.subject.id, 'name': a.subject.name})

        return Response({
            'papers_count': papers_count,
            'assigned_exams_count': assigned_count,
            'students_count': students_count,
            'pending_reviews': pending_reviews,
            'handwritten_graded': handwritten_graded,
            'recent_exams': recent_data,
            'assigned_subjects': assigned_subjects,
        })


class SchoolDashboardStatsView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def get(self, request):
        school = request.user
        teachers_count = User.objects.filter(school=school, role='teacher').count()
        students_count = User.objects.filter(school=school, role='student').count()
        exams_count = UserExam.objects.filter(school=school, status='COMPLETED').count()
        papers_count = ExamPaper.objects.filter(school=school).count()

        recent_activity = UserExam.objects.filter(
            school=school, status='COMPLETED',
        ).select_related('user', 'subject').order_by('-completed_at')[:10]

        activity_data = [{
            'id': e.id,
            'student': e.user.get_full_name() or e.user.username,
            'subject': e.subject.name,
            'score': e.score,
            'percentage': e.percentage,
            'completed_at': e.completed_at,
        } for e in recent_activity]

        return Response({
            'teachers_count': teachers_count,
            'students_count': students_count,
            'exams_count': exams_count,
            'papers_count': papers_count,
            'recent_activity': activity_data,
        })


# ============================================================
# Handwritten Answer Sheet Grading
# ============================================================

def _merge_answer_sheets(files):
    """Merge multiple image/pdf files into a single PDF. Returns a Django InMemoryUploadedFile."""
    import io
    from PIL import Image
    from django.core.files.uploadedfile import InMemoryUploadedFile

    if len(files) == 1:
        files[0].seek(0)
        return files[0]

    # Check if all files are PDFs — use pypdf for lossless PDF merging
    all_pdfs = all(f.name.lower().endswith('.pdf') for f in files)
    if all_pdfs:
        try:
            from pypdf import PdfWriter, PdfReader
            writer = PdfWriter()
            for f in files:
                f.seek(0)
                reader = PdfReader(f)
                for page in reader.pages:
                    writer.add_page(page)
            buf = io.BytesIO()
            writer.write(buf)
            buf.seek(0)
            return InMemoryUploadedFile(
                buf, 'answer_sheet', 'merged.pdf',
                'application/pdf', buf.getbuffer().nbytes, None
            )
        except Exception as e:
            pass  # fall through to PIL path

    # Mixed or image files — convert everything to images and save as PDF
    images = []
    for f in files:
        f.seek(0)
        data = f.read()
        if f.name.lower().endswith('.pdf'):
            # Try to convert PDF pages to images via pypdf + PIL
            try:
                from pypdf import PdfReader
                import tempfile, subprocess, os
                # Use pypdf to extract pages, then render with Pillow via pdf2image if available
                try:
                    from pdf2image import convert_from_bytes
                    pages = convert_from_bytes(data, dpi=150)
                    for page in pages:
                        images.append(page.convert('RGB'))
                    continue
                except ImportError:
                    pass
                # Fallback: just open with PIL (works for single-image PDFs)
                img = Image.open(io.BytesIO(data)).convert('RGB')
                images.append(img)
            except Exception:
                pass
        else:
            try:
                img = Image.open(io.BytesIO(data)).convert('RGB')
                images.append(img)
            except Exception:
                pass

    if not images:
        files[0].seek(0)
        return files[0]

    buf = io.BytesIO()
    images[0].save(buf, format='PDF', save_all=True, append_images=images[1:])
    buf.seek(0)
    return InMemoryUploadedFile(buf, 'answer_sheet', 'merged.pdf', 'application/pdf', buf.getbuffer().nbytes, None)


class HandwrittenExamUploadView(generics.CreateAPIView):
    """Upload a handwritten answer sheet + question paper for AI grading.
    Accepts multiple answer_sheet files (pages) which are merged into one PDF.
    """
    serializer_class = HandwrittenExamUploadSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]
    parser_classes = [MultiPartParser, FormParser]

    def create(self, request, *args, **kwargs):
        answer_sheets = request.FILES.getlist('answer_sheet')
        question_papers = request.FILES.getlist('question_paper')

        # Save the record normally (DRF picks up the last uploaded file for each field)
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user
        school = user if user.role == 'school' else user.school
        instance = serializer.save(school=school, teacher=user)

        # Post-save: if multiple pages were uploaded, merge them and replace the stored file
        if len(answer_sheets) > 1:
            merged = _merge_answer_sheets(answer_sheets)
            if instance.answer_sheet:
                instance.answer_sheet.delete(save=False)
            instance.answer_sheet.save('answer_merged.pdf', merged, save=True)

        if len(question_papers) > 1:
            merged = _merge_answer_sheets(question_papers)
            if instance.question_paper:
                instance.question_paper.delete(save=False)
            instance.question_paper.save('question_merged.pdf', merged, save=True)

        return Response(self.get_serializer(instance).data, status=status.HTTP_201_CREATED)


class HandwrittenExamProcessView(APIView):
    """Start AI grading of a handwritten exam."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def post(self, request, pk):
        user = request.user
        school = user if user.role == 'school' else user.school
        try:
            exam = HandwrittenExam.objects.get(pk=pk, school=school)
        except HandwrittenExam.DoesNotExist:
            return Response({'error': 'Handwritten exam not found'}, status=status.HTTP_404_NOT_FOUND)

        if exam.status == 'PROCESSING':
            return Response({'error': 'Already processing'}, status=status.HTTP_400_BAD_REQUEST)

        include_analysis = str(request.data.get('include_analysis', 'false')).lower() in ('true', '1', 'yes')

        from .handwritten_processor import process_handwritten_exam
        thread = threading.Thread(target=process_handwritten_exam, args=(exam.id, include_analysis))
        thread.daemon = True
        thread.start()

        return Response({'message': 'Grading started', 'id': exam.id}, status=status.HTTP_202_ACCEPTED)


class HandwrittenExamListView(generics.ListAPIView):
    """List all handwritten exams for the teacher's school."""
    serializer_class = HandwrittenExamSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get_queryset(self):
        user = self.request.user
        school = user if user.role == 'school' else user.school
        return HandwrittenExam.objects.filter(school=school).select_related('subject', 'teacher', 'student')


class HandwrittenExamDetailView(generics.RetrieveUpdateAPIView):
    """Get full detail, or PATCH exam_category, for a handwritten exam."""
    serializer_class = HandwrittenExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'student':
            return HandwrittenExam.objects.filter(student=user).select_related('subject', 'teacher', 'student')
        school = user if user.role == 'school' else user.school
        return HandwrittenExam.objects.filter(school=school).select_related('subject', 'teacher', 'student')

    def patch(self, request, *args, **kwargs):
        instance = self.get_object()
        if 'exam_category' in request.data:
            instance.exam_category = request.data['exam_category']
            instance.save(update_fields=['exam_category'])
        return Response({'id': instance.id, 'exam_category': instance.exam_category,
                         'exam_category_display': instance.get_exam_category_display()})


class StudentHandwrittenListView(generics.ListAPIView):
    """List handwritten exam results for the logged-in student."""
    serializer_class = HandwrittenExamSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return HandwrittenExam.objects.filter(
            student=self.request.user, status='GRADED',
        ).select_related('subject', 'teacher', 'student').order_by('-created_at')


class HandwrittenExamDeleteView(generics.DestroyAPIView):
    """Delete a handwritten exam and its files."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get_queryset(self):
        user = self.request.user
        school = user if user.role == 'school' else user.school
        return HandwrittenExam.objects.filter(school=school)

    def perform_destroy(self, instance):
        # Delete associated files
        if instance.answer_sheet:
            instance.answer_sheet.delete(save=False)
        if instance.question_paper:
            instance.question_paper.delete(save=False)
        instance.delete()


# ============================================================
# Generate Analysis on Demand
# ============================================================

class GenerateExamAnalysisView(APIView):
    """Teacher triggers analysis for an already-graded online exam."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def post(self, request, exam_id):
        user = request.user
        school = user if user.role == 'school' else user.school
        try:
            user_exam = UserExam.objects.get(id=exam_id, school=school, status='COMPLETED')
        except UserExam.DoesNotExist:
            return Response({'error': 'Exam not found or not completed'}, status=status.HTTP_404_NOT_FOUND)

        from .analysis import generate_analysis
        try:
            generate_analysis(user_exam)
            return Response({'message': 'Analysis generated successfully'})
        except Exception as e:
            return Response({'error': f'Analysis failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PendingReviewListView(APIView):
    """List exams pending teacher review."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get(self, request):
        user = request.user
        school = user if user.role == 'school' else user.school
        exams = UserExam.objects.filter(
            school=school,
            status='COMPLETED',
            grading_status__in=['PENDING_REVIEW', 'GRADING_MCQ', 'GRADING_DESCRIPTIVE', 'ANALYZING'],
        ).select_related('user', 'subject', 'assigned_exam').order_by('-completed_at')

        data = [{
            'id': e.id,
            'student': e.user.get_full_name() or e.user.username,
            'profile_photo': e.user.profile_photo.url if e.user.profile_photo else None,
            'subject': e.subject.name if e.subject else 'N/A',            'exam_title': e.assigned_exam.title if e.assigned_exam else None,
            'total_questions': e.total_questions,
            'completed_at': e.completed_at,
            'grading_status': e.grading_status,
        } for e in exams]

        return Response(data)


class TeacherGradeExamView(APIView):
    """Teacher triggers grading for a student-submitted online exam."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def post(self, request, exam_id):
        user = request.user
        school = user if user.role == 'school' else user.school
        include_analysis = str(request.data.get('include_analysis', 'false')).lower() in ('true', '1', 'yes')

        try:
            user_exam = UserExam.objects.get(id=exam_id, school=school, status='COMPLETED')
        except UserExam.DoesNotExist:
            return Response({'error': 'Exam not found'}, status=status.HTTP_404_NOT_FOUND)

        if user_exam.grading_status not in ('PENDING_REVIEW', 'FAILED'):
            return Response({'error': 'Exam is not pending review'}, status=status.HTTP_400_BAD_REQUEST)

        user_exam.grading_status = 'GRADING_MCQ'
        user_exam.save()

        thread = threading.Thread(
            target=grade_exam_async, args=(user_exam.id, include_analysis)
        )
        thread.daemon = True
        thread.start()

        return Response({'message': 'Grading started', 'exam_id': user_exam.id})


# ============================================================
# Teacher Analytics
# ============================================================

class TeacherAnalyticsView(APIView):
    """Unified analytics across online exams (UserExam) and handwritten exams."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def get(self, request):
        user = request.user
        school = user if user.role == 'school' else user.school

        period = int(request.query_params.get('period', 30))
        subject_id = request.query_params.get('subject_id')

        # Cutoff date
        if period > 0:
            cutoff = timezone.now() - timedelta(days=period)
        else:
            cutoff = None

        # --- Base querysets ---
        online_qs = UserExam.objects.filter(
            school=school,
            status='COMPLETED',
            grading_status='COMPLETED',
        )
        handwritten_qs = HandwrittenExam.objects.filter(
            school=school,
            status='GRADED',
        )

        if cutoff:
            online_qs = online_qs.filter(completed_at__gte=cutoff)
            handwritten_qs = handwritten_qs.filter(created_at__gte=cutoff)

        if subject_id:
            online_qs = online_qs.filter(subject_id=subject_id)
            handwritten_qs = handwritten_qs.filter(subject_id=subject_id)

        # --- Overview ---
        online_count = online_qs.count()
        handwritten_count = handwritten_qs.count()
        total_exams = online_count + handwritten_count

        online_students = set(online_qs.values_list('user_id', flat=True))
        hw_students = set(handwritten_qs.exclude(student__isnull=True).values_list('student_id', flat=True))
        total_students = len(online_students | hw_students)

        online_avg = online_qs.aggregate(avg=Avg('percentage'))['avg'] or 0
        hw_avg = handwritten_qs.aggregate(avg=Avg('percentage'))['avg'] or 0
        if total_exams > 0:
            average_percentage = round(
                (online_avg * online_count + hw_avg * handwritten_count) / total_exams, 1
            )
        else:
            average_percentage = 0

        pass_threshold = 40
        online_pass = online_qs.filter(percentage__gte=pass_threshold).count()
        online_fail = online_count - online_pass
        hw_pass = handwritten_qs.filter(percentage__gte=pass_threshold).count()
        hw_fail = handwritten_count - hw_pass
        pass_count = online_pass + hw_pass
        fail_count = online_fail + hw_fail
        pass_rate = round(pass_count / total_exams * 100, 1) if total_exams > 0 else 0

        overview = {
            'total_exams': total_exams,
            'total_students': total_students,
            'online_exams': online_count,
            'handwritten_exams': handwritten_count,
            'average_percentage': average_percentage,
            'pass_count': pass_count,
            'fail_count': fail_count,
            'pass_rate': pass_rate,
        }

        # --- Trends ---
        if period <= 14:
            trunc_fn = TruncDay
        elif period <= 90:
            trunc_fn = TruncWeek
        else:
            trunc_fn = TruncMonth

        online_trends = (
            online_qs.annotate(period=trunc_fn('completed_at'))
            .values('period')
            .annotate(avg=Avg('percentage'), count=Count('id'))
            .order_by('period')
        )
        hw_trends = (
            handwritten_qs.annotate(period=trunc_fn('created_at'))
            .values('period')
            .annotate(avg=Avg('percentage'), count=Count('id'))
            .order_by('period')
        )

        # Merge trends by period
        trend_map = {}
        for t in online_trends:
            key = t['period'].isoformat() if t['period'] else 'unknown'
            trend_map[key] = {
                'period': key,
                'online_avg': round(t['avg'] or 0, 1),
                'handwritten_avg': 0,
                'exam_count': t['count'],
            }
        for t in hw_trends:
            key = t['period'].isoformat() if t['period'] else 'unknown'
            if key in trend_map:
                trend_map[key]['handwritten_avg'] = round(t['avg'] or 0, 1)
                trend_map[key]['exam_count'] += t['count']
            else:
                trend_map[key] = {
                    'period': key,
                    'online_avg': 0,
                    'handwritten_avg': round(t['avg'] or 0, 1),
                    'exam_count': t['count'],
                }
        for entry in trend_map.values():
            vals = []
            if entry['online_avg']:
                vals.append(entry['online_avg'])
            if entry['handwritten_avg']:
                vals.append(entry['handwritten_avg'])
            entry['combined_avg'] = round(sum(vals) / len(vals), 1) if vals else 0

        trends = sorted(trend_map.values(), key=lambda x: x['period'])

        # --- Subject breakdown ---
        subject_online = (
            online_qs.values('subject__name', 'subject_id')
            .annotate(
                count=Count('id'),
                avg=Avg('percentage'),
                highest=Max('percentage'),
                lowest=Min('percentage'),
            )
        )
        subject_hw = (
            handwritten_qs.values('subject__name', 'subject_id')
            .annotate(
                count=Count('id'),
                avg=Avg('percentage'),
                highest=Max('percentage'),
                lowest=Min('percentage'),
            )
        )

        subj_map = {}
        for s in subject_online:
            name = s['subject__name']
            subj_map[name] = {
                'subject_name': name,
                'online_count': s['count'],
                'handwritten_count': 0,
                'total_exams': s['count'],
                'average_percentage': round(s['avg'] or 0, 1),
                'highest_score': round(s['highest'] or 0, 1),
                'lowest_score': round(s['lowest'] or 0, 1),
                '_online_avg': s['avg'] or 0,
                '_online_count': s['count'],
            }
            # Pass rate per subject
            passed = online_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
            subj_map[name]['pass_rate'] = round(passed / s['count'] * 100, 1) if s['count'] > 0 else 0

        for s in subject_hw:
            name = s['subject__name']
            if name in subj_map:
                entry = subj_map[name]
                entry['handwritten_count'] = s['count']
                entry['total_exams'] += s['count']
                entry['highest_score'] = max(entry['highest_score'], round(s['highest'] or 0, 1))
                entry['lowest_score'] = min(entry['lowest_score'], round(s['lowest'] or 0, 1))
                # Recalculate weighted avg
                total = entry['_online_count'] + s['count']
                entry['average_percentage'] = round(
                    (entry['_online_avg'] * entry['_online_count'] + (s['avg'] or 0) * s['count']) / total, 1
                ) if total > 0 else 0
                # Recalculate pass rate
                hw_passed = handwritten_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
                online_passed = online_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
                entry['pass_rate'] = round((online_passed + hw_passed) / total * 100, 1) if total > 0 else 0
            else:
                hw_passed = handwritten_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
                subj_map[name] = {
                    'subject_name': name,
                    'online_count': 0,
                    'handwritten_count': s['count'],
                    'total_exams': s['count'],
                    'average_percentage': round(s['avg'] or 0, 1),
                    'highest_score': round(s['highest'] or 0, 1),
                    'lowest_score': round(s['lowest'] or 0, 1),
                    'pass_rate': round(hw_passed / s['count'] * 100, 1) if s['count'] > 0 else 0,
                }

        # Remove internal keys
        subject_breakdown = []
        for entry in subj_map.values():
            entry.pop('_online_avg', None)
            entry.pop('_online_count', None)
            subject_breakdown.append(entry)

        # --- Student rankings (online only – handwritten may not have student FK) ---
        student_stats = (
            online_qs.values('user_id', 'user__first_name', 'user__last_name', 'user__username')
            .annotate(
                total_exams=Count('id'),
                average_percentage=Avg('percentage'),
                highest_percentage=Max('percentage'),
            )
            .order_by('-average_percentage')[:20]
        )

        student_rankings = []
        for rank, s in enumerate(student_stats, 1):
            name = f"{s['user__first_name']} {s['user__last_name']}".strip() or s['user__username']
            # Determine trend from last 2 exams
            last_two = list(
                online_qs.filter(user_id=s['user_id'])
                .order_by('-completed_at')
                .values_list('percentage', flat=True)[:2]
            )
            if len(last_two) >= 2:
                if last_two[0] > last_two[1] + 2:
                    trend = 'up'
                elif last_two[0] < last_two[1] - 2:
                    trend = 'down'
                else:
                    trend = 'stable'
            else:
                trend = 'stable'

            student_rankings.append({
                'rank': rank,
                'student_name': name,
                'total_exams': s['total_exams'],
                'average_percentage': round(s['average_percentage'] or 0, 1),
                'highest_percentage': round(s['highest_percentage'] or 0, 1),
                'latest_trend': trend,
            })

        # --- Exam type comparison ---
        online_type_stats = online_qs.aggregate(
            avg=Avg('percentage'),
            mcq_avg=Avg('mcq_score'),
            short_avg=Avg('short_answer_score'),
            long_avg=Avg('long_answer_score'),
        )
        exam_type_comparison = {
            'online': {
                'count': online_count,
                'average_percentage': round(online_type_stats['avg'] or 0, 1),
                'mcq_avg': round(online_type_stats['mcq_avg'] or 0, 1),
                'short_avg': round(online_type_stats['short_avg'] or 0, 1),
                'long_avg': round(online_type_stats['long_avg'] or 0, 1),
            },
            'handwritten': {
                'count': handwritten_count,
                'average_percentage': round(hw_avg, 1),
            },
        }

        # --- Recent performance (last 10 across both types) ---
        recent_online = list(
            online_qs.select_related('user', 'subject')
            .order_by('-completed_at')[:10]
        )
        recent_hw = list(
            handwritten_qs.select_related('student', 'subject')
            .order_by('-created_at')[:10]
        )

        combined = []
        for e in recent_online:
            combined.append({
                'type': 'online',
                'student': e.user.get_full_name() or e.user.username,
                'subject': e.subject.name if e.subject else 'N/A',
                'score': e.score,
                'percentage': e.percentage,
                'date': e.completed_at,
            })
        for e in recent_hw:
            combined.append({
                'type': 'handwritten',
                'student': (e.student.get_full_name() if e.student else e.student_name) or 'Unknown',
                'subject': e.subject.name if e.subject else 'N/A',
                'score': e.obtained_marks,
                'percentage': e.percentage,
                'date': e.created_at,
            })
        combined.sort(key=lambda x: x['date'] or timezone.now(), reverse=True)
        recent_performance = combined[:10]

        # --- Subjects list for filter dropdown ---
        subjects = list(
            Subject.objects.filter(is_active=True).values('id', 'name').order_by('name')
        )

        return Response({
            'overview': overview,
            'trends': trends,
            'subject_breakdown': subject_breakdown,
            'student_rankings': student_rankings,
            'exam_type_comparison': exam_type_comparison,
            'recent_performance': recent_performance,
            'subjects': subjects,
        })


# ============================================================
# Student Analytics
# ============================================================

class StudentAnalyticsView(APIView):
    """Analytics for a student's own exam performance."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        period = int(request.query_params.get('period', 30))
        subject_id = request.query_params.get('subject_id')

        if period > 0:
            cutoff = timezone.now() - timedelta(days=period)
        else:
            cutoff = None

        # --- Base querysets (student's own data) ---
        online_qs = UserExam.objects.filter(
            user=user,
            status='COMPLETED',
            grading_status='COMPLETED',
        )
        handwritten_qs = HandwrittenExam.objects.filter(
            student=user,
            status='GRADED',
        )

        if cutoff:
            online_qs = online_qs.filter(completed_at__gte=cutoff)
            handwritten_qs = handwritten_qs.filter(created_at__gte=cutoff)

        if subject_id:
            online_qs = online_qs.filter(subject_id=subject_id)
            handwritten_qs = handwritten_qs.filter(subject_id=subject_id)

        # --- Overview ---
        online_count = online_qs.count()
        handwritten_count = handwritten_qs.count()
        total_exams = online_count + handwritten_count

        online_agg = online_qs.aggregate(
            avg=Avg('percentage'), best=Max('percentage'), lowest=Min('percentage'),
        )
        hw_agg = handwritten_qs.aggregate(
            avg=Avg('percentage'), best=Max('percentage'), lowest=Min('percentage'),
        )

        online_avg = online_agg['avg'] or 0
        hw_avg = hw_agg['avg'] or 0
        if total_exams > 0:
            average_percentage = round(
                (online_avg * online_count + hw_avg * handwritten_count) / total_exams, 1
            )
        else:
            average_percentage = 0

        best_scores = [v for v in [online_agg['best'], hw_agg['best']] if v is not None]
        best_score = round(max(best_scores), 1) if best_scores else 0

        pass_threshold = 40
        online_pass = online_qs.filter(percentage__gte=pass_threshold).count()
        hw_pass = handwritten_qs.filter(percentage__gte=pass_threshold).count()
        pass_count = online_pass + hw_pass
        fail_count = total_exams - pass_count
        pass_rate = round(pass_count / total_exams * 100, 1) if total_exams > 0 else 0

        overview = {
            'total_exams': total_exams,
            'online_exams': online_count,
            'handwritten_exams': handwritten_count,
            'average_percentage': average_percentage,
            'best_score': best_score,
            'pass_count': pass_count,
            'fail_count': fail_count,
            'pass_rate': pass_rate,
        }

        # --- Trends ---
        if period <= 14:
            trunc_fn = TruncDay
        elif period <= 90:
            trunc_fn = TruncWeek
        else:
            trunc_fn = TruncMonth

        online_trends = (
            online_qs.annotate(period=trunc_fn('completed_at'))
            .values('period')
            .annotate(avg=Avg('percentage'), count=Count('id'))
            .order_by('period')
        )
        hw_trends = (
            handwritten_qs.annotate(period=trunc_fn('created_at'))
            .values('period')
            .annotate(avg=Avg('percentage'), count=Count('id'))
            .order_by('period')
        )

        trend_map = {}
        for t in online_trends:
            key = t['period'].isoformat() if t['period'] else 'unknown'
            trend_map[key] = {
                'period': key,
                'online_avg': round(t['avg'] or 0, 1),
                'handwritten_avg': 0,
                'exam_count': t['count'],
            }
        for t in hw_trends:
            key = t['period'].isoformat() if t['period'] else 'unknown'
            if key in trend_map:
                trend_map[key]['handwritten_avg'] = round(t['avg'] or 0, 1)
                trend_map[key]['exam_count'] += t['count']
            else:
                trend_map[key] = {
                    'period': key,
                    'online_avg': 0,
                    'handwritten_avg': round(t['avg'] or 0, 1),
                    'exam_count': t['count'],
                }
        for entry in trend_map.values():
            vals = []
            if entry['online_avg']:
                vals.append(entry['online_avg'])
            if entry['handwritten_avg']:
                vals.append(entry['handwritten_avg'])
            entry['combined_avg'] = round(sum(vals) / len(vals), 1) if vals else 0

        trends = sorted(trend_map.values(), key=lambda x: x['period'])

        # --- Subject breakdown ---
        subject_online = (
            online_qs.values('subject__name', 'subject_id')
            .annotate(
                count=Count('id'), avg=Avg('percentage'),
                highest=Max('percentage'), lowest=Min('percentage'),
            )
        )
        subject_hw = (
            handwritten_qs.values('subject__name', 'subject_id')
            .annotate(
                count=Count('id'), avg=Avg('percentage'),
                highest=Max('percentage'), lowest=Min('percentage'),
            )
        )

        subj_map = {}
        for s in subject_online:
            name = s['subject__name']
            passed = online_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
            subj_map[name] = {
                'subject_name': name,
                'online_count': s['count'],
                'handwritten_count': 0,
                'total_exams': s['count'],
                'average_percentage': round(s['avg'] or 0, 1),
                'highest_score': round(s['highest'] or 0, 1),
                'lowest_score': round(s['lowest'] or 0, 1),
                'pass_rate': round(passed / s['count'] * 100, 1) if s['count'] > 0 else 0,
                '_online_avg': s['avg'] or 0,
                '_online_count': s['count'],
            }
        for s in subject_hw:
            name = s['subject__name']
            if name in subj_map:
                entry = subj_map[name]
                entry['handwritten_count'] = s['count']
                entry['total_exams'] += s['count']
                entry['highest_score'] = max(entry['highest_score'], round(s['highest'] or 0, 1))
                entry['lowest_score'] = min(entry['lowest_score'], round(s['lowest'] or 0, 1))
                total = entry['_online_count'] + s['count']
                entry['average_percentage'] = round(
                    (entry['_online_avg'] * entry['_online_count'] + (s['avg'] or 0) * s['count']) / total, 1
                ) if total > 0 else 0
                hw_passed = handwritten_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
                online_passed = online_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
                entry['pass_rate'] = round((online_passed + hw_passed) / total * 100, 1) if total > 0 else 0
            else:
                hw_passed = handwritten_qs.filter(subject__name=name, percentage__gte=pass_threshold).count()
                subj_map[name] = {
                    'subject_name': name,
                    'online_count': 0,
                    'handwritten_count': s['count'],
                    'total_exams': s['count'],
                    'average_percentage': round(s['avg'] or 0, 1),
                    'highest_score': round(s['highest'] or 0, 1),
                    'lowest_score': round(s['lowest'] or 0, 1),
                    'pass_rate': round(hw_passed / s['count'] * 100, 1) if s['count'] > 0 else 0,
                }

        subject_breakdown = []
        for entry in subj_map.values():
            entry.pop('_online_avg', None)
            entry.pop('_online_count', None)
            subject_breakdown.append(entry)

        # --- Question type analysis (online exams only) ---
        type_stats = online_qs.aggregate(
            mcq_avg=Avg('mcq_score'),
            short_avg=Avg('short_answer_score'),
            long_avg=Avg('long_answer_score'),
            avg_correct=Avg('correct_answers'),
            avg_wrong=Avg('wrong_answers'),
            avg_unanswered=Avg('unanswered'),
        )
        question_type_analysis = {
            'mcq_avg': round(type_stats['mcq_avg'] or 0, 1),
            'short_avg': round(type_stats['short_avg'] or 0, 1),
            'long_avg': round(type_stats['long_avg'] or 0, 1),
            'avg_correct': round(type_stats['avg_correct'] or 0, 1),
            'avg_wrong': round(type_stats['avg_wrong'] or 0, 1),
            'avg_unanswered': round(type_stats['avg_unanswered'] or 0, 1),
        }

        # --- Recent exams (last 10 across both types) ---
        recent_online = list(
            online_qs.select_related('subject')
            .order_by('-completed_at')[:10]
        )
        recent_hw = list(
            handwritten_qs.select_related('subject')
            .order_by('-created_at')[:10]
        )

        combined = []
        for e in recent_online:
            combined.append({
                'id': e.id,
                'type': 'online',
                'subject': e.subject.name if e.subject else 'N/A',
                'score': e.score,
                'percentage': e.percentage,
                'mcq_score': e.mcq_score,
                'short_answer_score': e.short_answer_score,
                'long_answer_score': e.long_answer_score,
                'date': e.completed_at,
            })
        for e in recent_hw:
            combined.append({
                'id': e.id,
                'type': 'handwritten',
                'subject': e.subject.name if e.subject else 'N/A',
                'score': e.obtained_marks,
                'percentage': e.percentage,
                'date': e.created_at,
            })
        combined.sort(key=lambda x: x['date'] or timezone.now(), reverse=True)
        recent_exams = combined[:10]

        # --- Subjects list for filter ---
        subjects = list(
            Subject.objects.filter(is_active=True).values('id', 'name').order_by('name')
        )

        return Response({
            'overview': overview,
            'trends': trends,
            'subject_breakdown': subject_breakdown,
            'question_type_analysis': question_type_analysis,
            'recent_exams': recent_exams,
            'subjects': subjects,
        })


class ProgressCardView(generics.GenericAPIView):
    """
    Returns a student's exam results grouped by exam_category for the progress card.

    - Student: GET /api/progress-card/  → own results
    - Teacher/School: GET /api/progress-card/?student_id=<id>  → specific student

    Optional filters: exam_category, date_from (YYYY-MM-DD), date_to, subject_id
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, *args, **kwargs):
        user = request.user
        User = get_user_model()

        # Determine target student
        if user.role in ('school', 'teacher'):
            student_id = request.query_params.get('student_id')
            if not student_id:
                return Response({'error': 'student_id is required'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                student = User.objects.get(id=student_id, role='student')
            except User.DoesNotExist:
                return Response({'error': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
            # Permission check
            school = user if user.role == 'school' else user.school
            if student.school != school:
                return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        else:
            student = user

        exam_category = request.query_params.get('exam_category')
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        subject_id = request.query_params.get('subject_id')

        results = []

        # --- Online (UserExam) results ---
        ue_qs = UserExam.objects.filter(
            user=student,
            status='COMPLETED',
            assigned_exam__isnull=False,
        ).exclude(
            assigned_exam__exam_category='',
        ).select_related('subject', 'assigned_exam', 'subject__exam_type')

        if exam_category:
            ue_qs = ue_qs.filter(assigned_exam__exam_category=exam_category)
        if date_from:
            ue_qs = ue_qs.filter(completed_at__date__gte=date_from)
        if date_to:
            ue_qs = ue_qs.filter(completed_at__date__lte=date_to)
        if subject_id:
            ue_qs = ue_qs.filter(subject_id=subject_id)

        for ue in ue_qs.order_by('subject__name', 'assigned_exam__exam_category', 'completed_at'):
            results.append({
                'source': 'online',
                'subject_id': ue.subject_id,
                'subject_name': ue.subject.name,
                'exam_type_name': ue.subject.exam_type.name if ue.subject.exam_type_id else '',
                'exam_category': ue.assigned_exam.exam_category,
                'exam_category_display': ue.assigned_exam.get_exam_category_display(),
                'title': ue.assigned_exam.title,
                'score': ue.score,
                'total_marks': ue.assigned_exam.total_marks,
                'percentage': round(ue.percentage, 1),
                'completed_at': ue.completed_at,
            })

        # --- Handwritten results ---
        hw_qs = HandwrittenExam.objects.filter(
            student=student,
            status='GRADED',
        ).exclude(
            exam_category='',
        ).select_related('subject', 'subject__exam_type')

        if exam_category:
            hw_qs = hw_qs.filter(exam_category=exam_category)
        if date_from:
            hw_qs = hw_qs.filter(created_at__date__gte=date_from)
        if date_to:
            hw_qs = hw_qs.filter(created_at__date__lte=date_to)
        if subject_id:
            hw_qs = hw_qs.filter(subject_id=subject_id)

        for hw in hw_qs.order_by('subject__name', 'exam_category', 'created_at'):
            results.append({
                'source': 'handwritten',
                'subject_id': hw.subject_id,
                'subject_name': hw.subject.name,
                'exam_type_name': hw.subject.exam_type.name if hw.subject.exam_type_id else '',
                'exam_category': hw.exam_category,
                'exam_category_display': hw.get_exam_category_display(),
                'title': hw.title,
                'score': hw.obtained_marks,
                'total_marks': hw.total_marks,
                'percentage': round(hw.percentage, 1) if hw.percentage is not None else 0,
                'completed_at': hw.created_at,
            })

        return Response({
            'student': {
                'id': student.id,
                'name': student.get_full_name() or student.username,
                'grade': getattr(student, 'grade', '') or '',
                'section': getattr(student, 'section', '') or '',
            },
            'results': results,
        })
