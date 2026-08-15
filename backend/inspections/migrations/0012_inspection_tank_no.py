from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0011_cancelled_roster_and_vessel_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='inspection',
            name='tank_no',
            field=models.CharField(blank=True, max_length=50),
        ),
    ]
