import math
from .models import InspectionCalculation


MIN_PETROLEUM_DENSITY_KG_L = 0.5
MAX_PETROLEUM_DENSITY_KG_L = 1.2
MIN_TEMPERATURE_C = -50
MAX_TEMPERATURE_C = 150
MIN_CORRECTION_FACTOR = 0.8
MAX_CORRECTION_FACTOR = 1.2
MIN_WCF = 0.5  # WCF = density@20 - 0.0011; covers density range 0.5-1.2
MAX_WCF = 1.2


def _is_number(value):
    return value is not None and isinstance(value, (int, float)) and not isinstance(value, bool)


def _to_number(value, default=None):
    if _is_number(value):
        return value
    return default


def _net_observed(gross, roof, water):
    return (_to_number(gross, 0) or 0) - (_to_number(roof, 0) or 0) - (_to_number(water, 0) or 0)


def _add_error(errors, field, message):
    errors.setdefault(field, []).append(message)


SHORE_TANK_ITEM_VALIDATION_FIELDS = (
    'tank', 'tank_no',
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
)


def shore_tank_item_validation_data(item):
    """Build a plain validation payload from a ShoreTankCalculationItem instance."""
    return {
        field: getattr(item, 'tank_id', None) if field == 'tank' else getattr(item, field)
        for field in SHORE_TANK_ITEM_VALIDATION_FIELDS
    }


def validate_shore_tank_item_data(item_data):
    """Validate one shore tank measurement row before calculations are saved/run."""
    errors = {}

    if not item_data.get('tank') and not str(item_data.get('tank_no') or '').strip():
        _add_error(errors, 'tank_no', 'Tank number or tank selection is required.')

    for state in ('initial', 'final'):
        label = state.capitalize()
        density = item_data.get(f'density_{state}_kg_l')
        tank_temp = item_data.get(f'tank_temperature_{state}_c')
        sample_temp = item_data.get(f'sample_temperature_{state}_c')
        vcf = item_data.get(f'vcf_{state}')
        wcf = item_data.get(f'wcf_{state}')
        gross = _to_number(item_data.get(f'gross_observed_{state}_m3'), 0) or 0
        roof = _to_number(item_data.get(f'roof_displacement_{state}_m3'), 0) or 0
        water_volume = _to_number(item_data.get(f'water_volume_{state}_m3'), 0) or 0
        overall_dip = item_data.get(f'overall_dip_{state}_mm')
        water_dip = _to_number(item_data.get(f'water_dip_{state}_mm'), 0) or 0
        product_dip = item_data.get(f'product_dip_{state}_mm')

        if _is_number(density) and not (MIN_PETROLEUM_DENSITY_KG_L <= density <= MAX_PETROLEUM_DENSITY_KG_L):
            _add_error(
                errors,
                f'density_{state}_kg_l',
                f'{label} density must be between {MIN_PETROLEUM_DENSITY_KG_L} and {MAX_PETROLEUM_DENSITY_KG_L} kg/L.',
            )

        for field, value in (
            (f'tank_temperature_{state}_c', tank_temp),
            (f'sample_temperature_{state}_c', sample_temp),
        ):
            if _is_number(value) and not (MIN_TEMPERATURE_C <= value <= MAX_TEMPERATURE_C):
                _add_error(errors, field, f'{label} temperature must be between {MIN_TEMPERATURE_C} and {MAX_TEMPERATURE_C} C.')

        astm_values = [density, tank_temp, sample_temp]
        if any(value is not None for value in astm_values) and not all(value is not None for value in astm_values):
            _add_error(
                errors,
                f'density_{state}_kg_l',
                f'{label} density, sample temperature, and tank temperature are required together for ASTM lookup.',
            )

        for field, value, lo, hi in (
            (f'vcf_{state}', vcf, MIN_CORRECTION_FACTOR, MAX_CORRECTION_FACTOR),
            (f'wcf_{state}', wcf, MIN_WCF, MAX_WCF),
        ):
            if _is_number(value) and not (lo <= value <= hi):
                _add_error(
                    errors,
                    field,
                    f'{label} correction factor must be between {lo} and {hi}.',
                )

        if gross and roof + water_volume > gross:
            _add_error(
                errors,
                f'gross_observed_{state}_m3',
                f'{label} gross observed volume must be at least roof displacement plus water volume.',
            )

        if _is_number(overall_dip) and water_dip > overall_dip:
            _add_error(errors, f'water_dip_{state}_mm', f'{label} water dip cannot exceed overall dip.')

        if _is_number(overall_dip) and _is_number(product_dip) and product_dip > overall_dip:
            _add_error(errors, f'product_dip_{state}_mm', f'{label} product dip cannot exceed overall dip.')

    initial_net = _net_observed(
        item_data.get('gross_observed_initial_m3'),
        item_data.get('roof_displacement_initial_m3'),
        item_data.get('water_volume_initial_m3'),
    )
    final_net = _net_observed(
        item_data.get('gross_observed_final_m3'),
        item_data.get('roof_displacement_final_m3'),
        item_data.get('water_volume_final_m3'),
    )
    if final_net < initial_net:
        _add_error(errors, 'gross_observed_final_m3', 'Final net observed volume cannot be less than initial net observed volume.')

    return errors


def validate_shore_tank_calculation_data(calculation_data):
    """Validate a shore tank calculation payload, returning DRF-friendly errors."""
    errors = {}
    tank_items = calculation_data.get('tank_items') or []

    if not tank_items:
        errors['tank_items'] = ['At least one tank measurement is required.']

    for field in ('vessel_observed_volume_m3', 'vessel_standard_volume_m3', 'vessel_weight_air_mt', 'meter_quantity_m3'):
        value = calculation_data.get(field)
        if _is_number(value) and value < 0:
            _add_error(errors, field, 'Value cannot be negative.')

    density = calculation_data.get('vessel_density_kg_m3')
    if _is_number(density) and not (MIN_PETROLEUM_DENSITY_KG_L * 1000 <= density <= MAX_PETROLEUM_DENSITY_KG_L * 1000):
        _add_error(errors, 'vessel_density_kg_m3', 'Vessel density must be between 500 and 1200 kg/m3.')

    vessel_temp = calculation_data.get('vessel_temperature_c')
    if _is_number(vessel_temp) and not (MIN_TEMPERATURE_C <= vessel_temp <= MAX_TEMPERATURE_C):
        _add_error(errors, 'vessel_temperature_c', f'Vessel temperature must be between {MIN_TEMPERATURE_C} and {MAX_TEMPERATURE_C} C.')

    item_errors = []
    for item_data in tank_items:
        item_errors.append(validate_shore_tank_item_data(item_data))

    if any(item_errors):
        errors['tank_items'] = item_errors

    return errors


class InspectionCalculationEngine:
    REFERENCE_TEMPERATURE = 15
    THERMAL_EXPANSION_COEFFICIENT = 0.0008

    def calculate_all(self, inspection):
        gross_volume = self.calculate_gross_volume(inspection)
        water_volume = self.calculate_water_volume(inspection)
        net_volume = gross_volume - water_volume
        temp_correction = self.calculate_temperature_correction(inspection)
        corrected_volume = net_volume * temp_correction
        density_correction = self.calculate_density_correction(inspection)
        net_standard_volume = corrected_volume * density_correction

        calculation, _ = InspectionCalculation.objects.get_or_create(inspection=inspection)
        calculation.gross_volume = gross_volume
        calculation.water_volume = water_volume
        calculation.net_volume = net_volume
        calculation.temperature_correction_factor = temp_correction
        calculation.corrected_volume = corrected_volume
        calculation.density_correction_factor = density_correction
        calculation.net_standard_volume = net_standard_volume
        calculation.save()
        return calculation

    def calculate_gross_volume(self, inspection):
        tank = inspection.tank
        dip = inspection.dip_reading
        radius = tank.diameter / 2
        volume_liters = math.pi * (radius ** 2) * dip * 1000
        return round(volume_liters / 159, 2)

    def calculate_water_volume(self, inspection):
        tank = inspection.tank
        water_m = inspection.water_level / 100
        radius = tank.diameter / 2
        volume_liters = math.pi * (radius ** 2) * water_m * 1000
        return round(volume_liters / 159, 2)

    def calculate_temperature_correction(self, inspection):
        delta_t = inspection.temperature - self.REFERENCE_TEMPERATURE
        factor = 1 + (self.THERMAL_EXPANSION_COEFFICIENT * delta_t)
        return round(max(0.9, min(1.1, factor)), 6)

    def calculate_density_correction(self, inspection):
        density_map = {
            'crude_oil': 0.87, 'fuel_oil': 0.89, 'diesel': 0.84,
            'gasoline': 0.75, 'water': 1.0, 'other': 0.85,
        }
        base_density = density_map.get(inspection.tank.product_type, 0.85)
        delta_t = inspection.temperature - self.REFERENCE_TEMPERATURE
        density_corrected = base_density * (1 - 0.0008 * delta_t)
        return round(base_density / density_corrected, 6)


class ASTMD1250Calculator:
    """ASTM D1250 / API MPMS Ch.11 helper — Table 54B/59B & Table 60B."""

    @staticmethod
    def density_at_20(sample_density_kg_l, sample_temperature_c):
        from .astm_tables import density_at_20_formula
        return density_at_20_formula(sample_density_kg_l, sample_temperature_c)

    @staticmethod
    def vcf(density_at_20_kg_l, tank_temperature_c):
        from .astm_tables import vcf_formula
        return vcf_formula(density_at_20_kg_l, tank_temperature_c)

    @staticmethod
    def wcf(density_at_20_kg_l):
        """WCF = Density@20°C - 0.0011."""
        if density_at_20_kg_l is None:
            return None
        return round(max(density_at_20_kg_l - 0.0011, 0), 4)


class ShoreTankCalculationEngine:
    """
    ASTM D1250 / API MPMS Ch.11 calculation engine for shore tank items.
    Uses direct lookup from Table 59B (density @20C) and Table 60B (VCF)
    embedded in the PBPA Excel workbook, with formula fallback when inputs
    are outside the table range.
    """

    @staticmethod
    def density_at_20(sample_density_kg_l, sample_temperature_c):
        """Table 59B lookup with formula fallback."""
        from .astm_tables import density_at_20_from_table, density_at_20_formula
        result = density_at_20_from_table(sample_density_kg_l, sample_temperature_c)
        return result if result is not None else density_at_20_formula(sample_density_kg_l, sample_temperature_c)

    @staticmethod
    def vcf(density_at_20_kg_l, tank_temperature_c):
        """Table 60B lookup with formula fallback."""
        from .astm_tables import vcf_from_table, vcf_formula
        result = vcf_from_table(density_at_20_kg_l, tank_temperature_c)
        return result if result is not None else vcf_formula(density_at_20_kg_l, tank_temperature_c)

    @staticmethod
    def wcf(density_at_20_kg_l):
        """WCF = Density@20°C - 0.0011."""
        if density_at_20_kg_l is None:
            return None
        return round(max(density_at_20_kg_l - 0.0011, 0), 4)

    def calculate_all_tank_items(self, shore_calculation):
        """Run ASTM calculations for every tank item and persist results."""
        errors = []
        results = []

        for item in shore_calculation.tank_items.all():
            try:
                validation_errors = validate_shore_tank_item_data(shore_tank_item_validation_data(item))
                if validation_errors:
                    errors.append({'tank_no': item.tank_no, 'errors': validation_errors})
                    continue

                # Derive density@20 from sample density + sample temperature
                d20_initial = self.density_at_20(item.density_initial_kg_l, item.sample_temperature_initial_c)
                d20_final = self.density_at_20(item.density_final_kg_l, item.sample_temperature_final_c)

                # VCF uses density@20 and tank temperature
                vcf_i = self.vcf(d20_initial, item.tank_temperature_initial_c)
                vcf_f = self.vcf(d20_final, item.tank_temperature_final_c)

                # WCF
                wcf_i = self.wcf(d20_initial)
                wcf_f = self.wcf(d20_final)

                # Persist back (only if not manually overridden)
                if item.vcf_initial is None:
                    item.vcf_initial = vcf_i
                if item.vcf_final is None:
                    item.vcf_final = vcf_f
                if item.wcf_initial is None:
                    item.wcf_initial = wcf_i
                if item.wcf_final is None:
                    item.wcf_final = wcf_f

                item.save(update_fields=['vcf_initial', 'vcf_final', 'wcf_initial', 'wcf_final'])

                results.append({
                    'tank_no': item.tank_no,
                    'density_at_20_initial': d20_initial,
                    'density_at_20_final': d20_final,
                    'vcf_initial': item.vcf_initial,
                    'vcf_final': item.vcf_final,
                    'wcf_initial': item.wcf_initial,
                    'wcf_final': item.wcf_final,
                    'received_observed_volume_m3': item.received_observed_volume_m3,
                    'received_standard_volume_m3': item.received_standard_volume_m3,
                    'received_weight_air_mt': item.received_weight_air_mt,
                })

            except Exception as e:
                errors.append({'tank_no': item.tank_no, 'error': str(e)})

        return {'results': results, 'errors': errors}
