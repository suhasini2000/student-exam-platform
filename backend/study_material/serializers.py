from rest_framework import serializers
from .models import StudyMaterial, KeyConcept


class KeyConceptSerializer(serializers.ModelSerializer):
    class Meta:
        model = KeyConcept
        fields = ['id', 'title', 'description', 'formula', 'order']


class StudyMaterialSerializer(serializers.ModelSerializer):
    key_concepts = KeyConceptSerializer(many=True, read_only=True)
    chapter_name = serializers.CharField(source='chapter.name', read_only=True)

    class Meta:
        model = StudyMaterial
        fields = [
            'id', 'title', 'content', 'order',
            'chapter', 'chapter_name', 'key_concepts',
        ]
