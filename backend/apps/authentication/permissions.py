from rest_framework import permissions
from .models import UserRole

class IsManager(permissions.BasePermission):
    """
    Allows access only to users with the MANAGER role (or Django superusers).
    """
    message = "Access forbidden. Only admissions managers are authorized to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.role == UserRole.MANAGER or request.user.is_superuser)
        )

class IsCounsellor(permissions.BasePermission):
    """
    Allows access only to authenticated users with the COUNSELLOR role.
    """
    message = "Access forbidden. Only admissions counsellors are authorized to perform this action."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == UserRole.COUNSELLOR
        )

class IsManagerOrAssignedCounsellor(permissions.BasePermission):
    """
    Object-level permission allowing Managers full access, but restricting
    Counsellors strictly to leads or follow-ups explicitly assigned to them.
    Prevents URL-tampering attacks where Counsellor A guesses Counsellor B's lead ID.
    """
    message = "Access forbidden. You are not authorized to view or modify this record."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        # Managers have global access
        if user.role == UserRole.MANAGER or user.is_superuser:
            return True

        # Check Lead object
        if hasattr(obj, 'counsellor_id'):
            return obj.counsellor_id == user.id

        # Check FollowUp object
        if hasattr(obj, 'assigned_to_id'):
            return obj.assigned_to_id == user.id or (obj.lead and obj.lead.counsellor_id == user.id)

        # Check ActivityLog object
        if hasattr(obj, 'lead') and hasattr(obj.lead, 'counsellor_id'):
            return obj.lead.counsellor_id == user.id

        return False
