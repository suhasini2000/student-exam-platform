"""
Management command to automatically refresh questions from external sources
"""
from django.core.management.base import BaseCommand
from exams.models import Subject, Question
from exams.question_fetchers import get_fetcher
import time


class Command(BaseCommand):
    help = 'Continuously refresh questions from external sources'

    def add_arguments(self, parser):
        parser.add_argument(
            '--subject',
            type=int,
            required=True,
            help='Subject ID to refresh questions for'
        )
        parser.add_argument(
            '--source',
            type=str,
            default='opentrivia',
            choices=['opentrivia', 'json', 'csv'],
            help='Source to fetch questions from'
        )
        parser.add_argument(
            '--interval',
            type=int,
            default=3600,
            help='Refresh interval in seconds (default: 3600 = 1 hour)'
        )
        parser.add_argument(
            '--max-questions',
            type=int,
            default=100,
            help='Maximum number of questions to keep'
        )
        parser.add_argument(
            '--replace-old',
            action='store_true',
            help='Replace old questions instead of adding new ones'
        )

    def handle(self, *args, **options):
        subject_id = options['subject']
        source = options['source']
        interval = options['interval']
        max_questions = options['max_questions']
        replace_old = options['replace_old']

        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Subject with ID {subject_id} does not exist'))
            return

        self.stdout.write(self.style.SUCCESS(
            f'Starting automatic question refresh for "{subject.name}" every {interval} seconds'
        ))
        self.stdout.write('Press Ctrl+C to stop')

        try:
            while True:
                self.refresh_questions(subject, source, max_questions, replace_old)
                self.stdout.write(f'Sleeping for {interval} seconds...')
                time.sleep(interval)
        except KeyboardInterrupt:
            self.stdout.write(self.style.WARNING('\nStopped by user'))

    def refresh_questions(self, subject, source, max_questions, replace_old):
        """Refresh questions for a subject"""
        self.stdout.write(f'\n[{time.strftime("%Y-%m-%d %H:%M:%S")}] Refreshing questions...')

        # Get current question count
        current_count = Question.objects.filter(subject=subject).count()
        self.stdout.write(f'Current questions: {current_count}')

        deleted = 0  # Initialize deleted count
        
        # If replacing old questions, delete some old ones
        if replace_old and current_count >= max_questions:
            # Delete oldest 20% of questions
            delete_count = max(10, int(current_count * 0.2))
            old_questions = Question.objects.filter(subject=subject).order_by('created_at')[:delete_count]
            deleted = old_questions.delete()[0]
            self.stdout.write(f'Deleted {deleted} old questions')

        # Fetch new questions
        try:
            fetcher = get_fetcher(source)
            
            if source == 'opentrivia':
                fetch_count = min(20, max_questions - current_count + deleted if replace_old else max_questions - current_count)
                if fetch_count > 0:
                    questions_data = fetcher.fetch_questions(amount=fetch_count, difficulty='medium')
                else:
                    self.stdout.write('Maximum questions reached, skipping fetch')
                    return
            else:
                self.stdout.write(self.style.WARNING('File sources not supported in auto-refresh mode'))
                return

            # Save new questions
            created_count = 0
            for q_data in questions_data:
                try:
                    # Check for duplicates
                    exists = Question.objects.filter(
                        subject=subject,
                        question_text=q_data['question_text']
                    ).exists()
                    
                    if not exists:
                        Question.objects.create(
                            subject=subject,
                            question_text=q_data['question_text'],
                            option_a=q_data['option_a'],
                            option_b=q_data['option_b'],
                            option_c=q_data['option_c'],
                            option_d=q_data['option_d'],
                            correct_answer=q_data['correct_answer'],
                            explanation=q_data.get('explanation', ''),
                            difficulty='MEDIUM',
                            marks=q_data.get('marks', 1),
                            negative_marks=q_data.get('negative_marks', 0.0),
                        )
                        created_count += 1
                except Exception as e:
                    continue

            new_total = Question.objects.filter(subject=subject).count()
            self.stdout.write(self.style.SUCCESS(
                f'Added {created_count} new questions. Total: {new_total}'
            ))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Error refreshing questions: {e}'))
