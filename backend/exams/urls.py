from django.urls import path
from . import views, question_views

app_name = 'exams'

urlpatterns = [
    path('', views.home, name='home'),
    path('dashboard/', views.dashboard, name='dashboard'),
    path('select-exam/', views.select_exam_type, name='select_exam_type'),
    path('select-subject/<int:exam_type_id>/', views.select_subject, name='select_subject'),
    path('select-chapter/<int:subject_id>/', views.select_chapter, name='select_chapter'),
    path('start-exam/<int:subject_id>/', views.start_exam, name='start_exam'),
    path('start-exam/<int:subject_id>/chapter/<int:chapter_id>/', views.start_exam, name='start_exam_chapter'),
    path('take-exam/<int:user_exam_id>/', views.take_exam, name='take_exam'),
    path('submit-exam/<int:user_exam_id>/', views.submit_exam, name='submit_exam'),
    path('result/<int:user_exam_id>/', views.exam_result, name='exam_result'),
    path('history/', views.exam_history, name='exam_history'),
    path('refresh-questions/<int:subject_id>/', question_views.refresh_questions, name='refresh_questions'),
    path('delete-old-questions/<int:subject_id>/', question_views.delete_old_questions, name='delete_old_questions'),
]
