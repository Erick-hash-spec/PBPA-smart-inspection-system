from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from django.http import HttpResponse
from django.contrib.auth.models import User
from django.conf import settings
from django.db.models import F
from django.utils import timezone
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
from datetime import datetime, time, timedelta
import logging
import io
import json

sec_log = logging.getLogger('inspections.security')


class LoginRateThrottle(AnonRateThrottle):
    rate = '10/minute'

from .models import (
    UserProfile, Tank, Inspection, Seal, Isolation,
    InspectionCalculation, InspectionReport,
    ProductReceiptCertificate,
    SealIsolationReport,
    ShoreTankCalculation,
    Submission, VesselReport, RosterAssignment,
    ProvisionalOuturnReport, ProvisionalOuturnItem,
    StockReport,
)
from .serializers import (
    UserSerializer, UserProfileSerializer, UserRegistrationSerializer,
    TankSerializer, TankDetailSerializer,
    SealSerializer, IsolationSerializer,
    InspectionCalculationSerializer, InspectionReportSerializer,
    InspectionListSerializer, InspectionCreateSerializer, InspectionDetailSerializer,
    InspectionApprovalSerializer,
    ProductReceiptCertificateListSerializer,
    ProductReceiptCertificateDetailSerializer,
    SealIsolationReportListSerializer,
    SealIsolationReportDetailSerializer,
    ShoreTankCalculationListSerializer,
    ShoreTankCalculationDetailSerializer,
    SubmissionSerializer, VesselReportSerializer, RosterAssignmentSerializer,
    ProvisionalOuturnReportSerializer,
    StockReportSerializer,
)
from .permissions import IsInspector, IsSupervisor, IsAdmin
from .calculations import InspectionCalculationEngine, ShoreTankCalculationEngine
from .shore_tank_utils import (
    ShoreTankDocumentGenerator,
    generate_shore_tank_document,
    generate_product_receipt_document,
    generate_seal_isolation_document,
    generate_dip_ticket_document,
    generate_dip_ticket_pdf,
    generate_seal_isolation_pdf,
    generate_shore_tank_pdf,
)
from .astm_tables import density_at_20_from_table, vcf_from_table, wcf_from_density, table_range
from .signing import sign_pdf_bytes, get_signature_info, compute_document_hash


def get_or_create_user_profile(user):
    """Return a profile for existing users that may predate profile creation."""
    role = 'admin' if user.is_staff or user.is_superuser else 'inspector'
    profile, _ = UserProfile.objects.get_or_create(user=user, defaults={'role': role})
    return profile


def period_start_date(period):
    """Return the local start date for a supported period filter."""
    today = timezone.localdate()
    if period == 'daily':
        return today
    if period == 'weekly':
        return today - timedelta(days=today.weekday())
    if period == 'monthly':
        return today.replace(day=1)
    if period == 'yearly':
        return today.replace(month=1, day=1)
    return None


def filter_queryset_by_period(queryset, period, date_field):
    """Apply all/daily/weekly/monthly/yearly filters to DateField or DateTimeField values."""
    start_date = period_start_date(period)
    if not start_date:
        return queryset

    today = timezone.localdate()
    field = queryset.model._meta.get_field(date_field)
    if field.get_internal_type() == 'DateTimeField':
        return queryset.filter(**{
            f'{date_field}__date__gte': start_date,
            f'{date_field}__date__lte': today,
        })

    return queryset.filter(**{
        f'{date_field}__gte': start_date,
        f'{date_field}__lte': today,
    })


def period_start_datetime(period):
    """Return a timezone-aware datetime for log/date-time activity filters."""
    start_date = period_start_date(period)
    if not start_date:
        return None
    return timezone.make_aware(datetime.combine(start_date, time.min), timezone.get_current_timezone())


def count_log_entries(log_name, tokens, period=None):
    """Best-effort count of already-recorded security/audit log events."""
    log_path = getattr(settings, 'LOG_DIR', None)
    if not log_path:
        return 0
    log_file = log_path / log_name
    if not log_file.exists():
        return 0

    start_at = period_start_datetime(period)
    total = 0
    try:
        with log_file.open('r', encoding='utf-8', errors='ignore') as handle:
            for line in handle:
                if not all(token in line for token in tokens):
                    continue
                if start_at:
                    event_at = parse_log_datetime(line)
                    if event_at and event_at < start_at:
                        continue
                total += 1
    except OSError:
        return 0
    return total


def parse_log_datetime(line):
    """Parse either JSON or verbose Django log timestamps."""
    try:
        payload = json.loads(line)
        value = payload.get('asctime') or payload.get('timestamp')
        if value:
            parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
            return parsed if timezone.is_aware(parsed) else timezone.make_aware(parsed)
    except (ValueError, TypeError):
        pass

    parts = line.split()
    if len(parts) >= 3:
        try:
            parsed = datetime.fromisoformat(f'{parts[1]} {parts[2].split(",")[0]}')
            return timezone.make_aware(parsed, timezone.get_current_timezone())
        except (ValueError, TypeError):
            return None
    return None


def build_activity_overview(period=None):
    """Build admin/supervisor activity metrics for dashboard charts."""
    report_models = (
        Inspection,
        ProductReceiptCertificate,
        SealIsolationReport,
        ShoreTankCalculation,
        StockReport,
        ProvisionalOuturnReport,
        VesselReport,
    )

    report_creation = sum(
        filter_queryset_by_period(model.objects.all(), period, 'created_at').count()
        for model in report_models
    )
    report_editing = sum(
        filter_queryset_by_period(model.objects.filter(updated_at__gt=F('created_at') + timedelta(seconds=2)), period, 'updated_at').count()
        for model in report_models
    )
    file_uploads = filter_queryset_by_period(InspectionReport.objects.all(), period, 'generated_at').count()

    failed_login_attempts = count_log_entries('security.log', ['Unauthorized access attempt'], period)
    auth_attempts = count_log_entries('security.log', ['Authentication attempt'], period)
    password_changes = count_log_entries('security.log', ['reset password'], period)
    admin_actions = (
        count_log_entries('security.log', ['Admin '], period)
        + filter_queryset_by_period(User.objects.filter(is_staff=True), period, 'date_joined').count()
    )
    report_deletion = count_log_entries('audit.log', ['DELETE request'], period)

    rows = [
        {'activity': 'User login/logout', 'value': max(auth_attempts - failed_login_attempts, 0), 'why': 'Security', 'color': '#2563eb'},
        {'activity': 'Report creation', 'value': report_creation, 'why': 'Usage monitoring', 'color': '#16a34a'},
        {'activity': 'Report editing', 'value': report_editing, 'why': 'Audit trail', 'color': '#f59e0b'},
        {'activity': 'Report deletion', 'value': report_deletion, 'why': 'Accountability', 'color': '#ef4444'},
        {'activity': 'Password changes', 'value': password_changes, 'why': 'Security tracking', 'color': '#7c3aed'},
        {'activity': 'Failed login attempts', 'value': failed_login_attempts, 'why': 'Detect attacks', 'color': '#dc2626'},
        {'activity': 'File uploads', 'value': file_uploads, 'why': 'Monitor storage use', 'color': '#0891b2'},
        {'activity': 'Admin actions', 'value': admin_actions, 'why': 'Transparency', 'color': '#4f46e5'},
    ]
    return rows


# ========== USER VIEWSETS ==========
class UserRegistrationViewSet(viewsets.ModelViewSet):
    """User creation — admin only (no public registration)."""
    queryset = User.objects.all()
    serializer_class = UserRegistrationSerializer
    permission_classes = (IsAuthenticated,)

    def get_serializer_class(self):
        if self.action == 'create':
            return UserRegistrationSerializer
        return UserSerializer

    def create(self, request, *args, **kwargs):
        # Only admins may create users
        profile = get_or_create_user_profile(request.user)
        if profile.role != 'admin':
            sec_log.warning('Non-admin user %s attempted to create a user.', request.user.username)
            return Response({'detail': 'Only admins can create users.'}, status=status.HTTP_403_FORBIDDEN)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        role = request.data.get('role', 'inspector')
        if role not in ('inspector', 'supervisor', 'admin'):
            role = 'inspector'
        UserProfile.objects.create(user=user, role=role)
        sec_log.info('Admin %s created user %s with role %s.', request.user.username, user.username, role)
        return Response(
            {'detail': 'User created successfully.', 'user_id': user.id},
            status=status.HTTP_201_CREATED
        )


class UserProfileViewSet(viewsets.ModelViewSet):
    """User profile management"""
    queryset = UserProfile.objects.all()
    serializer_class = UserProfileSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        user = self.request.user
        profile = get_or_create_user_profile(user)
        if profile.role == 'admin':
            return UserProfile.objects.all()
        return UserProfile.objects.filter(user=user)

    @action(detail=False, methods=['get'])
    def current_user(self, request):
        """Get current user's profile"""
        profile = get_or_create_user_profile(request.user)
        serializer = self.get_serializer(profile)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def list_inspectors(self, request):
        """Get all inspectors"""
        inspectors = UserProfile.objects.filter(role='inspector', is_active=True)
        serializer = self.get_serializer(inspectors, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def set_password(self, request, pk=None):
        """Admin sets password for any user."""
        profile = get_or_create_user_profile(request.user)
        if profile.role != 'admin':
            sec_log.warning('Non-admin %s attempted set_password.', request.user.username)
            return Response({'detail': 'Only admins can set passwords.'}, status=status.HTTP_403_FORBIDDEN)
        user_profile = self.get_object()
        password = request.data.get('password', '')
        if len(password) < 8:
            return Response({'detail': 'Password must be at least 8 characters.'}, status=status.HTTP_400_BAD_REQUEST)
        user_profile.user.set_password(password)
        user_profile.user.save()
        sec_log.info('Admin %s reset password for user %s.', request.user.username, user_profile.user.username)
        return Response({'detail': 'Password updated successfully.'})


class RosterAssignmentViewSet(viewsets.ModelViewSet):
    """Supervisor roster assignments for inspectors."""
    permission_classes = (IsAuthenticated,)
    serializer_class = RosterAssignmentSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['inspector__username', 'inspector__first_name', 'inspector__last_name', 'terminal', 'vessel_name', 'task']
    ordering_fields = ['week_start_date', 'created_at', 'status']
    ordering = ['-week_start_date', '-created_at']

    def get_queryset(self):
        profile = get_or_create_user_profile(self.request.user)
        qs = RosterAssignment.objects.select_related('inspector', 'supervisor')
        if profile.role == 'inspector':
            return qs.filter(inspector=self.request.user, status='sent')
        if profile.role in ('supervisor', 'admin'):
            return qs
        return qs.none()

    def _ensure_supervisor_or_admin(self, request):
        profile = get_or_create_user_profile(request.user)
        if profile.role not in ('supervisor', 'admin'):
            return Response({'detail': 'Only supervisors and admins can manage rosters.'}, status=status.HTTP_403_FORBIDDEN)
        return None

    def create(self, request, *args, **kwargs):
        denied = self._ensure_supervisor_or_admin(request)
        if denied:
            return denied
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        denied = self._ensure_supervisor_or_admin(request)
        if denied:
            return denied
        return super().update(request, *args, **kwargs)

    def partial_update(self, request, *args, **kwargs):
        denied = self._ensure_supervisor_or_admin(request)
        if denied:
            return denied
        return super().partial_update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        denied = self._ensure_supervisor_or_admin(request)
        if denied:
            return denied
        return super().destroy(request, *args, **kwargs)

    def perform_create(self, serializer):
        sent_at = timezone.now() if serializer.validated_data.get('status') == 'sent' else None
        serializer.save(supervisor=self.request.user, sent_at=sent_at, is_read=False)

    def perform_update(self, serializer):
        instance = self.get_object()
        status_value = serializer.validated_data.get('status', instance.status)
        sent_at = instance.sent_at
        if status_value == 'sent' and not sent_at:
            sent_at = timezone.now()
        serializer.save(sent_at=sent_at, is_read=False if status_value == 'sent' else instance.is_read)

    @action(detail=True, methods=['post'])
    def send(self, request, pk=None):
        denied = self._ensure_supervisor_or_admin(request)
        if denied:
            return denied
        assignment = self.get_object()
        if assignment.status == 'cancelled':
            return Response({'detail': 'Cancelled roster assignments cannot be sent.'}, status=status.HTTP_400_BAD_REQUEST)
        assignment.status = 'sent'
        assignment.sent_at = timezone.now()
        assignment.is_read = False
        assignment.save(update_fields=['status', 'sent_at', 'is_read', 'updated_at'])
        return Response(self.get_serializer(assignment).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        denied = self._ensure_supervisor_or_admin(request)
        if denied:
            return denied
        assignment = self.get_object()
        assignment.status = 'cancelled'
        assignment.save(update_fields=['status', 'updated_at'])
        return Response(self.get_serializer(assignment).data)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        profile = get_or_create_user_profile(request.user)
        if profile.role != 'inspector':
            return Response({'count': 0})
        count = RosterAssignment.objects.filter(inspector=request.user, status='sent', is_read=False).count()
        return Response({'count': count})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        assignment = self.get_object()
        assignment.is_read = True
        assignment.save(update_fields=['is_read', 'updated_at'])
        return Response(self.get_serializer(assignment).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        assignment = self.get_object()
        buf = io.BytesIO()
        pdf = canvas.Canvas(buf, pagesize=letter)
        width, height = letter
        y = height - 60

        pdf.setFont("Helvetica-Bold", 15)
        pdf.drawString(50, y, "INSPECTOR ROSTER ASSIGNMENT")
        y -= 35
        pdf.setFont("Helvetica", 10)

        days_str = ', '.join(assignment.working_days) if assignment.working_days else '-'
        rows = [
            ("Inspector", assignment.inspector.get_full_name() or assignment.inspector.username),
            ("Week Starting", assignment.week_start_date.strftime("%d-%m-%Y") if assignment.week_start_date else '-'),
            ("Working Days", days_str),
            ("Shift", assignment.get_shift_display()),
            ("Location", assignment.location or "-"),
            ("Terminal", assignment.terminal or "-"),
            ("Vessel", assignment.vessel_name or "-"),
            ("Task", assignment.task or "-"),
            ("Supervisor", assignment.supervisor.get_full_name() if assignment.supervisor else "-"),
            ("Status", assignment.get_status_display()),
        ]
        for label, value in rows:
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(50, y, f"{label}:")
            pdf.setFont("Helvetica", 10)
            pdf.drawString(170, y, str(value))
            y -= 20

        if assignment.notes:
            y -= 10
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(50, y, "Notes:")
            y -= 18
            pdf.setFont("Helvetica", 10)
            text = pdf.beginText(50, y)
            for line in assignment.notes.splitlines():
                text.textLine(line[:95])
            pdf.drawText(text)

        pdf.showPage()
        pdf.save()
        buf.seek(0)
        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Roster_{assignment.week_start_date}_{assignment.inspector.username}.pdf"'
        return response


# ========== TANK VIEWSETS ==========
class TankViewSet(viewsets.ModelViewSet):
    """Tank management"""
    queryset = Tank.objects.filter(is_active=True)
    permission_classes = (IsAuthenticated,)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tank_id', 'tank_name', 'product_type']
    ordering_fields = ['tank_id', 'created_at']
    ordering = ['tank_id']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return TankDetailSerializer
        return TankSerializer
    
    @action(detail=True, methods=['get'])
    def inspection_history(self, request, pk=None):
        """Get inspection history for a tank"""
        tank = self.get_object()
        inspections = tank.inspections.all().order_by('-inspection_date')
        
        # Pagination
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 10)
        start = (int(page) - 1) * int(page_size)
        end = start + int(page_size)
        
        inspections_page = inspections[start:end]
        serializer = InspectionListSerializer(inspections_page, many=True)
        
        return Response({
            'count': inspections.count(),
            'page': page,
            'page_size': page_size,
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get tank summary statistics"""
        tanks = self.get_queryset()
        total_tanks = tanks.count()
        
        inspections = Inspection.objects.filter(tank__in=tanks)
        total_inspections = inspections.count()
        pending_inspections = inspections.filter(status='submitted').count()
        
        return Response({
            'total_tanks': total_tanks,
            'total_inspections': total_inspections,
            'pending_inspections': pending_inspections,
            'inspection_rate': f"{(total_inspections / total_tanks * 100):.2f}%" if total_tanks > 0 else "0%"
        })


# ========== SEAL & ISOLATION VIEWSETS ==========
class SealViewSet(viewsets.ModelViewSet):
    """Seal management"""
    queryset = Seal.objects.all()
    serializer_class = SealSerializer
    permission_classes = (IsAuthenticated,)
    
    def get_queryset(self):
        inspection_id = self.request.query_params.get('inspection_id')
        if inspection_id:
            return Seal.objects.filter(inspection_id=inspection_id)
        return Seal.objects.all()


class IsolationViewSet(viewsets.ModelViewSet):
    """Isolation/Valve management"""
    queryset = Isolation.objects.all()
    serializer_class = IsolationSerializer
    permission_classes = (IsAuthenticated,)
    
    def get_queryset(self):
        inspection_id = self.request.query_params.get('inspection_id')
        if inspection_id:
            return Isolation.objects.filter(inspection_id=inspection_id)
        return Isolation.objects.all()


# ========== CALCULATION VIEWSET ==========
class InspectionCalculationViewSet(viewsets.ReadOnlyModelViewSet):
    """View calculations (read-only)"""
    queryset = InspectionCalculation.objects.all()
    serializer_class = InspectionCalculationSerializer
    permission_classes = (IsAuthenticated,)


# ========== REPORT VIEWSET ==========
class InspectionReportViewSet(viewsets.ModelViewSet):
    """Report management"""
    queryset = InspectionReport.objects.all()
    serializer_class = InspectionReportSerializer
    permission_classes = (IsAuthenticated,)
    
    def get_queryset(self):
        inspection_id = self.request.query_params.get('inspection_id')
        if inspection_id:
            return InspectionReport.objects.filter(inspection_id=inspection_id)
        return InspectionReport.objects.all()


# ========== INSPECTION VIEWSET (Main) ==========
class InspectionViewSet(viewsets.ModelViewSet):
    """Main inspection endpoint"""
    permission_classes = (IsAuthenticated,)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['tank__tank_name', 'tank__tank_id', 'inspector__username']
    ordering_fields = ['inspection_date', 'created_at', 'status']
    ordering = ['-inspection_date']
    
    def get_queryset(self):
        user = self.request.user
        status_filter = self.request.query_params.get('status')
        tank_id = self.request.query_params.get('tank_id')
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        period = self.request.query_params.get('period')
        
        queryset = Inspection.objects.all()
        
        # Role-based filtering
        profile = get_or_create_user_profile(user)

        if profile:
            if profile.role == 'inspector':
                queryset = queryset.filter(inspector=user)
            elif profile.role == 'supervisor':
                queryset = queryset.filter(status__in=['submitted', 'approved', 'rejected'])
        
        # Apply filters
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        if tank_id:
            queryset = queryset.filter(tank_id=tank_id)
        
        if date_from:
            queryset = queryset.filter(inspection_date__gte=date_from)
        
        if date_to:
            queryset = queryset.filter(inspection_date__lte=date_to)

        queryset = filter_queryset_by_period(queryset, period, 'inspection_date')
        
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'create':
            return InspectionCreateSerializer
        elif self.action == 'retrieve':
            return InspectionDetailSerializer
        elif self.action in ['approve', 'reject']:
            return InspectionApprovalSerializer
        return InspectionListSerializer
    
    def perform_create(self, serializer):
        """Override create to set inspector"""
        inspection = serializer.save(inspector=self.request.user)
        
        # Automatically trigger calculations
        try:
            calc_engine = InspectionCalculationEngine()
            calc_engine.calculate_all(inspection)
        except Exception as e:
            # Log error but don't fail the request
            print(f"Calculation error: {str(e)}")
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def approve(self, request, pk=None):
        """Approve an inspection (Supervisor only)"""
        inspection = self.get_object()
        
        if get_or_create_user_profile(request.user).role != 'supervisor':
            return Response(
                {'detail': 'Only supervisors can approve inspections'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if inspection.status != 'submitted':
            return Response(
                {'detail': 'Only submitted inspections can be approved'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        inspection.status = 'approved'
        inspection.supervisor = request.user
        inspection.approval_date = timezone.now()
        inspection.save()
        
        serializer = self.get_serializer(inspection)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def reject(self, request, pk=None):
        """Reject an inspection (Supervisor only)"""
        inspection = self.get_object()
        
        if get_or_create_user_profile(request.user).role != 'supervisor':
            return Response(
                {'detail': 'Only supervisors can reject inspections'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if inspection.status != 'submitted':
            return Response(
                {'detail': 'Only submitted inspections can be rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        reason = request.data.get('rejection_reason', '')
        inspection.status = 'rejected'
        inspection.supervisor = request.user
        inspection.approval_date = timezone.now()
        inspection.rejection_reason = reason
        inspection.save()
        
        serializer = self.get_serializer(inspection)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def submit(self, request, pk=None):
        """Submit an inspection for approval"""
        inspection = self.get_object()
        
        if inspection.inspector != request.user:
            return Response(
                {'detail': 'You can only submit your own inspections'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if inspection.status != 'draft':
            return Response(
                {'detail': 'Only draft inspections can be submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        inspection.status = 'submitted'
        inspection.save()
        
        serializer = self.get_serializer(inspection)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get dashboard statistics"""
        user = request.user
        period = request.query_params.get('period')
        
        profile = get_or_create_user_profile(user)

        inspections_qs = filter_queryset_by_period(Inspection.objects.all(), period, 'inspection_date')
        product_receipts_qs = filter_queryset_by_period(ProductReceiptCertificate.objects.all(), period, 'receipt_date')
        seal_reports_qs = filter_queryset_by_period(SealIsolationReport.objects.all(), period, 'report_date')
        shore_calcs_qs = filter_queryset_by_period(ShoreTankCalculation.objects.all(), period, 'calculation_date')
        stock_reports_qs = filter_queryset_by_period(StockReport.objects.all(), period, 'report_date')
        provisional_reports_qs = filter_queryset_by_period(ProvisionalOuturnReport.objects.all(), period, 'report_date')
        vessel_reports_qs = filter_queryset_by_period(VesselReport.objects.all(), period, 'discharge_date')

        document_counts = {
            'inspections': inspections_qs.count(),
            'product_receipt_certificates': product_receipts_qs.count(),
            'seal_isolation_reports': seal_reports_qs.count(),
            'shore_tank_calculations': shore_calcs_qs.count(),
            'stock_reports': stock_reports_qs.count(),
            'provisional_outturn_reports': provisional_reports_qs.count(),
            'vessel_reports': vessel_reports_qs.count(),
        }

        def get_status_counts(queryset):
            return {
                'draft': queryset.filter(status='draft').count(),
                'submitted': queryset.filter(status='submitted').count(),
                'approved': queryset.filter(status='approved').count(),
                'rejected': queryset.filter(status='rejected').count(),
            }
        
        if profile.role == 'inspector':
            inspections = inspections_qs.filter(inspector=user)
            total_inspections = inspections.count()
            status_counts = get_status_counts(inspections)
            
            return Response({
                'role': 'inspector',
                'total_inspections': total_inspections,
                **status_counts,
                'pending_approval': status_counts['submitted'],
                'document_counts': document_counts,
            })
        
        elif profile.role == 'supervisor':
            inspections = inspections_qs.filter(status='submitted')
            total_pending = inspections.count()
            approved = inspections_qs.filter(supervisor=user, status='approved').count()
            status_counts = get_status_counts(inspections_qs)
            activity_overview = build_activity_overview(period)
            
            return Response({
                'role': 'supervisor',
                'total_pending_approval': total_pending,
                'total_approved': approved,
                'awaiting_review': total_pending,
                **status_counts,
                'document_counts': document_counts,
                'activity_overview': activity_overview,
            })
        
        elif profile.role == 'admin':
            total_inspections = inspections_qs.count()
            total_tanks = Tank.objects.filter(is_active=True).count()
            status_counts = get_status_counts(inspections_qs)
            activity_overview = build_activity_overview(period)
            
            return Response({
                'role': 'admin',
                'total_inspections': total_inspections,
                'total_tanks': total_tanks,
                **status_counts,
                'document_counts': document_counts,
                'activity_overview': activity_overview,
            })
        
        return Response({'detail': 'Unknown role'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def generate_document(self, request, pk=None):
        """Generate Dip Ticket as PDF"""
        inspection = self.get_object()
        try:
            buf = generate_dip_ticket_pdf(inspection)
            response = HttpResponse(
                buf.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="Dip_Ticket_{inspection.ticket_number or inspection.id}.pdf"'
            return response
        except Exception as e:
            return Response({'detail': f'Document generation error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def recent(self, request):
        """Get recent inspections"""
        limit = request.query_params.get('limit', 10)
        inspections = self.get_queryset()[:int(limit)]
        serializer = InspectionListSerializer(inspections, many=True)
        return Response(serializer.data)


class ProductReceiptCertificateViewSet(viewsets.ModelViewSet):
    """CRUD and PDF generation for PBPA product receipt certificates."""
    permission_classes = (IsAuthenticated,)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['certificate_number', 'vessel_name', 'terminal', 'pbpa_inspector_name']
    ordering_fields = ['created_at', 'receipt_date', 'certificate_number', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = ProductReceiptCertificate.objects.select_related('created_by').prefetch_related('items__tank')
        user = self.request.user
        status_filter = self.request.query_params.get('status')
        period = self.request.query_params.get('period')

        if get_or_create_user_profile(user).role == 'inspector':
            queryset = queryset.filter(created_by=user)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        queryset = filter_queryset_by_period(queryset, period, 'receipt_date')
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update', 'retrieve']:
            return ProductReceiptCertificateDetailSerializer
        return ProductReceiptCertificateListSerializer

    def perform_create(self, serializer):
        full_name = self.request.user.get_full_name() or self.request.user.username
        serializer.save(created_by=self.request.user, pbpa_inspector_name=serializer.validated_data.get('pbpa_inspector_name') or full_name)

    @action(detail=True, methods=['post'])
    def sign_document(self, request, pk=None):
        """Digitally sign the Product Receipt Certificate PDF."""
        certificate = self.get_object()
        if certificate.is_signed:
            return Response({'detail': 'Document is already signed.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from reportlab.lib.pagesizes import letter
            from reportlab.pdfgen import canvas
            import io
            buf = self._build_pdf(certificate)
            pdf_bytes = buf.getvalue()
            signer_name = request.user.get_full_name() or request.user.username
            signed_bytes = sign_pdf_bytes(pdf_bytes, signer_name=signer_name, reason='PBPA Product Receipt Certificate')
            certificate.is_signed     = True
            certificate.signed_at     = timezone.now()
            certificate.signed_by     = request.user
            certificate.document_hash = compute_document_hash(signed_bytes)
            certificate.save(update_fields=['is_signed','signed_at','signed_by','document_hash','updated_at'])
            response = HttpResponse(signed_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="SIGNED_PRC_{certificate.certificate_number}.pdf"'
            return response
        except Exception as e:
            return Response({'detail': f'Signing failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='signature-info')
    def signature_info(self, request):
        return Response(get_signature_info())

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        certificate = self.get_object()
        if certificate.status == 'issued':
            return Response({'detail': 'Certificate has already been issued.'}, status=status.HTTP_400_BAD_REQUEST)

        certificate.status = 'issued'
        certificate.issued_at = timezone.now()
        certificate.save(update_fields=['status', 'issued_at', 'updated_at'])

        serializer = ProductReceiptCertificateDetailSerializer(certificate, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        certificate = self.get_object()
        pdf_buffer = self._build_pdf(certificate)
        response = HttpResponse(pdf_buffer.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="product-receipt-certificate-{certificate.certificate_number}.pdf"'
        return response
    
    @action(detail=True, methods=['get'])
    def generate_document(self, request, pk=None):
        certificate = self.get_object()
        try:
            buf = generate_product_receipt_document(certificate)
            response = HttpResponse(
                buf.getvalue(),
                content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            )
            response['Content-Disposition'] = f'attachment; filename="Product_Receipt_Cert_{certificate.certificate_number}.docx"'
            return response
        except Exception as e:
            return Response({'detail': f'Document generation error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)

    def _build_pdf(self, certificate):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm

        buffer = io.BytesIO()
        W, H = A4
        pdf = canvas.Canvas(buffer, pagesize=A4)
        M = 15 * mm
        TW = W - 2 * M
        y = H - 10 * mm

        # THE UNITED REPUBLIC OF TANZANIA
        pdf.setFont("Helvetica", 9)
        pdf.drawCentredString(W / 2, y, "THE UNITED REPUBLIC OF TANZANIA")
        y -= 8 * mm

        # PETROLEUM BULK PROCUREMENT AGENCY
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawCentredString(W / 2, y, "PETROLEUM BULK PROCUREMENT AGENCY")
        y -= 5 * mm
        pdf.setFont("Helvetica", 6.5)
        pdf.drawCentredString(W / 2, y,
            "TANZANIA PORTS AUTHORITY, ONE STOP CENTER BUILDING, 11TH FLOOR, SOKOINE DRIVE, PLOT NO:1/2")
        y -= 4 * mm
        pdf.drawCentredString(W / 2, y,
            "Tel: +255222129009 / Fax: +255222129093 / Email: info@pbpa.go.tz / WEBSITE: www.pbpa.go.tz / P.O. Box 2634 Dar es Salaam, TANZANIA")
        y -= 7 * mm

        # Title box
        box_h = 11 * mm
        box_x = M + 8 * mm
        box_w = TW - 16 * mm
        pdf.setFillColor(colors.white)
        pdf.setStrokeColor(colors.black)
        pdf.setLineWidth(2.5)
        pdf.rect(box_x, y - box_h, box_w, box_h, fill=1, stroke=1)
        pdf.setFillColor(colors.black)
        pdf.setLineWidth(0.5)
        pdf.setFont("Helvetica-Bold", 14)
        pdf.drawCentredString(W / 2, y - box_h + 3.5 * mm, "PRODUCT RECEIPT CERTIFICATE")
        y -= box_h + 5 * mm

        cert_no = certificate.certificate_number or ""

        # Dotted underline field helper
        def ufield(label, value, y_pos, lw=30 * mm, line_end=None):
            le = line_end if line_end else (W - M - 38 * mm)
            pdf.setFont("Helvetica", 9)
            pdf.drawString(M, y_pos, label)
            lx = M + lw
            pdf.setDash(1, 2)
            pdf.line(lx, y_pos - 1, le, y_pos - 1)
            pdf.setDash()
            pdf.setFont("Helvetica-Bold", 9)
            pdf.drawString(lx + 1, y_pos, str(value))

        lg = 8 * mm
        ufield("Vessel Name:", certificate.vessel_name, y)
        y -= lg
        ufield("Terminal:", certificate.terminal, y)
        pdf.setFont("Helvetica-Bold", 12)
        pdf.drawRightString(W - M, y + lg - 1 * mm, cert_no)
        y -= lg
        date_str = certificate.receipt_date.strftime("%d - %m - %Y") if certificate.receipt_date else ""
        ufield("Date:", date_str, y)
        y -= lg
        time_str = (certificate.receipt_time.strftime("%H.%M") + "Hrs") if certificate.receipt_time else ""
        ufield("Time:", time_str, y)
        y -= 7 * mm

        pdf.setFont("Helvetica", 9)
        pdf.drawString(M, y,
            "This is to confirm that the following Quantity was Delivered/Received into your tanks:")
        y -= 7 * mm

        # Items table
        cw = [TW * p for p in (0.12, 0.30, 0.29, 0.29)]
        rh = 8 * mm
        hdrs = ["Tank No.", "Product", "Weight in Tonnage", "Volume in Liters"]
        x = M
        pdf.setFont("Helvetica-Bold", 8)
        for i, h in enumerate(hdrs):
            pdf.rect(x, y - rh, cw[i], rh)
            pdf.drawCentredString(x + cw[i] / 2, y - rh + 2.5 * mm, h)
            x += cw[i]
        y -= rh

        items = list(certificate.items.all())
        pdf.setFont("Helvetica", 9)
        for ri in range(11):
            item = items[ri] if ri < len(items) else None
            x = M
            vals = [
                item.tank_no if item else "",
                item.product_name if item else "",
                f"{item.weight_tonnage:.3f}" if item else "",
                f"{item.volume_liters:.3f}" if item else "",
            ]
            for ci, v in enumerate(vals):
                pdf.rect(x, y - rh, cw[ci], rh)
                pdf.drawCentredString(x + cw[ci] / 2, y - rh + 2.5 * mm, str(v))
                x += cw[ci]
            y -= rh

        x = M
        pdf.setFont("Helvetica-Bold", 9)
        totals = ["TOTAL", "",
                  f"{certificate.total_weight_tonnage:.3f}",
                  f"{certificate.total_volume_liters:.3f}"]
        for ci, v in enumerate(totals):
            pdf.rect(x, y - rh, cw[ci], rh)
            pdf.drawCentredString(x + cw[ci] / 2, y - rh + 2.5 * mm, str(v))
            x += cw[ci]
        y -= rh + 3 * mm

        # Flowmeter section
        half = TW / 2
        fm_rh = 7 * mm
        fm_val = f"{certificate.quantity_received_through_inlet_flowmeters:.3f}"
        pdf.setFont("Helvetica", 8)
        pdf.rect(M, y - fm_rh, half, fm_rh)
        pdf.rect(M + half, y - fm_rh, half, fm_rh)
        pdf.drawString(M + 2 * mm, y - fm_rh + 2 * mm, "Quantity received through inlet flowmeters:")
        pdf.drawString(M + half + 2 * mm, y - fm_rh + 2 * mm, "Volume in litres")
        y -= fm_rh
        pdf.rect(M, y - fm_rh, half, fm_rh)
        pdf.rect(M + half, y - fm_rh, half, fm_rh)
        pdf.setFont("Helvetica-Bold", 9)
        pdf.drawCentredString(M + half / 2, y - fm_rh + 2 * mm, fm_val)
        y -= fm_rh + 6 * mm

        # Signature block
        col = TW / 2 - 3 * mm
        rx = M + col + 6 * mm
        pdf.setFont("Helvetica", 9)
        pdf.drawString(M, y, "Terminal Representative:")
        pdf.drawString(rx, y, "PBPA Inspector:")
        y -= 7 * mm
        pdf.drawString(M, y, f"Name: {certificate.terminal_representative_name or ''}")
        pdf.drawString(rx, y, f"Name: {certificate.pbpa_inspector_name or ''}")
        y -= 10 * mm
        pdf.setLineWidth(0.8)
        pdf.line(M, y, M + col, y)
        pdf.line(rx, y, rx + col, y)
        y -= 5 * mm
        pdf.setFont("Helvetica", 9)
        pdf.drawString(M, y, f"Signature: {certificate.terminal_representative_signature or ''}")
        pdf.drawString(rx, y, f"Signature: {certificate.pbpa_inspector_signature or ''}")

        pdf.showPage()
        pdf.save()
        buffer.seek(0)
        return buffer


class SealIsolationReportViewSet(viewsets.ModelViewSet):
    """CRUD workflow for the PBPA sealing and isolation report."""
    permission_classes = (IsAuthenticated,)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['report_number', 'vessel_name', 'product_name', 'terminal', 'pbpa_inspector_name']
    ordering_fields = ['created_at', 'report_date', 'report_number', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = SealIsolationReport.objects.select_related('created_by').prefetch_related('entries')
        user = self.request.user
        status_filter = self.request.query_params.get('status')
        period = self.request.query_params.get('period')

        if get_or_create_user_profile(user).role == 'inspector':
            queryset = queryset.filter(created_by=user)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        queryset = filter_queryset_by_period(queryset, period, 'report_date')
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update', 'retrieve']:
            return SealIsolationReportDetailSerializer
        return SealIsolationReportListSerializer

    def perform_create(self, serializer):
        full_name = self.request.user.get_full_name() or self.request.user.username
        serializer.save(
            created_by=self.request.user,
            pbpa_inspector_name=serializer.validated_data.get('pbpa_inspector_name') or full_name,
        )

    @action(detail=True, methods=['post'])
    def sign_document(self, request, pk=None):
        """Digitally sign the Seal & Isolation Report as PDF."""
        report = self.get_object()
        if report.is_signed:
            return Response({'detail': 'Document is already signed.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            buf = generate_seal_isolation_pdf(report)
            pdf_bytes = buf.getvalue()
            signer_name = request.user.get_full_name() or request.user.username
            signed_bytes = sign_pdf_bytes(pdf_bytes, signer_name=signer_name, reason='PBPA Seal and Isolation Report')
            report.is_signed     = True
            report.signed_at     = timezone.now()
            report.signed_by     = request.user
            report.document_hash = compute_document_hash(signed_bytes)
            report.save(update_fields=['is_signed','signed_at','signed_by','document_hash','updated_at'])
            response = HttpResponse(signed_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="SIGNED_SIR_{report.report_number}.pdf"'
            return response
        except Exception as e:
            return Response({'detail': f'Signing failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def issue(self, request, pk=None):
        report = self.get_object()
        if report.status == 'issued':
            return Response({'detail': 'Report has already been issued.'}, status=status.HTTP_400_BAD_REQUEST)
        report.status = 'issued'
        report.issued_at = timezone.now()
        report.save(update_fields=['status', 'issued_at', 'updated_at'])
        serializer = SealIsolationReportDetailSerializer(report, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def generate_document(self, request, pk=None):
        report = self.get_object()
        try:
            buf = generate_seal_isolation_pdf(report)
            response = HttpResponse(
                buf.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="Seal_Isolation_{report.report_number}.pdf"'
            return response
        except Exception as e:
            return Response({'detail': f'Document generation error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


class ASTMLookupView(viewsets.ViewSet):
    """Stateless ASTM table lookup — returns d20, VCF, WCF for given inputs."""
    permission_classes = (IsAuthenticated,)

    @action(detail=False, methods=['post'], url_path='lookup')
    def lookup(self, request):
        try:
            sample_density = float(request.data['sample_density'])
            sample_temp    = float(request.data['sample_temp'])
            tank_temp      = float(request.data['tank_temp'])
        except (KeyError, TypeError, ValueError):
            return Response(
                {'detail': 'sample_density, sample_temp and tank_temp are required numbers.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        table_d20 = density_at_20_from_table(sample_density, sample_temp)
        d20 = table_d20 if table_d20 is not None else ShoreTankCalculationEngine.density_at_20(sample_density, sample_temp)

        table_vcf = vcf_from_table(d20, tank_temp) if d20 is not None else None
        vcf = table_vcf if table_vcf is not None else (
            ShoreTankCalculationEngine.vcf(d20, tank_temp) if d20 is not None else None
        )
        wcf = ShoreTankCalculationEngine.wcf(d20)

        return Response({
            'density_at_20': d20,
            'vcf': vcf,
            'wcf': wcf,
            'source': {
                'density_at_20': 'table_59b' if table_d20 is not None else 'formula_fallback',
                'vcf': 'table_60b' if table_vcf is not None else 'formula_fallback',
                'wcf': 'density_at_20',
            },
            'table_range': table_range(),
        })


class ShoreTankCalculationViewSet(viewsets.ModelViewSet):
    """CRUD workflow for the PBPA shore tank calculation workbook."""
    permission_classes = (IsAuthenticated,)
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['calculation_number', 'vessel_name', 'product_name', 'terminal', 'pbpa_inspector_name']
    ordering_fields = ['created_at', 'calculation_date', 'calculation_number', 'status']
    ordering = ['-created_at']

    def get_queryset(self):
        queryset = ShoreTankCalculation.objects.select_related('created_by').prefetch_related('tank_items__tank')
        user = self.request.user
        status_filter = self.request.query_params.get('status')
        period = self.request.query_params.get('period')

        if get_or_create_user_profile(user).role == 'inspector':
            queryset = queryset.filter(created_by=user)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        queryset = filter_queryset_by_period(queryset, period, 'calculation_date')
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update', 'retrieve']:
            return ShoreTankCalculationDetailSerializer
        return ShoreTankCalculationListSerializer

    def perform_create(self, serializer):
        full_name = self.request.user.get_full_name() or self.request.user.username
        serializer.save(
            created_by=self.request.user,
            pbpa_inspector_name=serializer.validated_data.get('pbpa_inspector_name') or full_name,
        )

    @action(detail=True, methods=['post'])
    def sign_document(self, request, pk=None):
        """Digitally sign the Shore Tank Calculation as PDF."""
        calculation = self.get_object()
        if calculation.is_signed:
            return Response({'detail': 'Document is already signed.'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            from reportlab.lib.pagesizes import A4, landscape
            from reportlab.pdfgen import canvas as rl_canvas
            import io
            buf = io.BytesIO()
            c = rl_canvas.Canvas(buf, pagesize=landscape(A4))
            w, h = landscape(A4)
            c.setFont('Helvetica-Bold', 14)
            c.drawCentredString(w/2, h-40, 'PBPA SHORE TANK CALCULATION')
            c.setFont('Helvetica', 11)
            c.drawString(40, h-70,  f'Calc No: {calculation.calculation_number}')
            c.drawString(40, h-90,  f'Vessel: {calculation.vessel_name}')
            c.drawString(40, h-110, f'Product: {calculation.product_name}')
            c.drawString(40, h-130, f'Terminal: {calculation.terminal}')
            c.drawString(40, h-150, f'Date: {calculation.calculation_date}')
            c.drawString(40, h-170, f'Terminal Std Vol: {calculation.terminal_standard_volume_m3} m3')
            c.drawString(40, h-190, f'Terminal Weight: {calculation.terminal_weight_air_mt} MT')
            c.drawString(40, h-210, f'Difference Std Vol: {calculation.difference_standard_volume_m3} m3')
            c.drawString(40, h-230, f'Difference Weight: {calculation.difference_weight_air_mt} MT')
            c.save()
            pdf_bytes = buf.getvalue()
            signer_name = request.user.get_full_name() or request.user.username
            signed_bytes = sign_pdf_bytes(pdf_bytes, signer_name=signer_name, reason='PBPA Shore Tank Calculation')
            calculation.is_signed     = True
            calculation.signed_at     = timezone.now()
            calculation.signed_by     = request.user
            calculation.document_hash = compute_document_hash(signed_bytes)
            calculation.save(update_fields=['is_signed','signed_at','signed_by','document_hash','updated_at'])
            response = HttpResponse(signed_bytes, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="SIGNED_STC_{calculation.calculation_number}.pdf"'
            return response
        except Exception as e:
            return Response({'detail': f'Signing failed: {str(e)}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        calculation = self.get_object()
        if calculation.status == 'final':
            return Response({'detail': 'Calculation is already final.'}, status=status.HTTP_400_BAD_REQUEST)

        calculation.status = 'final'
        calculation.finalized_at = timezone.now()
        calculation.save(update_fields=['status', 'finalized_at', 'updated_at'])

        serializer = ShoreTankCalculationDetailSerializer(calculation, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def calculate(self, request, pk=None):
        """
        Calculate all tank items for this shore tank calculation
        Performs ASTM D1250 calculations for volume and weight
        """
        calculation = self.get_object()
        
        try:
            calc_engine = ShoreTankCalculationEngine()
            results = calc_engine.calculate_all_tank_items(calculation)
            
            if results.get('errors'):
                return Response({
                    'detail': 'Calculation completed with warnings',
                    'errors': results['errors'],
                    'results': results
                }, status=status.HTTP_200_OK)
            
            return Response({
                'detail': 'Calculations completed successfully',
                'results': results
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            return Response({
                'detail': f'Calculation error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def generate_document(self, request, pk=None):
        calculation = self.get_object()
        try:
            buf = generate_shore_tank_pdf(calculation)
            response = HttpResponse(
                buf.getvalue(),
                content_type='application/pdf'
            )
            response['Content-Disposition'] = f'attachment; filename="Shore_Tank_Calc_{calculation.calculation_number}.pdf"'
            return response
        except Exception as e:
            return Response({'detail': f'Document generation error: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)


class SubmissionViewSet(viewsets.ModelViewSet):
    """Inspectors submit documents here; admins see notifications."""
    permission_classes = (IsAuthenticated,)
    serializer_class = SubmissionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vessel_name', 'doc_number', 'terminal', 'doc_type']
    ordering = ['-submitted_at']

    def get_queryset(self):
        user = self.request.user
        profile = get_or_create_user_profile(user)
        qs = Submission.objects.select_related('submitted_by')
        if profile.role == 'inspector':
            qs = qs.filter(submitted_by=user)
        return qs

    def perform_create(self, serializer):
        serializer.save(submitted_by=self.request.user)

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        profile = get_or_create_user_profile(request.user)
        if profile.role not in ('admin', 'supervisor'):
            return Response({'count': 0})
        return Response({'count': Submission.objects.filter(is_read=False).count()})

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        sub = self.get_object()
        sub.is_read = True
        sub.save(update_fields=['is_read'])
        return Response({'status': 'marked read'})

    @action(detail=False, methods=['post'])
    def mark_all_read(self, request):
        Submission.objects.filter(is_read=False).update(is_read=True)
        return Response({'status': 'all marked read'})


class VesselReportViewSet(viewsets.ModelViewSet):
    """Create and manage vessel discharge summary reports."""
    permission_classes = (IsAuthenticated,)
    serializer_class = VesselReportSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vessel_name', 'terminal', 'report_number', 'product_name']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = VesselReport.objects.select_related('created_by')
        return filter_queryset_by_period(qs, self.request.query_params.get('period'), 'discharge_date')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        report = self.get_object()
        if report.status == 'cancelled':
            return Response({'detail': 'Cancelled vessel reports cannot be finalized.'}, status=status.HTTP_400_BAD_REQUEST)
        report.status = 'final'
        report.save(update_fields=['status', 'updated_at'])
        return Response(VesselReportSerializer(report).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        report = self.get_object()
        report.status = 'cancelled'
        report.save(update_fields=['status', 'updated_at'])
        return Response(VesselReportSerializer(report).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        report = self.get_object()
        buf = self._build_pdf(report)
        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Vessel_Report_{report.report_number}.pdf"'
        return response

    def _build_pdf(self, report):
        from reportlab.lib.pagesizes import A4
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=A4,
            leftMargin=18 * mm,
            rightMargin=18 * mm,
            topMargin=14 * mm,
            bottomMargin=14 * mm,
        )
        styles = getSampleStyleSheet()

        def ps(name, **kwargs):
            return ParagraphStyle(name, parent=styles['Normal'], **kwargs)

        title_style = ps('vr_title', fontSize=13, alignment=TA_CENTER, fontName='Helvetica-Bold', leading=16)
        center_style = ps('vr_center', fontSize=8, alignment=TA_CENTER, leading=10)
        section_style = ps('vr_section', fontSize=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#8B1A1A'))
        label_style = ps('vr_label', fontSize=8, fontName='Helvetica-Bold', textColor=colors.HexColor('#444444'))
        value_style = ps('vr_value', fontSize=8, alignment=TA_LEFT)

        def fnum(value, suffix=''):
            try:
                return f"{float(value or 0):,.3f}{suffix}"
            except (TypeError, ValueError):
                return f"0.000{suffix}"

        elems = [
            Paragraph("THE UNITED REPUBLIC OF TANZANIA", center_style),
            Paragraph("<b>PETROLEUM BULK PROCUREMENT AGENCY</b>", ps('vr_agency', fontSize=10, alignment=TA_CENTER, fontName='Helvetica-Bold')),
            Paragraph("TANZANIA PORTS AUTHORITY, ONE STOP CENTER BUILDING, 11TH FLOOR, SOKOINE DRIVE", center_style),
            Spacer(1, 6 * mm),
            Paragraph("VESSEL REPORT", title_style),
            Spacer(1, 5 * mm),
        ]

        status_label = (report.status or '').upper()
        details = [
            [Paragraph('Report Number', label_style), Paragraph(report.report_number or '', value_style),
             Paragraph('Status', label_style), Paragraph(status_label, value_style)],
            [Paragraph('Vessel Name', label_style), Paragraph(report.vessel_name or '', value_style),
             Paragraph('Terminal', label_style), Paragraph(report.terminal or '', value_style)],
            [Paragraph('Product', label_style), Paragraph(report.product_name or '', value_style),
             Paragraph('Discharge Date', label_style), Paragraph(report.discharge_date.strftime('%d-%b-%Y') if report.discharge_date else '', value_style)],
            [Paragraph('Total Weight', label_style), Paragraph(fnum(report.total_weight_mt, ' MT'), value_style),
             Paragraph('Total Volume', label_style), Paragraph(fnum(report.total_volume_m3, ' m3'), value_style)],
        ]
        detail_table = Table(details, colWidths=[32 * mm, 58 * mm, 32 * mm, 58 * mm])
        detail_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.grey),
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f4f4f4')),
            ('BACKGROUND', (2, 0), (2, -1), colors.HexColor('#f4f4f4')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elems.append(detail_table)
        elems.append(Spacer(1, 7 * mm))

        elems.append(Paragraph("LINKED DOCUMENTS", section_style))
        linked_docs = [
            ['Dip Tickets', len(report.dip_ticket_ids or [])],
            ['Seal Reports', len(report.seal_report_ids or [])],
            ['Shore Tank Calculations', len(report.shore_calc_ids or [])],
            ['Product Receipt Certificates', len(report.cert_ids or [])],
        ]
        linked_table = Table(
            [[Paragraph('<b>Document Type</b>', label_style), Paragraph('<b>Count</b>', label_style)]] +
            [[Paragraph(label, value_style), Paragraph(str(count), value_style)] for label, count in linked_docs],
            colWidths=[130 * mm, 50 * mm],
        )
        linked_table.setStyle(TableStyle([
            ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
            ('INNERGRID', (0, 0), (-1, -1), 0.3, colors.grey),
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f4f4f4')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elems.append(linked_table)

        if report.remarks:
            elems.append(Spacer(1, 7 * mm))
            elems.append(Paragraph("REMARKS", section_style))
            remarks_table = Table([[Paragraph(report.remarks, value_style)]], colWidths=[180 * mm])
            remarks_table.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            elems.append(remarks_table)

        elems.append(Spacer(1, 14 * mm))
        prepared_by = report.created_by.get_full_name() if report.created_by else ''
        prepared_by = prepared_by or (report.created_by.username if report.created_by else '')
        signature_table = Table([
            ['Prepared By', 'Reviewed By'],
            [prepared_by or ' ', ' '],
        ], colWidths=[85 * mm, 85 * mm])
        signature_table.setStyle(TableStyle([
            ('LINEABOVE', (0, 1), (0, 1), 0.8, colors.black),
            ('LINEABOVE', (1, 1), (1, 1), 0.8, colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 5),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ]))
        elems.append(signature_table)

        elems.append(Spacer(1, 8 * mm))
        generated_at = timezone.localtime().strftime('%d-%b-%Y %H:%M')
        elems.append(Paragraph(f"Generated: {generated_at}", ps('vr_footer', fontSize=7, alignment=TA_CENTER, textColor=colors.grey)))

        doc.build(elems)
        buf.seek(0)
        return buf


class ProvisionalOuturnReportViewSet(viewsets.ModelViewSet):
    """CRUD + PDF for PBPA Provisional Outturn Reports."""
    permission_classes = (IsAuthenticated,)
    serializer_class = ProvisionalOuturnReportSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['vessel_name', 'report_number', 'port', 'product']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = ProvisionalOuturnReport.objects.select_related('created_by').prefetch_related('items')
        profile = get_or_create_user_profile(self.request.user)
        if profile.role == 'inspector':
            qs = qs.filter(created_by=self.request.user)
        qs = filter_queryset_by_period(qs, self.request.query_params.get('period'), 'report_date')
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        report = self.get_object()
        report.status = 'final'
        report.save(update_fields=['status', 'updated_at'])
        return Response(ProvisionalOuturnReportSerializer(report).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        report = self.get_object()
        buf = self._build_pdf(report)
        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="POR_{report.report_number}.pdf"'
        return response

    def _build_pdf(self, report):
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                                leftMargin=15*mm, rightMargin=15*mm,
                                topMargin=12*mm, bottomMargin=12*mm)
        styles = getSampleStyleSheet()
        W = landscape(A4)[0] - 30*mm

        def ps(name, **kw):
            return ParagraphStyle(name, parent=styles['Normal'], **kw)

        elems = []

        # ── Header ──────────────────────────────────────────────────────────
        elems.append(Paragraph("THE UNITED REPUBLIC OF TANZANIA", ps('h1', fontSize=9, alignment=TA_CENTER)))
        elems.append(Spacer(1, 2*mm))
        elems.append(Paragraph("<b>PETROLEUM BULK PROCUREMENT AGENCY</b>", ps('h2', fontSize=11, alignment=TA_CENTER)))
        elems.append(Paragraph(
            "TANZANIA PORTS AUTHORITY, ONE STOP CENTER BUILDING, 11TH FLOOR, SOKOINE DRIVE, PLOT NO:1/2",
            ps('a1', fontSize=7, alignment=TA_CENTER)))
        elems.append(Paragraph(
            "Tel: +255222129009 / Fax: +255222129093 / Email: info@pbpa.go.tz / WEBSITE: www.pbpa.go.tz / P.O. Box 2634 Dar es Salaam, TANZANIA",
            ps('a2', fontSize=6.5, alignment=TA_CENTER)))
        elems.append(Spacer(1, 5*mm))

        # ── Vessel info ──────────────────────────────────────────────────────
        date_str = report.report_date.strftime('%d.%m.%Y') if report.report_date else ''
        info = [
            [Paragraph(f"<b>VESSEL</b>", ps('i')), Paragraph(report.vessel_name or '', ps('iv', fontSize=10))],
            [Paragraph(f"<b>DATE</b>",   ps('i')), Paragraph(date_str, ps('iv', fontSize=10))],
            [Paragraph(f"<b>PORT</b>",   ps('i')), Paragraph(report.port or '', ps('iv', fontSize=10))],
            [Paragraph(f"<b>PRODUCT</b>",ps('i')), Paragraph(report.product or '', ps('iv', fontSize=10))],
        ]
        info_tbl = Table(info, colWidths=[25*mm, 80*mm])
        info_tbl.setStyle(TableStyle([
            ('FONTSIZE', (0,0), (-1,-1), 9),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
            ('TOPPADDING', (0,0), (-1,-1), 2),
        ]))
        elems.append(info_tbl)
        elems.append(Spacer(1, 5*mm))

        # ── Main table ───────────────────────────────────────────────────────
        items = list(report.items.all())
        totals = report.totals

        # diff totals
        tot_dv  = round((totals['shore_volume'] or 0) - (totals['ship_volume'] or 0), 3)
        tot_dvp = round(tot_dv / totals['ship_volume'] * 100, 3) if totals['ship_volume'] else 0
        tot_dw  = round((totals['shore_weight'] or 0) - (totals['ship_weight'] or 0), 3)
        tot_dwp = round(tot_dw / totals['ship_weight'] * 100, 3) if totals['ship_weight'] else 0

        def f3(v): return f'{float(v):,.3f}' if v is not None else ''

        hdr_style = ps('th', fontSize=7, alignment=TA_CENTER, fontName='Helvetica-Bold')
        cell_style = ps('td', fontSize=7.5, alignment=TA_CENTER)
        lft_style  = ps('tl', fontSize=7.5, alignment=TA_LEFT)

        # col widths: SN, Terminal, ShipVol, ShipWt, ShoreVol, ShoreWt, DiffVol, %Diff, DiffWt, %Diff
        cw = [8*mm, 38*mm, 22*mm, 22*mm, 22*mm, 22*mm, 22*mm, 16*mm, 22*mm, 16*mm]

        header_rows = [
            # row 0 — title span
            [Paragraph('<b>PROVISIONAL OUTTURN SUMMARY</b>', ps('title', fontSize=9, alignment=TA_CENTER, fontName='Helvetica-Bold'))]
            + ['']*9,
            # row 1 — group headers
            ['', '',
             Paragraph('<b>Ship Figures</b>', hdr_style), '',
             Paragraph('<b>Shore Figures</b>', hdr_style), '',
             Paragraph('<b>Difference</b>', hdr_style), '', '', ''],
            # row 2 — sub-group
            ['', '',
             Paragraph('<b>Volume</b>', hdr_style), Paragraph('<b>Weight</b>', hdr_style),
             Paragraph('<b>Volume</b>', hdr_style), Paragraph('<b>Weight</b>', hdr_style),
             Paragraph('<b>Volume</b>', hdr_style), '', Paragraph('<b>Weight</b>', hdr_style), ''],
            # row 3 — column labels
            [Paragraph('<b>S/N</b>', hdr_style),
             Paragraph('<b></b>', hdr_style),
             Paragraph('<b>M3 @ 20oC</b>', hdr_style), Paragraph('<b>M/Tons</b>', hdr_style),
             Paragraph('<b>M3 @ 20oC</b>', hdr_style), Paragraph('<b>M/Tons</b>', hdr_style),
             Paragraph('<b>M3 @ 20oC</b>', hdr_style), Paragraph('<b>%Diff</b>', hdr_style),
             Paragraph('<b>M/Tons</b>', hdr_style),    Paragraph('<b>%Diff</b>', hdr_style)],
        ]

        data_rows = []
        for item in items:
            data_rows.append([
                Paragraph(str(item.sn), cell_style),
                Paragraph(item.terminal_name or '', lft_style),
                Paragraph(f3(item.ship_volume_m3),  cell_style),
                Paragraph(f3(item.ship_weight_mt),  cell_style),
                Paragraph(f3(item.shore_volume_m3), cell_style),
                Paragraph(f3(item.shore_weight_mt), cell_style),
                Paragraph(f3(item.diff_volume_m3),  cell_style),
                Paragraph(f3(item.diff_volume_pct), cell_style),
                Paragraph(f3(item.diff_weight_mt),  cell_style),
                Paragraph(f3(item.diff_weight_pct), cell_style),
            ])

        # totals row
        bold_cell = ps('tb', fontSize=7.5, alignment=TA_CENTER, fontName='Helvetica-Bold')
        total_row = [
            '', '',
            Paragraph(f3(totals['ship_volume']),  bold_cell),
            Paragraph(f3(totals['ship_weight']),  bold_cell),
            Paragraph(f3(totals['shore_volume']), bold_cell),
            Paragraph(f3(totals['shore_weight']), bold_cell),
            Paragraph(f3(tot_dv),  bold_cell),
            Paragraph(f3(tot_dvp), bold_cell),
            Paragraph(f3(tot_dw),  bold_cell),
            Paragraph(f3(tot_dwp), bold_cell),
        ]

        all_rows = header_rows + data_rows + [total_row]
        n_data = len(data_rows)
        n_hdr  = len(header_rows)

        tbl = Table(all_rows, colWidths=cw, repeatRows=4)
        ts = TableStyle([
            # outer border
            ('BOX',         (0,0), (-1,-1), 1, colors.black),
            ('INNERGRID',   (0,0), (-1,-1), 0.4, colors.grey),
            # title row span
            ('SPAN',        (0,0), (-1,0)),
            ('BACKGROUND',  (0,0), (-1,0), colors.HexColor('#d0d0d0')),
            ('ALIGN',       (0,0), (-1,0), 'CENTER'),
            # group header spans
            ('SPAN',        (2,1), (3,1)),  # Ship Figures
            ('SPAN',        (4,1), (5,1)),  # Shore Figures
            ('SPAN',        (6,1), (9,1)),  # Difference
            ('SPAN',        (6,2), (7,2)),  # Volume diff
            ('SPAN',        (8,2), (9,2)),  # Weight diff
            ('BACKGROUND',  (0,1), (-1,3), colors.HexColor('#f0f0f0')),
            ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
            ('ROWBACKGROUNDS', (0, n_hdr), (-1, n_hdr + n_data - 1), [colors.white, colors.HexColor('#f9f9f9')]),
            # totals row
            ('BACKGROUND',  (0, -1), (-1, -1), colors.HexColor('#e8e8e8')),
            ('FONTNAME',    (0, -1), (-1, -1), 'Helvetica-Bold'),
            ('TOPPADDING',  (0,0), (-1,-1), 2),
            ('BOTTOMPADDING',(0,0), (-1,-1), 2),
        ])
        tbl.setStyle(ts)
        elems.append(tbl)
        elems.append(Spacer(1, 8*mm))

        # ── Signatures ───────────────────────────────────────────────────────
        sig_data = [[
            Paragraph('<b>CAPTAIN/CHIEF OFFICER</b>', ps('sl', fontSize=8)),
            '',
            Paragraph('<b>PBPA SURVEYOR</b>', ps('sr', fontSize=8, alignment=TA_CENTER)),
        ]]
        sig_tbl = Table(sig_data, colWidths=[W*0.4, W*0.2, W*0.4])
        sig_tbl.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
        elems.append(sig_tbl)
        elems.append(Spacer(1, 12*mm))

        name_data = [[
            Paragraph(f'Name: {report.captain_name or ""}', ps('sn', fontSize=9)),
            '',
            Paragraph(f'Name: {report.surveyor_name or ""}', ps('sn2', fontSize=9, alignment=TA_CENTER)),
        ]]
        name_tbl = Table(name_data, colWidths=[W*0.4, W*0.2, W*0.4])
        name_tbl.setStyle(TableStyle([
            ('LINEABOVE', (0,0), (0,0), 0.8, colors.black),
            ('LINEABOVE', (2,0), (2,0), 0.8, colors.black),
        ]))
        elems.append(name_tbl)

        doc.build(elems)
        buf.seek(0)
        return buf

    @action(detail=True, methods=['get'])
    def docx(self, request, pk=None):
        """Generate DOCX version of Provisional Outturn Report."""
        report = self.get_object()
        from docx import Document
        from docx.shared import Inches, Pt, RGBColor
        from docx.enum.text import WD_ALIGN_PARAGRAPH
        from docx.oxml.ns import qn
        from docx.oxml import OxmlElement

        doc = Document()

        # Set margins
        sections = doc.sections
        for section in sections:
            section.top_margin = Inches(0.5)
            section.bottom_margin = Inches(0.5)
            section.left_margin = Inches(0.75)
            section.right_margin = Inches(0.75)

        # Header
        header = doc.add_paragraph()
        header.alignment = WD_ALIGN_PARAGRAPH.CENTER
        header_run = header.add_run('THE UNITED REPUBLIC OF TANZANIA\n')
        header_run.font.size = Pt(9)
        
        title = doc.add_paragraph()
        title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        title_run = title.add_run('PETROLEUM BULK PROCUREMENT AGENCY\n')
        title_run.font.size = Pt(11)
        title_run.font.bold = True
        
        # PBPA Address
        address = doc.add_paragraph()
        address.alignment = WD_ALIGN_PARAGRAPH.CENTER
        address_run = address.add_run(
            'TANZANIA PORTS AUTHORITY, ONE STOP CENTER BUILDING, 11TH FLOOR, SOKOINE DRIVE, PLOT NO:1/2\n'
            'Tel: +255222129009 / Fax: +255222129093 / Email: info@pbpa.go.tz / WEBSITE: www.pbpa.go.tz / P.O. Box 2634 Dar es Salaam, TANZANIA'
        )
        address_run.font.size = Pt(7)

        doc.add_paragraph()  # Spacing

        # Report Title
        report_title = doc.add_paragraph()
        report_title.alignment = WD_ALIGN_PARAGRAPH.CENTER
        report_title_run = report_title.add_run('PROVISIONAL OUTTURN REPORT')
        report_title_run.font.size = Pt(12)
        report_title_run.font.bold = True

        doc.add_paragraph()  # Spacing

        # Report Info Table
        info_table = doc.add_table(rows=4, cols=2)
        info_table.style = 'Light Grid Accent 1'
        info_table.cell(0, 0).text = 'Vessel Name'
        info_table.cell(0, 1).text = report.vessel_name or ''
        info_table.cell(1, 0).text = 'Date'
        info_table.cell(1, 1).text = report.report_date.strftime('%d.%m.%Y') if report.report_date else ''
        info_table.cell(2, 0).text = 'Port'
        info_table.cell(2, 1).text = report.port or ''
        info_table.cell(3, 0).text = 'Product'
        info_table.cell(3, 1).text = report.product or ''

        doc.add_paragraph()  # Spacing

        # Summary Table
        items = list(report.items.all())
        totals = report.totals

        # Calculate differences
        tot_dv  = round((totals['shore_volume'] or 0) - (totals['ship_volume'] or 0), 3)
        tot_dvp = round(tot_dv / totals['ship_volume'] * 100, 3) if totals['ship_volume'] else 0
        tot_dw  = round((totals['shore_weight'] or 0) - (totals['ship_weight'] or 0), 3)
        tot_dwp = round(tot_dw / totals['ship_weight'] * 100, 3) if totals['ship_weight'] else 0

        # Create table
        table = doc.add_table(rows=len(items) + 2, cols=10)
        table.style = 'Light Grid Accent 1'

        # Header row
        headers = ['S/N', 'Terminal', 'Ship Vol\n(m³)', 'Ship Wgt\n(MT)', 'Shore Vol\n(m³)', 'Shore Wgt\n(MT)', 
                   'Diff Vol\n(m³)', 'Diff %', 'Diff Wgt\n(MT)', 'Diff %']
        header_cells = table.rows[0].cells
        for i, header_text in enumerate(headers):
            header_cells[i].text = header_text
            # Style header cell
            for paragraph in header_cells[i].paragraphs:
                for run in paragraph.runs:
                    run.font.bold = True
                    run.font.size = Pt(9)

        # Data rows
        for idx, item in enumerate(items):
            row = table.rows[idx + 1]
            cells = row.cells
            cells[0].text = str(idx + 1)
            cells[1].text = item.terminal_name or ''
            cells[2].text = f"{item.ship_volume_m3:.3f}" if item.ship_volume_m3 else ''
            cells[3].text = f"{item.ship_weight_mt:.3f}" if item.ship_weight_mt else ''
            cells[4].text = f"{item.shore_volume_m3:.3f}" if item.shore_volume_m3 else ''
            cells[5].text = f"{item.shore_weight_mt:.3f}" if item.shore_weight_mt else ''
            cells[6].text = f"{item.diff_volume_m3:.3f}"
            cells[7].text = f"{item.diff_volume_pct:.3f}%"
            cells[8].text = f"{item.diff_weight_mt:.3f}"
            cells[9].text = f"{item.diff_weight_pct:.3f}%"

        # Totals row
        total_row = table.rows[-1]
        total_cells = total_row.cells
        total_cells[0].text = ''
        total_cells[1].text = 'TOTAL'
        total_cells[2].text = f"{totals['ship_volume']:.3f}"
        total_cells[3].text = f"{totals['ship_weight']:.3f}"
        total_cells[4].text = f"{totals['shore_volume']:.3f}"
        total_cells[5].text = f"{totals['shore_weight']:.3f}"
        total_cells[6].text = f"{tot_dv:.3f}"
        total_cells[7].text = f"{tot_dvp:.3f}%"
        total_cells[8].text = f"{tot_dw:.3f}"
        total_cells[9].text = f"{tot_dwp:.3f}%"

        # Style total row
        for cell in total_cells:
            for paragraph in cell.paragraphs:
                for run in paragraph.runs:
                    run.font.bold = True

        doc.add_paragraph()  # Spacing

        # Signature section
        sig_para = doc.add_paragraph()
        sig_para_format = sig_para.paragraph_format
        sig_para_format.space_before = Pt(12)

        sig_table = doc.add_table(rows=3, cols=3)
        sig_table.style = 'Table Grid'

        # Signature lines (row 0)
        sig_table.cell(0, 0).text = '_' * 30
        sig_table.cell(0, 1).text = '_' * 30
        sig_table.cell(0, 2).text = '_' * 30

        # Names (row 1)
        sig_table.cell(1, 0).text = 'Captain / Master'
        sig_table.cell(1, 1).text = 'PBPA Surveyor'
        sig_table.cell(1, 2).text = 'Terminal Rep.'

        # Actual names (row 2)
        sig_table.cell(2, 0).text = report.captain_name or 'Name: _____________'
        sig_table.cell(2, 1).text = report.surveyor_name or 'Name: _____________'
        sig_table.cell(2, 2).text = 'Name: _____________'

        # Footer
        doc.add_paragraph()
        footer = doc.add_paragraph()
        footer.alignment = WD_ALIGN_PARAGRAPH.CENTER
        footer_run = footer.add_run(f'Report Generated: {report.created_at.strftime("%d.%m.%Y %H:%M")}')
        footer_run.font.size = Pt(8)
        footer_run.font.italic = True

        # Save to BytesIO
        buf = io.BytesIO()
        doc.save(buf)
        buf.seek(0)

        response = HttpResponse(
            buf.getvalue(),
            content_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        response['Content-Disposition'] = f'attachment; filename="POR_{report.report_number}.docx"'
        return response


class StockReportViewSet(viewsets.ModelViewSet):
    """CRUD + PDF for PBPA Daily Stock Reports."""
    permission_classes = (IsAuthenticated,)
    serializer_class = StockReportSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['report_number', 'notes']
    ordering = ['-report_date', '-created_at']

    def get_queryset(self):
        qs = StockReport.objects.select_related('created_by').prefetch_related('items')
        profile = get_or_create_user_profile(self.request.user)
        if profile.role == 'inspector':
            qs = qs.filter(created_by=self.request.user)
        qs = filter_queryset_by_period(qs, self.request.query_params.get('period'), 'report_date')
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def finalize(self, request, pk=None):
        report = self.get_object()
        report.status = 'final'
        report.save(update_fields=['status', 'updated_at'])
        return Response(StockReportSerializer(report).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        report = self.get_object()
        buf = self._build_pdf(report)
        response = HttpResponse(buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="StockReport_{report.report_number}.pdf"'
        return response

    def _build_pdf(self, report):
        from reportlab.lib.pagesizes import A4, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import mm
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(A4),
                                leftMargin=10*mm, rightMargin=10*mm,
                                topMargin=10*mm, bottomMargin=10*mm)
        styles = getSampleStyleSheet()
        W = landscape(A4)[0] - 20*mm

        def ps(name, **kw):
            return ParagraphStyle(name, parent=styles['Normal'], **kw)

        YELLOW = colors.HexColor('#FFD700')
        BLACK  = colors.black
        WHITE  = colors.white

        elems = []

        # Header
        elems.append(Paragraph("THE UNITED REPUBLIC OF TANZANIA", ps('h1', fontSize=9, alignment=TA_CENTER)))
        elems.append(Spacer(1, 1*mm))
        elems.append(Paragraph("<b>PETROLEUM BULK PROCUREMENT AGENCY</b>", ps('h2', fontSize=11, alignment=TA_CENTER)))
        elems.append(Paragraph(
            "TANZANIA PORTS AUTHORITY, ONE STOP CENTER BUILDING, 11TH FLOOR, SOKOINE DRIVE, PLOT NO:1/2",
            ps('a1', fontSize=7, alignment=TA_CENTER)))
        elems.append(Paragraph(
            "Tel: +255222129009 / Email: info@pbpa.go.tz / WEBSITE: www.pbpa.go.tz / P.O. Box 2634 Dar es Salaam, TANZANIA",
            ps('a2', fontSize=6.5, alignment=TA_CENTER)))
        elems.append(Spacer(1, 4*mm))

        date_str = report.report_date.strftime('%d-%b-%Y') if report.report_date else ''
        elems.append(Paragraph(f"<b>DAILY STOCK REPORT — {date_str}</b>", ps('title', fontSize=11, alignment=TA_CENTER)))
        elems.append(Spacer(1, 4*mm))

        items = list(report.items.all())

        def f(v):
            if v is None or v == 0:
                return ''
            return f'{float(v):,.0f}'

        hdr = ps('th', fontSize=7, alignment=TA_CENTER, fontName='Helvetica-Bold', textColor=BLACK)
        cell = ps('td', fontSize=7.5, alignment=TA_CENTER)
        lcell = ps('tl', fontSize=7.5, alignment=TA_LEFT)

        # Transit group header spans cols 5-6 (BPS + NON-BPS)
        cw = [W*p for p in (0.04, 0.14, 0.08, 0.09, 0.09, 0.09, 0.09, 0.09, 0.09, 0.10, 0.10)]

        transit_box = Table(
            [[Paragraph('<b>TRANSIT (LTRS)</b>', ps('tb', fontSize=7, alignment=TA_CENTER, fontName='Helvetica-Bold'))]],
            colWidths=[cw[5]+cw[6]]
        )
        transit_box.setStyle(TableStyle([
            ('BOX', (0,0), (-1,-1), 1.5, YELLOW),
            ('BACKGROUND', (0,0), (-1,-1), WHITE),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('TOPPADDING', (0,0), (-1,-1), 2),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ]))

        header_rows = [
            # row 0 — column headers
            [
                Paragraph('<b>S/N</b>', hdr),
                Paragraph('<b>DEPOT NAME</b>', hdr),
                Paragraph('<b>DATE</b>', hdr),
                Paragraph('<b>PRODUCT</b>', hdr),
                Paragraph('<b>LOCAL (LTRS)</b>', hdr),
                Paragraph('<b>BPS TRANSIT</b>', hdr),
                Paragraph('<b>NON-BPS TRANSIT</b>', hdr),
                Paragraph('<b>MINING (LTRS)</b>', hdr),
                Paragraph('<b>TRANSSHIPMENT (LTRS)</b>', hdr),
                Paragraph('<b>AWAITING FOR OUTTURN (LTRS)</b>', hdr),
                Paragraph('<b>TOTAL (LTRS)</b>', hdr),
            ],
        ]

        data_rows = []
        for item in items:
            item_date = item.date.strftime('%d-%b-%Y') if item.date else ''
            data_rows.append([
                Paragraph(str(item.sn), cell),
                Paragraph(item.depot_name or '', lcell),
                Paragraph(item_date, cell),
                Paragraph(item.product or '', cell),
                Paragraph(f(item.local_ltrs), cell),
                Paragraph(f(item.bps_transit_ltrs), cell),
                Paragraph(f(item.non_bps_transit_ltrs), cell),
                Paragraph(f(item.mining_ltrs), cell),
                Paragraph(f(item.transshipment_ltrs), cell),
                Paragraph(f(item.awaiting_outturn_ltrs), cell),
                Paragraph(f(item.total_ltrs), cell),
            ])

        bold_cell = ps('tb', fontSize=7.5, alignment=TA_CENTER, fontName='Helvetica-Bold')
        total_row = [
            '', Paragraph('<b>TOTAL</b>', ps('tot', fontSize=8, alignment=TA_CENTER, fontName='Helvetica-Bold')),
            '', '', '', '', '', '', '', '',
            Paragraph(f'{report.total_ltrs:,.0f}', bold_cell),
        ]

        all_rows = header_rows + data_rows + [total_row]
        n_hdr = len(header_rows)
        n_data = len(data_rows)

        tbl = Table(all_rows, colWidths=cw, repeatRows=1)
        ts = TableStyle([
            ('BOX',         (0,0), (-1,-1), 1, BLACK),
            ('INNERGRID',   (0,0), (-1,-1), 0.4, colors.grey),
            ('BACKGROUND',  (0,0), (-1, n_hdr-1), YELLOW),
            ('ROWBACKGROUNDS', (0, n_hdr), (-1, n_hdr+n_data-1), [WHITE, colors.HexColor('#FFFDE7')]),
            ('BACKGROUND',  (0,-1), (-1,-1), colors.HexColor('#F5F5F5')),
            ('FONTNAME',    (0,-1), (-1,-1), 'Helvetica-Bold'),
            ('VALIGN',      (0,0), (-1,-1), 'MIDDLE'),
            ('TOPPADDING',  (0,0), (-1,-1), 2),
            ('BOTTOMPADDING',(0,0), (-1,-1), 2),
            # Transit group box on header
            ('BOX',         (5,0), (6,0), 1.5, BLACK),
        ])
        tbl.setStyle(ts)
        elems.append(tbl)

        if report.notes:
            elems.append(Spacer(1, 4*mm))
            elems.append(Paragraph(f'Notes: {report.notes}', ps('notes', fontSize=8)))

        doc.build(elems)
        buf.seek(0)
        return buf


def csrf_failure(request, reason=""):
    """Handle CSRF failures securely."""
    from .exception_handler import custom_exception_handler
    from rest_framework.exceptions import ValidationError
    
    sec_log.warning(f"CSRF failure: {reason or 'no reason provided'} | IP: {request.META.get('REMOTE_ADDR')}")
    
    if request.headers.get('Accept', '').startswith('application/json') or request.path.startswith('/api/'):
        return Response(
            {'detail': 'CSRF verification failed. Request aborted.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    return HttpResponse(
        '<h1>403 Forbidden</h1><p>CSRF verification failed. Request aborted.</p>',
        status=403,
        content_type='text/html'
    )
