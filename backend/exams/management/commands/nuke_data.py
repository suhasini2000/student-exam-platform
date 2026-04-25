from django.core.management.base import BaseCommand
from django.db import transaction
from django.contrib.auth import get_user_model
from exams.models import (
    ExamType, Subject, Chapter, Question, ExamPaper,
    AssignedExam, UserExam, UserAnswer, TeacherAssignment,
    HandwrittenExam, AnswerSheetUpload
)
from study_material.models import StudyMaterial

User = get_user_model()

class Command(BaseCommand):
    help = 'Nuke all curriculum and exam data (Blank Slate)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING('Starting Nuclear Data Purge...'))
        
        with transaction.atomic():
            # 1. Clear Exams and Submissions
            self.stdout.write('Purging submissions and results...')
            UserAnswer.objects.all().delete()
            UserExam.objects.all().delete()
            AnswerSheetUpload.objects.all().delete()
            HandwrittenExam.objects.all().delete()
            AssignedExam.objects.all().delete()
            
            # 2. Clear Question Bank and Source Papers
            self.stdout.write('Purging question bank and exam papers...')
            Question.objects.all().delete()
            ExamPaper.objects.all().delete()
            
            # 3. Clear Curriculum Structure
            self.stdout.write('Purging curriculum nodes...')
            StudyMaterial.objects.all().delete()
            Chapter.objects.all().delete()
            TeacherAssignment.objects.all().delete()
            Subject.objects.all().delete()
            ExamType.objects.all().delete()
            
            # 4. Clear Standard Accounts
            # First break school references to avoid ProtectedError
            self.stdout.write('Breaking user-school references...')
            User.objects.filter(is_superuser=False).update(school=None)
            
            self.stdout.write('Purging standard user accounts (preserving superusers)...')
            User.objects.filter(is_superuser=False).delete()

        self.stdout.write(self.style.SUCCESS('Successfully cleared all sample data. Platform is now a BLANK SLATE.'))
