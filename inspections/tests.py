from django.contrib.auth.models import User
from django.core import mail
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
    Notification,
)
from .calculations import (
    validate_shore_tank_calculation_data,
    validate_shore_tank_item_data,
)
from .serializers import ShoreTankCalculationDetailSerializer
from .encryption import decrypt, encrypt
from .mfa import generate_secret, verify_code, _code
from .signing import compute_model_hash, create_digital_signature, verify_digital_signature


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


class AES256GCMEncryptionTests(SimpleTestCase):
    def test_round_trip_uses_a_random_authenticated_ciphertext(self):
        plaintext = '255 123 456 — confidential contact number'
        first = encrypt(plaintext)
        second = encrypt(plaintext)

        self.assertTrue(first.startswith('aes256gcm:v1:'))
        self.assertNotEqual(first, plaintext)
        self.assertNotEqual(first, second)
        self.assertEqual(decrypt(first), plaintext)

    def test_modified_ciphertext_is_rejected(self):
        ciphertext = encrypt('confidential')
        modified = ciphertext[:-1] + ('A' if ciphertext[-1] != 'A' else 'B')

        with self.assertRaises(Exception):
            decrypt(modified)


class MFAAuthenticatorTests(SimpleTestCase):
    def test_totp_code_round_trip_and_invalid_code(self):
        secret = generate_secret()
        timestamp = 1_700_000_000
        code = _code(secret, timestamp)

        self.assertTrue(verify_code(secret, code, at_time=timestamp, valid_window=0))
        self.assertFalse(verify_code(secret, '000000', at_time=timestamp, valid_window=0))


class DigitalSignatureIntegrityTests(SimpleTestCase):
    def test_model_hash_ignores_workflow_metadata_but_detects_content_change(self):
        certificate = ProductReceiptCertificate(
            certificate_number='PRC-000001', vessel_name='MV Integrity', terminal='Kurasini',
            terminal_representative_name='Terminal Representative', status='draft',
        )
        original = compute_model_hash(certificate, 'product_receipt', certificate.certificate_number)
        certificate.signing_step = 'inspector_signed'
        certificate.document_hash = 'a' * 64
        self.assertEqual(original, compute_model_hash(certificate, 'product_receipt', certificate.certificate_number))

        certificate.vessel_name = 'MV Altered'
        self.assertNotEqual(original, compute_model_hash(certificate, 'product_receipt', certificate.certificate_number))

    def test_hmac_signature_is_bound_to_signer_hash_and_timestamp(self):
        document_hash = 'a' * 64
        timestamp = '2026-08-07T10:35:15'
        signature = create_digital_signature(document_hash, '42', timestamp)

        self.assertTrue(verify_digital_signature(document_hash, '42', timestamp, signature))
        self.assertFalse(verify_digital_signature('b' * 64, '42', timestamp, signature))


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

    def test_terminal_rep_dashboard_counts_submitted_inspections(self):
        self.authenticate(self.bob)

        response = self.client.get('/api/inspections/dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['document_counts']['inspections'], 2)
        self.assertEqual(response.data['submitted'], 2)

    def test_admin_dashboard_counts_submitted_dip_tickets_and_shore_tank_calculations(self):
        submitted_shore_calc = ShoreTankCalculation.objects.filter(created_by=self.alice).first()
        Submission.objects.create(
            submitted_by=self.alice,
            doc_type='dip_ticket',
            doc_id=self.alice_inspection.id,
            doc_number='DT-ALICE',
            vessel_name=self.alice_inspection.vessel_name,
        )
        Submission.objects.create(
            submitted_by=self.alice,
            doc_type='shore_tank',
            doc_id=submitted_shore_calc.id,
            doc_number='STC-ALICE',
            vessel_name=submitted_shore_calc.vessel_name,
        )
        self.authenticate(self.carla)

        response = self.client.get('/api/inspections/dashboard/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['document_counts']['inspections'], 1)
        self.assertEqual(response.data['document_counts']['shore_tank_calculations'], 1)

        dip_ticket_response = self.client.get('/api/inspections/')
        shore_tank_response = self.client.get('/api/shore-tank-calculations/')
        dip_tickets = dip_ticket_response.data.get('results', dip_ticket_response.data)
        shore_tanks = shore_tank_response.data.get('results', shore_tank_response.data)

        self.assertEqual(len(dip_tickets), 1)
        self.assertEqual(len(shore_tanks), 1)

    def test_admin_can_create_terminal(self):
        self.authenticate(self.carla)

        response = self.client.post('/api/terminals/', {'name': 'New Terminal', 'location': 'Kurasini'})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data['name'], 'New Terminal')

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

    def test_sampling_form_has_no_signing_workflow_endpoint(self):
        self.authenticate(self.alice)

        response = self.client.post(f'/api/sampling-forms/{self.alice_sampling_form.id}/submit_to_admin/')

        self.assertEqual(response.status_code, 404)


@override_settings(SECURE_SSL_REDIRECT=False, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class TerminalSigningRequestTests(APITestCase):
    def setUp(self):
        self.inspector = User.objects.create_user(
            username='inspector', email='inspector@example.com', password='pass123456789'
        )
        self.kurasini_rep = User.objects.create_user(
            username='kurasini-rep', email='kurasini@example.com', password='pass123456789'
        )
        self.other_rep = User.objects.create_user(
            username='other-rep', email='other@example.com', password='pass123456789'
        )
        UserProfile.objects.create(user=self.inspector, role='inspector')
        UserProfile.objects.create(
            user=self.kurasini_rep, role='terminal_representative', terminal='Kurasini'
        )
        UserProfile.objects.create(
            user=self.other_rep, role='terminal_representative', terminal='Tanga'
        )
        self.certificate = ProductReceiptCertificate.objects.create(
            vessel_name='MV Terminal Test', terminal='Kurasini',
            terminal_representative_name='Kurasini Representative',
            created_by=self.inspector, status='issued', signing_step='inspector_signed',
        )

    def test_send_to_client_targets_only_selected_terminal_and_emails_representative(self):
        self.client.force_authenticate(user=self.inspector)

        response = self.client.post(
            f'/api/product-receipt-certificates/{self.certificate.id}/send_to_client/'
        )

        self.assertEqual(response.status_code, 200)
        self.certificate.refresh_from_db()
        self.assertEqual(self.certificate.signing_step, 'sent_to_client')
        self.assertEqual(
            list(Notification.objects.filter(notification_type='signing_request').values_list('recipient', flat=True)),
            [self.kurasini_rep.id],
        )
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['kurasini@example.com'])

    def test_representative_from_another_terminal_cannot_access_signing_request(self):
        self.certificate.signing_step = 'sent_to_client'
        self.certificate.save(update_fields=['signing_step'])
        self.client.force_authenticate(user=self.other_rep)

        response = self.client.get(f'/api/product-receipt-certificates/{self.certificate.id}/')

        self.assertEqual(response.status_code, 404)

    def test_terminal_workflow_notification_filters_exclude_service_request_messages(self):
        self.client.force_authenticate(user=self.kurasini_rep)
        Notification.objects.create(
            recipient=self.kurasini_rep, notification_type='signing_request',
            title='Signing request', message='Please sign this document.',
        )
        Notification.objects.create(
            recipient=self.kurasini_rep, notification_type='report_submitted_client',
            title='Report submitted', message='The report was submitted to admin.',
        )
        Notification.objects.create(
            recipient=self.kurasini_rep, notification_type='sr_message',
            title='Service request message', message='A separate message alert.',
        )

        response = self.client.get(
            '/api/notifications/?notification_type=signing_request,report_submitted_client'
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(
            {item['notification_type'] for item in response.data['results']},
            {'signing_request', 'report_submitted_client'},
        )
