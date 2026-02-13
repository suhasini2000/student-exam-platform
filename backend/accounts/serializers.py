from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[('student', 'Student'), ('school', 'School')], default='student')

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'phone_number',
            'grade', 'board', 'school_name', 'role',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    school_account_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'date_of_birth', 'grade', 'board',
            'school_name', 'parent_phone', 'created_at',
            'role', 'school', 'student_id', 'school_account_name',
        ]
        read_only_fields = ['id', 'username', 'created_at', 'role', 'school', 'student_id']

    def get_school_account_name(self, obj):
        if obj.school:
            return obj.school.school_name or obj.school.username
        return None


class SchoolCreateTeacherSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[], write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password',
            'first_name', 'last_name', 'phone_number',
            'subject_ids',
        ]

    def create(self, validated_data):
        subject_ids = validated_data.pop('subject_ids', [])
        school = self.context['request'].user
        password = validated_data.pop('password')
        teacher = User(
            **validated_data,
            role='teacher',
            school=school,
            school_name=school.school_name,
            board=school.board,
        )
        teacher.set_password(password)
        teacher.save()

        # Create teacher-subject assignments
        if subject_ids:
            from exams.models import TeacherAssignment, Subject
            for subject_id in subject_ids:
                try:
                    subject = Subject.objects.get(id=subject_id)
                    TeacherAssignment.objects.get_or_create(
                        school=school, teacher=teacher, subject=subject,
                    )
                except Subject.DoesNotExist:
                    pass

        return teacher


class SchoolCreateStudentSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    teacher_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[], write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password',
            'first_name', 'last_name', 'phone_number',
            'grade', 'student_id', 'parent_phone',
            'teacher_ids',
        ]

    def create(self, validated_data):
        teacher_ids = validated_data.pop('teacher_ids', [])
        request_user = self.context['request'].user
        # Both school and teacher can create students
        school = request_user if request_user.role == 'school' else request_user.school
        password = validated_data.pop('password')
        student = User(
            **validated_data,
            role='student',
            school=school,
            school_name=school.school_name if school else '',
            board=school.board if school else 'CBSE',
        )
        student.set_password(password)
        student.save()

        # Add student to selected teachers' assignments
        if teacher_ids:
            from exams.models import TeacherAssignment
            assignments = TeacherAssignment.objects.filter(
                school=school, teacher_id__in=teacher_ids,
            )
            for assignment in assignments:
                assignment.students.add(student)

        return student


class MemberListSerializer(serializers.ModelSerializer):
    assigned_teachers = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'student_id', 'grade', 'phone_number',
            'is_active', 'created_at', 'assigned_teachers',
        ]

    def get_assigned_teachers(self, obj):
        if obj.role == 'student':
            from exams.models import TeacherAssignment
            assignments = TeacherAssignment.objects.filter(
                students=obj,
            ).select_related('teacher', 'subject')
            return [
                {
                    'teacher_name': a.teacher.get_full_name() or a.teacher.username,
                    'subject_name': a.subject.name,
                }
                for a in assignments
            ]
        if obj.role == 'teacher':
            from exams.models import TeacherAssignment
            assignments = TeacherAssignment.objects.filter(
                teacher=obj,
            ).select_related('subject')
            return [
                {'subject_name': a.subject.name}
                for a in assignments
            ]
        return []
