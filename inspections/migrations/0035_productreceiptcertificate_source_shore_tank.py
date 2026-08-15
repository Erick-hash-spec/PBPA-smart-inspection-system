from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('inspections', '0034_shoretankcalculationitem_operation_label')]

    operations = [
        migrations.AddField(
            model_name='productreceiptcertificate',
            name='source_shore_tank_calculation',
            field=models.OneToOneField(blank=True, null=True, on_delete=models.SET_NULL,
                                       related_name='product_receipt_certificate',
                                       to='inspections.shoretankcalculation'),
        ),
    ]
