from django.db import migrations

from inspections.encryption import EncryptedTextField, PREFIX, encrypt


SENSITIVE_FIELDS = {
    'UserProfile': ('phone',),
    'RosterAssignment': ('notes',),
    'Inspection': ('observations', 'remarks', 'rejection_reason'),
    'Seal': ('remarks',),
    'Isolation': ('remarks',),
    'ProductReceiptCertificate': ('notes',),
    'SealIsolationReport': ('notes',),
    'SealIsolationEntry': ('remarks',),
    'ShoreTankCalculation': ('remarks',),
    'Submission': ('notes',),
    'VesselReport': ('remarks',),
    'StockReport': ('notes',),
    'ServiceRequest': ('notes',),
    'ServiceRequestMessage': ('body',),
    'SamplingForm': ('remarks',),
}


def encrypt_existing_values(apps, schema_editor):
    """Convert legacy plaintext safely; already encrypted data is left intact."""
    for model_name, fields in SENSITIVE_FIELDS.items():
        model = apps.get_model('inspections', model_name)
        for field_name in fields:
            for row in model.objects.exclude(**{field_name: ''}).iterator():
                value = getattr(row, field_name)
                if value and not value.startswith(PREFIX):
                    setattr(row, field_name, encrypt(value))
                    row.save(update_fields=[field_name])


class Migration(migrations.Migration):
    dependencies = [('inspections', '0029_userprofile_mfa')]

    operations = [
        migrations.AlterField(model_name='userprofile', name='phone', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='rosterassignment', name='notes', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='inspection', name='observations', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='inspection', name='remarks', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='inspection', name='rejection_reason', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='seal', name='remarks', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='isolation', name='remarks', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='productreceiptcertificate', name='notes', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='sealisolationreport', name='notes', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='sealisolationentry', name='remarks', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='shoretankcalculation', name='remarks', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='submission', name='notes', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='vesselreport', name='remarks', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='stockreport', name='notes', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='servicerequest', name='notes', field=EncryptedTextField(blank=True)),
        migrations.AlterField(model_name='servicerequestmessage', name='body', field=EncryptedTextField()),
        migrations.AlterField(model_name='samplingform', name='remarks', field=EncryptedTextField(blank=True)),
        migrations.RunPython(encrypt_existing_values, migrations.RunPython.noop),
    ]
