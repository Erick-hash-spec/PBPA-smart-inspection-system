from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone


def default_receipt_time():
    """Return the current local time for certificate defaults."""
    return timezone.localtime().time().replace(microsecond=0)

# ========== USER ROLES ==========
class UserProfile(models.Model):
    """Extended user profile with role information"""
    ROLE_CHOICES = (
        ('inspector', 'Inspector'),
        ('supervisor', 'Supervisor'),
        ('admin', 'Admin'),
    )
    
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='inspector')
    department = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.get_full_name()} ({self.get_role_display()})"
    
    class Meta:
        verbose_name = "User Profile"
        verbose_name_plural = "User Profiles"


class RosterAssignment(models.Model):
    """Supervisor-created weekly roster assignment for an inspector."""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('cancelled', 'Cancelled'),
    )
    SHIFT_CHOICES = (
        ('day', 'Day'),
        ('night', 'Night'),
        ('custom', 'Custom'),
    )
    DAY_CHOICES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    inspector = models.ForeignKey(User, on_delete=models.CASCADE, related_name='roster_assignments')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='rosters_created')
    week_start_date = models.DateField(default=timezone.localdate, help_text='Monday of the roster week')
    working_days = models.JSONField(default=list, help_text='List of day names, e.g. ["Mon","Wed","Fri"]')
    shift = models.CharField(max_length=20, choices=SHIFT_CHOICES, default='day')
    location = models.CharField(max_length=200, blank=True, help_text='KURASINI or KIGAMBONI')
    terminal = models.CharField(max_length=200, blank=True)
    vessel_name = models.CharField(max_length=200, blank=True)
    task = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    is_read = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-week_start_date', '-created_at']
        verbose_name = "Roster Assignment"
        verbose_name_plural = "Roster Assignments"

    def __str__(self):
        days = ', '.join(self.working_days) if self.working_days else 'No days'
        return f"{self.week_start_date} [{days}] - {self.inspector.get_full_name() or self.inspector.username}"


# ========== TANK MANAGEMENT ==========
class Tank(models.Model):
    """Tank information and specifications"""
    PRODUCT_CHOICES = (
        ('crude_oil', 'Crude Oil'),
        ('fuel_oil', 'Fuel Oil'),
        ('diesel', 'Diesel'),
        ('gasoline', 'Gasoline'),
        ('water', 'Water'),
        ('other', 'Other'),
    )
    
    tank_id = models.CharField(max_length=50, unique=True)
    tank_name = models.CharField(max_length=100)
    product_type = models.CharField(max_length=20, choices=PRODUCT_CHOICES)
    capacity = models.FloatField(validators=[MinValueValidator(0)])  # in barrels or liters
    location = models.CharField(max_length=200)
    height = models.FloatField(validators=[MinValueValidator(0)], help_text="Tank height in meters")
    diameter = models.FloatField(validators=[MinValueValidator(0)], help_text="Tank diameter in meters")
    calibration_chart = models.FileField(upload_to='calibration_charts/', null=True, blank=True)
    last_calibrated = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.tank_name} ({self.tank_id})"
    
    class Meta:
        ordering = ['tank_id']
        verbose_name = "Tank"
        verbose_name_plural = "Tanks"


# ========== INSPECTIONS ==========
class Inspection(models.Model):
    """Main inspection record"""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )
    
    tank = models.ForeignKey(Tank, on_delete=models.CASCADE, related_name='inspections')
    inspector = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='inspections_created')
    supervisor = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='inspections_approved')

    # PBPA Dip Ticket Header
    ticket_number = models.CharField(max_length=30, blank=True)
    vessel_name = models.CharField(max_length=200, blank=True)
    product_name = models.CharField(max_length=100, blank=True)
    terminal = models.CharField(max_length=200, blank=True)
    inspection_time = models.TimeField(default=default_receipt_time)
    
    # Dip Ticket Data
    dip_reading = models.FloatField(validators=[MinValueValidator(0)], help_text="Dip reading in cm/meters")
    temperature = models.FloatField(validators=[MinValueValidator(-50), MaxValueValidator(150)], help_text="Temperature in Celsius")
    water_level = models.FloatField(validators=[MinValueValidator(0)], default=0, help_text="Water level in cm")

    # PBPA repeated dip-ticket measurements: 1st, 2nd, 3rd, and average.
    overall_dip_1_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    overall_dip_2_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    overall_dip_3_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    product_dip_1_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    product_dip_2_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    product_dip_3_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    product_volume_1_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    product_volume_2_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    product_volume_3_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    free_water_volume_1_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    free_water_volume_2_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    free_water_volume_3_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    tank_temperature_1_c = models.FloatField(null=True, blank=True)
    tank_temperature_2_c = models.FloatField(null=True, blank=True)
    tank_temperature_3_c = models.FloatField(null=True, blank=True)
    specific_gravity_1 = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    specific_gravity_2 = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    specific_gravity_3 = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    sample_temperature_1_c = models.FloatField(null=True, blank=True)
    sample_temperature_2_c = models.FloatField(null=True, blank=True)
    sample_temperature_3_c = models.FloatField(null=True, blank=True)

    # PBPA dip ticket seal and meter readings block.
    outlet_valve_seal_number = models.CharField(max_length=50, blank=True)
    water_valve_seal_number = models.CharField(max_length=50, blank=True)
    other_branches_seal_number = models.CharField(max_length=50, blank=True)
    meter_reading_obs = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    meter_reading_at_20 = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    meter_reading_mts = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])

    terminal_representative_name = models.CharField(max_length=200, blank=True)
    terminal_representative_signature = models.CharField(max_length=200, blank=True)
    pbpa_inspector_name = models.CharField(max_length=200, blank=True)
    pbpa_inspector_signature = models.CharField(max_length=200, blank=True)
    
    # Observations
    observations = models.TextField(blank=True)
    tank_condition = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    inspection_date = models.DateTimeField(default=timezone.now)
    approval_date = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Inspection {self.id} - {self.tank.tank_name} ({self.inspection_date.date()})"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.ticket_number:
            self.ticket_number = f"DIP-{self.pk:08d}"
            super().save(update_fields=['ticket_number'])

    @staticmethod
    def _average(values):
        numeric_values = [value for value in values if value is not None]
        if not numeric_values:
            return None
        return round(sum(numeric_values) / len(numeric_values), 3)

    @property
    def overall_dip_average_mm(self):
        return self._average([self.overall_dip_1_mm, self.overall_dip_2_mm, self.overall_dip_3_mm])

    @property
    def product_dip_average_mm(self):
        return self._average([self.product_dip_1_mm, self.product_dip_2_mm, self.product_dip_3_mm])

    @property
    def product_volume_average_l(self):
        return self._average([self.product_volume_1_l, self.product_volume_2_l, self.product_volume_3_l])

    @property
    def free_water_volume_average_l(self):
        return self._average([self.free_water_volume_1_l, self.free_water_volume_2_l, self.free_water_volume_3_l])

    @property
    def tank_temperature_average_c(self):
        return self._average([self.tank_temperature_1_c, self.tank_temperature_2_c, self.tank_temperature_3_c])

    @property
    def specific_gravity_average(self):
        return self._average([self.specific_gravity_1, self.specific_gravity_2, self.specific_gravity_3])

    @property
    def sample_temperature_average_c(self):
        return self._average([self.sample_temperature_1_c, self.sample_temperature_2_c, self.sample_temperature_3_c])
    
    class Meta:
        ordering = ['-inspection_date']
        verbose_name = "Inspection"
        verbose_name_plural = "Inspections"
        indexes = [
            models.Index(fields=['tank', '-inspection_date']),
            models.Index(fields=['status']),
        ]


# ========== SEALS & ISOLATION ==========
class Seal(models.Model):
    """Seal information for tanks"""
    STATUS_CHOICES = (
        ('intact', 'Intact'),
        ('damaged', 'Damaged'),
        ('missing', 'Missing'),
    )
    
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='seals')
    seal_number = models.CharField(max_length=50)
    seal_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='intact')
    location = models.CharField(max_length=100, blank=True)
    remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Seal {self.seal_number} - {self.status}"
    
    class Meta:
        ordering = ['seal_number']
        verbose_name = "Seal"
        verbose_name_plural = "Seals"


class Isolation(models.Model):
    """Pipeline and valve isolation checks"""
    VALVE_STATUS = (
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('unknown', 'Unknown'),
    )
    
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='isolations')
    valve_id = models.CharField(max_length=50)
    valve_type = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=VALVE_STATUS, default='closed')
    pipeline_name = models.CharField(max_length=100, blank=True)
    is_isolated = models.BooleanField(default=True)
    remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Valve {self.valve_id} - {self.status}"
    
    class Meta:
        ordering = ['valve_id']
        verbose_name = "Isolation"
        verbose_name_plural = "Isolations"


# ========== CALCULATIONS ==========
class InspectionCalculation(models.Model):
    """Automated calculations for inspections"""
    inspection = models.OneToOneField(Inspection, on_delete=models.CASCADE, related_name='calculation')
    
    # Volume calculations
    gross_volume = models.FloatField(validators=[MinValueValidator(0)], help_text="Gross volume in barrels/liters")
    water_volume = models.FloatField(validators=[MinValueValidator(0)], default=0, help_text="Water volume")
    net_volume = models.FloatField(validators=[MinValueValidator(0)], help_text="Net volume (gross - water)")
    
    # Temperature corrections
    reference_temperature = models.FloatField(default=15, help_text="Reference temperature (°C)")
    temperature_correction_factor = models.FloatField(default=1.0)
    corrected_volume = models.FloatField(validators=[MinValueValidator(0)], help_text="Temperature corrected volume")
    
    # Density adjustments
    product_density = models.FloatField(validators=[MinValueValidator(0.5)], default=0.85, help_text="Density in g/cm³")
    density_correction_factor = models.FloatField(default=1.0)
    
    # NSV (Net Standard Volume)
    net_standard_volume = models.FloatField(validators=[MinValueValidator(0)], help_text="NSV at standard conditions")
    
    # Metadata
    calculated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Calculation for Inspection {self.inspection.id}"
    
    class Meta:
        verbose_name = "Inspection Calculation"
        verbose_name_plural = "Inspection Calculations"


# ========== REPORTS ==========
class InspectionReport(models.Model):
    """Generated reports"""
    REPORT_TYPE = (
        ('dip_ticket', 'Dip Ticket'),
        ('inspection_report', 'Inspection Report'),
        ('daily_summary', 'Daily Summary'),
        ('monthly_summary', 'Monthly Summary'),
    )
    
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='reports')
    report_type = models.CharField(max_length=20, choices=REPORT_TYPE)
    generated_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    report_file = models.FileField(upload_to='reports/')
    report_data = models.JSONField(default=dict, blank=True)
    
    generated_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"{self.get_report_type_display()} - Inspection {self.inspection.id}"
    
    class Meta:
        ordering = ['-generated_at']
        verbose_name = "Inspection Report"
        verbose_name_plural = "Inspection Reports"


class ProductReceiptCertificate(models.Model):
    """One-page receipt certificate based on the PBPA template."""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('issued', 'Issued'),
    )

    certificate_number = models.CharField(max_length=20, unique=True, blank=True)
    vessel_name = models.CharField(max_length=200)
    terminal = models.CharField(max_length=200)
    receipt_date = models.DateField(default=timezone.localdate)
    receipt_time = models.TimeField(default=default_receipt_time)
    quantity_received_through_inlet_flowmeters = models.FloatField(
        validators=[MinValueValidator(0)],
        default=0,
        help_text="Quantity received through inlet flowmeters in liters",
    )
    terminal_representative_name = models.CharField(max_length=200)
    terminal_representative_signature = models.CharField(max_length=200, blank=True)
    pbpa_inspector_name = models.CharField(max_length=200, blank=True)
    pbpa_inspector_signature = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='product_receipt_certificates'
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    # ── Digital signature fields ──
    is_signed        = models.BooleanField(default=False)
    signed_at        = models.DateTimeField(null=True, blank=True)
    signed_by        = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='signed_certificates')
    document_hash    = models.CharField(max_length=64, blank=True, help_text='SHA-256 of signed PDF')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Product Receipt Certificate"
        verbose_name_plural = "Product Receipt Certificates"

    def __str__(self):
        return f"PRC {self.certificate_number or 'Draft'} - {self.vessel_name}"

    @property
    def total_weight_tonnage(self):
        return round(sum(item.weight_tonnage for item in self.items.all()), 3)

    @property
    def total_volume_liters(self):
        return round(sum(item.volume_liters for item in self.items.all()), 3)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.certificate_number:
            self.certificate_number = f"{self.pk:08d}"
            super().save(update_fields=['certificate_number'])


class ProductReceiptCertificateItem(models.Model):
    """Line items shown in the certificate table."""
    certificate = models.ForeignKey(
        ProductReceiptCertificate, on_delete=models.CASCADE, related_name='items'
    )
    tank = models.ForeignKey(
        Tank, on_delete=models.SET_NULL, null=True, blank=True, related_name='receipt_certificate_items'
    )
    tank_no = models.CharField(max_length=50, blank=True)
    product_name = models.CharField(max_length=100)
    weight_tonnage = models.FloatField(validators=[MinValueValidator(0)])
    volume_liters = models.FloatField(validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = "Product Receipt Certificate Item"
        verbose_name_plural = "Product Receipt Certificate Items"

    def __str__(self):
        tank_label = self.tank_no or (self.tank.tank_id if self.tank else "N/A")
        return f"{tank_label} - {self.product_name}"

    def save(self, *args, **kwargs):
        if self.tank and not self.tank_no:
            self.tank_no = self.tank.tank_id
        super().save(*args, **kwargs)


class SealIsolationReport(models.Model):
    """Standalone PBPA sealing and isolation report."""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('issued', 'Issued'),
    )

    report_number = models.CharField(max_length=20, unique=True, blank=True)
    vessel_name = models.CharField(max_length=200)
    product_name = models.CharField(max_length=100)
    terminal = models.CharField(max_length=200)
    report_date = models.DateField(default=timezone.localdate)
    terminal_representative_name = models.CharField(max_length=200, blank=True)
    terminal_representative_signature = models.CharField(max_length=200, blank=True)
    pbpa_inspector_name = models.CharField(max_length=200, blank=True)
    pbpa_inspector_signature = models.CharField(max_length=200, blank=True)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='seal_isolation_reports'
    )
    issued_at = models.DateTimeField(null=True, blank=True)
    # ── Digital signature fields ──
    is_signed        = models.BooleanField(default=False)
    signed_at        = models.DateTimeField(null=True, blank=True)
    signed_by        = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='signed_seal_reports')
    document_hash    = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Seal and Isolation Report"
        verbose_name_plural = "Seal and Isolation Reports"

    def __str__(self):
        return f"Seal Isolation {self.report_number or 'Draft'} - {self.vessel_name}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.report_number:
            self.report_number = f"{self.pk:08d}"
            super().save(update_fields=['report_number'])


class SealIsolationEntry(models.Model):
    """Location and seal number row from the PBPA sealing/isolation template."""
    report = models.ForeignKey(SealIsolationReport, on_delete=models.CASCADE, related_name='entries')
    location = models.CharField(max_length=200)
    seal_number = models.CharField(max_length=50)
    remarks = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = "Seal and Isolation Entry"
        verbose_name_plural = "Seal and Isolation Entries"

    def __str__(self):
        return f"{self.location} - {self.seal_number}"


class ShoreTankCalculation(models.Model):
    """PBPA shore tank calculation workbook header and quantity summary."""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('final', 'Final'),
    )

    calculation_number = models.CharField(max_length=20, unique=True, blank=True)
    vessel_name = models.CharField(max_length=200)
    product_name = models.CharField(max_length=100)
    terminal = models.CharField(max_length=200)
    calculation_date = models.DateField(default=timezone.localdate)
    vessel_density_kg_m3 = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    vessel_temperature_c = models.FloatField(null=True, blank=True)
    vessel_observed_volume_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    vessel_standard_volume_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    vessel_weight_air_mt = models.FloatField(default=0, validators=[MinValueValidator(0)])
    meter_quantity_m3 = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    pbpa_inspector_name = models.CharField(max_length=200, blank=True)
    terminal_representative_name = models.CharField(max_length=200, blank=True)
    remarks = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='shore_tank_calculations'
    )
    finalized_at = models.DateTimeField(null=True, blank=True)
    # ── Digital signature fields ──
    is_signed        = models.BooleanField(default=False)
    signed_at        = models.DateTimeField(null=True, blank=True)
    signed_by        = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, related_name='signed_shore_calcs')
    document_hash    = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Shore Tank Calculation"
        verbose_name_plural = "Shore Tank Calculations"

    def __str__(self):
        return f"Shore Calc {self.calculation_number or 'Draft'} - {self.vessel_name}"

    @property
    def terminal_observed_volume_m3(self):
        return round(sum(item.received_observed_volume_m3 or 0 for item in self.tank_items.all()), 3)

    @property
    def terminal_standard_volume_m3(self):
        return round(sum(item.received_standard_volume_m3 or 0 for item in self.tank_items.all()), 3)

    @property
    def terminal_weight_air_mt(self):
        return round(sum(item.received_weight_air_mt or 0 for item in self.tank_items.all()), 3)

    @property
    def difference_observed_volume_m3(self):
        return round(self.terminal_observed_volume_m3 - self.vessel_observed_volume_m3, 3)

    @property
    def difference_standard_volume_m3(self):
        return round(self.terminal_standard_volume_m3 - self.vessel_standard_volume_m3, 3)

    @property
    def difference_weight_air_mt(self):
        return round(self.terminal_weight_air_mt - self.vessel_weight_air_mt, 3)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.calculation_number:
            self.calculation_number = f"{self.pk:08d}"
            super().save(update_fields=['calculation_number'])


# ========== SUBMISSIONS & VESSEL REPORTS ==========

class Submission(models.Model):
    """A document submitted to the PBPA admin dashboard."""
    DOC_TYPE_CHOICES = (
        ('dip_ticket', 'Dip Ticket'),
        ('seal_isolation', 'Seal & Isolation Report'),
        ('product_receipt', 'Product Receipt Certificate'),
        ('shore_tank', 'Shore Tank Calculation'),
        ('stock_report', 'Stock Report'),
        ('provisional_outturn', 'Provisional Outturn Report'),
    )
    doc_type        = models.CharField(max_length=30, choices=DOC_TYPE_CHOICES)
    doc_id          = models.PositiveIntegerField()
    doc_number      = models.CharField(max_length=50, blank=True)
    vessel_name     = models.CharField(max_length=200, blank=True)
    terminal        = models.CharField(max_length=200, blank=True)
    submitted_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='submissions')
    submitted_at    = models.DateTimeField(auto_now_add=True)
    is_read         = models.BooleanField(default=False)
    notes           = models.TextField(blank=True)

    class Meta:
        ordering = ['-submitted_at']
        verbose_name = 'Submission'
        verbose_name_plural = 'Submissions'

    def __str__(self):
        return f"{self.get_doc_type_display()} #{self.doc_number} — {self.vessel_name}"


class VesselReport(models.Model):
    """Summary report created after a vessel completes discharge."""
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('final', 'Final'),
        ('cancelled', 'Cancelled'),
    )
    vessel_name         = models.CharField(max_length=200)
    terminal            = models.CharField(max_length=200)
    product_name        = models.CharField(max_length=100, blank=True)
    discharge_date      = models.DateField(default=timezone.localdate)
    report_number       = models.CharField(max_length=30, unique=True, blank=True)
    status              = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    created_by          = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='vessel_reports')
    # linked documents
    dip_ticket_ids      = models.JSONField(default=list, blank=True)
    seal_report_ids     = models.JSONField(default=list, blank=True)
    shore_calc_ids      = models.JSONField(default=list, blank=True)
    cert_ids            = models.JSONField(default=list, blank=True)
    # summary figures
    total_weight_mt     = models.FloatField(default=0)
    total_volume_m3     = models.FloatField(default=0)
    remarks             = models.TextField(blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Vessel Report'
        verbose_name_plural = 'Vessel Reports'

    def __str__(self):
        return f"Vessel Report {self.report_number or 'Draft'} — {self.vessel_name}"

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.report_number:
            self.report_number = f"VR-{self.pk:06d}"
            super().save(update_fields=['report_number'])


class StockReport(models.Model):
    """PBPA Daily Stock Report."""
    STATUS_CHOICES = (('draft', 'Draft'), ('final', 'Final'))

    report_number = models.CharField(max_length=30, unique=True, blank=True)
    report_date   = models.DateField(default=timezone.localdate)
    status        = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    created_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='stock_reports')
    notes         = models.TextField(blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-report_date', '-created_at']
        verbose_name = 'Stock Report'
        verbose_name_plural = 'Stock Reports'

    def __str__(self):
        return f'Stock Report {self.report_number or "Draft"} — {self.report_date}'

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.report_number:
            self.report_number = f'SR-{self.pk:06d}'
            super().save(update_fields=['report_number'])

    @property
    def total_ltrs(self):
        return round(sum(i.total_ltrs for i in self.items.all()), 0)


class StockReportItem(models.Model):
    """One row in the stock report table."""
    report              = models.ForeignKey(StockReport, on_delete=models.CASCADE, related_name='items')
    sn                  = models.PositiveIntegerField(default=1)
    depot_name          = models.CharField(max_length=200)
    date                = models.DateField(default=timezone.localdate)
    product             = models.CharField(max_length=100)
    local_ltrs          = models.FloatField(default=0)
    bps_transit_ltrs    = models.FloatField(default=0)
    non_bps_transit_ltrs= models.FloatField(default=0)
    mining_ltrs         = models.FloatField(default=0)
    transshipment_ltrs  = models.FloatField(default=0)
    awaiting_outturn_ltrs = models.FloatField(default=0)

    class Meta:
        ordering = ['sn']

    @property
    def total_ltrs(self):
        return round(
            (self.local_ltrs or 0) +
            (self.bps_transit_ltrs or 0) +
            (self.non_bps_transit_ltrs or 0) +
            (self.mining_ltrs or 0) +
            (self.transshipment_ltrs or 0) +
            (self.awaiting_outturn_ltrs or 0), 0
        )


class ProvisionalOuturnReport(models.Model):
    """PBPA Provisional Outturn Report — compares ship figures vs shore figures."""
    STATUS_CHOICES = (('draft', 'Draft'), ('final', 'Final'))

    report_number   = models.CharField(max_length=30, unique=True, blank=True)
    vessel_name     = models.CharField(max_length=200)
    report_date     = models.DateField(default=timezone.localdate)
    port            = models.CharField(max_length=200, blank=True)
    product         = models.CharField(max_length=100, blank=True)
    captain_name    = models.CharField(max_length=200, blank=True)
    surveyor_name   = models.CharField(max_length=200, blank=True)
    status          = models.CharField(max_length=10, choices=STATUS_CHOICES, default='draft')
    created_by      = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='provisional_outturn_reports')
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Provisional Outturn Report'
        verbose_name_plural = 'Provisional Outturn Reports'

    def __str__(self):
        return f'POR {self.report_number or "Draft"} — {self.vessel_name}'

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new and not self.report_number:
            self.report_number = f'POR-{self.pk:06d}'
            super().save(update_fields=['report_number'])

    @property
    def totals(self):
        items = self.items.all()
        return {
            'ship_volume':  round(sum(i.ship_volume_m3  or 0 for i in items), 3),
            'ship_weight':  round(sum(i.ship_weight_mt  or 0 for i in items), 3),
            'shore_volume': round(sum(i.shore_volume_m3 or 0 for i in items), 3),
            'shore_weight': round(sum(i.shore_weight_mt or 0 for i in items), 3),
        }


class ProvisionalOuturnItem(models.Model):
    """One terminal/company row in the Provisional Outturn Report."""
    report          = models.ForeignKey(ProvisionalOuturnReport, on_delete=models.CASCADE, related_name='items')
    sn              = models.PositiveIntegerField(default=1)
    terminal_name   = models.CharField(max_length=200)
    ship_volume_m3  = models.FloatField(default=0, validators=[MinValueValidator(0)])
    ship_weight_mt  = models.FloatField(default=0, validators=[MinValueValidator(0)])
    shore_volume_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    shore_weight_mt = models.FloatField(default=0, validators=[MinValueValidator(0)])

    class Meta:
        ordering = ['sn']

    @property
    def diff_volume_m3(self):
        return round((self.shore_volume_m3 or 0) - (self.ship_volume_m3 or 0), 3)

    @property
    def diff_volume_pct(self):
        if not self.ship_volume_m3:
            return 0
        return round(self.diff_volume_m3 / self.ship_volume_m3 * 100, 3)

    @property
    def diff_weight_mt(self):
        return round((self.shore_weight_mt or 0) - (self.ship_weight_mt or 0), 3)

    @property
    def diff_weight_pct(self):
        if not self.ship_weight_mt:
            return 0
        return round(self.diff_weight_mt / self.ship_weight_mt * 100, 3)


class ShoreTankCalculationItem(models.Model):
    """Initial/final tank measurement pair from the shore tank calculation sheet."""
    calculation = models.ForeignKey(ShoreTankCalculation, on_delete=models.CASCADE, related_name='tank_items')
    tank = models.ForeignKey(
        Tank, on_delete=models.SET_NULL, null=True, blank=True, related_name='shore_calculation_items'
    )
    tank_no = models.CharField(max_length=50, blank=True)
    overall_dip_initial_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    overall_dip_final_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    water_dip_initial_mm = models.FloatField(default=0, validators=[MinValueValidator(0)])
    water_dip_final_mm = models.FloatField(default=0, validators=[MinValueValidator(0)])
    product_dip_initial_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    product_dip_final_mm = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    tank_temperature_initial_c = models.FloatField(null=True, blank=True)
    tank_temperature_final_c = models.FloatField(null=True, blank=True)
    sample_temperature_initial_c = models.FloatField(null=True, blank=True)
    sample_temperature_final_c = models.FloatField(null=True, blank=True)
    density_initial_kg_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    density_final_kg_l = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    gross_observed_initial_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    gross_observed_final_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    roof_displacement_initial_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    roof_displacement_final_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    water_volume_initial_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    water_volume_final_m3 = models.FloatField(default=0, validators=[MinValueValidator(0)])
    vcf_initial = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    vcf_final = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    wcf_initial = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    wcf_final = models.FloatField(null=True, blank=True, validators=[MinValueValidator(0)])
    remarks = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = "Shore Tank Calculation Item"
        verbose_name_plural = "Shore Tank Calculation Items"

    @staticmethod
    def _net_observed(gross, roof, water):
        return max((gross or 0) - (roof or 0) - (water or 0), 0)

    @staticmethod
    def _default_vcf(density_kg_l, tank_temperature_c):
        if density_kg_l is None or tank_temperature_c is None:
            return 1
        try:
            from inspections.astm_tables import vcf_from_table
            result = vcf_from_table(density_kg_l, tank_temperature_c)
            if result is not None:
                return result
        except Exception:
            pass
        alpha = 0.00064 if density_kg_l >= 0.8 else 0.001210
        return round(1 / (1 + alpha * (tank_temperature_c - 20)), 6)

    @staticmethod
    def _default_wcf(density_kg_l):
        if density_kg_l is None:
            return None
        return round(max(density_kg_l - 0.0011, 0), 6)

    @property
    def net_observed_initial_m3(self):
        return round(self._net_observed(
            self.gross_observed_initial_m3,
            self.roof_displacement_initial_m3,
            self.water_volume_initial_m3,
        ), 3)

    @property
    def net_observed_final_m3(self):
        return round(self._net_observed(
            self.gross_observed_final_m3,
            self.roof_displacement_final_m3,
            self.water_volume_final_m3,
        ), 3)

    @property
    def received_observed_volume_m3(self):
        return round(self.net_observed_final_m3 - self.net_observed_initial_m3, 3)

    @property
    def effective_vcf_initial(self):
        return self.vcf_initial or self._default_vcf(self.density_initial_kg_l, self.tank_temperature_initial_c)

    @property
    def effective_vcf_final(self):
        return self.vcf_final or self._default_vcf(self.density_final_kg_l, self.tank_temperature_final_c)

    @property
    def effective_wcf_initial(self):
        return self.wcf_initial or self._default_wcf(self.density_initial_kg_l)

    @property
    def effective_wcf_final(self):
        return self.wcf_final or self._default_wcf(self.density_final_kg_l)

    @property
    def standard_volume_initial_m3(self):
        vcf = round(self.effective_vcf_initial, 4)
        return round(self.net_observed_initial_m3 * vcf, 3)

    @property
    def standard_volume_final_m3(self):
        vcf = round(self.effective_vcf_final, 4)
        return round(self.net_observed_final_m3 * vcf, 3)

    @property
    def received_standard_volume_m3(self):
        return round(self.standard_volume_final_m3 - self.standard_volume_initial_m3, 3)

    @property
    def weight_air_initial_mt(self):
        if self.effective_wcf_initial is None:
            return None
        wcf = round(self.effective_wcf_initial, 4)
        return round(self.standard_volume_initial_m3 * wcf, 3)

    @property
    def weight_air_final_mt(self):
        if self.effective_wcf_final is None:
            return None
        wcf = round(self.effective_wcf_final, 4)
        return round(self.standard_volume_final_m3 * wcf, 3)

    @property
    def received_weight_air_mt(self):
        if self.weight_air_initial_mt is None or self.weight_air_final_mt is None:
            return None
        return round(self.weight_air_final_mt - self.weight_air_initial_mt, 3)

    def save(self, *args, **kwargs):
        if self.tank and not self.tank_no:
            self.tank_no = self.tank.tank_id
        super().save(*args, **kwargs)
