from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0013_alter_inspection_tank_optional'),
        ('auth', '0012_alter_user_first_name_max_length'),
    ]

    operations = [
        migrations.CreateModel(
            name='SamplingForm',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('form_number', models.CharField(blank=True, max_length=30, unique=True)),
                ('vessel_name', models.CharField(max_length=200)),
                ('product_name', models.CharField(max_length=100)),
                ('terminal', models.CharField(max_length=200)),
                ('sampling_date', models.DateField(default=django.utils.timezone.localdate)),
                ('sampling_time', models.TimeField(blank=True, null=True)),
                ('tank_no', models.CharField(blank=True, max_length=50)),
                ('sample_point', models.CharField(blank=True, max_length=200, help_text='e.g. Shore Tank, Vessel Manifold')),
                ('sample_reference', models.CharField(blank=True, max_length=100)),
                ('sample_quantity', models.CharField(blank=True, max_length=100, help_text='e.g. 1 Litre composite')),
                ('seal_number_before', models.CharField(blank=True, max_length=50)),
                ('seal_number_after', models.CharField(blank=True, max_length=50)),
                ('temperature', models.FloatField(blank=True, null=True, help_text='Sample temperature in Celsius')),
                ('density_observed', models.FloatField(blank=True, null=True, help_text='Observed density kg/L')),
                ('colour', models.CharField(blank=True, max_length=100)),
                ('appearance', models.CharField(blank=True, max_length=200)),
                ('remarks', models.TextField(blank=True)),
                ('terminal_representative_name', models.CharField(blank=True, max_length=200)),
                ('terminal_representative_signature', models.CharField(blank=True, max_length=200)),
                ('pbpa_inspector_name', models.CharField(blank=True, max_length=200)),
                ('pbpa_inspector_signature', models.CharField(blank=True, max_length=200)),
                ('status', models.CharField(
                    choices=[('draft', 'Draft'), ('issued', 'Issued')],
                    default='draft', max_length=20,
                )),
                ('created_by', models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='sampling_forms', to='auth.user',
                )),
                ('issued_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Sampling Form',
                'verbose_name_plural': 'Sampling Forms',
                'ordering': ['-created_at'],
            },
        ),
    ]
