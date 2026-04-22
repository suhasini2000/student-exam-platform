"""
URL configuration for exam_platform project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from accounts.api_views import (
    RegisterView, ProfileView,
    SchoolCreateTeacherView, SchoolCreateStudentView,
    SchoolMembersListView, TeacherStudentListView,
    UpdateMemberView, DeleteMemberView, site_images_view,
    site_image_upload_view, site_image_delete_view,
)
from exams.api_views import (
    ExamTypeListView, SubjectListView, ChapterListView,
    SubjectCreateView, SubjectUpdateView, SubjectDeleteView,
    ChapterCreateView, ChapterUpdateView, ChapterDeleteView,
    generate_exam, save_answer, submit_exam,
    grading_status, exam_result, ExamHistoryView,
    ExamPaperUploadView, ExamPaperListView, ExamPaperDeleteView,
    GenerateQuestionsFromPaperView, CreatePaperFromPapersView,
    GenerateFromInstructionsView,
    AssignedExamCreateView, AssignedExamListView, AssignedExamDeleteView,
    AssignedExamSubmissionsView,
    StudentAssignedExamsView, TeacherReviewView,
    TeacherDashboardStatsView, SchoolDashboardStatsView,
    TeacherAssignmentListView, TeacherAssignmentCreateView,
    TeacherAssignmentDeleteView, TeacherMyAssignmentsView,
    HandwrittenExamUploadView, HandwrittenExamProcessView,
    HandwrittenExamListView, HandwrittenExamDetailView,
    HandwrittenExamDeleteView, StudentHandwrittenListView,
    TeacherAnalyticsView,
    StudentAnalyticsView,
    GenerateExamAnalysisView,
    TeacherGradeExamView,
    PendingReviewListView,
    TeacherQuestionListView,
    ProgressCardView,
)

urlpatterns = [
    path('admin/', admin.site.urls),

    # JWT Auth
    path('api/auth/register/', RegisterView.as_view(), name='api-register'),
    path('api/auth/login/', TokenObtainPairView.as_view(), name='api-login'),
    path('api/auth/refresh/', TokenRefreshView.as_view(), name='api-refresh'),
    path('api/auth/profile/', ProfileView.as_view(), name='api-profile'),

    # School/Teacher account management
    path('api/auth/create-teacher/', SchoolCreateTeacherView.as_view(), name='api-create-teacher'),
    path('api/auth/create-student/', SchoolCreateStudentView.as_view(), name='api-create-student'),
    path('api/auth/members/', SchoolMembersListView.as_view(), name='api-members'),
    path('api/auth/my-students/', TeacherStudentListView.as_view(), name='api-my-students'),
    path('api/auth/members/<int:pk>/', DeleteMemberView.as_view(), name='api-delete-member'),
    path('api/auth/members/<int:pk>/update/', UpdateMemberView.as_view(), name='api-update-member'),

    # Exam browsing & subject/chapter management
    path('api/exam-types/', ExamTypeListView.as_view(), name='api-exam-types'),
    path('api/subjects/', SubjectListView.as_view(), name='api-subjects'),
    path('api/subjects/create/', SubjectCreateView.as_view(), name='api-subject-create'),
    path('api/subjects/<int:pk>/', SubjectDeleteView.as_view(), name='api-subject-delete'),
    path('api/subjects/<int:pk>/update/', SubjectUpdateView.as_view(), name='api-subject-update'),
    path('api/chapters/', ChapterListView.as_view(), name='api-chapters'),
    path('api/chapters/create/', ChapterCreateView.as_view(), name='api-chapter-create'),
    path('api/chapters/<int:pk>/', ChapterDeleteView.as_view(), name='api-chapter-delete'),
    path('api/chapters/<int:pk>/update/', ChapterUpdateView.as_view(), name='api-chapter-update'),

    # Exam actions
    path('api/exams/generate/', generate_exam, name='api-generate-exam'),
    path('api/exams/<int:exam_id>/answer/', save_answer, name='api-save-answer'),
    path('api/exams/<int:exam_id>/submit/', submit_exam, name='api-submit-exam'),
    path('api/exams/<int:exam_id>/grading-status/', grading_status, name='api-grading-status'),
    path('api/exams/<int:exam_id>/result/', exam_result, name='api-exam-result'),
    path('api/exams/history/', ExamHistoryView.as_view(), name='api-exam-history'),

    # Teacher exam paper management
    path('api/exams/papers/upload/', ExamPaperUploadView.as_view(), name='api-paper-upload'),
    path('api/exams/papers/', ExamPaperListView.as_view(), name='api-paper-list'),
    path('api/exams/papers/<int:pk>/generate/', GenerateQuestionsFromPaperView.as_view(), name='api-paper-generate'),
    path('api/exams/papers/<int:pk>/', ExamPaperDeleteView.as_view(), name='api-paper-delete'),
    path('api/exams/papers/create-from-papers/', CreatePaperFromPapersView.as_view(), name='api-create-from-papers'),
    path('api/exams/generate-from-instructions/', GenerateFromInstructionsView.as_view(), name='api-generate-instructions'),

    # Question browsing (for manual selection)
    path('api/questions/', TeacherQuestionListView.as_view(), name='api-questions'),

    # Assigned exams
    path('api/exams/assigned/create/', AssignedExamCreateView.as_view(), name='api-assigned-create'),
    path('api/exams/assigned/', AssignedExamListView.as_view(), name='api-assigned-list'),
    path('api/exams/assigned/<int:pk>/', AssignedExamDeleteView.as_view(), name='api-assigned-delete'),
    path('api/exams/assigned/<int:pk>/submissions/', AssignedExamSubmissionsView.as_view(), name='api-assigned-submissions'),
    path('api/exams/assigned/my/', StudentAssignedExamsView.as_view(), name='api-assigned-my'),

    # Teacher review
    path('api/exams/review/<int:exam_id>/', TeacherReviewView.as_view(), name='api-teacher-review'),
    path('api/exams/<int:exam_id>/analyze/', GenerateExamAnalysisView.as_view(), name='api-generate-analysis'),
    path('api/exams/<int:exam_id>/grade/', TeacherGradeExamView.as_view(), name='api-teacher-grade-exam'),
    path('api/exams/pending-review/', PendingReviewListView.as_view(), name='api-pending-review'),

    # Teacher assignments (school manages)
    path('api/assignments/', TeacherAssignmentListView.as_view(), name='api-assignments'),
    path('api/assignments/create/', TeacherAssignmentCreateView.as_view(), name='api-assignment-create'),
    path('api/assignments/<int:pk>/', TeacherAssignmentDeleteView.as_view(), name='api-assignment-delete'),
    path('api/assignments/my/', TeacherMyAssignmentsView.as_view(), name='api-my-assignments'),

    # Handwritten answer sheet grading
    path('api/handwritten/upload/', HandwrittenExamUploadView.as_view(), name='api-handwritten-upload'),
    path('api/handwritten/<int:pk>/process/', HandwrittenExamProcessView.as_view(), name='api-handwritten-process'),
    path('api/handwritten/', HandwrittenExamListView.as_view(), name='api-handwritten-list'),
    path('api/handwritten/<int:pk>/', HandwrittenExamDetailView.as_view(), name='api-handwritten-detail'),
    path('api/handwritten/<int:pk>/delete/', HandwrittenExamDeleteView.as_view(), name='api-handwritten-delete'),
    path('api/handwritten/my/', StudentHandwrittenListView.as_view(), name='api-student-handwritten'),

    # Dashboard stats
    path('api/dashboard/teacher/', TeacherDashboardStatsView.as_view(), name='api-teacher-dashboard'),
    path('api/dashboard/school/', SchoolDashboardStatsView.as_view(), name='api-school-dashboard'),

    # Analytics
    path('api/analytics/teacher/', TeacherAnalyticsView.as_view(), name='api-teacher-analytics'),
    path('api/analytics/student/', StudentAnalyticsView.as_view(), name='api-student-analytics'),

    # Progress card
    path('api/progress-card/', ProgressCardView.as_view(), name='api-progress-card'),

    # Site images
    path('api/site-images/', site_images_view, name='api-site-images'),
    path('api/site-images/upload/', site_image_upload_view, name='api-site-image-upload'),
    path('api/site-images/<int:pk>/', site_image_delete_view, name='api-site-image-delete'),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
