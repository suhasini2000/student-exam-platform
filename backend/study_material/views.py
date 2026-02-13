from rest_framework import generics, permissions
from .models import StudyMaterial
from .serializers import StudyMaterialSerializer


class StudyMaterialListView(generics.ListAPIView):
    serializer_class = StudyMaterialSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = StudyMaterial.objects.filter(is_active=True).prefetch_related('key_concepts')
        chapter = self.request.query_params.get('chapter')
        if chapter:
            qs = qs.filter(chapter_id=chapter)
        return qs
