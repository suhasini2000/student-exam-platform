"""
Seed multi-tenant sample data: school, teachers, students, assigned exams.
Assumes populate_10th_data has already been run (subjects/chapters/questions exist).
Usage: python manage.py seed_multi_tenant
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from accounts.models import User
from exams.models import Subject, Chapter, AssignedExam, TeacherAssignment


class Command(BaseCommand):
    help = 'Seed school, teacher, student accounts and assigned exams'

    def handle(self, *args, **options):
        self.stdout.write('Seeding multi-tenant data...\n')

        # ---- School Account ----
        school, created = User.objects.get_or_create(
            username='demoschool',
            defaults={
                'email': 'school@demo.com',
                'first_name': 'Demo',
                'last_name': 'School Admin',
                'role': 'school',
                'school_name': 'Demo Public School',
                'board': 'CBSE',
                'is_staff': False,
            }
        )
        if created:
            school.set_password('school123')
            school.save()
            self.stdout.write(self.style.SUCCESS('  Created school: demoschool / school123'))
        else:
            self.stdout.write('  School account already exists.')

        # ---- Teachers ----
        teachers_data = [
            {
                'username': 'teacher1',
                'email': 'teacher1@demo.com',
                'first_name': 'Rajesh',
                'last_name': 'Kumar',
                'phone_number': '9876543210',
            },
            {
                'username': 'teacher2',
                'email': 'teacher2@demo.com',
                'first_name': 'Priya',
                'last_name': 'Sharma',
                'phone_number': '9876543211',
            },
        ]

        teachers = []
        for td in teachers_data:
            teacher, created = User.objects.get_or_create(
                username=td['username'],
                defaults={
                    **td,
                    'role': 'teacher',
                    'school': school,
                    'board': school.board,
                }
            )
            if created:
                teacher.set_password('teacher123')
                teacher.save()
                self.stdout.write(self.style.SUCCESS(f'  Created teacher: {td["username"]} / teacher123'))
            else:
                self.stdout.write(f'  Teacher {td["username"]} already exists.')
            teachers.append(teacher)

        # ---- Students ----
        students_data = [
            {
                'username': 'student1',
                'email': 'student1@demo.com',
                'first_name': 'Amit',
                'last_name': 'Patel',
                'grade': '10',
                'student_id': 'STU-2025-001',
                'phone_number': '9988776655',
            },
            {
                'username': 'student2',
                'email': 'student2@demo.com',
                'first_name': 'Sneha',
                'last_name': 'Reddy',
                'grade': '10',
                'student_id': 'STU-2025-002',
                'phone_number': '9988776656',
            },
            {
                'username': 'student3',
                'email': 'student3@demo.com',
                'first_name': 'Ravi',
                'last_name': 'Singh',
                'grade': '10',
                'student_id': 'STU-2025-003',
                'phone_number': '9988776657',
            },
            {
                'username': 'student4',
                'email': 'student4@demo.com',
                'first_name': 'Meera',
                'last_name': 'Nair',
                'grade': '9',
                'student_id': 'STU-2025-004',
                'phone_number': '9988776658',
            },
            {
                'username': 'student5',
                'email': 'student5@demo.com',
                'first_name': 'Karan',
                'last_name': 'Verma',
                'grade': '9',
                'student_id': 'STU-2025-005',
                'phone_number': '9988776659',
            },
        ]

        students = []
        for sd in students_data:
            student, created = User.objects.get_or_create(
                username=sd['username'],
                defaults={
                    **sd,
                    'role': 'student',
                    'school': school,
                    'school_name': school.school_name,
                    'board': school.board,
                }
            )
            if created:
                student.set_password('student123')
                student.save()
                self.stdout.write(self.style.SUCCESS(f'  Created student: {sd["username"]} / student123'))
            else:
                self.stdout.write(f'  Student {sd["username"]} already exists.')
            students.append(student)

        # ---- Teacher Assignments (teacher → subject → students) ----
        math = Subject.objects.filter(code='MATH', exam_type__code='CBSE10').first()
        science = Subject.objects.filter(code='SCI', exam_type__code='CBSE10').first()
        english = Subject.objects.filter(code='ENG', exam_type__code='CBSE10').first()

        if math and len(teachers) > 0:
            ta1, created = TeacherAssignment.objects.get_or_create(
                school=school, teacher=teachers[0], subject=math,
            )
            if created:
                ta1.students.set(students[:3])  # Class 10 students to teacher1 for Math
                self.stdout.write(self.style.SUCCESS(f'  Assigned teacher1 → Mathematics with 3 students'))
            else:
                self.stdout.write(f'  teacher1 → Mathematics assignment already exists.')

        if science and len(teachers) > 1:
            ta2, created = TeacherAssignment.objects.get_or_create(
                school=school, teacher=teachers[1], subject=science,
            )
            if created:
                ta2.students.set(students)  # All students to teacher2 for Science
                self.stdout.write(self.style.SUCCESS(f'  Assigned teacher2 → Science with {len(students)} students'))
            else:
                self.stdout.write(f'  teacher2 → Science assignment already exists.')

        if english and len(teachers) > 0:
            ta3, created = TeacherAssignment.objects.get_or_create(
                school=school, teacher=teachers[0], subject=english,
            )
            if created:
                ta3.students.set(students[:3])
                self.stdout.write(self.style.SUCCESS(f'  Assigned teacher1 → English with 3 students'))

        # ---- Assigned Exams ----
        if not math and not science:
            self.stdout.write(self.style.WARNING(
                '\n  No subjects found. Run "python manage.py populate_10th_data" first, then re-run this command to create assigned exams.'
            ))
        else:
            now = timezone.now()
            exams_created = 0

            if math:
                math_chapters = list(Chapter.objects.filter(subject=math)[:3])
                exam1, created = AssignedExam.objects.get_or_create(
                    title='Mathematics Unit Test 1',
                    teacher=teachers[0],
                    defaults={
                        'school': school,
                        'subject': math,
                        'total_marks': 50,
                        'duration_minutes': 90,
                        'start_time': now - timedelta(hours=1),
                        'end_time': now + timedelta(days=7),
                        'is_active': True,
                    }
                )
                if created:
                    exam1.chapters.set(math_chapters)
                    exam1.assigned_to.set(students[:3])  # Class 10 students
                    exams_created += 1

                exam2, created = AssignedExam.objects.get_or_create(
                    title='Mathematics Practice Test',
                    teacher=teachers[0],
                    defaults={
                        'school': school,
                        'subject': math,
                        'total_marks': 50,
                        'duration_minutes': 60,
                        'start_time': now + timedelta(days=2),
                        'end_time': now + timedelta(days=9),
                        'is_active': True,
                    }
                )
                if created:
                    exam2.assigned_to.set(students[:3])
                    exams_created += 1

            if science:
                science_chapters = list(Chapter.objects.filter(subject=science)[:4])
                exam3, created = AssignedExam.objects.get_or_create(
                    title='Science Mid-Term Exam',
                    teacher=teachers[1],
                    defaults={
                        'school': school,
                        'subject': science,
                        'total_marks': 50,
                        'duration_minutes': 90,
                        'start_time': now - timedelta(hours=2),
                        'end_time': now + timedelta(days=5),
                        'is_active': True,
                    }
                )
                if created:
                    exam3.chapters.set(science_chapters)
                    exam3.assigned_to.set(students)  # All students
                    exams_created += 1

            self.stdout.write(self.style.SUCCESS(f'  Created {exams_created} assigned exams'))

        # ---- Set existing users without a role to 'student' ----
        updated = User.objects.filter(role='').update(role='student')
        if updated:
            self.stdout.write(f'  Updated {updated} existing users to role=student')

        # ---- Summary ----
        self.stdout.write(self.style.SUCCESS(
            f'\nDone! Summary:\n'
            f'  Schools: {User.objects.filter(role="school").count()}\n'
            f'  Teachers: {User.objects.filter(role="teacher").count()}\n'
            f'  Students: {User.objects.filter(role="student").count()}\n'
            f'  Assigned Exams: {AssignedExam.objects.count()}\n'
            f'\nLogin credentials:\n'
            f'  School:   demoschool / school123\n'
            f'  Teacher:  teacher1 / teacher123  |  teacher2 / teacher123\n'
            f'  Students: student1..student5 / student123'
        ))
