from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended User model with role-based multi-tenant support"""
    ROLE_CHOICES = [
        ('school', 'School'),
        ('teacher', 'Teacher'),
        ('student', 'Student'),
    ]
    BOARD_CHOICES = [
        ('CBSE', 'CBSE'),
        ('STATE', 'State Board'),
        ('ICSE', 'ICSE'),
    ]
    GRADE_CHOICES = [
        ('9', 'Class 9'),
        ('10', 'Class 10'),
    ]

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    school = models.ForeignKey(
        'self', null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='members',
        help_text='Links teachers/students to their school account',
    )
    student_id = models.CharField(max_length=50, blank=True, help_text='School-assigned student ID (e.g. STU-2024-001)')

    phone_number = models.CharField(max_length=15, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True)
    grade = models.CharField(max_length=2, choices=GRADE_CHOICES, default='10')
    board = models.CharField(max_length=10, choices=BOARD_CHOICES, default='CBSE')
    school_name = models.CharField(max_length=200, blank=True)
    parent_phone = models.CharField(max_length=15, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.username} - {self.get_full_name()} ({self.role})"

    @property
    def is_school(self):
        return self.role == 'school'

    @property
    def is_teacher(self):
        return self.role == 'teacher'

    @property
    def is_student(self):
        return self.role == 'student'

    def get_school_account(self):
        """Return the school account for this user (self if school, FK if teacher/student)."""
        if self.role == 'school':
            return self
        return self.school

    class Meta:
        db_table = 'users'


class SiteImage(models.Model):
    """Background images for various UI sections — per-school or global."""
    school = models.ForeignKey(
        'User', null=True, blank=True,
        on_delete=models.CASCADE,
        related_name='site_images',
        help_text='School that owns this image (null = global default)',
    )
    key = models.CharField(max_length=50, help_text='Unique key e.g. school_dashboard, manage_teachers')
    title = models.CharField(max_length=200, blank=True)
    image = models.ImageField(upload_to='site_images/')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.key} - {self.title} ({self.school or 'Global'})"

    class Meta:
        db_table = 'site_images'
        unique_together = ['school', 'key']
        ordering = ['key']
