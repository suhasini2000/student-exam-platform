"""
Management command to fetch questions from OpenTrivia API for each chapter
"""
from django.core.management.base import BaseCommand
from exams.models import Subject, Chapter, Question
from exams.question_fetchers import OpenTriviaFetcher
import time


class Command(BaseCommand):
    help = 'Fetch questions from OpenTrivia API for all chapters'

    def add_arguments(self, parser):
        parser.add_argument(
            '--subject-id',
            type=int,
            default=1,
            help='Subject ID to fetch questions for'
        )
        parser.add_argument(
            '--amount',
            type=int,
            default=10,
            help='Number of questions to fetch per chapter'
        )
        parser.add_argument(
            '--difficulty',
            type=str,
            default='medium',
            choices=['easy', 'medium', 'hard'],
            help='Question difficulty level'
        )

    def handle(self, *args, **options):
        subject_id = options['subject_id']
        amount = options['amount']
        difficulty = options['difficulty']
        
        try:
            math_subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Subject with ID {subject_id} not found'))
            return
        
        self.stdout.write(f'Fetching questions for: {math_subject.name}')
        
        chapters = Chapter.objects.filter(subject=math_subject)
        
        if not chapters.exists():
            self.stdout.write(self.style.WARNING('No chapters found for this subject'))
            return
        
        fetcher = OpenTriviaFetcher()
        total_created = 0
        
        for chapter in chapters:
            self.stdout.write(f'\n📚 Chapter: {chapter.name}')
            
            try:
                questions_data = fetcher.fetch_questions(amount=amount, difficulty=difficulty)
                
                created_count = 0
                for q_data in questions_data:
                    try:
                        Question.objects.create(
                            subject=math_subject,
                            chapter=chapter,
                            question_text=q_data['question_text'],
                            option_a=q_data['option_a'],
                            option_b=q_data['option_b'],
                            option_c=q_data['option_c'],
                            option_d=q_data['option_d'],
                            correct_answer=q_data['correct_answer'],
                            explanation=q_data.get('explanation', ''),
                            difficulty='MEDIUM',
                            marks=1,
                            negative_marks=0.0,
                            time_per_question_seconds=30
                        )
                        created_count += 1
                    except Exception as e:
                        self.stdout.write(self.style.WARNING(f'  ⚠️  Error creating question: {str(e)}'))
                        continue
                
                self.stdout.write(self.style.SUCCESS(f'  ✅ Created {created_count} questions'))
                total_created += created_count
                
                # Add delay to avoid rate limiting
                time.sleep(5)
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  ❌ Error fetching: {str(e)}'))
        
        self.stdout.write(self.style.SUCCESS(f'\n🎉 Total questions created: {total_created}'))
        
        total_questions = Question.objects.filter(subject=math_subject).count()
        self.stdout.write(f'Total questions in database: {total_questions}')
