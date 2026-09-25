from datetime import timedelta
from django.db.models import Count, Case, When, Q, IntegerField
from django.utils import timezone
from django.conf import settings

from apps.authentication.models import User, UserRole
from apps.leads.models import Lead, FollowUp, LeadStatus, FollowUpStatus, LeadSource, AgeingCategory

class DashboardAnalyticsService:
    """
    High-performance aggregation service for operational insights and management dashboards.
    
    PERFORMANCE DESIGN:
    - Uses single-pass SQL aggregations (Count with Case/When) instead of fetching Python model instances.
    - Scopes queries strictly based on the calling user's role (Manager vs Counsellor).
    - Prevents N+1 database queries.
    """

    @classmethod
    def get_summary_metrics(cls, user, now=None) -> dict:
        """
        Calculates high-level summary KPIs.
        
        CONVERSION RATE DEFINITION:
        Conversion Rate = (Total Converted Leads / Total Ingested Leads) * 100
        This measures the gross yield of all student enquiries reaching confirmed seat conversion.
        """
        current_time = now or timezone.now()
        today = current_time.date()

        # Scope leads queryset
        leads_qs = Lead.objects.filter(is_deleted=False)
        followups_qs = FollowUp.objects.all()

        if not user.is_manager:
            leads_qs = leads_qs.filter(counsellor=user)
            followups_qs = followups_qs.filter(Q(assigned_to=user) | Q(lead__counsellor=user))

        # Single-pass Lead aggregation
        lead_agg = leads_qs.aggregate(
            total_leads=Count('id'),
            new_leads=Count(Case(When(status=LeadStatus.NEW, then=1), output_field=IntegerField())),
            unassigned_leads=Count(Case(When(counsellor__isnull=True, then=1), output_field=IntegerField())),
            converted_leads=Count(Case(When(status=LeadStatus.CONVERTED, then=1), output_field=IntegerField())),
        )

        total_leads = lead_agg['total_leads'] or 0
        new_leads = lead_agg['new_leads'] or 0
        # If user is counsellor, unassigned leads count is 0
        unassigned_leads = (lead_agg['unassigned_leads'] or 0) if user.is_manager else 0
        converted_leads = lead_agg['converted_leads'] or 0

        # Conversion Rate Formula
        conversion_rate = round((converted_leads / total_leads * 100), 1) if total_leads > 0 else 0.0

        # Follow-up aggregations
        fu_agg = followups_qs.aggregate(
            todays_followups=Count(
                Case(
                    When(status=FollowUpStatus.PENDING, scheduled_at__date=today, then=1),
                    output_field=IntegerField()
                )
            ),
            overdue_followups=Count(
                Case(
                    When(status=FollowUpStatus.PENDING, scheduled_at__lt=current_time, then=1),
                    output_field=IntegerField()
                )
            ),
        )

        todays_followups = fu_agg['todays_followups'] or 0
        overdue_followups = fu_agg['overdue_followups'] or 0

        return {
            'total_leads': total_leads,
            'new_leads': new_leads,
            'unassigned_leads': unassigned_leads,
            'today_followups': todays_followups,
            'todays_followups': todays_followups,
            'overdue_followups': overdue_followups,
            'converted_leads': converted_leads,
            'conversion_rate': conversion_rate,
            'calculation_definition': 'converted_leads / total_leads * 100',
        }

    @classmethod
    def get_lead_funnel(cls, user) -> list[dict]:
        """
        Returns lead counts across the 7 progressive lifecycle funnel stages:
        NEW -> CONTACTED -> INTERESTED -> COUNSELLING_SCHEDULED ->
        APPLICATION_STARTED -> APPLICATION_SUBMITTED -> CONVERTED
        """
        funnel_stages = [
            (LeadStatus.NEW, 'New Enquiries'),
            (LeadStatus.CONTACTED, 'Contacted'),
            (LeadStatus.INTERESTED, 'Interested & Qualified'),
            (LeadStatus.COUNSELLING_SCHEDULED, 'Counselling Scheduled'),
            (LeadStatus.APPLICATION_STARTED, 'Application Started'),
            (LeadStatus.APPLICATION_SUBMITTED, 'Application Submitted'),
            (LeadStatus.CONVERTED, 'Enrolled / Converted'),
        ]

        leads_qs = Lead.objects.filter(is_deleted=False)
        if not user.is_manager:
            leads_qs = leads_qs.filter(counsellor=user)

        # Single-pass aggregation for all 7 stages
        when_clauses = {
            f"count_{code.lower()}": Count(Case(When(status=code, then=1), output_field=IntegerField()))
            for code, _ in funnel_stages
        }
        agg_results = leads_qs.aggregate(**when_clauses)

        funnel_data = []
        for code, label in funnel_stages:
            stage_count = agg_results.get(f"count_{code.lower()}", 0) or 0
            funnel_data.append({
                'stage': code,
                'stage_display': label,
                'count': stage_count,
            })

        return funnel_data

    @classmethod
    def get_source_analysis(cls, user) -> list[dict]:
        """
        Returns lead counts and proportions grouped by acquisition source.
        """
        leads_qs = Lead.objects.filter(is_deleted=False)
        if not user.is_manager:
            leads_qs = leads_qs.filter(counsellor=user)

        source_counts = (
            leads_qs.values('source')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        total_leads = sum(item['count'] for item in source_counts)

        source_labels = dict(LeadSource.choices)
        results = []
        for item in source_counts:
            src = item['source']
            count = item['count']
            pct = round((count / total_leads * 100), 1) if total_leads > 0 else 0.0
            results.append({
                'source': src,
                'source_display': str(source_labels.get(src, src)),
                'count': count,
                'percentage': pct,
            })

        return results

    @classmethod
    def get_course_analysis(cls, user) -> list[dict]:
        """
        Returns lead demand distribution grouped by academic program.
        """
        leads_qs = Lead.objects.filter(is_deleted=False)
        if not user.is_manager:
            leads_qs = leads_qs.filter(counsellor=user)

        course_counts = (
            leads_qs.values('course__id', 'course__code', 'course__name')
            .annotate(count=Count('id'))
            .order_by('-count')
        )

        total_leads = sum(item['count'] for item in course_counts)

        results = []
        for item in course_counts:
            c_id = item['course__id']
            c_name = item['course__name'] or 'Unspecified Program'
            c_code = item['course__code'] or 'N/A'
            count = item['count']
            pct = round((count / total_leads * 100), 1) if total_leads > 0 else 0.0

            results.append({
                'course_id': c_id,
                'course_code': c_code,
                'course_name': c_name,
                'count': count,
                'percentage': pct,
            })

        return results

    @classmethod
    def get_counsellor_workload(cls, user, now=None) -> list[dict]:
        """
        Returns operational workload distribution metrics per counsellor:
        - Assigned lead count
        - Pending follow-up count
        - Overdue follow-up count
        
        Designed strictly for team balancing, not a simplistic 'score'.
        """
        current_time = now or timezone.now()

        counsellor_qs = User.objects.filter(role=UserRole.COUNSELLOR, is_active=True)
        if not user.is_manager:
            # A counsellor only views their own operational workload
            counsellor_qs = counsellor_qs.filter(id=user.id)

        # High-performance DB annotation in single query
        workload_qs = counsellor_qs.annotate(
            assigned_lead_count=Count(
                'assigned_leads',
                filter=Q(assigned_leads__is_deleted=False),
                distinct=True
            ),
            pending_followup_count=Count(
                'assigned_follow_ups',
                filter=Q(assigned_follow_ups__status=FollowUpStatus.PENDING),
                distinct=True
            ),
            overdue_followup_count=Count(
                'assigned_follow_ups',
                filter=Q(
                    assigned_follow_ups__status=FollowUpStatus.PENDING,
                    assigned_follow_ups__scheduled_at__lt=current_time
                ),
                distinct=True
            ),
        ).order_by('first_name', 'last_name')

        results = []
        for c in workload_qs:
            results.append({
                'counsellor_id': c.id,
                'username': c.username,
                'full_name': c.get_full_name() or c.username,
                'email': c.email,
                'is_available_for_assignment': c.is_available_for_assignment,
                'assigned_lead_count': c.assigned_lead_count,
                'assigned_leads_count': c.assigned_lead_count,
                'pending_followup_count': c.pending_followup_count,
                'pending_followups_count': c.pending_followup_count,
                'overdue_followup_count': c.overdue_followup_count,
                'overdue_followups_count': c.overdue_followup_count,
            })

        return results

    @classmethod
    def get_ageing_breakdown(cls, user, now=None) -> dict:
        """
        Returns lead counts grouped into Fresh (0-2 days), Ageing (3-7 days),
        and Stale (8+ days) based on created_at.
        """
        current_time = now or timezone.now()
        fresh_days = getattr(settings, 'LEAD_FRESH_DAYS_MAX', 2)
        ageing_days = getattr(settings, 'LEAD_AGEING_DAYS_MAX', 7)

        fresh_cutoff = current_time - timedelta(days=fresh_days)
        ageing_cutoff = current_time - timedelta(days=ageing_days)

        leads_qs = Lead.objects.filter(is_deleted=False)
        if not user.is_manager:
            leads_qs = leads_qs.filter(counsellor=user)

        terminal_statuses = [LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED, LeadStatus.LOST]

        # Single DB query aggregation
        agg = leads_qs.aggregate(
            fresh_count=Count(
                Case(
                    When(~Q(status__in=terminal_statuses) & Q(created_at__gte=fresh_cutoff), then=1),
                    output_field=IntegerField()
                )
            ),
            ageing_count=Count(
                Case(
                    When(~Q(status__in=terminal_statuses) & Q(created_at__lt=fresh_cutoff, created_at__gte=ageing_cutoff), then=1),
                    output_field=IntegerField()
                )
            ),
            stale_count=Count(
                Case(
                    When(~Q(status__in=terminal_statuses) & Q(created_at__lt=ageing_cutoff), then=1),
                    output_field=IntegerField()
                )
            ),
            closed_count=Count(
                Case(
                    When(status__in=terminal_statuses, then=1),
                    output_field=IntegerField()
                )
            ),
        )

        return {
            'fresh': agg['fresh_count'] or 0,
            'ageing': agg['ageing_count'] or 0,
            'stale': agg['stale_count'] or 0,
            'closed': agg['closed_count'] or 0,
            'fresh_threshold_days': fresh_days,
            'ageing_threshold_days': ageing_days,
        }

    @classmethod
    def get_complete_dashboard(cls, user, now=None) -> dict:
        """
        Aggregates all operational metrics into a single cohesive response payload
        for optimal frontend rendering in React/Recharts.
        """
        current_time = now or timezone.now()
        return {
            'summary': cls.get_summary_metrics(user, now=current_time),
            'funnel': cls.get_lead_funnel(user),
            'source_analysis': cls.get_source_analysis(user),
            'course_analysis': cls.get_course_analysis(user),
            'counsellor_workload': cls.get_counsellor_workload(user, now=current_time),
            'ageing': cls.get_ageing_breakdown(user, now=current_time),
            'user_role': user.role if hasattr(user, 'role') else 'UNKNOWN',
            'generated_at': current_time.isoformat(),
        }
