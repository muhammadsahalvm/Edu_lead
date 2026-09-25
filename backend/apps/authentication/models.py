from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils.translation import gettext_lazy as _

class UserRole(models.TextChoices):
    MANAGER = 'MANAGER', _('Manager')
    COUNSELLOR = 'COUNSELLOR', _('Counsellor')

class User(AbstractUser):
    """
    Custom user model for EduLead Admission Management System.
    Supports role-based authorization: MANAGER and COUNSELLOR.
    """
    role = models.CharField(
        max_length=20,
        choices=UserRole.choices,
        default=UserRole.COUNSELLOR,
        db_index=True,
        help_text=_('Role governing system visibility and permissions.')
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        help_text=_('Contact number for internal staff directory.')
    )
    is_available_for_assignment = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_('Designates whether this counsellor can receive new automated lead assignments.')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('User')
        verbose_name_plural = _('Users')
        ordering = ['first_name', 'last_name', 'username']
        indexes = [
            models.Index(fields=['role', 'is_active', 'is_available_for_assignment'], name='idx_user_assignment_pool'),
        ]

    @property
    def is_manager(self) -> bool:
        return self.role == UserRole.MANAGER or self.is_superuser

    @property
    def is_counsellor(self) -> bool:
        return self.role == UserRole.COUNSELLOR

    def __str__(self) -> str:
        name = self.get_full_name() or self.username
        return f"{name} ({self.get_role_display()})"
