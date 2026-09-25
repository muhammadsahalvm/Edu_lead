from datetime import timedelta
from django.db.models import Q, Exists, OuterRef
from django.utils import timezone
from django.conf import settings
from apps.leads.models import Lead, FollowUp, FollowUpStatus, LeadStatus

class LeadFilterHelper:
    """
    Queryset filtering and search helper for Leads.
    Avoids unnecessary third-party dependencies by implementing clean, 
    performant Django ORM filtering.
    """

    @classmethod
    def filter_queryset(cls, queryset, query_params, user):
        # 1. Search Query (Name, Phone, Email, Lead ID)
        search_query = query_params.get('search', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(phone__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(lead_number__icontains=search_query)
            )

        # 2. Status Filter (Single or comma-separated list)
        status_param = query_params.get('status', '').strip()
        if status_param:
            statuses = [s.strip() for s in status_param.split(',') if s.strip()]
            queryset = queryset.filter(status__in=statuses)

        # 3. Course Filter
        course_id = query_params.get('course', '').strip()
        if course_id:
            queryset = queryset.filter(course_id=course_id)

        # 4. Source Filter (Single or comma-separated list)
        source_param = query_params.get('source', '').strip()
        if source_param:
            sources = [s.strip() for s in source_param.split(',') if s.strip()]
            queryset = queryset.filter(source__in=sources)

        # 5. Priority Filter
        priority = query_params.get('priority', '').strip()
        if priority:
            queryset = queryset.filter(priority=priority)

        # 6. Counsellor Filter (Managers only; Counsellors already row-filtered)
        if user.is_manager:
            counsellor_param = query_params.get('counsellor', '').strip()
            if counsellor_param:
                if counsellor_param.lower() in ('unassigned', 'none', 'null'):
                    queryset = queryset.filter(counsellor__isnull=True)
                else:
                    queryset = queryset.filter(counsellor_id=counsellor_param)

        # 7. Follow-up State Filter
        has_overdue = query_params.get('has_overdue_followup', '').strip().lower()
        now = timezone.now()
        overdue_subquery = FollowUp.objects.filter(
            lead=OuterRef('pk'),
            status=FollowUpStatus.PENDING,
            scheduled_at__lt=now
        )
        if has_overdue in ('true', '1', 'yes'):
            queryset = queryset.filter(Exists(overdue_subquery))
        elif has_overdue in ('false', '0', 'no'):
            queryset = queryset.exclude(Exists(overdue_subquery))

        # 8. Ageing Category Filter (FRESH, AGEING, STALE, CLOSED)
        ageing_category = query_params.get('ageing', '').strip().upper()
        if ageing_category:
            from apps.leads.services.ageing_service import AgeingService
            queryset = AgeingService.filter_by_ageing(queryset, ageing_category)

        # 9. Sorting / Ordering
        ordering = query_params.get('ordering', '-created_at').strip()
        allowed_sort_fields = [
            'created_at', '-created_at',
            'updated_at', '-updated_at',
            'first_name', '-first_name',
            'priority', '-priority',
            'status', '-status',
            'last_contacted_at', '-last_contacted_at',
            'next_followup_at', '-next_followup_at',
        ]
        if ordering in allowed_sort_fields:
            queryset = queryset.order_by(ordering)
        else:
            queryset = queryset.order_by('-created_at')

        return queryset
