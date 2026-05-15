"""
Serializers for inspection app models
"""
from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import (
    UserProfile, Tank, Inspection, Seal, Isolation,
    InspectionCalculation, InspectionReport,
    ProductReceiptCertificate, ProductReceiptCertificateItem,
    SealIsolationReport, SealIsolationEntry,
    ShoreTankCalculation, ShoreTankCalculationItem,
    Submission, VesselReport,
    ProvisionalOuturnReport, ProvisionalOuturnItem,
    StockReport, StockReportItem,
)


# ========== USER SERIALIZERS ==========
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')
        read_only_fields = ('id',)


class UserProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ('id', 'user', 'role', 'department', 'phone', 'is_active', 'created_at', 'updated_at')
        read_only_fields = ('id', 'created_at', 'updated_at')


class UserRegistrationSerializer(serializers.ModelSerializer):
    password         = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('username', 'email', 'password', 'confirm_password', 'first_name', 'last_name')

    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        return data

    def create(self, validated_data):
        validated_data.pop('confirm_password')
        return User.objects.create_user(**validated_data)


# ========== TANK SERIALIZERS ==========
class TankSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tank
        fields = (
            'id', 'tank_id', 'tank_name', 'product_type', 'capacity',
            'location', 'height', 'diameter', 'calibration_chart',
            'last_calibrated', 'is_active', 'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'created_at', 'updated_at')


class TankDetailSerializer(TankSerializer):
    recent_inspections = serializers.SerializerMethodField()

    def get_recent_inspections(self, obj):
        return InspectionListSerializer(obj.inspections.all()[:5], many=True).data


# ========== SEAL & ISOLATION SERIALIZERS ==========
class SealSerializer(serializers.ModelSerializer):
    class Meta:
        model = Seal
        fields = ('id', 'inspection', 'seal_number', 'seal_type', 'status', 'location', 'remarks', 'created_at')
        read_only_fields = ('id', 'created_at')


class IsolationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Isolation
        fields = (
            'id', 'inspection', 'valve_id', 'valve_type', 'status',
            'pipeline_name', 'is_isolated', 'remarks', 'created_at'
        )
        read_only_fields = ('id', 'created_at')


# ========== CALCULATION SERIALIZERS ==========
class InspectionCalculationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InspectionCalculation
        fields = (
            'id', 'inspection', 'gross_volume', 'water_volume', 'net_volume',
            'reference_temperature', 'temperature_correction_factor', 'corrected_volume',
            'product_density', 'density_correction_factor', 'net_standard_volume',
            'calculated_at', 'updated_at'
        )
        read_only_fields = ('id', 'calculated_at', 'updated_at')


# ========== REPORT SERIALIZERS ==========
class InspectionReportSerializer(serializers.ModelSerializer):
    generated_by_name = serializers.CharField(source='generated_by.get_full_name', read_only=True)

    class Meta:
        model = InspectionReport
        fields = (
            'id', 'inspection', 'report_type', 'generated_by', 'generated_by_name',
            'report_file', 'report_data', 'generated_at'
        )
        read_only_fields = ('id', 'generated_at')


# ========== INSPECTION SERIALIZERS ==========
class InspectionListSerializer(serializers.ModelSerializer):
    tank_name      = serializers.CharField(source='tank.tank_name', read_only=True)
    inspector_name = serializers.CharField(source='inspector.get_full_name', read_only=True)

    class Meta:
        model = Inspection
        fields = (
            'id', 'tank', 'tank_name', 'inspector', 'inspector_name',
            'ticket_number', 'vessel_name', 'product_name', 'terminal',
            'dip_reading', 'temperature', 'status', 'inspection_date', 'created_at'
        )
        read_only_fields = ('id', 'created_at')


class InspectionCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inspection
        fields = (
            'id', 'tank', 'ticket_number', 'vessel_name', 'product_name',
            'terminal', 'inspection_time', 'dip_reading', 'temperature', 'water_level',
            'overall_dip_1_mm', 'overall_dip_2_mm', 'overall_dip_3_mm',
            'product_dip_1_mm', 'product_dip_2_mm', 'product_dip_3_mm',
            'product_volume_1_l', 'product_volume_2_l', 'product_volume_3_l',
            'free_water_volume_1_l', 'free_water_volume_2_l', 'free_water_volume_3_l',
            'tank_temperature_1_c', 'tank_temperature_2_c', 'tank_temperature_3_c',
            'specific_gravity_1', 'specific_gravity_2', 'specific_gravity_3',
            'sample_temperature_1_c', 'sample_temperature_2_c', 'sample_temperature_3_c',
            'outlet_valve_seal_number', 'water_valve_seal_number',
            'other_branches_seal_number', 'meter_reading_obs',
            'meter_reading_at_20', 'meter_reading_mts',
            'terminal_representative_name', 'terminal_representative_signature',
            'pbpa_inspector_name', 'pbpa_inspector_signature',
            'observations', 'tank_condition', 'remarks', 'inspection_date'
        )
        read_only_fields = ('id',)

    def create(self, validated_data):
        validated_data['inspector'] = self.context['request'].user
        return super().create(validated_data)


class InspectionDetailSerializer(serializers.ModelSerializer):
    tank_detail    = TankSerializer(source='tank', read_only=True)
    inspector_name = serializers.CharField(source='inspector.get_full_name', read_only=True)
    supervisor_name = serializers.CharField(source='supervisor.get_full_name', read_only=True, allow_null=True)
    seals       = SealSerializer(many=True, read_only=True)
    isolations  = IsolationSerializer(many=True, read_only=True)
    calculation = InspectionCalculationSerializer(read_only=True)
    reports     = InspectionReportSerializer(many=True, read_only=True)
    overall_dip_average_mm       = serializers.FloatField(read_only=True)
    product_dip_average_mm       = serializers.FloatField(read_only=True)
    product_volume_average_l     = serializers.FloatField(read_only=True)
    free_water_volume_average_l  = serializers.FloatField(read_only=True)
    tank_temperature_average_c   = serializers.FloatField(read_only=True)
    specific_gravity_average     = serializers.FloatField(read_only=True)
    sample_temperature_average_c = serializers.FloatField(read_only=True)

    class Meta:
        model = Inspection
        fields = (
            'id', 'tank', 'tank_detail', 'inspector', 'inspector_name',
            'supervisor', 'supervisor_name', 'ticket_number', 'vessel_name',
            'product_name', 'terminal', 'inspection_time', 'dip_reading', 'temperature',
            'water_level', 'observations', 'tank_condition', 'remarks',
            'overall_dip_1_mm', 'overall_dip_2_mm', 'overall_dip_3_mm', 'overall_dip_average_mm',
            'product_dip_1_mm', 'product_dip_2_mm', 'product_dip_3_mm', 'product_dip_average_mm',
            'product_volume_1_l', 'product_volume_2_l', 'product_volume_3_l', 'product_volume_average_l',
            'free_water_volume_1_l', 'free_water_volume_2_l', 'free_water_volume_3_l', 'free_water_volume_average_l',
            'tank_temperature_1_c', 'tank_temperature_2_c', 'tank_temperature_3_c', 'tank_temperature_average_c',
            'specific_gravity_1', 'specific_gravity_2', 'specific_gravity_3', 'specific_gravity_average',
            'sample_temperature_1_c', 'sample_temperature_2_c', 'sample_temperature_3_c', 'sample_temperature_average_c',
            'outlet_valve_seal_number', 'water_valve_seal_number',
            'other_branches_seal_number', 'meter_reading_obs',
            'meter_reading_at_20', 'meter_reading_mts',
            'terminal_representative_name', 'terminal_representative_signature',
            'pbpa_inspector_name', 'pbpa_inspector_signature',
            'status', 'inspection_date', 'approval_date', 'rejection_reason',
            'seals', 'isolations', 'calculation', 'reports',
            'created_at', 'updated_at'
        )
        read_only_fields = ('id', 'inspector', 'supervisor', 'approval_date', 'rejection_reason', 'created_at', 'updated_at')


class InspectionApprovalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Inspection
        fields = ('id', 'status', 'rejection_reason')
        read_only_fields = ('id',)

    def validate_status(self, value):
        if value not in ['approved', 'rejected']:
            raise serializers.ValidationError("Status must be 'approved' or 'rejected'")
        return value

    def update(self, instance, validated_data):
        instance.status           = validated_data.get('status', instance.status)
        instance.rejection_reason = validated_data.get('rejection_reason', '')
        instance.supervisor       = self.context['request'].user
        instance.approval_date    = timezone.now()
        instance.save()
        return instance


# ========== PRODUCT RECEIPT CERTIFICATE ==========
class ProductReceiptCertificateItemSerializer(serializers.ModelSerializer):
    tank_name = serializers.CharField(source='tank.tank_name', read_only=True)

    class Meta:
        model = ProductReceiptCertificateItem
        fields = ('id', 'tank', 'tank_name', 'tank_no', 'product_name', 'weight_tonnage', 'volume_liters', 'created_at')
        read_only_fields = ('id', 'created_at')


class ProductReceiptCertificateListSerializer(serializers.ModelSerializer):
    created_by_name      = serializers.CharField(source='created_by.get_full_name', read_only=True)
    signed_by_name       = serializers.CharField(source='signed_by.get_full_name',  read_only=True, allow_null=True)
    total_weight_tonnage = serializers.FloatField(read_only=True)
    total_volume_liters  = serializers.FloatField(read_only=True)

    class Meta:
        model = ProductReceiptCertificate
        fields = (
            'id', 'certificate_number', 'vessel_name', 'terminal',
            'receipt_date', 'receipt_time', 'status', 'created_by', 'created_by_name',
            'total_weight_tonnage', 'total_volume_liters',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'issued_at'
        )
        read_only_fields = (
            'id', 'certificate_number', 'created_by', 'created_by_name',
            'total_weight_tonnage', 'total_volume_liters',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'issued_at'
        )


class ProductReceiptCertificateDetailSerializer(serializers.ModelSerializer):
    items                = ProductReceiptCertificateItemSerializer(many=True)
    created_by_name      = serializers.CharField(source='created_by.get_full_name', read_only=True)
    signed_by_name       = serializers.CharField(source='signed_by.get_full_name',  read_only=True, allow_null=True)
    total_weight_tonnage = serializers.FloatField(read_only=True)
    total_volume_liters  = serializers.FloatField(read_only=True)

    class Meta:
        model = ProductReceiptCertificate
        fields = (
            'id', 'certificate_number', 'vessel_name', 'terminal',
            'receipt_date', 'receipt_time', 'quantity_received_through_inlet_flowmeters',
            'terminal_representative_name', 'terminal_representative_signature',
            'pbpa_inspector_name', 'pbpa_inspector_signature', 'notes',
            'status', 'created_by', 'created_by_name', 'items',
            'total_weight_tonnage', 'total_volume_liters',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'updated_at', 'issued_at'
        )
        read_only_fields = (
            'id', 'certificate_number', 'created_by', 'created_by_name',
            'total_weight_tonnage', 'total_volume_liters',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'updated_at', 'issued_at'
        )

    def _sync_items(self, certificate, items_data):
        certificate.items.all().delete()
        for item_data in items_data:
            ProductReceiptCertificateItem.objects.create(certificate=certificate, **item_data)

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        certificate = ProductReceiptCertificate.objects.create(**validated_data)
        self._sync_items(certificate, items_data)
        return certificate

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance


# ========== SEAL AND ISOLATION REPORT ==========
class SealIsolationEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SealIsolationEntry
        fields = ('id', 'location', 'seal_number', 'remarks', 'created_at')
        read_only_fields = ('id', 'created_at')


class SealIsolationReportListSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    signed_by_name  = serializers.CharField(source='signed_by.get_full_name',  read_only=True, allow_null=True)

    class Meta:
        model = SealIsolationReport
        fields = (
            'id', 'report_number', 'vessel_name', 'product_name', 'terminal',
            'report_date', 'status', 'created_by', 'created_by_name',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'issued_at'
        )
        read_only_fields = (
            'id', 'report_number', 'created_by', 'created_by_name',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'issued_at'
        )


class SealIsolationReportDetailSerializer(serializers.ModelSerializer):
    entries         = SealIsolationEntrySerializer(many=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    signed_by_name  = serializers.CharField(source='signed_by.get_full_name',  read_only=True, allow_null=True)

    class Meta:
        model = SealIsolationReport
        fields = (
            'id', 'report_number', 'vessel_name', 'product_name', 'terminal',
            'report_date', 'terminal_representative_name', 'terminal_representative_signature',
            'pbpa_inspector_name', 'pbpa_inspector_signature', 'notes',
            'status', 'created_by', 'created_by_name', 'entries',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'updated_at', 'issued_at'
        )
        read_only_fields = (
            'id', 'report_number', 'created_by', 'created_by_name',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'updated_at', 'issued_at'
        )

    def _sync_entries(self, report, entries_data):
        report.entries.all().delete()
        for entry_data in entries_data:
            SealIsolationEntry.objects.create(report=report, **entry_data)

    def create(self, validated_data):
        entries_data = validated_data.pop('entries', [])
        report = SealIsolationReport.objects.create(**validated_data)
        self._sync_entries(report, entries_data)
        return report

    def update(self, instance, validated_data):
        entries_data = validated_data.pop('entries', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if entries_data is not None:
            self._sync_entries(instance, entries_data)
        return instance


# ========== SHORE TANK CALCULATION ==========
class ShoreTankCalculationItemSerializer(serializers.ModelSerializer):
    tank_name                   = serializers.CharField(source='tank.tank_name', read_only=True)
    net_observed_initial_m3     = serializers.FloatField(read_only=True)
    net_observed_final_m3       = serializers.FloatField(read_only=True)
    received_observed_volume_m3 = serializers.FloatField(read_only=True)
    effective_vcf_initial       = serializers.FloatField(read_only=True)
    effective_vcf_final         = serializers.FloatField(read_only=True)
    effective_wcf_initial       = serializers.FloatField(read_only=True)
    effective_wcf_final         = serializers.FloatField(read_only=True)
    standard_volume_initial_m3  = serializers.FloatField(read_only=True)
    standard_volume_final_m3    = serializers.FloatField(read_only=True)
    received_standard_volume_m3 = serializers.FloatField(read_only=True)
    weight_air_initial_mt       = serializers.FloatField(read_only=True)
    weight_air_final_mt         = serializers.FloatField(read_only=True)
    received_weight_air_mt      = serializers.FloatField(read_only=True)

    class Meta:
        model = ShoreTankCalculationItem
        fields = (
            'id', 'tank', 'tank_name', 'tank_no',
            'overall_dip_initial_mm', 'overall_dip_final_mm',
            'water_dip_initial_mm', 'water_dip_final_mm',
            'product_dip_initial_mm', 'product_dip_final_mm',
            'tank_temperature_initial_c', 'tank_temperature_final_c',
            'sample_temperature_initial_c', 'sample_temperature_final_c',
            'density_initial_kg_l', 'density_final_kg_l',
            'gross_observed_initial_m3', 'gross_observed_final_m3',
            'roof_displacement_initial_m3', 'roof_displacement_final_m3',
            'water_volume_initial_m3', 'water_volume_final_m3',
            'vcf_initial', 'vcf_final', 'wcf_initial', 'wcf_final',
            'net_observed_initial_m3', 'net_observed_final_m3',
            'received_observed_volume_m3', 'effective_vcf_initial',
            'effective_vcf_final', 'effective_wcf_initial', 'effective_wcf_final',
            'standard_volume_initial_m3', 'standard_volume_final_m3',
            'received_standard_volume_m3', 'weight_air_initial_mt',
            'weight_air_final_mt', 'received_weight_air_mt',
            'remarks', 'created_at'
        )
        read_only_fields = ('id', 'created_at')


class ShoreTankCalculationListSerializer(serializers.ModelSerializer):
    created_by_name               = serializers.CharField(source='created_by.get_full_name', read_only=True)
    signed_by_name                = serializers.CharField(source='signed_by.get_full_name',  read_only=True, allow_null=True)
    terminal_observed_volume_m3   = serializers.FloatField(read_only=True)
    terminal_standard_volume_m3   = serializers.FloatField(read_only=True)
    terminal_weight_air_mt        = serializers.FloatField(read_only=True)
    difference_observed_volume_m3 = serializers.FloatField(read_only=True)
    difference_standard_volume_m3 = serializers.FloatField(read_only=True)
    difference_weight_air_mt      = serializers.FloatField(read_only=True)

    class Meta:
        model = ShoreTankCalculation
        fields = (
            'id', 'calculation_number', 'vessel_name', 'product_name',
            'terminal', 'calculation_date', 'status', 'created_by', 'created_by_name',
            'terminal_observed_volume_m3', 'terminal_standard_volume_m3', 'terminal_weight_air_mt',
            'difference_observed_volume_m3', 'difference_standard_volume_m3', 'difference_weight_air_mt',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'finalized_at'
        )
        read_only_fields = (
            'id', 'calculation_number', 'created_by', 'created_by_name',
            'terminal_observed_volume_m3', 'terminal_standard_volume_m3', 'terminal_weight_air_mt',
            'difference_observed_volume_m3', 'difference_standard_volume_m3', 'difference_weight_air_mt',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'finalized_at'
        )


class ShoreTankCalculationDetailSerializer(serializers.ModelSerializer):
    tank_items                    = ShoreTankCalculationItemSerializer(many=True)
    created_by_name               = serializers.CharField(source='created_by.get_full_name', read_only=True)
    signed_by_name                = serializers.CharField(source='signed_by.get_full_name',  read_only=True, allow_null=True)
    terminal_observed_volume_m3   = serializers.FloatField(read_only=True)
    terminal_standard_volume_m3   = serializers.FloatField(read_only=True)
    terminal_weight_air_mt        = serializers.FloatField(read_only=True)
    difference_observed_volume_m3 = serializers.FloatField(read_only=True)
    difference_standard_volume_m3 = serializers.FloatField(read_only=True)
    difference_weight_air_mt      = serializers.FloatField(read_only=True)

    class Meta:
        model = ShoreTankCalculation
        fields = (
            'id', 'calculation_number', 'vessel_name', 'product_name',
            'terminal', 'calculation_date', 'vessel_density_kg_m3',
            'vessel_temperature_c', 'vessel_observed_volume_m3',
            'vessel_standard_volume_m3', 'vessel_weight_air_mt',
            'meter_quantity_m3', 'pbpa_inspector_name',
            'terminal_representative_name', 'remarks', 'status',
            'created_by', 'created_by_name', 'tank_items',
            'terminal_observed_volume_m3', 'terminal_standard_volume_m3', 'terminal_weight_air_mt',
            'difference_observed_volume_m3', 'difference_standard_volume_m3', 'difference_weight_air_mt',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'updated_at', 'finalized_at'
        )
        read_only_fields = (
            'id', 'calculation_number', 'created_by', 'created_by_name',
            'terminal_observed_volume_m3', 'terminal_standard_volume_m3', 'terminal_weight_air_mt',
            'difference_observed_volume_m3', 'difference_standard_volume_m3', 'difference_weight_air_mt',
            'is_signed', 'signed_at', 'signed_by_name', 'document_hash',
            'created_at', 'updated_at', 'finalized_at'
        )

    def _sync_items(self, calculation, items_data):
        calculation.tank_items.all().delete()
        for item_data in items_data:
            ShoreTankCalculationItem.objects.create(calculation=calculation, **item_data)

    def create(self, validated_data):
        items_data = validated_data.pop('tank_items', [])
        calculation = ShoreTankCalculation.objects.create(**validated_data)
        self._sync_items(calculation, items_data)
        return calculation

    def update(self, instance, validated_data):
        items_data = validated_data.pop('tank_items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance


# ========== SUBMISSION & VESSEL REPORT ==========
class SubmissionSerializer(serializers.ModelSerializer):
    submitted_by_name = serializers.CharField(source='submitted_by.get_full_name', read_only=True)
    SUBMITTABLE_DOCUMENTS = {
        'dip_ticket': {
            'model': Inspection,
            'status': 'approved',
            'label': 'Dip Ticket',
        },
        'seal_isolation': {
            'model': SealIsolationReport,
            'status': 'issued',
            'label': 'Seal & Isolation Report',
        },
        'product_receipt': {
            'model': ProductReceiptCertificate,
            'status': 'issued',
            'label': 'Product Receipt Certificate',
        },
        'shore_tank': {
            'model': ShoreTankCalculation,
            'status': 'final',
            'label': 'Shore Tank Calculation',
        },
        'stock_report': {
            'model': StockReport,
            'status': 'final',
            'label': 'Stock Report',
        },
        'provisional_outturn': {
            'model': ProvisionalOuturnReport,
            'status': 'final',
            'label': 'Provisional Outturn Report',
        },
    }

    class Meta:
        model = Submission
        fields = (
            'id', 'doc_type', 'doc_id', 'doc_number', 'vessel_name', 'terminal',
            'submitted_by', 'submitted_by_name', 'submitted_at', 'is_read', 'notes',
        )
        read_only_fields = ('id', 'submitted_by', 'submitted_by_name', 'submitted_at')

    def validate(self, data):
        doc_type = data.get('doc_type')
        doc_id = data.get('doc_id')
        config = self.SUBMITTABLE_DOCUMENTS.get(doc_type)

        if not config:
            raise serializers.ValidationError({'doc_type': 'Unsupported document type.'})

        document = config['model'].objects.filter(pk=doc_id).first()
        if document is None:
            raise serializers.ValidationError({'doc_id': f"{config['label']} was not found."})

        required_status = config['status']
        current_status = getattr(document, 'status', None)
        if current_status != required_status:
            raise serializers.ValidationError({
                'detail': f"{config['label']} must be {required_status} before it can be submitted."
            })

        existing = Submission.objects.filter(doc_type=doc_type, doc_id=doc_id)
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)
        if existing.exists():
            raise serializers.ValidationError({
                'detail': f"{config['label']} has already been submitted."
            })

        return data


class VesselReportSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = VesselReport
        fields = (
            'id', 'report_number', 'vessel_name', 'terminal', 'product_name',
            'discharge_date', 'status', 'created_by', 'created_by_name',
            'dip_ticket_ids', 'seal_report_ids', 'shore_calc_ids', 'cert_ids',
            'total_weight_mt', 'total_volume_m3', 'remarks',
            'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'report_number', 'created_by', 'created_by_name', 'created_at', 'updated_at')


# ========== PROVISIONAL OUTTURN REPORT ==========
class ProvisionalOuturnItemSerializer(serializers.ModelSerializer):
    diff_volume_m3  = serializers.FloatField(read_only=True)
    diff_volume_pct = serializers.FloatField(read_only=True)
    diff_weight_mt  = serializers.FloatField(read_only=True)
    diff_weight_pct = serializers.FloatField(read_only=True)

    class Meta:
        model = ProvisionalOuturnItem
        fields = (
            'id', 'sn', 'terminal_name',
            'ship_volume_m3', 'ship_weight_mt',
            'shore_volume_m3', 'shore_weight_mt',
            'diff_volume_m3', 'diff_volume_pct',
            'diff_weight_mt', 'diff_weight_pct',
        )
        read_only_fields = ('id',)


class ProvisionalOuturnReportSerializer(serializers.ModelSerializer):
    items           = ProvisionalOuturnItemSerializer(many=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    totals          = serializers.DictField(read_only=True)

    class Meta:
        model = ProvisionalOuturnReport
        fields = (
            'id', 'report_number', 'vessel_name', 'report_date',
            'port', 'product', 'captain_name', 'surveyor_name',
            'status', 'created_by', 'created_by_name',
            'items', 'totals', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'report_number', 'created_by', 'created_by_name', 'totals', 'created_at', 'updated_at')

    def _sync_items(self, report, items_data):
        report.items.all().delete()
        for item_data in items_data:
            ProvisionalOuturnItem.objects.create(report=report, **item_data)

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        report = ProvisionalOuturnReport.objects.create(**validated_data)
        self._sync_items(report, items_data)
        return report

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance


# ========== STOCK REPORT ==========
class StockReportItemSerializer(serializers.ModelSerializer):
    total_ltrs = serializers.FloatField(read_only=True)

    class Meta:
        model = StockReportItem
        fields = (
            'id', 'sn', 'depot_name', 'date', 'product',
            'local_ltrs', 'bps_transit_ltrs', 'non_bps_transit_ltrs',
            'mining_ltrs', 'transshipment_ltrs', 'awaiting_outturn_ltrs',
            'total_ltrs',
        )
        read_only_fields = ('id',)


class StockReportSerializer(serializers.ModelSerializer):
    items           = StockReportItemSerializer(many=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    total_ltrs      = serializers.FloatField(read_only=True)

    class Meta:
        model = StockReport
        fields = (
            'id', 'report_number', 'report_date', 'status',
            'created_by', 'created_by_name', 'notes',
            'items', 'total_ltrs', 'created_at', 'updated_at',
        )
        read_only_fields = ('id', 'report_number', 'created_by', 'created_by_name', 'total_ltrs', 'created_at', 'updated_at')

    def _sync_items(self, report, items_data):
        report.items.all().delete()
        for item_data in items_data:
            StockReportItem.objects.create(report=report, **item_data)

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        report = StockReport.objects.create(**validated_data)
        self._sync_items(report, items_data)
        return report

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            self._sync_items(instance, items_data)
        return instance
