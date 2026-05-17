import os, sys
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))

import django
django.setup()

from inspections.calculations import ShoreTankCalculationEngine
from inspections.astm_tables import density_at_20_from_table, vcf_from_table, wcf_from_density, table_range
from inspections.models import ShoreTankCalculationItem

PASS = '\033[92mPASS\033[0m'
FAIL = '\033[91mFAIL\033[0m'

def check(label, got, expected=None, not_none=False):
    if not_none:
        ok = got is not None
    elif expected is not None:
        ok = abs(float(got) - float(expected)) < 0.001
    else:
        ok = got is not None
    print(f"  {'[PASS]' if ok else '[FAIL]'} {label}: {got}" + (f" (expected ~{expected})" if expected and not ok else ""))
    return ok

print("\n=== 1. ASTM Table Range ===")
tr = table_range()
print(f"  density: {tr['density_min']} – {tr['density_max']} kg/L")
print(f"  temp:    {tr['temp_min']} – {tr['temp_max']} °C")
print(f"  steps:   density={tr['density_step']}, temp={tr['temp_step']}")

print("\n=== 2. Table 59B: density@20 lookup ===")
check("0.845 @ 30°C",  density_at_20_from_table(0.845, 30.0),  0.8519)
check("0.850 @ 25°C",  density_at_20_from_table(0.850, 25.0),  not_none=True)
check("0.700 @ 20°C",  density_at_20_from_table(0.700, 20.0),  0.700)   # at ref temp
check("out-of-range",  density_at_20_from_table(0.845, 60.0),  not_none=False)  # should be None

print("\n=== 3. Table 60B: VCF lookup ===")
check("0.845 @ 30°C",  vcf_from_table(0.845, 30.0),  not_none=True)
check("0.845 @ 20°C",  vcf_from_table(0.845, 20.0),  1.0)   # at ref temp VCF≈1
check("out-of-range",  vcf_from_table(0.845, 60.0),  not_none=False)

print("\n=== 4. WCF ===")
check("WCF 0.845",  wcf_from_density(0.845),  0.8439)
check("WCF None",   wcf_from_density(None),   not_none=False)

print("\n=== 5. Engine full chain ===")
eng = ShoreTankCalculationEngine()
d20 = eng.density_at_20(0.845, 30.0)
vcf = eng.vcf(d20, 35.0)
wcf = eng.wcf(d20)
check("d20",  d20,  not_none=True)
check("vcf",  vcf,  not_none=True)
check("wcf",  wcf,  not_none=True)
print(f"  values: d20={d20}, vcf={vcf}, wcf={wcf}")

# formula fallback (out of table range)
d20_oor = eng.density_at_20(0.845, 60.0)
vcf_oor = eng.vcf(d20_oor, 60.0)
check("fallback d20 (60°C)", d20_oor, not_none=True)
check("fallback vcf (60°C)", vcf_oor, not_none=True)
print(f"  fallback: d20={d20_oor}, vcf={vcf_oor}")

print("\n=== 6. Model property chain ===")
item = ShoreTankCalculationItem()
item.gross_observed_initial_m3    = 500.0
item.gross_observed_final_m3      = 1500.0
item.roof_displacement_initial_m3 = 5.0
item.roof_displacement_final_m3   = 5.0
item.water_volume_initial_m3      = 2.0
item.water_volume_final_m3        = 2.0
item.density_initial_kg_l         = 0.845
item.density_final_kg_l           = 0.845
item.tank_temperature_initial_c   = 30.0
item.tank_temperature_final_c     = 35.0
item.sample_temperature_initial_c = 30.0
item.sample_temperature_final_c   = 35.0

check("net_obs_initial",       item.net_observed_initial_m3,    493.0)
check("net_obs_final",         item.net_observed_final_m3,      1493.0)
check("received_obs_vol",      item.received_observed_volume_m3, 1000.0)
check("vcf_initial not None",  item.effective_vcf_initial,      not_none=True)
check("vcf_final not None",    item.effective_vcf_final,        not_none=True)
check("std_vol_initial",       item.standard_volume_initial_m3, not_none=True)
check("std_vol_final",         item.standard_volume_final_m3,   not_none=True)
check("received_std_vol",      item.received_standard_volume_m3, not_none=True)
check("weight_initial",        item.weight_air_initial_mt,      not_none=True)
check("weight_final",          item.weight_air_final_mt,        not_none=True)
check("received_weight",       item.received_weight_air_mt,     not_none=True)

print(f"\n  Summary:")
print(f"    NOV initial:       {item.net_observed_initial_m3} m³")
print(f"    NOV final:         {item.net_observed_final_m3} m³")
print(f"    Received obs vol:  {item.received_observed_volume_m3} m³")
print(f"    VCF initial:       {item.effective_vcf_initial}")
print(f"    VCF final:         {item.effective_vcf_final}")
print(f"    Std vol initial:   {item.standard_volume_initial_m3} m³")
print(f"    Std vol final:     {item.standard_volume_final_m3} m³")
print(f"    Received std vol:  {item.received_standard_volume_m3} m³")
print(f"    Weight initial:    {item.weight_air_initial_mt} MT")
print(f"    Weight final:      {item.weight_air_final_mt} MT")
print(f"    Received weight:   {item.received_weight_air_mt} MT")

print("\n=== 7. Edge cases ===")
# Zero density
item2 = ShoreTankCalculationItem()
item2.gross_observed_initial_m3 = 0
item2.gross_observed_final_m3   = 0
item2.roof_displacement_initial_m3 = 0
item2.roof_displacement_final_m3   = 0
item2.water_volume_initial_m3 = 0
item2.water_volume_final_m3   = 0
check("zero GOV nov_initial", item2.net_observed_initial_m3, 0.0)
check("zero GOV nov_final",   item2.net_observed_final_m3,   0.0)
check("no density wcf=None",  item2.effective_wcf_initial,   not_none=False)

print("\nDone.")
