"""
URL configuration for edulead_api.
"""

from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "EduLead Admission Lead Management API",
        "version": "1.0.0"
    })

urlpatterns = [
    path('', health_check, name='root-health'),
    path('api/health/', health_check, name='api-health'),
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/courses/', include('apps.courses.urls')),
    path('api/v1/leads/', include('apps.leads.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
]

