from django.db import models
from django.conf import settings


class ExamType(models.Model):
    """Main exam categories: CBSE 10th, State Board 10th, etc."""
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'exam_types'
        ordering = ['name']


class Subject(models.Model):
    """Subjects for each exam type"""
    exam_type = models.ForeignKey(ExamType, on_delete=models.CASCADE, related_name='subjects')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    description = models.TextField(blank=True)
    duration_minutes = models.IntegerField(default=90)
    total_marks = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.exam_type.name} - {self.name}"

    class Meta:
        db_table = 'subjects'
        unique_together = ['exam_type', 'code']
        ordering = ['exam_type', 'name']


class Chapter(models.Model):
    """Chapters within each subject"""
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='chapters')
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.subject.name} - {self.name}"

    class Meta:
        db_table = 'chapters'
        unique_together = ['subject', 'code']
        ordering = ['subject', 'order', 'name']


class Question(models.Model):
    """Questions supporting MCQ, Short Answer, and Long Answer types"""
    DIFFICULTY_CHOICES = [
        ('EASY', 'Easy'),
        ('MEDIUM', 'Medium'),
        ('HARD', 'Hard'),
    ]
    QUESTION_TYPE_CHOICES = [
        ('MCQ', 'Multiple Choice'),
        ('SHORT', 'Short Answer'),
        ('LONG', 'Long Answer'),
    ]

    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='questions')
    chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True, related_name='questions')
    school = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='school_questions',
        help_text='School that owns this question (null = global)',
    )
    question_type = models.CharField(max_length=5, choices=QUESTION_TYPE_CHOICES, default='MCQ')
    question_text = models.TextField()
    # MCQ options (nullable for SHORT/LONG)
    option_a = models.CharField(max_length=500, blank=True, null=True)
    option_b = models.CharField(max_length=500, blank=True, null=True)
    option_c = models.CharField(max_length=500, blank=True, null=True)
    option_d = models.CharField(max_length=500, blank=True, null=True)
    correct_answer = models.CharField(max_length=1, choices=[
        ('A', 'Option A'), ('B', 'Option B'),
        ('C', 'Option C'), ('D', 'Option D'),
    ], blank=True)
    # For SHORT/LONG answer grading
    model_answer = models.TextField(blank=True, help_text='Expected answer for AI grading')
    grading_rubric = models.TextField(blank=True, help_text='Rubric for AI grading (JSON or text)')
    explanation = models.TextField(blank=True)
    marks = models.IntegerField(default=1)
    negative_marks = models.FloatField(default=0.0)
    time_per_question_seconds = models.IntegerField(default=60)
    difficulty = models.CharField(max_length=10, choices=DIFFICULTY_CHOICES, default='MEDIUM')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.subject.name} - {self.question_type} Q{self.id}"

    class Meta:
        db_table = 'questions'
        ordering = ['subject', 'id']


class UserExam(models.Model):
    """Track user exam attempts with AI grading support"""
    STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ]
    GRADING_STATUS_CHOICES = [
        ('NOT_STARTED', 'Not Started'),
        ('GRADING_MCQ', 'Grading MCQs'),
        ('GRADING_DESCRIPTIVE', 'AI Grading Descriptive'),
        ('ANALYZING', 'Generating Analysis'),
        ('COMPLETED', 'Grading Complete'),
        ('FAILED', 'Grading Failed'),
    ]

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exams')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True)
    school = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='school_exams',
        help_text='School this exam belongs to',
    )
    assigned_exam = models.ForeignKey(
        'AssignedExam', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='user_exams',
        help_text='The assigned exam this attempt is for',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='NOT_STARTED')
    grading_status = models.CharField(max_length=25, choices=GRADING_STATUS_CHOICES, default='NOT_STARTED')
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_questions = models.IntegerField(default=0)
    answered_questions = models.IntegerField(default=0)
    correct_answers = models.IntegerField(default=0)
    wrong_answers = models.IntegerField(default=0)
    unanswered = models.IntegerField(default=0)
    score = models.FloatField(default=0.0)
    percentage = models.FloatField(default=0.0)
    # Score breakdown by question type
    mcq_score = models.FloatField(default=0.0)
    short_answer_score = models.FloatField(default=0.0)
    long_answer_score = models.FloatField(default=0.0)
    total_time_seconds = models.IntegerField(default=0)
    # AI analysis
    analysis_data = models.JSONField(default=dict, blank=True)
    suggestions = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} - {self.subject.name}"

    class Meta:
        db_table = 'user_exams'
        ordering = ['-created_at']


class UserAnswer(models.Model):
    """Store individual answers with AI grading support"""
    GRADING_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('GRADED', 'Graded'),
        ('AI_GRADING', 'AI Grading'),
        ('FAILED', 'Failed'),
    ]

    user_exam = models.ForeignKey(UserExam, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    # MCQ answer
    selected_answer = models.CharField(max_length=1, null=True, blank=True, choices=[
        ('A', 'Option A'), ('B', 'Option B'),
        ('C', 'Option C'), ('D', 'Option D'),
    ])
    # Descriptive answer
    text_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)
    marks_obtained = models.FloatField(default=0.0)
    # AI grading fields
    ai_score = models.FloatField(null=True, blank=True)
    ai_feedback = models.TextField(blank=True)
    grading_status = models.CharField(max_length=15, choices=GRADING_STATUS_CHOICES, default='PENDING')
    # Teacher review fields
    teacher_reviewed = models.BooleanField(default=False)
    teacher_score = models.FloatField(null=True, blank=True)
    teacher_feedback = models.TextField(blank=True)
    time_taken_seconds = models.IntegerField(default=0)
    answered_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user_exam.user.username} - Q{self.question.id}"

    @property
    def final_score(self):
        """Return teacher score if reviewed, otherwise AI/auto score."""
        if self.teacher_reviewed and self.teacher_score is not None:
            return self.teacher_score
        return self.marks_obtained

    class Meta:
        db_table = 'user_answers'
        unique_together = ['user_exam', 'question']
        ordering = ['question']


class ExamAnalysis(models.Model):
    """Detailed post-exam analysis"""
    user_exam = models.OneToOneField(UserExam, on_delete=models.CASCADE, related_name='analysis')
    question_type_breakdown = models.JSONField(default=dict)
    difficulty_breakdown = models.JSONField(default=dict)
    time_analysis = models.JSONField(default=dict)
    strengths = models.JSONField(default=list)
    weaknesses = models.JSONField(default=list)
    recommendations = models.JSONField(default=list)
    percentile = models.FloatField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Analysis - {self.user_exam}"

    class Meta:
        db_table = 'exam_analyses'


class ExamPaper(models.Model):
    """Uploaded exam papers for AI question generation"""
    school = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='exam_papers',
    )
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='uploaded_papers',
    )
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    chapter = models.ForeignKey(Chapter, on_delete=models.SET_NULL, null=True, blank=True)
    title = models.CharField(max_length=300)
    file = models.FileField(upload_to='exam_papers/%Y/%m/')
    total_marks = models.IntegerField(default=50)
    extracted_text = models.TextField(blank=True)
    questions_generated = models.BooleanField(default=False)
    generation_error = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.subject.name}"

    class Meta:
        db_table = 'exam_papers'
        ordering = ['-created_at']


class TeacherAssignment(models.Model):
    """Maps a teacher to a subject and their assigned students"""
    school = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='school_teacher_assignments',
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='teaching_assignments',
    )
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    students = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True,
        related_name='student_teacher_assignments',
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.teacher.get_full_name()} - {self.subject.name}"

    class Meta:
        db_table = 'teacher_assignments'
        unique_together = ['teacher', 'subject']
        ordering = ['teacher', 'subject']


class AssignedExam(models.Model):
    """Teacher-assigned exams to students"""
    school = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='assigned_exams_school',
    )
    teacher = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='assigned_exams_teacher',
    )
    title = models.CharField(max_length=300)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    chapters = models.ManyToManyField(Chapter, blank=True)
    num_questions = models.IntegerField(default=29)  # 20 MCQ + 5 SHORT + 4 LONG
    total_marks = models.IntegerField(default=50)
    duration_minutes = models.IntegerField(default=90)
    assigned_to = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True,
        related_name='assigned_exams',
    )
    is_active = models.BooleanField(default=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.subject.name}"

    class Meta:
        db_table = 'assigned_exams'
        ordering = ['-created_at']
