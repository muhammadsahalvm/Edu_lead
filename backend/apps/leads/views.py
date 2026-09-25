from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import (
    Lead,
    FollowUp,
    ActivityLog,
    ActivityType,
    LeadStatus,
    FollowUpStatus,
    FollowUpType,
)
from .serializers import (
    LeadListSerializer,
    LeadDetailSerializer,
    LeadCreateSerializer,
    StatusTransitionSerializer,
    ReassignLeadSerializer,
    FollowUpSerializer,
    ActivityLogSerializer,
)
from .filters import LeadFilterHelper
from .pagination import StandardResultsSetPagination
from .services.lifecycle_service import LifecycleService
from .services.assignment_service import AssignmentService
from .services.duplicate_service import DuplicateService
from apps.authentication.permissions import IsManager, IsManagerOrAssignedCounsellor

class LeadViewSet(viewsets.ModelViewSet):
    """
    Complete Lead Management ViewSet.
    Enforces role-based row-level permissions:
    - Managers view all leads across the institution.
    - Counsellors are strictly constrained to their own assigned leads.
    """
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAssignedCounsellor]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        if self.action == 'create':
            return LeadCreateSerializer
        elif self.action in ['retrieve', 'update', 'partial_update']:
            return LeadDetailSerializer
        return LeadListSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Lead.objects.filter(is_deleted=False).select_related('course', 'counsellor')

        # Row-level authorization scoping
        if not user.is_manager:
            queryset = queryset.filter(counsellor=user)

        # Apply searching, filtering, and ordering
        return LeadFilterHelper.filter_queryset(queryset, self.request.query_params, user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        auto_assign = serializer.validated_data.pop('auto_assign', True)
        counsellor = serializer.validated_data.get('counsellor')

        # Counsellors self-assign on manual creation; Managers can leave it to auto-assign or pick
        if user.is_counsellor:
            counsellor = user
        elif not counsellor and auto_assign:
            counsellor = AssignmentService.get_next_counsellor()

        with transaction.atomic():
            lead = serializer.save(counsellor=counsellor)

            # Check for potential duplicates to inform the frontend
            potential_duplicates = DuplicateService.find_potential_duplicates(
                email=lead.email,
                phone=lead.phone,
                exclude_lead_id=lead.id
            )

            audit_details = f"Lead created by {user.get_full_name() or user.username} via {lead.get_source_display()}."
            if potential_duplicates:
                dup_numbers = [d['lead_number'] for d in potential_duplicates]
                audit_details += f" (Note: Likely duplicate match with {', '.join(dup_numbers)})"

            ActivityLog.objects.create(
                lead=lead,
                actor=user,
                activity_type=ActivityType.LEAD_CREATED,
                new_value=lead.lead_number,
                details=audit_details
            )

        response_data = LeadDetailSerializer(lead, context={'request': request}).data
        response_data['duplicate_warning'] = bool(potential_duplicates)
        response_data['matched_duplicates_count'] = len(potential_duplicates)

        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_update(self, serializer):
        user = self.request.user
        old_lead = self.get_object()
        old_course = old_lead.course

        lead = serializer.save()

        # Check if course changed
        if old_course != lead.course:
            ActivityLog.objects.create(
                lead=lead,
                actor=user,
                activity_type=ActivityType.COURSE_CHANGED,
                old_value=old_course.name if old_course else 'None',
                new_value=lead.course.name if lead.course else 'None',
                details=f"Course preference changed by {user.get_full_name() or user.username}"
            )
        else:
            ActivityLog.objects.create(
                lead=lead,
                actor=user,
                activity_type=ActivityType.LEAD_UPDATED,
                details=f"Lead details updated by {user.get_full_name() or user.username}"
            )

    def perform_destroy(self, instance):
        # Soft delete preservation
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted', 'updated_at'])
        ActivityLog.objects.create(
            lead=instance,
            actor=self.request.user,
            activity_type=ActivityType.LEAD_UPDATED,
            details=f"Lead soft-deleted by {self.request.user.username}"
        )

    @action(detail=True, methods=['post'], url_path='transition-status')
    def transition_status(self, request, pk=None):
        """
        Controlled lifecycle status transition endpoint.
        Rejects invalid transitions with clear, descriptive error details without modifying data.
        """
        lead = self.get_object()
        serializer = StatusTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data['status']
        loss_reason = serializer.validated_data.get('loss_reason')
        loss_notes = serializer.validated_data.get('loss_notes')
        remarks = serializer.validated_data.get('remarks')

        try:
            updated_lead = LifecycleService.transition_status(
                lead=lead,
                new_status=new_status,
                actor=request.user,
                loss_reason=loss_reason,
                loss_notes=loss_notes,
                remarks=remarks
            )
            return Response(
                LeadDetailSerializer(updated_lead, context={'request': request}).data,
                status=status.HTTP_200_OK
            )
        except DjangoValidationError as exc:
            return Response(
                {'error': 'Invalid Status Transition', 'details': exc.message_dict if hasattr(exc, 'message_dict') else str(exc)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManager])
    def reassign(self, request, pk=None):
        """
        Manager-only action: Reassign lead to a new counsellor.
        Counsellors attempting this endpoint receive 403 Forbidden.
        """
        lead = self.get_object()
        serializer = ReassignLeadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        new_counsellor = serializer.validated_data['counsellor_id']
        reason = serializer.validated_data['reason']

        AssignmentService.assign_lead(
            lead=lead,
            counsellor=new_counsellor,
            actor=request.user,
            reason=f"Reassigned by {request.user.username}: {reason}"
        )

        return Response({
            'detail': f"Lead successfully reassigned to {new_counsellor.get_full_name() or new_counsellor.username}.",
            'counsellor_id': new_counsellor.id,
            'counsellor_name': new_counsellor.get_full_name() or new_counsellor.username,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """
        Duplicate inspection endpoint for real-time frontend form validation.
        """
        email = request.query_params.get('email', '').strip()
        phone = request.query_params.get('phone', '').strip()
        exclude_id = request.query_params.get('exclude_id')

        try:
            exclude_id_int = int(exclude_id) if exclude_id else None
        except ValueError:
            exclude_id_int = None

        duplicates = DuplicateService.find_potential_duplicates(
            email=email,
            phone=phone,
            exclude_lead_id=exclude_id_int
        )
        return Response({
            'has_duplicate': bool(duplicates),
            'count': len(duplicates),
            'duplicates': duplicates
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        Retrieve complete chronological activity log for this lead.
        """
        lead = self.get_object()
        activities = lead.activities.all().select_related('actor').order_by('-created_at')
        serializer = ActivityLogSerializer(activities, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


def recalculate_lead_next_followup(lead: Lead):
    """
    Recalculates and caches lead.next_followup_at based on pending follow-ups.
    """
    from apps.leads.services.followup_service import FollowUpService
    return FollowUpService.recalculate_lead_next_followup(lead)


class FollowUpViewSet(viewsets.ModelViewSet):
    """
    Follow-up Task ViewSet with role-level data scoping and complete lifecycle actions:
    - Scheduling (create)
    - Completion with outcome and optional next follow-up scheduling
    - Marking missed
    - Cancelling with mandatory reason
    - Overdue and Upcoming querysets
    """
    serializer_class = FollowUpSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerOrAssignedCounsellor]

    def get_queryset(self):
        user = self.request.user
        queryset = FollowUp.objects.select_related('lead', 'assigned_to', 'lead__counsellor')

        # Role scoping: Managers see all; Counsellors see only assigned leads / tasks
        if not user.is_manager:
            queryset = queryset.filter(Q(assigned_to=user) | Q(lead__counsellor=user))

        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)

        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        followup_type = self.request.query_params.get('followup_type')
        if followup_type:
            queryset = queryset.filter(followup_type=followup_type)

        now = timezone.now()
        is_overdue = self.request.query_params.get('is_overdue', '').lower()
        if is_overdue in ('true', '1', 'yes'):
            queryset = queryset.filter(status=FollowUpStatus.PENDING, scheduled_at__lt=now)

        is_upcoming = self.request.query_params.get('is_upcoming', '').lower()
        if is_upcoming in ('true', '1', 'yes'):
            queryset = queryset.filter(status=FollowUpStatus.PENDING, scheduled_at__gte=now)

        return queryset.order_by('scheduled_at')

    def perform_create(self, serializer):
        user = self.request.user
        assigned_to = serializer.validated_data.get('assigned_to', user)
        if user.is_counsellor:
            assigned_to = user

        follow_up = serializer.save(assigned_to=assigned_to)

        lead = follow_up.lead
        recalculate_lead_next_followup(lead)

        ActivityLog.objects.create(
            lead=lead,
            actor=user,
            activity_type=ActivityType.FOLLOWUP_CREATED,
            new_value=follow_up.get_followup_type_display(),
            details=(
                f"{follow_up.get_followup_type_display()} scheduled for "
                f"{follow_up.scheduled_at.strftime('%Y-%m-%d %H:%M')} "
                f"by {user.get_full_name() or user.username}."
            )
        )

    def perform_update(self, serializer):
        user = self.request.user
        follow_up = serializer.save()
        lead = follow_up.lead
        recalculate_lead_next_followup(lead)

        ActivityLog.objects.create(
            lead=lead,
            actor=user,
            activity_type=ActivityType.LEAD_UPDATED,
            details=f"Follow-up #{follow_up.id} updated by {user.get_full_name() or user.username}."
        )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """
        Mark follow-up as completed with mandatory outcome and optional notes.
        Optionally schedules the next follow-up seamlessly.
        """
        follow_up = self.get_object()

        if follow_up.status == FollowUpStatus.COMPLETED:
            return Response({'error': 'Follow-up is already marked as completed.'}, status=status.HTTP_400_BAD_REQUEST)
        if follow_up.status == FollowUpStatus.CANCELLED:
            return Response({'error': 'Cannot complete a cancelled follow-up.'}, status=status.HTTP_400_BAD_REQUEST)

        from .serializers import FollowUpCompleteSerializer
        serializer = FollowUpCompleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        outcome = serializer.validated_data['outcome']
        notes = serializer.validated_data.get('notes', '')
        next_followup_at = serializer.validated_data.get('next_followup_at')
        next_followup_type = serializer.validated_data.get('next_followup_type', FollowUpType.CALL)

        now = timezone.now()
        with transaction.atomic():
            follow_up.status = FollowUpStatus.COMPLETED
            follow_up.outcome = outcome
            follow_up.completed_at = now
            if notes:
                follow_up.notes = f"{follow_up.notes}\n[Completed Notes]: {notes}".strip()
            follow_up.save()

            lead = follow_up.lead
            lead.last_contacted_at = now

            # If lead was NEW, automatically advance to CONTACTED upon completed first outreach
            if lead.status == LeadStatus.NEW:
                lead.status = LeadStatus.CONTACTED
                ActivityLog.objects.create(
                    lead=lead,
                    actor=request.user,
                    activity_type=ActivityType.STATUS_CHANGED,
                    old_value=LeadStatus.NEW,
                    new_value=LeadStatus.CONTACTED,
                    details=f"Status automatically advanced to Contacted upon completed {follow_up.get_followup_type_display()}."
                )

            # Seamless next follow-up scheduling if provided
            next_followup_obj = None
            if next_followup_at:
                next_followup_obj = FollowUp.objects.create(
                    lead=lead,
                    assigned_to=follow_up.assigned_to,
                    scheduled_at=next_followup_at,
                    followup_type=next_followup_type,
                    status=FollowUpStatus.PENDING,
                    notes=f"Follow-up chained after {follow_up.get_followup_type_display()} on {now.strftime('%Y-%m-%d')}"
                )
                ActivityLog.objects.create(
                    lead=lead,
                    actor=request.user,
                    activity_type=ActivityType.FOLLOWUP_CREATED,
                    new_value=next_followup_obj.get_followup_type_display(),
                    details=f"Next follow-up scheduled for {next_followup_at.strftime('%Y-%m-%d %H:%M')}"
                )

            lead.save()
            recalculate_lead_next_followup(lead)

            ActivityLog.objects.create(
                lead=lead,
                actor=request.user,
                activity_type=ActivityType.FOLLOWUP_COMPLETED,
                old_value=follow_up.get_followup_type_display(),
                new_value=follow_up.get_outcome_display(),
                details=(
                    f"{follow_up.get_followup_type_display()} completed by {request.user.get_full_name() or request.user.username}. "
                    f"Outcome: {follow_up.get_outcome_display()}" + (f" | Notes: {notes}" if notes else "")
                )
            )

        response_data = FollowUpSerializer(follow_up, context={'request': request}).data
        if next_followup_obj:
            response_data['next_scheduled_followup'] = FollowUpSerializer(next_followup_obj, context={'request': request}).data

        return Response(response_data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mark-missed')
    def mark_missed(self, request, pk=None):
        """
        Flag scheduled follow-up as missed.
        """
        follow_up = self.get_object()

        if follow_up.status == FollowUpStatus.COMPLETED:
            return Response({'error': 'Cannot mark a completed follow-up as missed.'}, status=status.HTTP_400_BAD_REQUEST)
        if follow_up.status == FollowUpStatus.CANCELLED:
            return Response({'error': 'Cannot mark a cancelled follow-up as missed.'}, status=status.HTTP_400_BAD_REQUEST)

        from .serializers import FollowUpMissedSerializer
        serializer = FollowUpMissedSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notes = serializer.validated_data.get('notes', '')

        with transaction.atomic():
            follow_up.status = FollowUpStatus.MISSED
            if notes:
                follow_up.notes = f"{follow_up.notes}\n[Missed Notes]: {notes}".strip()
            follow_up.save()

            lead = follow_up.lead
            recalculate_lead_next_followup(lead)

            ActivityLog.objects.create(
                lead=lead,
                actor=request.user,
                activity_type=ActivityType.FOLLOWUP_MISSED,
                new_value=follow_up.get_followup_type_display(),
                details=(
                    f"{follow_up.get_followup_type_display()} scheduled for "
                    f"{follow_up.scheduled_at.strftime('%Y-%m-%d %H:%M')} was marked missed "
                    f"by {request.user.get_full_name() or request.user.username}."
                    + (f" Remarks: {notes}" if notes else "")
                )
            )

        return Response(FollowUpSerializer(follow_up, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a scheduled follow-up with mandatory reason.
        Does not appear as overdue once cancelled.
        """
        follow_up = self.get_object()

        if follow_up.status == FollowUpStatus.COMPLETED:
            return Response({'error': 'Cannot cancel a completed follow-up.'}, status=status.HTTP_400_BAD_REQUEST)
        if follow_up.status == FollowUpStatus.CANCELLED:
            return Response({'error': 'Follow-up is already cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

        from .serializers import FollowUpCancelSerializer
        serializer = FollowUpCancelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data['reason']

        with transaction.atomic():
            follow_up.status = FollowUpStatus.CANCELLED
            follow_up.notes = f"{follow_up.notes}\n[Cancelled]: {reason}".strip()
            follow_up.save()

            lead = follow_up.lead
            recalculate_lead_next_followup(lead)

            ActivityLog.objects.create(
                lead=lead,
                actor=request.user,
                activity_type=ActivityType.FOLLOWUP_CANCELLED,
                new_value=follow_up.get_followup_type_display(),
                details=(
                    f"{follow_up.get_followup_type_display()} scheduled for "
                    f"{follow_up.scheduled_at.strftime('%Y-%m-%d %H:%M')} was cancelled by "
                    f"{request.user.get_full_name() or request.user.username}. Reason: {reason}"
                )
            )

        return Response(FollowUpSerializer(follow_up, context={'request': request}).data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """
        Quick endpoint for upcoming scheduled follow-ups.
        """
        queryset = self.get_queryset().filter(
            status=FollowUpStatus.PENDING,
            scheduled_at__gte=timezone.now()
        ).order_by('scheduled_at')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """
        Quick endpoint for overdue follow-ups (pending & scheduled_at < NOW).
        """
        queryset = self.get_queryset().filter(
            status=FollowUpStatus.PENDING,
            scheduled_at__lt=timezone.now()
        ).order_by('scheduled_at')

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log ViewSet.
    Counsellors only view activities for their assigned leads.
    """
    serializer_class = ActivityLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ActivityLog.objects.select_related('actor', 'lead')
        if not user.is_manager:
            queryset = queryset.filter(lead__counsellor=user)

        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)

        activity_type = self.request.query_params.get('activity_type')
        if activity_type:
            queryset = queryset.filter(activity_type=activity_type)

        return queryset.order_by('-created_at')
