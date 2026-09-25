from rest_framework import viewsets, permissions
from .models import Course
from .serializers import CourseSerializer
from apps.authentication.permissions import IsManager

class CourseViewSet(viewsets.ModelViewSet):
    """
    CRUD ViewSet for Course management.
    - All authenticated users (Manager & Counsellor) can read courses for dropdowns and info.
    - Only users with role MANAGER (or superuser) can create, update, or delete courses.
    """
    queryset = Course.objects.all().order_by('name')
    serializer_class = CourseSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.IsAuthenticated()]
        return [IsManager()]
