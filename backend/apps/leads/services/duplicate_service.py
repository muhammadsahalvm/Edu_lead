import re
from django.db.models import Q
from apps.leads.models import Lead

class DuplicateService:
    """
    Service responsible for detecting duplicate leads based on phone and email.
    
    DUPLICATE DETECTION STRATEGY:
    1. Normalization:
       - Phone numbers are cleaned of non-digit characters. If 10 or more digits,
         the last 10 digits are compared to catch varying prefixes (+91, 0, none).
       - Emails are lowercased and whitespace stripped.
    2. Matching Logic:
       - A potential duplicate is flagged if:
         * Cleaned phone matches an existing lead's phone, OR
         * Normalized email matches an existing lead's email.
    3. Non-Blocking Approach:
       - Educational enquiries frequently recur (e.g. student inquires for B.Tech CSE,
         then 2 weeks later inquires for B.Tech AI).
       - Duplicate detection does NOT bluntly abort the submission. Instead:
         * Flagged as a potential duplicate.
         * Previous lead records are returned in the API response.
         * An audit trail entry notes the relationship for counsellor awareness.
    """

    @classmethod
    def clean_phone(cls, phone: str) -> str:
        if not phone:
            return ""
        digits = re.sub(r'\D', '', phone)
        # If standard 10+ digits with country code, take last 10 digits for matching
        if len(digits) >= 10:
            return digits[-10:]
        return digits

    @classmethod
    def clean_email(cls, email: str) -> str:
        return email.strip().lower() if email else ""

    @classmethod
    def find_potential_duplicates(cls, email: str = None, phone: str = None, exclude_lead_id: int = None) -> list[dict]:
        """
        Searches existing non-deleted leads for phone or email matches.
        Returns a list of matching lead summaries with match reason.
        """
        cleaned_phone = cls.clean_phone(phone)
        cleaned_email = cls.clean_email(email)

        if not cleaned_phone and not cleaned_email:
            return []

        query = Q()
        if cleaned_phone:
            query |= Q(phone__endswith=cleaned_phone)
        if cleaned_email:
            query |= Q(email__iexact=cleaned_email)

        leads = Lead.objects.filter(is_deleted=False).filter(query).select_related('course', 'counsellor')
        if exclude_lead_id:
            leads = leads.exclude(id=exclude_lead_id)

        results = []
        for lead in leads[:5]:  # limit to top 5 matches
            match_types = []
            if cleaned_phone and lead.phone and cls.clean_phone(lead.phone) == cleaned_phone:
                match_types.append('PHONE')
            if cleaned_email and lead.email and cls.clean_email(lead.email) == cleaned_email:
                match_types.append('EMAIL')

            results.append({
                'id': lead.id,
                'lead_number': lead.lead_number,
                'full_name': lead.full_name,
                'email': lead.email,
                'phone': lead.phone,
                'status': lead.status,
                'status_display': lead.get_status_display(),
                'course_name': lead.course.name if lead.course else None,
                'counsellor_name': lead.counsellor.get_full_name() if lead.counsellor else 'Unassigned',
                'created_at': lead.created_at.isoformat(),
                'match_types': match_types,
            })

        return results
