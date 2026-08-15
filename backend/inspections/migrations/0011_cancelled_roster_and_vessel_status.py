from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0010_merge_20260516_2355'),
    ]

    operations = [
        migrations.AlterField(
            model_name='rosterassignment',
            name='status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('sent', 'Sent'), ('cancelled', 'Cancelled')],
                default='draft',
                max_length=10,
            ),
        ),
        migrations.AlterField(
            model_name='vesselreport',
            name='status',
            field=models.CharField(
                choices=[('draft', 'Draft'), ('final', 'Final'), ('cancelled', 'Cancelled')],
                default='draft',
                max_length=10,
            ),
        ),
    ]
