from django.db import models
from exams.models import Chapter


class StudyMaterial(models.Model):
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='study_materials')
    title = models.CharField(max_length=200)
    content = models.TextField()
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.chapter.name} - {self.title}"

    class Meta:
        db_table = 'study_materials'
        ordering = ['chapter', 'order']


class KeyConcept(models.Model):
    study_material = models.ForeignKey(StudyMaterial, on_delete=models.CASCADE, related_name='key_concepts')
    title = models.CharField(max_length=200)
    description = models.TextField()
    formula = models.TextField(blank=True)
    order = models.IntegerField(default=0)

    def __str__(self):
        return self.title

    class Meta:
        db_table = 'key_concepts'
        ordering = ['order']
