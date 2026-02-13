"""
Import mathematics questions from JSON and assign to chapters
"""
from django.core.management.base import BaseCommand
from django.db.models import Count
from exams.models import Question, Chapter, Subject
import json


class Command(BaseCommand):
    help = 'Import mathematics questions from eamcet_mathematics.json'

    def handle(self, *args, **options):
        math_subject = Subject.objects.get(id=1)
        
        # Get chapters
        chapters = {
            'TRIG': Chapter.objects.get(code='TRIG', subject=math_subject),
            'CALC': Chapter.objects.get(code='CALC', subject=math_subject),
            'ALG': Chapter.objects.get(code='ALG', subject=math_subject),
            'PROB': Chapter.objects.get(code='PROB', subject=math_subject),
            'COORD': Chapter.objects.get(code='COORD', subject=math_subject),
            'VECTOR': Chapter.objects.get(code='VECTOR', subject=math_subject),
            '3D': Chapter.objects.get(code='3D', subject=math_subject),
        }
        
        # Load JSON file
        with open('eamcet_mathematics.json', 'r') as f:
            questions_data = json.load(f)
        
        self.stdout.write(f'Found {len(questions_data)} questions in JSON file\n')
        
        # Chapter assignment based on keywords
        chapter_mapping = {
            'sin': 'TRIG', 'cos': 'TRIG', 'tan': 'TRIG', 'θ': 'TRIG',
            'derivative': 'CALC', 'integral': 'CALC', 'limit': 'CALC', '∫': 'CALC',
            'matrix': 'ALG', 'determinant': 'ALG', 'equation': 'ALG', 'polynomial': 'ALG', 'roots': 'ALG',
            'probability': 'PROB', 'dice': 'PROB',
            'slope': 'COORD', 'circle': 'COORD', 'distance': 'COORD', 'line': 'COORD',
            'vector': 'VECTOR', 'dot': 'VECTOR',
            'plane': '3D', 'dimension': '3D'
        }
        
        created_count = 0
        chapter_counts = {code: 0 for code in chapters.keys()}
        
        for q_data in questions_data:
            question_text = q_data['question']
            options = q_data['options']
            correct_idx = q_data['correct_answer']
            
            # Determine chapter
            assigned_chapter = 'ALG'  # Default
            for keyword, chapter_code in chapter_mapping.items():
                if keyword.lower() in question_text.lower():
                    assigned_chapter = chapter_code
                    break
            
            # Create question
            try:
                Question.objects.create(
                    subject=math_subject,
                    chapter=chapters[assigned_chapter],
                    question_text=question_text,
                    option_a=options[0],
                    option_b=options[1],
                    option_c=options[2],
                    option_d=options[3],
                    correct_answer=['A', 'B', 'C', 'D'][correct_idx],
                    explanation=q_data.get('explanation', ''),
                    difficulty='MEDIUM',
                    marks=1,
                    negative_marks=0.0,
                    time_per_question_seconds=30
                )
                created_count += 1
                chapter_counts[assigned_chapter] += 1
                
            except Exception as e:
                self.stdout.write(self.style.WARNING(f'Error: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Created {created_count} questions'))
        
        # Show distribution
        self.stdout.write('\n📊 New questions added per chapter:')
        for code, count in chapter_counts.items():
            if count > 0:
                self.stdout.write(f'  {chapters[code].name}: +{count} questions')
        
        # Show total
        self.stdout.write('\n📊 Total questions per chapter:')
        chapter_list = Chapter.objects.filter(subject=math_subject).annotate(
            q_count=Count('questions')
        ).order_by('order')
        
        for c in chapter_list:
            self.stdout.write(f'  {c.order}. {c.name}: {c.q_count} questions')
        
        total = Question.objects.filter(subject=math_subject).count()
        self.stdout.write(self.style.SUCCESS(f'\n✅ Total: {total} questions'))
