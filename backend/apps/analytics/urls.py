from django.urls import path
from .views import (
    DashboardOverviewView,
    SummaryMetricsView,
    LeadFunnelView,
    SourceAnalysisView,
    CourseAnalysisView,
    CounsellorWorkloadView,
    AgeingAnalysisView,
)

app_name = 'analytics'

urlpatterns = [
    path('dashboard/', DashboardOverviewView.as_view(), name='dashboard_overview'),
    path('summary/', SummaryMetricsView.as_view(), name='summary_metrics'),
    path('funnel/', LeadFunnelView.as_view(), name='lead_funnel'),
    path('sources/', SourceAnalysisView.as_view(), name='source_analysis'),
    path('courses/', CourseAnalysisView.as_view(), name='course_analysis'),
    path('counsellor-workload/', CounsellorWorkloadView.as_view(), name='counsellor_workload'),
    path('ageing/', AgeingAnalysisView.as_view(), name='ageing_analysis'),
]
