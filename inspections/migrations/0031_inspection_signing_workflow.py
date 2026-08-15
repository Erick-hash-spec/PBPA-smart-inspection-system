from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0030_encrypt_sensitive_text_fields'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='inspection',
            name='is_signed',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='inspection',
            name='signed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='inspection',
            name='signed_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='signed_inspections',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='inspection',
            name='document_hash',
            field=models.CharField(blank=True, max_length=64),
        ),
        migrations.AddField(
            model_name='inspection',
            name='signing_step',
            field=models.CharField(
                choices=[
                    ('draft', 'Draft'),
                    ('inspector_signed', 'Inspector Signed'),
                    ('sent_to_client', 'Sent to Terminal Rep'),
                    ('client_signed', 'Terminal Rep Signed'),
                    ('sent_to_inspector', 'Sent Back to Inspector'),
                    ('verified', 'Inspector Verified'),
                    ('submitted', 'Submitted to Admin'),
                ],
                default='draft',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='inspection',
            name='inspector_signed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='inspection',
            name='inspector_signed_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='dip_inspector_signed',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='inspection',
            name='client_signed_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='inspection',
            name='client_signed_by',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='dip_client_signed',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        migrations.AddField(
            model_name='inspection',
            name='verified_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
