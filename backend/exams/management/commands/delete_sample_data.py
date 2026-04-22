"""
Safe cleanup command to remove global sample data.
"""
from django.core.management.base import BaseCommand
from exams.models import Question, Chapter, Subject, UserExam, UserAnswer, ExamAnalysis

class Command(BaseCommand):
    help = 'Safely deletes global sample data while preserving school data'

    def handle(self, *args, **options):
        self.stdout.write("Starting safe cleanup...")
        
        # Identify global subjects (no school)
        global_subjects = Subject.objects.filter(school__isnull=True)
        global_sub_ids = list(global_subjects.values_list('id', flat=True))
        
        # 1. Delete dependent data first to avoid Foreign Key errors
        # (Only for questions that are linked to global subjects)
        ua_count = UserAnswer.objects.filter(question__subject_id__in=global_sub_ids).delete()[0]
        self.stdout.write(f"Deleted {ua_count} user answers linked to global subjects.")
        
        # 2. Delete Global Questions
        q_count = Question.objects.filter(subject_id__in=global_sub_ids).delete()[0]
        self.stdout.write(f"Deleted {q_count} global questions.")
        
        # 3. Delete Global Chapters
        c_count = Chapter.objects.filter(subject_id__in=global_sub_ids).delete()[0]
        self.stdout.write(f"Deleted {c_count} global chapters.")
        
        # 4. Finally Delete Global Subjects
        s_count = global_subjects.count()
        sub_names = list(global_subjects.values_list('name', flat=True))
        global_subjects.delete()
        self.stdout.write(f"Deleted {s_count} global subjects: {', '.join(sub_names)}")
        
        self.stdout.write(self.style.SUCCESS("✅ Safe cleanup complete."))
