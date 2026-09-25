from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.authentication.models import User, UserRole
from apps.courses.models import Course, DegreeLevel
from apps.leads.models import (
    Lead,
    FollowUp,
    ActivityLog,
    LeadStatus,
    LeadSource,
    LeadPriority,
    FollowUpType,
    FollowUpStatus,
    FollowUpOutcome,
    ActivityType,
)


class Command(BaseCommand):
    help = 'Seeds realistic educational institution demo data for testing dashboards and workflows.'

    def handle(self, *args, **options):
        self.stdout.write('Seeding institutional admission demo data...')

        # 1. Manager & Counsellors
        manager_priya, _ = User.objects.get_or_create(
            username='manager_priya',
            defaults={
                'email': 'priya.sharma@edulead.edu',
                'first_name': 'Priya',
                'last_name': 'Sharma',
                'role': UserRole.MANAGER,
                'phone': '+919876500001',
            }
        )
        manager_priya.set_password('Password@123')
        manager_priya.save()

        manager_sahal, _ = User.objects.get_or_create(
            username='manager_sahal',
            defaults={
                'email': 'sahal@edulead.edu',
                'first_name': 'Mohd',
                'last_name': 'Sahal',
                'role': UserRole.MANAGER,
                'phone': '+919876500000',
            }
        )
        manager_sahal.set_password('Password@123')
        manager_sahal.save()

        counsellor_1, _ = User.objects.get_or_create(
            username='counsellor_amit',
            defaults={
                'email': 'amit.verma@edulead.edu',
                'first_name': 'Amit',
                'last_name': 'Verma',
                'role': UserRole.COUNSELLOR,
                'phone': '+919876500002',
                'is_available_for_assignment': True,
            }
        )
        counsellor_1.set_password('Password@123')
        counsellor_1.save()

        counsellor_honey, _ = User.objects.get_or_create(
            username='counsellor_Honey',
            defaults={
                'email': 'Honey@edulead.edu',
                'first_name': 'Sinu',
                'last_name': 'Honey',
                'role': UserRole.COUNSELLOR,
                'phone': '+919876500005',
                'is_available_for_assignment': True,
            }
        )
        counsellor_honey.set_password('Password@123')
        counsellor_honey.save()

        counsellor_2, _ = User.objects.get_or_create(
            username='counsellor_neha',
            defaults={
                'email': 'neha.sen@edulead.edu',
                'first_name': 'Neha',
                'last_name': 'Sen',
                'role': UserRole.COUNSELLOR,
                'phone': '+919876500003',
                'is_available_for_assignment': True,
            }
        )
        counsellor_2.set_password('Password@123')
        counsellor_2.save()

        counsellor_3, _ = User.objects.get_or_create(
            username='counsellor_rahul',
            defaults={
                'email': 'rahul.roy@edulead.edu',
                'first_name': 'Rahul',
                'last_name': 'Roy',
                'role': UserRole.COUNSELLOR,
                'phone': '+919876500004',
                'is_available_for_assignment': True,
            }
        )
        counsellor_3.set_password('Password@123')
        counsellor_3.save()

        # 2. Courses
        c_btech, _ = Course.objects.get_or_create(
            code='BTECH_CS',
            defaults={
                'name': 'B.Tech in Computer Science & AI',
                'degree_level': DegreeLevel.UNDERGRADUATE,
                'department': 'School of Engineering',
                'duration_years': 4.0,
                'fee_per_year': 320000.00,
            }
        )

        c_mba, _ = Course.objects.get_or_create(
            code='MBA_EXEC',
            defaults={
                'name': 'Executive MBA in Digital Leadership',
                'degree_level': DegreeLevel.POSTGRADUATE,
                'department': 'School of Business',
                'duration_years': 2.0,
                'fee_per_year': 480000.00,
            }
        )

        c_bba, _ = Course.objects.get_or_create(
            code='BBA_IB',
            defaults={
                'name': 'BBA in International Business',
                'degree_level': DegreeLevel.UNDERGRADUATE,
                'department': 'School of Business',
                'duration_years': 3.0,
                'fee_per_year': 210000.00,
            }
        )

        c_mtech, _ = Course.objects.get_or_create(
            code='MTECH_DS',
            defaults={
                'name': 'M.Tech in Data Science & Cloud',
                'degree_level': DegreeLevel.POSTGRADUATE,
                'department': 'School of Computing',
                'duration_years': 2.0,
                'fee_per_year': 260000.00,
            }
        )

        now = timezone.now()

        # 3. Seed Leads with diverse funnel states, channels, and ageing
        sample_leads_data = [
            # Fresh Leads (0-2 days)
            {
                'first_name': 'Aarav', 'last_name': 'Patel', 'email': 'aarav.patel@gmail.com', 'phone': '+919811122233',
                'course': c_btech, 'source': LeadSource.WEBSITE, 'status': LeadStatus.NEW,
                'priority': LeadPriority.HIGH, 'counsellor': counsellor_1, 'age_days': 0.2
            },
            {
                'first_name': 'Diya', 'last_name': 'Mehta', 'email': 'diya.mehta@yahoo.com', 'phone': '+919811122234',
                'course': c_mba, 'source': LeadSource.WALK_IN, 'status': LeadStatus.CONTACTED,
                'priority': LeadPriority.HIGH, 'counsellor': counsellor_1, 'age_days': 1.0
            },
            {
                'first_name': 'Kabir', 'last_name': 'Kapoor', 'email': 'kabir.k@gmail.com', 'phone': '+919811122235',
                'course': c_btech, 'source': LeadSource.WHATSAPP, 'status': LeadStatus.INTERESTED,
                'priority': LeadPriority.HIGH, 'counsellor': counsellor_2, 'age_days': 1.5
            },
            {
                'first_name': 'Sanya', 'last_name': 'Gupta', 'email': 'sanya.g@outlook.com', 'phone': '+919811122236',
                'course': c_bba, 'source': LeadSource.CAMPAIGN, 'status': LeadStatus.NEW,
                'priority': LeadPriority.MEDIUM, 'counsellor': None, 'age_days': 0.5  # Unassigned
            },
            {
                'first_name': 'Dev', 'last_name': 'Rathore', 'email': 'dev.rathore@gmail.com', 'phone': '+919811122237',
                'course': c_mtech, 'source': LeadSource.WEBSITE, 'status': LeadStatus.NEW,
                'priority': LeadPriority.MEDIUM, 'counsellor': None, 'age_days': 0.8  # Unassigned
            },

            # Ageing Leads (3-7 days)
            {
                'first_name': 'Rohan', 'last_name': 'Iyer', 'email': 'rohan.iyer@gmail.com', 'phone': '+919811122238',
                'course': c_btech, 'source': LeadSource.EDUCATION_FAIR, 'status': LeadStatus.COUNSELLING_SCHEDULED,
                'priority': LeadPriority.HIGH, 'counsellor': counsellor_2, 'age_days': 4.0
            },
            {
                'first_name': 'Ananya', 'last_name': 'Nair', 'email': 'ananya.nair@hotmail.com', 'phone': '+919811122239',
                'course': c_mba, 'source': LeadSource.REFERRAL, 'status': LeadStatus.APPLICATION_STARTED,
                'priority': LeadPriority.HIGH, 'counsellor': counsellor_3, 'age_days': 5.0
            },
            {
                'first_name': 'Ishaan', 'last_name': 'Bose', 'email': 'ishaan.bose@gmail.com', 'phone': '+919811122240',
                'course': c_bba, 'source': LeadSource.WEBSITE, 'status': LeadStatus.APPLICATION_SUBMITTED,
                'priority': LeadPriority.HIGH, 'counsellor': counsellor_1, 'age_days': 6.0
            },

            # Stale Leads (8+ days) & Converted
            {
                'first_name': 'Meera', 'last_name': 'Joshi', 'email': 'meera.joshi@gmail.com', 'phone': '+919811122241',
                'course': c_btech, 'source': LeadSource.WEBSITE, 'status': LeadStatus.CONVERTED,
                'priority': LeadPriority.MEDIUM, 'counsellor': counsellor_1, 'age_days': 12.0, 'converted': True
            },
            {
                'first_name': 'Arjun', 'last_name': 'Reddy', 'email': 'arjun.reddy@gmail.com', 'phone': '+919811122242',
                'course': c_mba, 'source': LeadSource.CAMPAIGN, 'status': LeadStatus.CONVERTED,
                'priority': LeadPriority.HIGH, 'counsellor': counsellor_2, 'age_days': 15.0, 'converted': True
            },
            {
                'first_name': 'Pooja', 'last_name': 'Chopra', 'email': 'pooja.c@gmail.com', 'phone': '+919811122243',
                'course': c_mtech, 'source': LeadSource.PHONE, 'status': LeadStatus.INTERESTED,
                'priority': LeadPriority.LOW, 'counsellor': counsellor_3, 'age_days': 9.0
            },
            {
                'first_name': 'Vikram', 'last_name': 'Malhotra', 'email': 'vikram.m@gmail.com', 'phone': '+919811122244',
                'course': c_btech, 'source': LeadSource.EDUCATION_FAIR, 'status': LeadStatus.CONTACTED,
                'priority': LeadPriority.MEDIUM, 'counsellor': counsellor_3, 'age_days': 11.0
            },
        ]

        created_leads = []
        for item in sample_leads_data:
            lead_obj, created = Lead.objects.get_or_create(
                phone=item['phone'],
                defaults={
                    'first_name': item['first_name'],
                    'last_name': item['last_name'],
                    'email': item['email'],
                    'course': item['course'],
                    'source': item['source'],
                    'status': item['status'],
                    'priority': item['priority'],
                    'counsellor': item['counsellor'],
                }
            )
            # Adjust created_at to simulate exact ageing
            Lead.objects.filter(id=lead_obj.id).update(
                created_at=now - timedelta(days=item['age_days']),
                converted_at=(now - timedelta(days=item['age_days'] - 2)) if item.get('converted') else None
            )
            lead_obj.refresh_from_db()
            created_leads.append(lead_obj)

        # 4. Seed Follow-ups: Today, Overdue, and Completed
        if created_leads:
            # Overdue Follow-up 1 (Amit Verma)
            FollowUp.objects.get_or_create(
                lead=created_leads[0],
                assigned_to=counsellor_1,
                scheduled_at=now - timedelta(hours=18),
                defaults={
                    'followup_type': FollowUpType.CALL,
                    'status': FollowUpStatus.PENDING,
                    'notes': 'Overdue phone discussion on scholarship eligibility and BTech syllabus.',
                }
            )

            # Overdue Follow-up 2 (Neha Sen)
            FollowUp.objects.get_or_create(
                lead=created_leads[2],
                assigned_to=counsellor_2,
                scheduled_at=now - timedelta(days=1, hours=3),
                defaults={
                    'followup_type': FollowUpType.WHATSAPP,
                    'status': FollowUpStatus.PENDING,
                    'notes': 'Overdue WhatsApp brochure share requested by candidate.',
                }
            )

            # Today Follow-up 1 (Amit Verma)
            FollowUp.objects.get_or_create(
                lead=created_leads[1],
                assigned_to=counsellor_1,
                scheduled_at=now + timedelta(hours=2),
                defaults={
                    'followup_type': FollowUpType.COUNSELLING,
                    'status': FollowUpStatus.PENDING,
                    'notes': 'Today 2:30 PM Counselling session regarding MBA fee breakdown.',
                }
            )

            # Today Follow-up 2 (Rahul Roy)
            FollowUp.objects.get_or_create(
                lead=created_leads[6],
                assigned_to=counsellor_3,
                scheduled_at=now + timedelta(hours=4),
                defaults={
                    'followup_type': FollowUpType.CALL,
                    'status': FollowUpStatus.PENDING,
                    'notes': 'Document verification call for MBA application submission.',
                }
            )

            # Completed Follow-up
            FollowUp.objects.get_or_create(
                lead=created_leads[7],
                assigned_to=counsellor_1,
                scheduled_at=now - timedelta(days=2),
                defaults={
                    'followup_type': FollowUpType.MEETING,
                    'status': FollowUpStatus.COMPLETED,
                    'outcome': FollowUpOutcome.MEETING_COMPLETED,
                    'notes': 'Campus visit concluded. Candidate submitted documentation.',
                }
            )

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded: {User.objects.count()} Users, {Course.objects.count()} Courses, "
            f"{Lead.objects.count()} Leads, {FollowUp.objects.count()} Follow-ups."
        ))
