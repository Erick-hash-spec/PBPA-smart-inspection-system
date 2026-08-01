from django.db import migrations


def supervisor_to_terminal_rep(apps, schema_editor):
    UserProfile = apps.get_model('inspections', 'UserProfile')
    updated = UserProfile.objects.filter(role='supervisor').update(role='terminal_representative')
    print('  Updated %d UserProfile row(s): supervisor -> terminal_representative' % updated)


def terminal_rep_to_supervisor(apps, schema_editor):
    UserProfile = apps.get_model('inspections', 'UserProfile')
    UserProfile.objects.filter(role='terminal_representative').update(role='supervisor')


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0024_rename_supervisor_inspection_approved_by_and_more'),
    ]

    operations = [
        migrations.RunPython(supervisor_to_terminal_rep, terminal_rep_to_supervisor),
    ]
