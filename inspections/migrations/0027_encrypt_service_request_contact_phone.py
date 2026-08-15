from django.db import migrations
from inspections.encryption import EncryptedTextField


def encrypt_existing_contact_numbers(apps, schema_editor):
    ServiceRequest = apps.get_model('inspections', 'ServiceRequest')
    from inspections.encryption import encrypt

    for request in ServiceRequest.objects.exclude(contact_phone='').iterator():
        value = request.contact_phone
        if value and not value.startswith('aes256gcm:v1:'):
            ServiceRequest.objects.filter(pk=request.pk).update(contact_phone=encrypt(value))


class Migration(migrations.Migration):
    dependencies = [('inspections', '0026_document_signature')]

    operations = [
        migrations.AlterField(
            model_name='servicerequest',
            name='contact_phone',
            field=EncryptedTextField(blank=True),
        ),
        migrations.RunPython(encrypt_existing_contact_numbers, migrations.RunPython.noop),
    ]
