from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0012_inspection_tank_no'),
    ]

    operations = [
        migrations.AlterField(
            model_name='inspection',
            name='tank',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='inspections',
                to='inspections.tank',
            ),
        ),
    ]
