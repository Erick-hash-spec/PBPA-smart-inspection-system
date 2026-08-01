from django.contrib.auth.models import User
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APITestCase
from rest_framework import serializers

from .models import (
    Inspection,
    ProductReceiptCertificate,
    Seal,
    SealIsolationReport,
    ShoreTankCalculation,
    StockReport,
    Submission,
    UserProfile,
    VesselReport,
    ProvisionalOuturnReport,
    SamplingForm,
)
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


@override_settings(SECURE_SSL_REDIRECT=False)
class OwnershipAccessTests(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(username='alice', password='pass123456789')
        self.bob = User.objects.create_user(username='bob', password='pass123456789')
        self.carla = User.objects.create_user(username='carla', password='pass123456789')
        UserProfile.objects.create(user=self.alice, role='inspector')
        UserProfile.objects.create(user=self.bob, role='terminal_representative')
        UserProfile.objects.create(user=self.carla, role='admin')

        self.alice_inspection = Inspection.objects.create(
            inspector=self.alice,
            vessel_name='MV Alice',
            product_name='Diesel',
            terminal='Terminal A',
            dip_reading=10,
            temperature=25,
            status='submitted',
        )
        self.bob_inspection = Inspection.objects.create(
            inspector=self.bob,
            vessel_name='MV Bob',
            product_name='Petrol',
            terminal='Terminal B',
            dip_reading=11,
            temperature=24,
            status='submitted',
        )
        self.carla_draft_inspection = Inspection.objects.create(
            inspector=self.carla,
            vessel_name='MV Carla',
            product_name='Jet A-1',
            terminal='Terminal C',
            dip_reading=12,
            temperature=23,
            status='draft',
        )
        self.alice_certificate = ProductReceiptCertificate.objects.create(
            vessel_name='MV Alice',
            terminal='Terminal A',
            terminal_representative_name='Rep A',
            status='issued',
            created_by=self.alice,
        )
        ProductReceiptCertificate.objects.create(
            vessel_name='MV Bob',
            terminal='Terminal B',
            terminal_representative_name='Rep B',
            status='issued',
            created_by=self.bob,
        )
        SealIsolationReport.objects.create(
            vessel_name='MV Alice',
            product_name='Diesel',
            terminal='Terminal A',
            status='issued',
            created_by=self.alice,
        )
        SealIsolationReport.objects.create(
            vessel_name='MV Bob',
            product_name='Petrol',
            terminal='Terminal B',
            status='issued',
            created_by=self.bob,
        )
        ShoreTankCalculation.objects.create(
            vessel_name='MV Alice',
            product_name='Diesel',
            terminal='Terminal A',
            status='final',
            created_by=self.alice,
        )
        ShoreTankCalculation.objects.create(
            vessel_name='MV Bob',
            product_name='Petrol',
            terminal='Terminal B',
            status='final',
            created_by=self.bob,
        )
        StockReport.objects.create(created_by=self.alice)
        StockReport.objects.create(created_by=self.bob)
        ProvisionalOuturnReport.objects.create(vessel_name='MV Alice', status='final', created_by=self.alice)
        ProvisionalOuturnReport.objects.create(vessel_name='MV Bob', status='final', created_by=self.bob)
        self.alice_sampling_form = SamplingForm.objects.create(
            vessel_name='MV Alice',
            product_name='Diesel',
            terminal='Terminal A',
            status='issued',
            signing_step='verified',
            created_by=self.alice,
        )
        VesselReport.objects.create(vessel_name='MV Alice', terminal='Terminal A', created_by=self.alice)
        VesselReport.objects.create(vessel_name='MV Bob', terminal='Terminal B', created_by=self.bob)

    def authenticate(self, user):
        self.client.force_authenticate(user=user)

    def test_inspector_dashboard_counts_only_current_user_records(self):
        self.authenticate(self.alice)

        response = self.client.get('/api/inspections/dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['document_counts']['inspections'], 1)
        self.assertEqual(response.data['document_counts']['product_receipt_certificates'], 1)
        self.assertEqual(response.data['document_counts']['seal_isolation_reports'], 1)
        self.assertEqual(response.data['document_counts']['shore_tank_calculations'], 1)
        self.assertEqual(response.data['document_counts']['stock_reports'], 1)
        self.assertEqual(response.data['document_counts']['provisional_outturn_reports'], 1)
        self.assertEqual(response.data['document_counts']['vessel_reports'], 1)

    def test_terminal_rep_and_admin_dashboards_count_all_submitted_inspections(self):
        for user in (self.bob, self.carla):
            self.authenticate(user)

            response = self.client.get('/api/inspections/dashboard/')

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data['document_counts']['inspections'], 2)
            self.assertEqual(response.data['submitted'], 2)

    def test_terminal_rep_and_admin_can_list_submitted_inspections(self):
        for user in (self.bob, self.carla):
            self.authenticate(user)

            response = self.client.get('/api/inspections/')

            self.assertEqual(response.status_code, 200)
            results = response.data.get('results', response.data)
            self.assertEqual(
                {item['id'] for item in results},
                {self.alice_inspection.id, self.bob_inspection.id},
            )

    def test_admin_can_retrieve_non_submitted_inspection(self):
        self.authenticate(self.carla)

        response = self.client.get(f'/api/inspections/{self.carla_draft_inspection.id}/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['id'], self.carla_draft_inspection.id)

    def test_submissions_list_omits_missing_document_targets(self):
        Submission.objects.create(
            submitted_by=self.alice,
            doc_type='dip_ticket',
            doc_id=self.alice_inspection.id,
            doc_number='DT-1',
            vessel_name='MV Alice',
        )
        Submission.objects.create(
            submitted_by=self.alice,
            doc_type='dip_ticket',
            doc_id=999999,
            doc_number='MISSING',
            vessel_name='Deleted Vessel',
        )
        self.authenticate(self.carla)

        response = self.client.get('/api/submissions/')

        self.assertEqual(response.status_code, 200)
        results = response.data.get('results', response.data)
        self.assertEqual({item['doc_number'] for item in results}, {'DT-1'})

    def test_inspector_cannot_list_or_retrieve_another_users_inspection(self):
        self.authenticate(self.alice)

        list_response = self.client.get('/api/inspections/')
        self.assertEqual(list_response.status_code, 200)
        results = list_response.data.get('results', list_response.data)
        self.assertEqual([item['id'] for item in results], [self.alice_inspection.id])

        detail_response = self.client.get(f'/api/inspections/{self.bob_inspection.id}/')
        self.assertEqual(detail_response.status_code, 404)

    def test_child_records_cannot_be_attached_to_another_users_inspection(self):
        self.authenticate(self.alice)

        response = self.client.post('/api/seals/', {
            'inspection': self.bob_inspection.id,
            'seal_number': 'S-001',
            'status': 'intact',
        })

        self.assertEqual(response.status_code, 403)
        self.assertFalse(Seal.objects.filter(seal_number='S-001').exists())

    def test_submission_must_reference_current_users_document(self):
        self.authenticate(self.bob)

        response = self.client.post('/api/submissions/', {
            'doc_type': 'product_receipt',
            'doc_id': self.alice_certificate.id,
        })

        self.assertEqual(response.status_code, 400)
        self.assertFalse(Submission.objects.exists())

    def test_verified_sampling_form_can_be_submitted_to_admin(self):
        self.authenticate(self.alice)

        response = self.client.post(f'/api/sampling-forms/{self.alice_sampling_form.id}/submit_to_admin/')

        self.assertEqual(response.status_code, 200)
        self.alice_sampling_form.refresh_from_db()
        self.assertEqual(self.alice_sampling_form.signing_step, 'submitted')
        self.assertTrue(Submission.objects.filter(
            doc_type='sampling_form',
            doc_id=self.alice_sampling_form.id,
            doc_number=self.alice_sampling_form.form_number,
        ).exists())
