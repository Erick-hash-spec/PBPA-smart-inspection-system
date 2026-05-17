from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0007_alter_submission_doc_type'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RosterAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('assignment_date', models.DateField(default=django.utils.timezone.localdate)),
                ('shift', models.CharField(choices=[('day', 'Day'), ('night', 'Night'), ('custom', 'Custom')], default='day', max_length=20)),
                ('terminal', models.CharField(blank=True, max_length=200)),
                ('vessel_name', models.CharField(blank=True, max_length=200)),
                ('task', models.CharField(max_length=200)),
                ('notes', models.TextField(blank=True)),
                ('status', models.CharField(choices=[('draft', 'Draft'), ('sent', 'Sent')], default='draft', max_length=10)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('inspector', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roster_assignments', to=settings.AUTH_USER_MODEL)),
                ('supervisor', models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='rosters_created', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Roster Assignment',
                'verbose_name_plural': 'Roster Assignments',
                'ordering': ['-assignment_date', '-created_at'],
            },
        ),
    ]
