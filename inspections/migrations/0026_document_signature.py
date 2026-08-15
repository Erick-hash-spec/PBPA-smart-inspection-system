from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0025_data_rename_supervisor_role'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DocumentSignature',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('doc_type', models.CharField(max_length=30)),
                ('doc_id', models.PositiveIntegerField()),
                ('doc_number', models.CharField(blank=True, max_length=50)),
                ('role', models.CharField(choices=[('inspector', 'Inspector'), ('terminal_representative', 'Terminal Representative'), ('admin', 'Admin')], max_length=30)),
                ('document_hash', models.CharField(help_text='SHA-256 of document content at signing time', max_length=64)),
                ('digital_signature', models.CharField(help_text='HMAC-SHA256(doc_hash|user_id|timestamp|secret)', max_length=64)),
                ('signing_timestamp', models.CharField(help_text='ISO timestamp string used in signature', max_length=30)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.CharField(blank=True, max_length=500)),
                ('status', models.CharField(choices=[('valid', 'Valid'), ('superseded', 'Superseded'), ('tampered', 'Tampered')], default='valid', max_length=15)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('signer', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='document_signatures', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Document Signature',
                'verbose_name_plural': 'Document Signatures',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='documentsignature',
            index=models.Index(fields=['doc_type', 'doc_id'], name='inspections_doc_typ_doc_id_idx'),
        ),
    ]
