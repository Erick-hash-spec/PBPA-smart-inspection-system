from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0036_provisionaloutturn_captain_email_signing'),
    ]

    operations = [
        migrations.AlterField(
            model_name='samplingform',
            name='terminal',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
