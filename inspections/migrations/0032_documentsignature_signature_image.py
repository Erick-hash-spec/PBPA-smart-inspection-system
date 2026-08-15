from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('inspections', '0031_inspection_signing_workflow'),
    ]

    operations = [
        migrations.AddField(
            model_name='documentsignature',
            name='signature_image',
            field=models.TextField(blank=True, help_text='Base64 signature image used in the signed PDF'),
        ),
    ]
