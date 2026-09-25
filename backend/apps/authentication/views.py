from rest_framework import generics, permissions
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User, UserRole
from .serializers import CustomTokenObtainPairSerializer, UserProfileSerializer, CounsellorSummarySerializer

class CustomTokenObtainPairView(TokenObtainPairView):
    """Obtain JWT access and refresh token with embedded user role information."""
    serializer_class = CustomTokenObtainPairSerializer

class CurrentUserProfileView(generics.RetrieveUpdateAPIView):
    """Retrieve or update profile details of currently authenticated user."""
    serializer_class = UserProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user

class CounsellorListView(generics.ListAPIView):
    """List active counsellors for assignment dropdowns and filters."""
    serializer_class = CounsellorSummarySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return User.objects.filter(role=UserRole.COUNSELLOR, is_active=True).order_by('first_name', 'last_name')
