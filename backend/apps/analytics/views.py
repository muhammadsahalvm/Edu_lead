from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from .services import DashboardAnalyticsService

class DashboardOverviewView(APIView):
    """
    Main dashboard endpoint returning complete operational insights:
    Summary metrics, funnel, sources, courses, workload, and ageing breakdown.
    Automatically scoped based on user role.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = DashboardAnalyticsService.get_complete_dashboard(request.user)
        return Response(data, status=status.HTTP_200_OK)


class SummaryMetricsView(APIView):
    """Returns high-level KPI cards and conversion rate."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = DashboardAnalyticsService.get_summary_metrics(request.user)
        return Response(data, status=status.HTTP_200_OK)


class LeadFunnelView(APIView):
    """Returns 7-stage conversion funnel data."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = DashboardAnalyticsService.get_lead_funnel(request.user)
        return Response(data, status=status.HTTP_200_OK)


class SourceAnalysisView(APIView):
    """Returns lead distribution and percentage grouped by acquisition channel."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = DashboardAnalyticsService.get_source_analysis(request.user)
        return Response(data, status=status.HTTP_200_OK)


class CourseAnalysisView(APIView):
    """Returns lead volume grouped by academic course preference."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = DashboardAnalyticsService.get_course_analysis(request.user)
        return Response(data, status=status.HTTP_200_OK)


class CounsellorWorkloadView(APIView):
    """Returns operational workload (assigned leads, pending follow-ups, overdue follow-ups)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = DashboardAnalyticsService.get_counsellor_workload(request.user)
        return Response(data, status=status.HTTP_200_OK)


class AgeingAnalysisView(APIView):
    """Returns dynamic ageing distribution (Fresh, Ageing, Stale)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = DashboardAnalyticsService.get_ageing_breakdown(request.user)
        return Response(data, status=status.HTTP_200_OK)
