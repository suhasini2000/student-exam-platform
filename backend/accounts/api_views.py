from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view, permission_classes as perm_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model

from .serializers import (
    RegisterSerializer, UserProfileSerializer,
    SchoolCreateTeacherSerializer, SchoolCreateStudentSerializer,
    MemberListSerializer,
)
from .permissions import IsSchoolUser, IsSchoolOrTeacher, IsTeacherUser

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(
            {'message': 'Registration successful', 'username': user.username, 'role': user.role},
            status=status.HTTP_201_CREATED,
        )


class ProfileView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class SchoolCreateTeacherView(generics.CreateAPIView):
    serializer_class = SchoolCreateTeacherSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        teacher = serializer.save()
        return Response(
            {'message': 'Teacher account created', 'username': teacher.username, 'id': teacher.id},
            status=status.HTTP_201_CREATED,
        )


class SchoolCreateStudentView(generics.CreateAPIView):
    serializer_class = SchoolCreateStudentSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolOrTeacher]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        return Response(
            {'message': 'Student account created', 'username': student.username, 'id': student.id},
            status=status.HTTP_201_CREATED,
        )


class SchoolMembersListView(generics.ListAPIView):
    """School lists all teachers & students under them."""
    serializer_class = MemberListSerializer
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def get_queryset(self):
        role_filter = self.request.query_params.get('role')
        qs = User.objects.filter(school=self.request.user, is_active=True)
        if role_filter in ('teacher', 'student'):
            qs = qs.filter(role=role_filter)
        return qs.order_by('role', 'first_name')


class TeacherStudentListView(generics.ListAPIView):
    """Teacher lists students. If ?subject=ID is given, filter to students assigned to this teacher for that subject."""
    serializer_class = MemberListSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeacherUser]

    def get_queryset(self):
        from exams.models import TeacherAssignment
        teacher = self.request.user
        subject_id = self.request.query_params.get('subject')

        if subject_id:
            # Filter to students assigned to this teacher for this subject
            assignment = TeacherAssignment.objects.filter(
                teacher=teacher, subject_id=subject_id,
            ).first()
            if assignment:
                return assignment.students.order_by('first_name')
            return User.objects.none()

        # No subject filter: return all students assigned to this teacher (across all subjects)
        assigned_student_ids = TeacherAssignment.objects.filter(
            teacher=teacher,
        ).values_list('students__id', flat=True).distinct()

        if assigned_student_ids:
            return User.objects.filter(id__in=assigned_student_ids, role='student').order_by('first_name')

        # Fallback: if teacher has no assignments, show all school students
        return User.objects.filter(
            school=teacher.school,
            role='student',
        ).order_by('first_name')


class DeleteMemberView(generics.DestroyAPIView):
    """School deletes a teacher or student account."""
    permission_classes = [permissions.IsAuthenticated, IsSchoolUser]

    def get_queryset(self):
        return User.objects.filter(school=self.request.user)


@api_view(['GET'])
@perm_classes([permissions.AllowAny])
def site_images_view(request):
    """Return active site images for the user's school, with global fallback."""
    from .models import SiteImage
    data = {}

    # Global defaults first
    for img in SiteImage.objects.filter(school__isnull=True, is_active=True):
        data[img.key] = {
            'title': img.title,
            'url': request.build_absolute_uri(img.image.url) if img.image else None,
        }

    # Override with school-specific images
    if request.user.is_authenticated:
        school = request.user if request.user.role == 'school' else request.user.school
        if school:
            for img in SiteImage.objects.filter(school=school, is_active=True):
                data[img.key] = {
                    'id': img.id,
                    'title': img.title,
                    'url': request.build_absolute_uri(img.image.url) if img.image else None,
                }

    return Response(data)


@api_view(['POST'])
@perm_classes([permissions.IsAuthenticated])
def site_image_upload_view(request):
    """School uploads/replaces a background image for a given key."""
    from .models import SiteImage
    if request.user.role != 'school':
        return Response({'error': 'Only school accounts can upload images.'}, status=403)

    key = request.data.get('key')
    image = request.FILES.get('image')
    title = request.data.get('title', '')

    if not key or not image:
        return Response({'error': 'Both key and image are required.'}, status=400)

    obj, created = SiteImage.objects.update_or_create(
        school=request.user, key=key,
        defaults={'title': title, 'image': image, 'is_active': True},
    )
    return Response({
        'id': obj.id,
        'key': obj.key,
        'title': obj.title,
        'url': request.build_absolute_uri(obj.image.url),
    }, status=201 if created else 200)


@api_view(['DELETE'])
@perm_classes([permissions.IsAuthenticated])
def site_image_delete_view(request, pk):
    """School deletes one of their background images."""
    from .models import SiteImage
    if request.user.role != 'school':
        return Response({'error': 'Only school accounts can delete images.'}, status=403)
    try:
        img = SiteImage.objects.get(pk=pk, school=request.user)
        img.delete()
        return Response({'message': 'Image deleted.'})
    except SiteImage.DoesNotExist:
        return Response({'error': 'Image not found.'}, status=404)
