from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inspections', '0033_terminal'),
    ]

    operations = [
        migrations.AddField(
            model_name='shoretankcalculationitem',
            name='operation_label',
            field=models.CharField(default='L.DISPL / PROV / FINAL', max_length=30),
        ),
    ]
