"""
Nuclear cleanup command: Removes EVERYTHING (Users, Exams, Questions, etc.)
Preserves only superusers.
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from exams.models import Question, Chapter, Subject, UserExam, UserAnswer, ExamAnalysis, ExamType, ExamPaper, AssignedExam, TeacherAssignment, HandwrittenExam, AnswerSheetUpload
from accounts.models import SiteImage
from study_material.models import StudyMaterial

User = get_user_model()

class Command(BaseCommand):
    help = 'Wipes all platform data except superusers'

    def handle(self, *args, **options):
        self.stdout.write(self.style.WARNING("☢️ STARTING FULL DATABASE WIPE..."))
        
        # 1. Clear Exams & Results
        ExamAnalysis.objects.all().delete()
        UserAnswer.objects.all().delete()
        UserExam.objects.all().delete()
        AssignedExam.objects.all().delete()
        AnswerSheetUpload.objects.all().delete()
        HandwrittenExam.objects.all().delete()
        
        # 2. Clear Papers & Questions
        ExamPaper.objects.all().delete()
        Question.objects.all().delete()
        
        # 3. Clear Structure
        StudyMaterial.objects.all().delete()
        Chapter.objects.all().delete()
        TeacherAssignment.objects.all().delete()
        Subject.objects.all().delete()
        ExamType.objects.all().delete()
        
        # 4. Clear Images
        SiteImage.objects.all().delete()
        
        # 5. Clear User school references (to avoid Protected Error)
        self.stdout.write("Breaking school references...")
        User.objects.all().update(school=None)
        
        # 6. Clear Users (except superusers)
        users_to_delete = User.objects.filter(is_superuser=False)
        u_count = users_to_delete.count()
        users_to_delete.delete()
        
        self.stdout.write(self.style.SUCCESS(f"✅ Data wiped successfully. Deleted {u_count} users."))
        self.stdout.write(self.style.SUCCESS("✅ Tables are now fresh. Superusers preserved."))
