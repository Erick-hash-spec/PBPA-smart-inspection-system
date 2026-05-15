from django.test import SimpleTestCase
from rest_framework import serializers

from .calculations import (
    validate_shore_tank_calculation_data,
    validate_shore_tank_item_data,
)
from .serializers import ShoreTankCalculationDetailSerializer


def valid_tank_item(**overrides):
    data = {
        'tank_no': 'T-101',
        'overall_dip_initial_mm': 1000,
        'overall_dip_final_mm': 1200,
        'water_dip_initial_mm': 10,
        'water_dip_final_mm': 12,
        'product_dip_initial_mm': 990,
        'product_dip_final_mm': 1188,
        'tank_temperature_initial_c': 25,
        'tank_temperature_final_c': 26,
        'sample_temperature_initial_c': 25,
        'sample_temperature_final_c': 26,
        'density_initial_kg_l': 0.84,
        'density_final_kg_l': 0.84,
        'gross_observed_initial_m3': 1000,
        'gross_observed_final_m3': 1200,
        'roof_displacement_initial_m3': 2,
        'roof_displacement_final_m3': 2,
        'water_volume_initial_m3': 1,
        'water_volume_final_m3': 1,
    }
    data.update(overrides)
    return data


class ShoreTankValidationTests(SimpleTestCase):
    def test_valid_item_has_no_errors(self):
        self.assertEqual(validate_shore_tank_item_data(valid_tank_item()), {})

    def test_rejects_invalid_physical_relationships(self):
        errors = validate_shore_tank_item_data(valid_tank_item(
            density_initial_kg_l=1.5,
            water_dip_initial_mm=1001,
            gross_observed_final_m3=900,
        ))

        self.assertIn('density_initial_kg_l', errors)
        self.assertIn('water_dip_initial_mm', errors)
        self.assertIn('gross_observed_final_m3', errors)

    def test_requires_astm_inputs_together(self):
        errors = validate_shore_tank_item_data(valid_tank_item(
            sample_temperature_final_c=None,
        ))

        self.assertIn('density_final_kg_l', errors)

    def test_calculation_requires_tank_items_and_valid_vessel_values(self):
        errors = validate_shore_tank_calculation_data({
            'vessel_density_kg_m3': 1300,
            'vessel_temperature_c': 200,
            'vessel_observed_volume_m3': -1,
            'tank_items': [],
        })

        self.assertIn('tank_items', errors)
        self.assertIn('vessel_density_kg_m3', errors)
        self.assertIn('vessel_temperature_c', errors)
        self.assertIn('vessel_observed_volume_m3', errors)

    def test_detail_serializer_returns_nested_tank_item_errors(self):
        serializer = ShoreTankCalculationDetailSerializer(data={
            'vessel_name': 'MV Test',
            'product_name': 'Diesel',
            'terminal': 'Terminal A',
            'tank_items': [
                valid_tank_item(gross_observed_final_m3=900),
            ],
        })

        self.assertFalse(serializer.is_valid())
        errors = serializer.errors
        self.assertIn('tank_items', errors)
        self.assertIsInstance(errors['tank_items'][0], dict)
        self.assertIn('gross_observed_final_m3', errors['tank_items'][0])

    def test_detail_serializer_accepts_valid_payload(self):
        serializer = ShoreTankCalculationDetailSerializer(data={
            'vessel_name': 'MV Test',
            'product_name': 'Diesel',
            'terminal': 'Terminal A',
            'tank_items': [valid_tank_item()],
        })

        if not serializer.is_valid():
            raise serializers.ValidationError(serializer.errors)

        self.assertIn('tank_items', serializer.validated_data)
