from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0008_rosterassignment'),
    ]

    operations = [
        migrations.AddField(
            model_name='rosterassignment',
            name='is_read',
            field=models.BooleanField(default=False),
        ),
    ]
