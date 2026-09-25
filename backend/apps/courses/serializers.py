from rest_framework import serializers
from .models import Course

class CourseSerializer(serializers.ModelSerializer):
    degree_level_display = serializers.CharField(source='get_degree_level_display', read_only=True)

    class Meta:
        model = Course
        fields = [
            'id',
            'code',
            'name',
            'degree_level',
            'degree_level_display',
            'department',
            'duration_years',
            'fee_per_year',
            'is_active',
            'created_at',
            'updated_at',
        ]
