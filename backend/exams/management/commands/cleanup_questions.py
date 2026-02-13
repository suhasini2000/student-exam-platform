"""
Management command to clean up trivia questions and keep only math questions
"""
from django.core.management.base import BaseCommand
from django.db.models import Count
from exams.models import Question, Chapter, Subject


class Command(BaseCommand):
    help = 'Remove trivia questions and organize math questions by chapter'

    def handle(self, *args, **options):
        math_subject = Subject.objects.get(id=1)
        
        self.stdout.write("Analyzing questions...\n")
        
        # Get chapters
        chapters = {}
        for code in ['TRIG', 'CALC', 'ALG', 'PROB', 'COORD', 'VECTOR', '3D']:
            chapters[code] = Chapter.objects.get(code=code, subject=math_subject)
        
        # Keywords for detecting math questions
        chapter_keywords = {
            'TRIG': ['sin', 'cos', 'tan', 'theta', 'trigon', 'angle', 'radian'],
            'CALC': ['derivative', 'integral', 'limit', 'differentiat', 'integrat', 'dx', 'dy'],
            'ALG': ['equation', 'matrix', 'determinant', 'polynomial', 'factor', 'quadratic'],
            'PROB': ['probability', 'random', 'dice', 'coin', 'sample', 'event'],
            'COORD': ['coordinate', 'line', 'circle', 'parabola', 'ellipse', 'slope', 'distance'],
            'VECTOR': ['vector', 'dot', 'cross', 'magnitude', 'direction'],
            '3D': ['plane', 'dimension', 'spatial']
        }
        
        questions = Question.objects.filter(subject=math_subject)
        
        math_count = 0
        trivia_count = 0
        
        for q in questions:
            text_lower = q.question_text.lower()
            
            # Check if it's a math question
            is_math = any(
                keyword in text_lower 
                for keywords in chapter_keywords.values() 
                for keyword in keywords
            )
            
            if is_math:
                math_count += 1
                # Assign to appropriate chapter
                for chapter_code, keywords in chapter_keywords.items():
                    if any(keyword in text_lower for keyword in keywords):
                        q.chapter = chapters[chapter_code]
                        q.save()
                        break
            else:
                trivia_count += 1
                q.delete()
        
        self.stdout.write(self.style.SUCCESS(f'✅ Kept {math_count} math questions'))
        self.stdout.write(self.style.WARNING(f'🗑️  Deleted {trivia_count} trivia questions'))
        
        # Show distribution
        self.stdout.write('\n📊 Questions per Chapter:')
        chapter_counts = Chapter.objects.filter(subject=math_subject).annotate(
            q_count=Count('questions')
        ).order_by('order')
        
        for c in chapter_counts:
            self.stdout.write(f'  {c.order}. {c.name}: {c.q_count} questions')
        
        total = Question.objects.filter(subject=math_subject).count()
        self.stdout.write(self.style.SUCCESS(f'\n✅ Total: {total} questions'))
