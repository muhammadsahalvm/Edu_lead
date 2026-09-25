from django.contrib import admin
from .models import Course

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'degree_level', 'department', 'duration_years', 'fee_per_year', 'is_active')
    list_filter = ('degree_level', 'is_active', 'department')
    search_fields = ('code', 'name', 'department')
    ordering = ('name',)
    list_editable = ('is_active', 'fee_per_year')
