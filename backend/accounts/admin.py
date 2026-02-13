from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, SiteImage


@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'school', 'phone_number', 'is_staff']
    list_filter = ['role', 'is_staff', 'is_active', 'board']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'student_id']
    fieldsets = UserAdmin.fieldsets + (
        ('Role & School', {
            'fields': ('role', 'school', 'student_id')
        }),
        ('Additional Info', {
            'fields': ('phone_number', 'date_of_birth', 'address', 'grade', 'board', 'school_name', 'parent_phone')
        }),
    )


@admin.register(SiteImage)
class SiteImageAdmin(admin.ModelAdmin):
    list_display = ['key', 'title', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['key', 'title']
