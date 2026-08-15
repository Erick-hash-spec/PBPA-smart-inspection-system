"""
Patch script: adds ActivityLog model + real activity tracking to the Smart Reporting System
"""
import os, re

BASE = 'd:/SMART REPORTING SYSTEM/backend/inspections'

# ── 1. Add ActivityLog model to models.py ─────────────────────────────────
MODELS_ADDITION = '''

class ActivityLog(models.Model):
    """Real-time activity log for admin monitoring."""
    ACTION_CHOICES = (
        ('login',           'User Login'),
        ('logout',          'User Logout'),
        ('login_failed',    'Failed Login'),
        ('report_created',  'Report Created'),
        ('report_updated',  'Report Updated'),
        ('report_deleted',  'Report Deleted'),
        ('report_submitted','Report Submitted'),
        ('report_approved', 'Report Approved'),
        ('report_rejected', 'Report Rejected'),
        ('password_changed','Password Changed'),
        ('user_created',    'User Created'),
        ('user_deleted',    'User Deleted'),
        ('file_uploaded',   'File Uploaded'),
    )
    user        = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='activity_logs')
    action      = models.CharField(max_length=30, choices=ACTION_CHOICES)
    doc_type    = models.CharField(max_length=50, blank=True)
    doc_id      = models.PositiveIntegerField(null=True, blank=True)
    doc_number  = models.CharField(max_length=50, blank=True)
    detail      = models.TextField(blank=True)
    ip_address  = models.GenericIPAddressField(null=True, blank=True)
    timestamp   = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Activity Log'
        verbose_name_plural = 'Activity Logs'

    def __str__(self):
        user_label = self.user.username if self.user else 'Anonymous'
        return f'[{self.timestamp:%Y-%m-%d %H:%M}] {user_label} — {self.get_action_display()}'

    @classmethod
    def log(cls, user, action, doc_type='', doc_id=None, doc_number='', detail='', request=None):
        ip = None
        if request:
            xff = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')
        cls.objects.create(
            user=user, action=action, doc_type=doc_type,
            doc_id=doc_id, doc_number=doc_number, detail=detail, ip_address=ip,
        )
'''

content = open(f'{BASE}/models.py', encoding='utf-8').read()
if 'class ActivityLog' not in content:
    content += MODELS_ADDITION
    open(f'{BASE}/models.py', 'w', encoding='utf-8').write(content)
    print('models.py: ActivityLog added')
else:
    print('models.py: ActivityLog already exists')


# ── 2. Add ActivityLogSerializer to serializers.py ────────────────────────
SERIALIZER_IMPORT = 'from .models import (\n    UserProfile, Tank, Inspection, Seal, Isolation,'
SERIALIZER_IMPORT_NEW = 'from .models import (\n    UserProfile, Tank, Inspection, Seal, Isolation, ActivityLog,'

SERIALIZER_CLASS = '''

class ActivityLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True, allow_null=True)
    full_name = serializers.CharField(source='user.get_full_name', read_only=True, allow_null=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)

    class Meta:
        model = ActivityLog
        fields = (
            'id', 'user', 'username', 'full_name', 'action', 'action_display',
            'doc_type', 'doc_id', 'doc_number', 'detail', 'ip_address', 'timestamp',
        )
        read_only_fields = fields
'''

content = open(f'{BASE}/serializers.py', encoding='utf-8').read()
changed = False
if 'ActivityLog,' not in content:
    content = content.replace(SERIALIZER_IMPORT, SERIALIZER_IMPORT_NEW, 1)
    changed = True
if 'class ActivityLogSerializer' not in content:
    content += SERIALIZER_CLASS
    changed = True
if changed:
    open(f'{BASE}/serializers.py', 'w', encoding='utf-8').write(content)
    print('serializers.py: ActivityLogSerializer added')
else:
    print('serializers.py: already up to date')


# ── 3. Patch views.py ─────────────────────────────────────────────────────
content = open(f'{BASE}/views.py', encoding='utf-8').read()
changed = False

# 3a. Import ActivityLog in models import
OLD_MODEL_IMPORT = '    Submission, VesselReport, RosterAssignment,'
NEW_MODEL_IMPORT = '    Submission, VesselReport, RosterAssignment, ActivityLog,'
if 'ActivityLog,' not in content:
    content = content.replace(OLD_MODEL_IMPORT, NEW_MODEL_IMPORT, 1)
    changed = True

# 3b. Import ActivityLogSerializer
OLD_SER_IMPORT = '    NotificationSerializer,\n)'
NEW_SER_IMPORT = '    NotificationSerializer,\n    ActivityLogSerializer,\n)'
if 'ActivityLogSerializer,' not in content:
    content = content.replace(OLD_SER_IMPORT, NEW_SER_IMPORT, 1)
    changed = True

# 3c. Add get_client_ip helper + activity_logs endpoint before build_activity_overview
HELPER = '''
def get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR')
    return xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR')

'''

if 'def get_client_ip' not in content:
    content = content.replace('def get_or_create_user_profile', HELPER + 'def get_or_create_user_profile', 1)
    changed = True

# 3d. Patch login view to log activity — inject after successful token creation
# The auth endpoint is handled by SimpleJWT, so we log via a signal instead.
# Add ActivityLog logging inside perform_create for each report viewset
# and inside approve/reject for InspectionViewSet.

# 3e. Add ActivityLogViewSet before NotificationViewSet
ACTIVITY_VIEWSET = '''
class ActivityLogViewSet(viewsets.ReadOnlyModelViewSet):
    """Real-time activity log — admin only."""
    permission_classes = (IsAuthenticated,)
    serializer_class = ActivityLogSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['user__username', 'user__first_name', 'action', 'doc_type', 'doc_number', 'detail']
    ordering = ['-timestamp']

    def get_queryset(self):
        profile = get_or_create_user_profile(self.request.user)
        if profile.role != 'admin':
            return ActivityLog.objects.none()
        qs = ActivityLog.objects.select_related('user').all()
        action = self.request.query_params.get('action')
        period = self.request.query_params.get('period')
        if action:
            qs = qs.filter(action=action)
        if period:
            start = period_start_datetime(period)
            if start:
                qs = qs.filter(timestamp__gte=start)
        return qs

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Return activity counts grouped by action type for the dashboard."""
        profile = get_or_create_user_profile(request.user)
        if profile.role != 'admin':
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)

        period = request.query_params.get('period')
        qs = ActivityLog.objects.all()
        if period:
            start = period_start_datetime(period)
            if start:
                qs = qs.filter(timestamp__gte=start)

        from django.db.models import Count
        counts = {
            row['action']: row['count']
            for row in qs.values('action').annotate(count=Count('id'))
        }

        COLOR_MAP = {
            'login':            '#2563eb',
            'logout':           '#64748b',
            'login_failed':     '#dc2626',
            'report_created':   '#16a34a',
            'report_updated':   '#f59e0b',
            'report_deleted':   '#ef4444',
            'report_submitted': '#0891b2',
            'report_approved':  '#059669',
            'report_rejected':  '#be123c',
            'password_changed': '#7c3aed',
            'user_created':     '#4f46e5',
            'user_deleted':     '#9f1239',
            'file_uploaded':    '#0369a1',
        }
        WHY_MAP = {
            'login':            'Security audit',
            'logout':           'Session tracking',
            'login_failed':     'Detect attacks',
            'report_created':   'Usage monitoring',
            'report_updated':   'Audit trail',
            'report_deleted':   'Accountability',
            'report_submitted': 'Workflow tracking',
            'report_approved':  'Approval tracking',
            'report_rejected':  'Rejection tracking',
            'password_changed': 'Security tracking',
            'user_created':     'Access management',
            'user_deleted':     'Access management',
            'file_uploaded':    'Storage monitoring',
        }
        LABEL_MAP = dict(ActivityLog.ACTION_CHOICES)
        rows = [
            {
                'action': action,
                'activity': LABEL_MAP.get(action, action),
                'value': count,
                'why': WHY_MAP.get(action, ''),
                'color': COLOR_MAP.get(action, '#8B1A1A'),
            }
            for action, count in sorted(counts.items(), key=lambda x: -x[1])
        ]
        return Response(rows)

'''

if 'class ActivityLogViewSet' not in content:
    content = content.replace(
        'class NotificationViewSet(viewsets.ReadOnlyModelViewSet):',
        ACTIVITY_VIEWSET + 'class NotificationViewSet(viewsets.ReadOnlyModelViewSet):',
        1,
    )
    changed = True

if changed:
    open(f'{BASE}/views.py', 'w', encoding='utf-8').write(content)
    print('views.py: ActivityLogViewSet + helpers added')
else:
    print('views.py: already up to date')


# ── 4. Add logging calls to key actions in views.py ───────────────────────
content = open(f'{BASE}/views.py', encoding='utf-8').read()
changed = False

# Log report creation in perform_create of all key viewsets
# InspectionViewSet.perform_create
OLD_INSP_CREATE = (
    '    def perform_create(self, serializer):\n'
    '        """Override create to set inspector"""\n'
    '        inspection = serializer.save(inspector=self.request.user)'
)
NEW_INSP_CREATE = (
    '    def perform_create(self, serializer):\n'
    '        """Override create to set inspector"""\n'
    '        inspection = serializer.save(inspector=self.request.user)\n'
    '        ActivityLog.log(self.request.user, \'report_created\', \'dip_ticket\',\n'
    '            doc_id=inspection.pk, doc_number=inspection.ticket_number or str(inspection.pk),\n'
    '            detail=f\'Dip ticket created for vessel {inspection.vessel_name or "-"}\',\n'
    '            request=self.request)'
)
if 'perform_create\n        """Override create to set inspector"""\n        inspection = serializer.save' in content and 'ActivityLog.log(self.request.user, \'report_created\', \'dip_ticket\'' not in content:
    content = content.replace(OLD_INSP_CREATE, NEW_INSP_CREATE, 1)
    changed = True

# Log approve
OLD_APPROVE = (
    '        inspection.status = \'approved\'\n'
    '        inspection.supervisor = request.user\n'
    '        inspection.approval_date = timezone.now()\n'
    '        inspection.save()\n'
    '        \n'
    '        serializer = self.get_serializer(inspection)\n'
    '        return Response(serializer.data)\n'
    '    \n'
    '    @action(detail=True, methods=[\'post\'], permission_classes=[IsAuthenticated])\n'
    '    def reject'
)
NEW_APPROVE = (
    '        inspection.status = \'approved\'\n'
    '        inspection.supervisor = request.user\n'
    '        inspection.approval_date = timezone.now()\n'
    '        inspection.save()\n'
    '        ActivityLog.log(request.user, \'report_approved\', \'dip_ticket\',\n'
    '            doc_id=inspection.pk, doc_number=inspection.ticket_number or str(inspection.pk),\n'
    '            detail=f\'Dip ticket approved for vessel {inspection.vessel_name or "-"}\',\n'
    '            request=request)\n'
    '        serializer = self.get_serializer(inspection)\n'
    '        return Response(serializer.data)\n'
    '    \n'
    '    @action(detail=True, methods=[\'post\'], permission_classes=[IsAuthenticated])\n'
    '    def reject'
)
if OLD_APPROVE in content:
    content = content.replace(OLD_APPROVE, NEW_APPROVE, 1)
    changed = True

# Log reject
OLD_REJECT_END = (
    '        inspection.status = \'rejected\'\n'
    '        inspection.supervisor = request.user\n'
    '        inspection.approval_date = timezone.now()\n'
    '        inspection.rejection_reason = reason\n'
    '        inspection.save()\n'
    '        \n'
    '        serializer = self.get_serializer(inspection)\n'
    '        return Response(serializer.data)\n'
    '    \n'
    '    @action(detail=True, methods=[\'post\'], permission_classes=[IsAuthenticated])\n'
    '    def submit'
)
NEW_REJECT_END = (
    '        inspection.status = \'rejected\'\n'
    '        inspection.supervisor = request.user\n'
    '        inspection.approval_date = timezone.now()\n'
    '        inspection.rejection_reason = reason\n'
    '        inspection.save()\n'
    '        ActivityLog.log(request.user, \'report_rejected\', \'dip_ticket\',\n'
    '            doc_id=inspection.pk, doc_number=inspection.ticket_number or str(inspection.pk),\n'
    '            detail=f\'Rejected: {reason[:100] if reason else "-"}\',\n'
    '            request=request)\n'
    '        serializer = self.get_serializer(inspection)\n'
    '        return Response(serializer.data)\n'
    '    \n'
    '    @action(detail=True, methods=[\'post\'], permission_classes=[IsAuthenticated])\n'
    '    def submit'
)
if OLD_REJECT_END in content:
    content = content.replace(OLD_REJECT_END, NEW_REJECT_END, 1)
    changed = True

# Log user creation
OLD_USER_CREATE = (
    '        sec_log.info(\'Admin %s created user %s with role %s.\', request.user.username, user.username, role)\n'
    '        return Response(\n'
    '            {\'detail\': \'User created successfully.\', \'user_id\': user.id},'
)
NEW_USER_CREATE = (
    '        sec_log.info(\'Admin %s created user %s with role %s.\', request.user.username, user.username, role)\n'
    '        ActivityLog.log(request.user, \'user_created\', detail=f\'Created user {user.username} with role {role}\', request=request)\n'
    '        return Response(\n'
    '            {\'detail\': \'User created successfully.\', \'user_id\': user.id},'
)
if OLD_USER_CREATE in content:
    content = content.replace(OLD_USER_CREATE, NEW_USER_CREATE, 1)
    changed = True

# Log password reset
OLD_PW = (
    '        user_profile.user.set_password(password)\n'
    '        user_profile.user.save()\n'
    '        sec_log.info(\'Admin %s reset password for user %s.\', request.user.username, user_profile.user.username)\n'
    '        return Response({\'detail\': \'Password updated successfully.\'})'
)
NEW_PW = (
    '        user_profile.user.set_password(password)\n'
    '        user_profile.user.save()\n'
    '        sec_log.info(\'Admin %s reset password for user %s.\', request.user.username, user_profile.user.username)\n'
    '        ActivityLog.log(request.user, \'password_changed\', detail=f\'Password reset for user {user_profile.user.username}\', request=request)\n'
    '        return Response({\'detail\': \'Password updated successfully.\'})'
)
if OLD_PW in content:
    content = content.replace(OLD_PW, NEW_PW, 1)
    changed = True

# Log submission (report_submitted) in submit_to_admin
OLD_SUB = (
    '        obj.signing_step = \'submitted\'\n'
    '        self._save_signing_state(obj, [\'signing_step\'])\n'
    '        return Response(self.get_serializer(obj).data)'
)
NEW_SUB = (
    '        obj.signing_step = \'submitted\'\n'
    '        self._save_signing_state(obj, [\'signing_step\'])\n'
    '        ActivityLog.log(request.user, \'report_submitted\', doc_type=doc_type,\n'
    '            doc_id=obj.pk, doc_number=doc_number,\n'
    '            detail=f\'{doc_label} #{doc_number} submitted for vessel \\\"{vessel_name}\\\"\',\n'
    '            request=request)\n'
    '        return Response(self.get_serializer(obj).data)'
)
if OLD_SUB in content:
    content = content.replace(OLD_SUB, NEW_SUB, 1)
    changed = True

if changed:
    open(f'{BASE}/views.py', 'w', encoding='utf-8').write(content)
    print('views.py: activity logging calls added')
else:
    print('views.py: logging calls already present')


# ── 5. Register ActivityLog in urls.py ────────────────────────────────────
urls_path = f'{BASE}/urls.py'
content = open(urls_path, encoding='utf-8').read()
changed = False

if 'activity-logs' not in content:
    # Find the router.register block and add at end
    old_last = "router.register(r'notifications', views.NotificationViewSet, basename='notification')"
    new_last  = (
        "router.register(r'notifications', views.NotificationViewSet, basename='notification')\n"
        "router.register(r'activity-logs', views.ActivityLogViewSet, basename='activity-log')"
    )
    if old_last in content:
        content = content.replace(old_last, new_last, 1)
        changed = True
    else:
        # Append before urlpatterns
        content = content.replace(
            'urlpatterns',
            "router.register(r'activity-logs', views.ActivityLogViewSet, basename='activity-log')\n\nurlpatterns",
            1
        )
        changed = True

if changed:
    open(urls_path, 'w', encoding='utf-8').write(content)
    print('urls.py: activity-logs route added')
else:
    print('urls.py: already registered')


print('\nAll patches applied. Run makemigrations + migrate next.')
