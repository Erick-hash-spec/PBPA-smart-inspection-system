import math
from .models import InspectionCalculation


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


def _astm_expansion(density_kg_l):
    """ASTM D1250 thermal expansion coefficient by density range."""
    if density_kg_l >= 0.8:
        return 0.00064   # heavy products (fuel oil, diesel, crude)
    return 0.001210      # light products (gasoline, naphtha)


class ASTMD1250Calculator:
    """ASTM D1250 / API MPMS Ch.11 helper — Table 54B/59B & Table 60B."""

    @staticmethod
    def density_at_20(sample_density_kg_l, sample_temperature_c):
        """Table 54B/59B: correct observed sample density to 20°C.
        d20 = d_obs * (1 + alpha*(T_obs - 20))
        """
        if sample_density_kg_l is None or sample_temperature_c is None:
            return None
        alpha = _astm_expansion(sample_density_kg_l)
        return round(sample_density_kg_l * (1 + alpha * (sample_temperature_c - 20)), 4)

    @staticmethod
    def vcf(density_at_20_kg_l, tank_temperature_c):
        """Table 60B: VCF = 1 / (1 + alpha*(T_tank - 20))."""
        if density_at_20_kg_l is None or tank_temperature_c is None:
            return 1.0
        alpha = _astm_expansion(density_at_20_kg_l)
        return round(1 / (1 + alpha * (tank_temperature_c - 20)), 6)

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
        from .astm_tables import density_at_20_from_table
        result = density_at_20_from_table(sample_density_kg_l, sample_temperature_c)
        if result is not None:
            return result
        # formula fallback
        if sample_density_kg_l is None or sample_temperature_c is None:
            return None
        alpha = _astm_expansion(sample_density_kg_l)
        return round(sample_density_kg_l * (1 + alpha * (sample_temperature_c - 20)), 4)

    @staticmethod
    def vcf(density_at_20_kg_l, tank_temperature_c):
        """Table 60B lookup with formula fallback."""
        from .astm_tables import vcf_from_table
        result = vcf_from_table(density_at_20_kg_l, tank_temperature_c)
        if result is not None:
            return result
        # formula fallback
        if density_at_20_kg_l is None or tank_temperature_c is None:
            return 1.0
        alpha = _astm_expansion(density_at_20_kg_l)
        return round(1 / (1 + alpha * (tank_temperature_c - 20)), 6)

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
