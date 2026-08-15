from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0027_encrypt_service_request_contact_phone'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notification',
            name='notification_type',
            field=models.CharField(
                choices=[
                    ('signing_request', 'Signing Request'),
                    ('ready_to_submit', 'Document Ready to Submit'),
                    ('report_submitted', 'Report Submitted to Admin'),
                    ('report_submitted_client', 'Signed Report Shared with Client'),
                    ('sr_message', 'Service Request Message'),
                ],
                default='report_submitted',
                max_length=30,
            ),
        ),
    ]
