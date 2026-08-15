from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0007_alter_submission_doc_type'),
    ]

    operations = [
        migrations.AddField(
            model_name='rosterassignment',
            name='week_start_date',
            field=models.DateField(help_text='Monday of the roster week', null=True, blank=True),
        ),
        migrations.AddField(
            model_name='rosterassignment',
            name='working_days',
            field=models.JSONField(default=list, help_text='List of day names, e.g. ["Mon","Wed","Fri"]'),
        ),
        migrations.AddField(
            model_name='rosterassignment',
            name='location',
            field=models.CharField(blank=True, max_length=200, help_text='KURASINI or KIGAMBONI'),
        ),
        migrations.AlterField(
            model_name='rosterassignment',
            name='task',
            field=models.CharField(max_length=200, blank=True),
        ),
        migrations.RemoveField(
            model_name='rosterassignment',
            name='assignment_date',
        ),
    ]
