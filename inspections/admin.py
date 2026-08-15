from django.contrib import admin
from django.utils import timezone
from .models import (
    UserProfile, Terminal, Tank, Inspection, Seal, Isolation,
    InspectionCalculation, InspectionReport,
    ProductReceiptCertificate, ProductReceiptCertificateItem,
    SealIsolationReport, SealIsolationEntry,
    ShoreTankCalculation, ShoreTankCalculationItem,
    Submission, VesselReport, RosterAssignment,
    DocumentSignature,
)

admin.site.site_header = "Smart Reporting Admin"
admin.site.site_title = "Smart Reporting"
admin.site.index_title = "PBPA Operations Console"


@admin.register(Terminal)
class TerminalAdmin(admin.ModelAdmin):
    list_display = ('name', 'location', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name', 'location')
    list_editable = ('is_active',)


# ── User Profile ──────────────────────────────────────────────────────────────
@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'role', 'department', 'phone', 'is_active', 'created_at')
    list_filter = ('role', 'is_active')
    search_fields = ('user__username', 'user__first_name', 'user__last_name', 'user__email', 'department')
    list_per_page = 25
    list_editable = ('role', 'is_active')
    ordering = ('user__username',)


# ── Tank ──────────────────────────────────────────────────────────────────────
@admin.register(Tank)
class TankAdmin(admin.ModelAdmin):
    list_display = ('tank_id', 'tank_name', 'product_type', 'capacity', 'location', 'is_active', 'last_calibrated')
    list_filter = ('product_type', 'is_active')
    search_fields = ('tank_id', 'tank_name', 'location')
    list_per_page = 25
    list_editable = ('is_active',)
    ordering = ('tank_id',)
    fieldsets = (
        ('Basic Info', {'fields': ('tank_id', 'tank_name', 'product_type', 'location', 'is_active')}),
        ('Dimensions', {'fields': ('height', 'diameter', 'capacity')}),
        ('Calibration', {'fields': ('calibration_chart', 'last_calibrated')}),
    )


# ── Inspection ────────────────────────────────────────────────────────────────
def approve_inspections(modeladmin, request, queryset):
    queryset.filter(status='submitted').update(
        status='approved', approved_by=request.user, approval_date=timezone.now()
    )
approve_inspections.short_description = 'Approve selected inspections'

def reject_inspections(modeladmin, request, queryset):
    queryset.filter(status='submitted').update(
        status='rejected', approved_by=request.user, approval_date=timezone.now()
    )
reject_inspections.short_description = 'Reject selected inspections'


@admin.register(Inspection)
class InspectionAdmin(admin.ModelAdmin):
    list_display = ('id', 'ticket_number', 'vessel_name', 'tank', 'inspector', 'status', 'inspection_date', 'temperature')
    list_filter = ('status', 'tank__product_type', 'terminal')
    search_fields = ('ticket_number', 'vessel_name', 'terminal', 'tank__tank_name', 'inspector__username')
    readonly_fields = ('created_at', 'updated_at', 'approval_date')
    date_hierarchy = 'inspection_date'
    list_per_page = 25
    ordering = ('-inspection_date',)
    actions = [approve_inspections, reject_inspections]
    fieldsets = (
        ('Header', {'fields': ('tank', 'inspector', 'approved_by', 'status', 'inspection_date')}),
        ('Dip Ticket', {'fields': ('ticket_number', 'vessel_name', 'product_name', 'terminal')}),
        ('Measurements', {'fields': ('dip_reading', 'temperature', 'water_level', 'tank_condition')}),
        ('Seal & Meter', {'fields': (
            'outlet_valve_seal_number', 'water_valve_seal_number', 'other_branches_seal_number',
            'meter_reading_obs', 'meter_reading_at_20', 'meter_reading_mts',
        )}),
        ('Notes', {'fields': ('observations', 'remarks', 'rejection_reason')}),
        ('Timestamps', {'fields': ('created_at', 'updated_at', 'approval_date'), 'classes': ('collapse',)}),
    )


# ── Seal ──────────────────────────────────────────────────────────────────────
@admin.register(Seal)
class SealAdmin(admin.ModelAdmin):
    list_display = ('seal_number', 'inspection', 'status', 'location', 'created_at')
    list_filter = ('status',)
    search_fields = ('seal_number', 'inspection__tank__tank_name')
    list_per_page = 25
    ordering = ('seal_number',)


# ── Isolation ─────────────────────────────────────────────────────────────────
@admin.register(Isolation)
class IsolationAdmin(admin.ModelAdmin):
    list_display = ('valve_id', 'inspection', 'status', 'is_isolated', 'pipeline_name', 'created_at')
    list_filter = ('status', 'is_isolated')
    search_fields = ('valve_id', 'pipeline_name')
    list_per_page = 25


# ── Inspection Calculation ────────────────────────────────────────────────────
@admin.register(InspectionCalculation)
class InspectionCalculationAdmin(admin.ModelAdmin):
    list_display = ('inspection', 'gross_volume', 'water_volume', 'net_volume', 'corrected_volume', 'net_standard_volume', 'calculated_at')
    list_filter = ('calculated_at',)
    readonly_fields = ('calculated_at', 'updated_at')
    list_per_page = 25
    ordering = ('-calculated_at',)


# ── Inspection Report ─────────────────────────────────────────────────────────
@admin.register(InspectionReport)
class InspectionReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'inspection', 'report_type', 'generated_by', 'generated_at')
    list_filter = ('report_type',)
    search_fields = ('inspection__tank__tank_name',)
    readonly_fields = ('generated_at',)
    date_hierarchy = 'generated_at'
    list_per_page = 25
    ordering = ('-generated_at',)


# ── Product Receipt Certificate ───────────────────────────────────────────────
class ProductReceiptCertificateItemInline(admin.TabularInline):
    model = ProductReceiptCertificateItem
    extra = 1
    fields = ('tank', 'tank_no', 'product_name', 'weight_tonnage', 'volume_liters')


@admin.register(ProductReceiptCertificate)
class ProductReceiptCertificateAdmin(admin.ModelAdmin):
    list_display = ('certificate_number', 'vessel_name', 'terminal', 'receipt_date', 'status', 'pbpa_inspector_name', 'total_weight_tonnage', 'total_volume_liters')
    list_filter = ('status', 'terminal')
    search_fields = ('certificate_number', 'vessel_name', 'terminal', 'pbpa_inspector_name')
    readonly_fields = ('certificate_number', 'created_at', 'updated_at', 'issued_at')
    date_hierarchy = 'receipt_date'
    list_per_page = 25
    ordering = ('-receipt_date',)
    inlines = [ProductReceiptCertificateItemInline]
    fieldsets = (
        ('Header', {'fields': ('certificate_number', 'vessel_name', 'terminal', 'receipt_date', 'receipt_time', 'status')}),
        ('Quantities', {'fields': ('quantity_received_through_inlet_flowmeters',)}),
        ('Signatories', {'fields': ('terminal_representative_name', 'terminal_representative_signature', 'pbpa_inspector_name', 'pbpa_inspector_signature')}),
        ('Notes', {'fields': ('notes',)}),
        ('Metadata', {'fields': ('created_by', 'issued_at', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


# ── Seal Isolation Report ─────────────────────────────────────────────────────
class SealIsolationEntryInline(admin.TabularInline):
    model = SealIsolationEntry
    extra = 1
    fields = ('location', 'seal_number', 'remarks')


@admin.register(SealIsolationReport)
class SealIsolationReportAdmin(admin.ModelAdmin):
    list_display = ('report_number', 'vessel_name', 'product_name', 'terminal', 'report_date', 'status', 'pbpa_inspector_name')
    list_filter = ('status', 'terminal')
    search_fields = ('report_number', 'vessel_name', 'product_name', 'terminal', 'pbpa_inspector_name')
    readonly_fields = ('report_number', 'created_at', 'updated_at', 'issued_at')
    date_hierarchy = 'report_date'
    list_per_page = 25
    ordering = ('-report_date',)
    inlines = [SealIsolationEntryInline]


# ── Shore Tank Calculation ────────────────────────────────────────────────────
class ShoreTankCalculationItemInline(admin.TabularInline):
    model = ShoreTankCalculationItem
    extra = 1
    fields = ('tank', 'tank_no', 'density_initial_kg_l', 'density_final_kg_l', 'gross_observed_initial_m3', 'gross_observed_final_m3')


@admin.register(ShoreTankCalculation)
class ShoreTankCalculationAdmin(admin.ModelAdmin):
    list_display = ('calculation_number', 'vessel_name', 'product_name', 'terminal', 'calculation_date', 'status', 'terminal_standard_volume_m3', 'terminal_weight_air_mt')
    list_filter = ('status', 'terminal')
    search_fields = ('calculation_number', 'vessel_name', 'product_name', 'terminal', 'pbpa_inspector_name')
    readonly_fields = ('calculation_number', 'created_at', 'updated_at', 'finalized_at')
    date_hierarchy = 'calculation_date'
    list_per_page = 25
    ordering = ('-calculation_date',)
    inlines = [ShoreTankCalculationItemInline]


# Submissions and Vessel Reports
@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ('doc_type', 'doc_number', 'vessel_name', 'terminal', 'submitted_by', 'submitted_at', 'is_read')
    list_filter = ('doc_type', 'is_read', 'submitted_at')
    search_fields = ('doc_number', 'vessel_name', 'terminal', 'submitted_by__username')
    readonly_fields = ('submitted_at',)
    date_hierarchy = 'submitted_at'
    list_per_page = 25
    ordering = ('-submitted_at',)
    list_editable = ('is_read',)


@admin.register(VesselReport)
class VesselReportAdmin(admin.ModelAdmin):
    list_display = ('report_number', 'vessel_name', 'terminal', 'product_name', 'discharge_date', 'status', 'total_weight_mt', 'total_volume_m3')
    list_filter = ('status', 'terminal', 'discharge_date')
    search_fields = ('report_number', 'vessel_name', 'terminal', 'product_name')
    readonly_fields = ('report_number', 'created_at', 'updated_at')
    date_hierarchy = 'discharge_date'
    list_per_page = 25
    ordering = ('-discharge_date',)
    fieldsets = (
        ('Header', {'fields': ('report_number', 'vessel_name', 'terminal', 'product_name', 'discharge_date', 'status')}),
        ('Linked Documents', {'fields': ('dip_ticket_ids', 'seal_report_ids', 'shore_calc_ids', 'cert_ids')}),
        ('Summary', {'fields': ('total_weight_mt', 'total_volume_m3', 'remarks')}),
        ('Metadata', {'fields': ('created_by', 'created_at', 'updated_at'), 'classes': ('collapse',)}),
    )


@admin.register(RosterAssignment)
class RosterAssignmentAdmin(admin.ModelAdmin):
    list_display = ('week_start_date', 'inspector', 'created_by_admin', 'shift', 'location', 'terminal', 'status', 'sent_at')
    list_filter = ('status', 'shift', 'week_start_date')
    search_fields = ('inspector__username', 'inspector__first_name', 'inspector__last_name', 'terminal', 'vessel_name', 'task')
    readonly_fields = ('created_at', 'updated_at', 'sent_at')
    date_hierarchy = 'week_start_date'
    list_per_page = 25
    ordering = ('-week_start_date', '-created_at')


@admin.register(DocumentSignature)
class DocumentSignatureAdmin(admin.ModelAdmin):
    list_display = ('doc_type', 'doc_number', 'signer', 'role', 'status', 'ip_address', 'created_at')
    list_filter = ('doc_type', 'role', 'status')
    search_fields = ('doc_number', 'signer__username', 'signer__first_name', 'document_hash')
    readonly_fields = (
        'doc_type', 'doc_id', 'doc_number', 'signer', 'role',
        'document_hash', 'digital_signature', 'signing_timestamp',
        'ip_address', 'user_agent', 'status', 'created_at',
    )
    date_hierarchy = 'created_at'
    list_per_page = 25
    ordering = ('-created_at',)
