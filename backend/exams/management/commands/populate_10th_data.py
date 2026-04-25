from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Populate sample data for Class 10 exams (Placeholder)'

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('✓ Data population skipped (No-op command)')
        )
