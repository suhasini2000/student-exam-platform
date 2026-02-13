"""
Management command to fetch questions from external sources
"""
from django.core.management.base import BaseCommand, CommandError
from exams.models import Subject, Question
from exams.question_fetchers import get_fetcher


class Command(BaseCommand):
    help = 'Fetch questions from external sources'

    def add_arguments(self, parser):
        parser.add_argument(
            '--source',
            type=str,
            required=True,
            choices=['opentrivia', 'json', 'csv', 'quizapi'],
            help='Source to fetch questions from'
        )
        parser.add_argument(
            '--subject',
            type=int,
            required=True,
            help='Subject ID to add questions to'
        )
        parser.add_argument(
            '--amount',
            type=int,
            default=10,
            help='Number of questions to fetch'
        )
        parser.add_argument(
            '--file',
            type=str,
            help='File path for JSON or CSV sources'
        )
        parser.add_argument(
            '--difficulty',
            type=str,
            default='medium',
            choices=['easy', 'medium', 'hard'],
            help='Question difficulty'
        )
        parser.add_argument(
            '--category',
            type=str,
            help='Category or tags for the questions'
        )

    def handle(self, *args, **options):
        source = options['source']
        subject_id = options['subject']
        amount = options['amount']
        difficulty = options['difficulty']
        file_path = options.get('file')
        category = options.get('category')

        # Validate subject
        try:
            subject = Subject.objects.get(id=subject_id)
        except Subject.DoesNotExist:
            raise CommandError(f'Subject with ID {subject_id} does not exist')

        self.stdout.write(f'Fetching questions from {source}...')

        # Get appropriate fetcher
        try:
            fetcher = get_fetcher(source)
        except ValueError as e:
            raise CommandError(str(e))

        # Fetch questions based on source type
        questions_data = []
        
        if source in ['json', 'csv']:
            if not file_path:
                raise CommandError(f'--file argument is required for {source} source')
            questions_data = fetcher.fetch_questions(file_path)
        elif source == 'opentrivia':
            questions_data = fetcher.fetch_questions(
                category=category or "",
                amount=amount,
                difficulty=difficulty
            )
        elif source == 'quizapi':
            questions_data = fetcher.fetch_questions(
                tags=category or "",
                limit=amount,
                difficulty=difficulty
            )

        if not questions_data:
            self.stdout.write(self.style.WARNING('No questions fetched'))
            return

        # Save questions to database
        created_count = 0
        for q_data in questions_data:
            try:
                # Map difficulty
                difficulty_map = {
                    'EASY': 'EASY',
                    'MEDIUM': 'MEDIUM',
                    'HARD': 'HARD',
                }
                
                question = Question.objects.create(
                    subject=subject,
                    question_text=q_data['question_text'],
                    option_a=q_data['option_a'],
                    option_b=q_data['option_b'],
                    option_c=q_data['option_c'],
                    option_d=q_data['option_d'],
                    correct_answer=q_data['correct_answer'],
                    explanation=q_data.get('explanation', ''),
                    difficulty=difficulty_map.get(q_data.get('difficulty', 'MEDIUM'), 'MEDIUM'),
                    marks=q_data.get('marks', 1),
                    negative_marks=q_data.get('negative_marks', 0.0),
                )
                created_count += 1
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'Error creating question: {e}'))
                continue

        self.stdout.write(
            self.style.SUCCESS(
                f'Successfully created {created_count} questions for subject "{subject.name}"'
            )
        )
