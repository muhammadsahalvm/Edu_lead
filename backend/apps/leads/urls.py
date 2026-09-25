from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LeadViewSet, FollowUpViewSet, ActivityLogViewSet

app_name = 'leads'

router = DefaultRouter()
router.register(r'follow-ups', FollowUpViewSet, basename='followup')
router.register(r'activities', ActivityLogViewSet, basename='activity')
router.register(r'', LeadViewSet, basename='lead')

urlpatterns = [
    path('', include(router.urls)),
]
