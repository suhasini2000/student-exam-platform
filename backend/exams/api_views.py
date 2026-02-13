import threading

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Count, Q
from django.utils import timezone
from django.contrib.auth import get_user_model

from .models import (
    ExamType, Subject, Chapter, Question, UserExam, UserAnswer,
    ExamPaper, AssignedExam, TeacherAssignment,
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
)
from .paper_generator import generate_paper
from .grading import grade_exam_async
from accounts.permissions import IsSchoolOrTeacher, IsTeacherUser, IsSchoolUser

User = get_user_model()


# ============================================================
# Existing views (updated with school-aware filtering)
# ============================================================

class ExamTypeListView(generics.ListAPIView):
    serializer_class = ExamTypeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ExamType.objects.filter(is_active=True).annotate(
            subject_count=Count('subjects')
        )


class SubjectListView(generics.ListAPIView):
    serializer_class = SubjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Subject.objects.filter(is_active=True).annotate(
            chapter_count=Count('chapters'),
            question_count=Count('questions'),
        )
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
        if not name or not code:
            return Response({'error': 'Name and code are required'}, status=status.HTTP_400_BAD_REQUEST)

        # Use school's board as exam type, or create one
        board = request.user.board or 'CBSE'
        exam_type, _ = ExamType.objects.get_or_create(
            code=f'{board}10',
            defaults={'name': f'{board} Class 10', 'is_active': True},
        )

        if Subject.objects.filter(exam_type=exam_type, code=code).exists():
            return Response({'error': f'Subject with code {code} already exists'}, status=status.HTTP_400_BAD_REQUEST)

        subject = Subject.objects.create(
            exam_type=exam_type,
            name=name,
            code=code,
            description=request.data.get('description', ''),
            duration_minutes=int(request.data.get('duration_minutes', 90)),
            total_marks=int(request.data.get('total_marks', 50)),
        )
        return Response({
            'id': subject.id, 'name': subject.name, 'code': subject.code,
            'message': 'Subject created successfully',
        }, status=status.HTTP_201_CREATED)


class SubjectDeleteView(APIView):
    """School deletes a subject."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def delete(self, request, pk):
        try:
            subject = Subject.objects.get(pk=pk)
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

    # Get school context for question filtering
    school = request.user.get_school_account() if hasattr(request.user, 'get_school_account') else None

    # Generate paper
    questions = generate_paper(subject, chapter, school=school)
    if not questions:
        return Response(
            {'error': 'Not enough questions available to generate an exam'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Calculate total time
    total_time = sum(q.time_per_question_seconds for q in questions)

    # Create UserExam
    user_exam = UserExam.objects.create(
        user=request.user,
        subject=subject,
        chapter=chapter,
        school=school,
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
        'total_marks': 50,
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
    user_exam.grading_status = 'GRADING_MCQ'
    user_exam.save()

    # Start grading in background thread
    thread = threading.Thread(target=grade_exam_async, args=(user_exam.id,))
    thread.daemon = True
    thread.start()

    return Response({'message': 'Exam submitted, grading started', 'exam_id': user_exam.id})


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

    serializer = UserExamDetailSerializer(user_exam)
    return Response(serializer.data)


class ExamHistoryView(generics.ListAPIView):
    serializer_class = UserExamListSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return UserExam.objects.filter(
            user=self.request.user,
            status='COMPLETED',
        ).select_related('subject__exam_type', 'chapter').order_by('-completed_at')


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

        # Run in background
        from .paper_processor import generate_questions_from_paper
        thread = threading.Thread(target=generate_questions_from_paper, args=(paper.id,))
        thread.daemon = True
        thread.start()

        return Response({'message': 'Question generation started', 'paper_id': paper.id})


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

        if result['success']:
            return Response({
                'message': f'Successfully generated {result["questions_count"]} questions',
                'questions_count': result['questions_count'],
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': result['error']}, status=status.HTTP_400_BAD_REQUEST)


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

        # Run generation in background thread
        from .paper_processor import generate_questions_from_instructions
        thread = threading.Thread(
            target=generate_questions_from_instructions,
            args=(subject, chapters, topics, marks_distribution, total_marks, school, user),
        )
        thread.daemon = True
        thread.start()

        return Response({
            'message': 'Question generation from instructions started',
            'subject': subject.name,
            'total_marks': total_marks,
            'num_mcq': num_mcq,
            'num_short': num_short,
            'num_long': num_long,
        }, status=status.HTTP_202_ACCEPTED)


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
        ).select_related('teacher', 'subject').prefetch_related('students')
        teacher_id = self.request.query_params.get('teacher')
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)
        return qs


class TeacherAssignmentCreateView(APIView):
    """School creates/updates a teacher-subject-students mapping."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def post(self, request):
        serializer = TeacherAssignmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        school = request.user
        teacher_id = serializer.validated_data['teacher_id']
        subject_id = serializer.validated_data['subject_id']
        student_ids = serializer.validated_data.get('student_ids', [])

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

        # Create or update assignment
        assignment, created = TeacherAssignment.objects.get_or_create(
            school=school,
            teacher=teacher,
            subject=subject,
        )

        # Set students (only those in the school)
        if student_ids:
            students = User.objects.filter(id__in=student_ids, school=school, role='student')
            assignment.students.set(students)
        else:
            assignment.students.clear()

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
    """Teacher views their own subject+student assignments."""
    serializer_class = TeacherAssignmentSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherUser]

    def get_queryset(self):
        return TeacherAssignment.objects.filter(
            teacher=self.request.user,
        ).select_related('teacher', 'subject').prefetch_related('students')


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
        students_count = User.objects.filter(school=school, role='student').count()
        pending_reviews = UserExam.objects.filter(
            school=school,
            status='COMPLETED',
            grading_status='COMPLETED',
        ).exclude(
            answers__teacher_reviewed=True,
        ).distinct().count()

        # Recent exams by students
        recent_exams = UserExam.objects.filter(
            school=school, status='COMPLETED',
        ).select_related('user', 'subject').order_by('-completed_at')[:10]

        recent_data = [{
            'id': e.id,
            'student': e.user.get_full_name() or e.user.username,
            'subject': e.subject.name,
            'score': e.score,
            'percentage': e.percentage,
            'completed_at': e.completed_at,
        } for e in recent_exams]

        return Response({
            'papers_count': papers_count,
            'assigned_exams_count': assigned_count,
            'students_count': students_count,
            'pending_reviews': pending_reviews,
            'recent_exams': recent_data,
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
