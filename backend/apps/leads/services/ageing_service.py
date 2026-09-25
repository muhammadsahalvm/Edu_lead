from datetime import timedelta
from django.db.models import Q
from django.utils import timezone
from django.conf import settings
from apps.leads.models import Lead, LeadStatus, AgeingCategory

class AgeingService:
    """
    Reusable domain service for Lead Ageing calculation based on created_at.
    
    BUSINESS RULES:
    - 0–2 days = Fresh (FRESH)
    - 3–7 days = Ageing (AGEING)
    - 8+ days  = Stale (STALE)
    - Terminal leads (CONVERTED, NOT_INTERESTED, LOST) = Closed (CLOSED)
    
    Dynamic & Non-Persistent:
    - Ageing label is NEVER permanently stored in the database.
    - Evaluated dynamically against timezone.now() or filtered via ORM queries.
    """

    FRESH_DAYS_MAX = getattr(settings, 'LEAD_FRESH_DAYS_MAX', 2)
    AGEING_DAYS_MAX = getattr(settings, 'LEAD_AGEING_DAYS_MAX', 7)

    @classmethod
    def calculate_ageing_days(cls, lead: Lead, now=None) -> float:
        """
        Calculates exact elapsed days since lead creation.
        """
        current_time = now or timezone.now()
        if not lead.created_at:
            return 0.0
        delta = current_time - lead.created_at
        return max(0.0, round(delta.total_seconds() / 86400.0, 1))

    @classmethod
    def get_ageing_category(cls, lead: Lead, now=None) -> str:
        """
        Classifies lead into FRESH, AGEING, STALE, or CLOSED dynamically.
        """
        if lead.status in [LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED, LeadStatus.LOST]:
            return AgeingCategory.CLOSED

        days = cls.calculate_ageing_days(lead, now=now)
        if days <= cls.FRESH_DAYS_MAX:
            return AgeingCategory.FRESH
        elif days <= cls.AGEING_DAYS_MAX:
            return AgeingCategory.AGEING
        return AgeingCategory.STALE

    @classmethod
    def filter_by_ageing(cls, queryset, ageing_category: str, now=None):
        """
        Applies performant ORM query filtering for a specific ageing bucket based on created_at.
        """
        current_time = now or timezone.now()
        fresh_cutoff = current_time - timedelta(days=cls.FRESH_DAYS_MAX)
        ageing_cutoff = current_time - timedelta(days=cls.AGEING_DAYS_MAX)

        terminal_statuses = [LeadStatus.CONVERTED, LeadStatus.NOT_INTERESTED, LeadStatus.LOST]

        category = ageing_category.upper()
        if category == AgeingCategory.CLOSED:
            return queryset.filter(status__in=terminal_statuses)
        elif category == AgeingCategory.FRESH:
            return queryset.exclude(status__in=terminal_statuses).filter(
                created_at__gte=fresh_cutoff
            )
        elif category == AgeingCategory.AGEING:
            return queryset.exclude(status__in=terminal_statuses).filter(
                created_at__lt=fresh_cutoff,
                created_at__gte=ageing_cutoff
            )
        elif category == AgeingCategory.STALE:
            return queryset.exclude(status__in=terminal_statuses).filter(
                created_at__lt=ageing_cutoff
            )
        return queryset
