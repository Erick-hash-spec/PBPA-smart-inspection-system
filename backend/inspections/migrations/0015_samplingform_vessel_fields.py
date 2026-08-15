from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0014_samplingform'),
    ]

    operations = [
        # Remove shore-tank-specific fields, add vessel-specific ones
        migrations.RemoveField(model_name='samplingform', name='tank_no'),
        migrations.RemoveField(model_name='samplingform', name='sample_point'),

        migrations.AddField(
            model_name='samplingform',
            name='voyage_no',
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name='samplingform',
            name='bill_of_lading_no',
            field=models.CharField(max_length=100, blank=True),
        ),
        migrations.AddField(
            model_name='samplingform',
            name='cargo_tank_no',
            field=models.CharField(max_length=100, blank=True, help_text='Vessel cargo tank number(s)'),
        ),
        migrations.AddField(
            model_name='samplingform',
            name='sample_location',
            field=models.CharField(
                max_length=200, blank=True,
                help_text='e.g. Upper, Middle, Lower, Bottom, Composite, Manifold',
            ),
        ),
        migrations.AddField(
            model_name='samplingform',
            name='sampled_by',
            field=models.CharField(max_length=200, blank=True),
        ),
        migrations.AddField(
            model_name='samplingform',
            name='witnessed_by',
            field=models.CharField(max_length=200, blank=True),
        ),
        migrations.AddField(
            model_name='samplingform',
            name='sample_container',
            field=models.CharField(
                max_length=200, blank=True,
                help_text='e.g. 1L glass bottle, 500ml tin',
            ),
        ),
        migrations.AddField(
            model_name='samplingform',
            name='number_of_samples',
            field=models.PositiveIntegerField(null=True, blank=True),
        ),
    ]
