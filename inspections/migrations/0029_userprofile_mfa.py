from django.db import migrations, models
import inspections.encryption


class Migration(migrations.Migration):
    dependencies = [('inspections', '0028_notification_signing_request')]
    operations = [
        migrations.AddField(model_name='userprofile', name='mfa_secret', field=inspections.encryption.EncryptedTextField(blank=True, default='')),
        migrations.AddField(model_name='userprofile', name='mfa_enabled', field=models.BooleanField(default=False)),
        migrations.AddField(model_name='userprofile', name='mfa_confirmed_at', field=models.DateTimeField(blank=True, null=True)),
    ]
