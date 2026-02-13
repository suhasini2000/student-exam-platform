from django.contrib import admin
from .models import StudyMaterial, KeyConcept


class KeyConceptInline(admin.TabularInline):
    model = KeyConcept
    extra = 1


@admin.register(StudyMaterial)
class StudyMaterialAdmin(admin.ModelAdmin):
    list_display = ['title', 'chapter', 'order', 'is_active']
    list_filter = ['chapter__subject', 'is_active']
    inlines = [KeyConceptInline]


@admin.register(KeyConcept)
class KeyConceptAdmin(admin.ModelAdmin):
    list_display = ['title', 'study_material', 'order']
