from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.utils.translation import gettext_lazy as _
from decimal import Decimal

class DegreeLevel(models.TextChoices):
    UNDERGRADUATE = 'UNDERGRADUATE', _('Undergraduate (UG)')
    POSTGRADUATE = 'POSTGRADUATE', _('Postgraduate (PG)')
    DIPLOMA = 'DIPLOMA', _('Diploma')
    CERTIFICATE = 'CERTIFICATE', _('Certificate')
    DOCTORAL = 'DOCTORAL', _('Doctoral (Ph.D.)')

class Course(models.Model):
    """
    Academic program/course entity for lead preference tracking and admission pipeline.
    """
    code = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        help_text=_('Unique code identifying the course (e.g. BTECH_CSE, MBA_FIN).')
    )
    name = models.CharField(
        max_length=200,
        help_text=_('Full academic title of the program.')
    )
    degree_level = models.CharField(
        max_length=30,
        choices=DegreeLevel.choices,
        default=DegreeLevel.UNDERGRADUATE,
        db_index=True
    )
    department = models.CharField(
        max_length=100,
        blank=True,
        help_text=_('Academic department or faculty.')
    )
    duration_years = models.DecimalField(
        max_digits=3,
        decimal_places=1,
        default=Decimal('4.0'),
        validators=[MinValueValidator(Decimal('0.5'))],
        help_text=_('Duration of the program in years.')
    )
    fee_per_year = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Annual tuition fee in local currency.')
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text=_('Controls visibility in lead assignment and intake forms.')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('Course')
        verbose_name_plural = _('Courses')
        ordering = ['name']
        indexes = [
            models.Index(fields=['degree_level', 'is_active'], name='idx_course_level_active'),
        ]

    def clean(self):
        super().clean()
        if self.code:
            self.code = self.code.strip().upper()
        if self.duration_years and self.duration_years <= Decimal('0'):
            raise ValidationError({'duration_years': _('Duration must be greater than zero.')})
        if self.fee_per_year and self.fee_per_year < Decimal('0'):
            raise ValidationError({'fee_per_year': _('Tuition fee cannot be negative.')})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.name} ({self.code})"
