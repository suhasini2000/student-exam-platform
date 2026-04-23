from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(choices=[('student', 'Student'), ('school', 'School')], default='student')
    board = serializers.CharField(max_length=50, required=False, default='CBSE')

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password', 'password2',
            'first_name', 'last_name', 'phone_number',
            'grade', 'board', 'school_name', 'role', 'org_type',
            'class_from', 'class_to',
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
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'phone_number', 'date_of_birth', 'grade', 'section', 'board',
            'school_name', 'parent_phone', 'created_at',
            'role', 'org_type', 'class_from', 'class_to',
            'school', 'student_id', 'teacher_id', 'school_account_name',
            'profile_photo',
        ]
        read_only_fields = ['id', 'username', 'created_at', 'role', 'school', 'student_id', 'teacher_id']

    def get_school_account_name(self, obj):
        if obj.school:
            return obj.school.school_name or obj.school.username
        return None

    def get_profile_photo(self, obj):
        if not obj.profile_photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return obj.profile_photo.url


class SchoolCreateTeacherSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])
    username = serializers.CharField(required=False, allow_blank=True)
    subject_ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, default=[], write_only=True,
    )

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password',
            'first_name', 'last_name', 'phone_number',
            'teacher_id', 'subject_ids',
        ]

    def _generate_unique_username(self, base):
        """Generate a unique username by appending numbers if needed."""
        username = base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1
        return username

    def create(self, validated_data):
        subject_ids = validated_data.pop('subject_ids', [])
        school = self.context['request'].user
        password = validated_data.pop('password')

        # Auto-generate unique username if not provided or already taken
        username = validated_data.get('username', '').strip()
        if not username:
            # Build from first_name + school short name
            first = validated_data.get('first_name', 'teacher').lower().replace(' ', '')
            org_prefix = (school.username or 'org')[:10].lower()
            username = f'{first}_{org_prefix}'
        # Ensure uniqueness
        validated_data['username'] = self._generate_unique_username(username)

        teacher = User(
            **validated_data,
            role='teacher',
            school=school,
            school_name=school.school_name,
            board=school.board,
            org_type=school.org_type,
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
    username = serializers.CharField(required=False, allow_blank=True)
    grade = serializers.CharField(required=False, allow_blank=True, default='')
    section = serializers.CharField(required=False, allow_blank=True, default='')

    class Meta:
        model = User
        fields = [
            'username', 'email', 'password',
            'first_name', 'last_name', 'phone_number',
            'grade', 'section', 'student_id', 'parent_phone',
        ]

    def _generate_unique_username(self, base):
        username = base
        counter = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1
        return username

    def create(self, validated_data):
        request_user = self.context['request'].user
        school = request_user if request_user.role == 'school' else request_user.school
        password = validated_data.pop('password')

        # Auto-generate unique username if not provided or already taken
        username = validated_data.get('username', '').strip()
        if not username:
            first = validated_data.get('first_name', 'student').lower().replace(' ', '')
            org_prefix = (school.username if school else 'org')[:10].lower()
            username = f'{first}_{org_prefix}'
        validated_data['username'] = self._generate_unique_username(username)

        student = User(
            **validated_data,
            role='student',
            school=school,
            school_name=school.school_name if school else '',
            board=school.board if school else 'CBSE',
            org_type=school.org_type if school else 'school',
        )
        student.set_password(password)
        student.save()
        return student


class MemberListSerializer(serializers.ModelSerializer):
    assigned_teachers = serializers.SerializerMethodField()
    profile_photo = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'student_id', 'teacher_id', 'grade', 'section', 'phone_number',
            'is_active', 'created_at', 'assigned_teachers', 'profile_photo',
        ]

    def get_profile_photo(self, obj):
        if not obj.profile_photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.profile_photo.url)
        return obj.profile_photo.url

    def get_assigned_teachers(self, obj):
        if obj.role == 'student':
            from exams.models import TeacherAssignment
            # Filter assignments where this specific student is added
            assignments = TeacherAssignment.objects.filter(
                students=obj,
                school=obj.school,
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
                {
                    'subject_name': a.subject.name,
                    'grade': a.grade,
                    'section': a.section,
                }
                for a in assignments
            ]
        return []
