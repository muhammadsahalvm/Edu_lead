"""
URL configuration for edulead_api.
"""

from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/auth/', include('apps.authentication.urls')),
    path('api/v1/courses/', include('apps.courses.urls')),
    path('api/v1/leads/', include('apps.leads.urls')),
    path('api/v1/analytics/', include('apps.analytics.urls')),
]
