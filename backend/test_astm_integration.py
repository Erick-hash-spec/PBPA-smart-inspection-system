"""
Simulate the /api/astm/lookup/ endpoint logic against sample document data.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from inspections.astm_tables import density_at_20_from_table, vcf_from_table, wcf_from_density

cases = [
    # (label, sample_density, sample_temp, tank_temp, exp_d20, exp_vcf, exp_wcf)
    ('INITIAL', 0.735, 30.0, 29.0, 0.7439, 0.9890, 0.7428),
    ('FINAL',   0.742, 28.0, 31.0, 0.7449, 0.9868, 0.7480),
]

print("=" * 60)
print("ASTM TABLE LOOKUP - END-TO-END VERIFICATION")
print("Tank 5002 | Gasoline | MT NCC NAIMA")
print("=" * 60)

all_ok = True
for label, sd, st, tt, exp_d20, exp_vcf, exp_wcf in cases:
    d20 = density_at_20_from_table(sd, st)
    vcf = vcf_from_table(d20, tt)
    wcf = wcf_from_density(d20)

    def chk(got, exp, tol=0.002):
        return "OK" if got is not None and abs(got - exp) <= tol else f"FAIL (got {got})"

    r_d20 = chk(d20,  exp_d20, 0.0001)
    r_vcf = chk(vcf,  exp_vcf, 0.001)
    r_wcf = chk(wcf,  exp_wcf, 0.0001)

    print(f"\n{label}:")
    print(f"  Density @20C : {d20}  expected {exp_d20}  [{r_d20}]")
    print(f"  VCF          : {round(vcf,4) if vcf else None}  expected {exp_vcf}  [{r_vcf}]")
    print(f"  WCF          : {wcf}  expected {exp_wcf}  [{r_wcf}]")

    if "FAIL" in (r_d20 + r_vcf + r_wcf):
        all_ok = False

# Volume chain
gov_i, gov_f = 475.588, 1810.281
d20_i = density_at_20_from_table(0.735, 30.0)
d20_f = density_at_20_from_table(0.742, 28.0)
vcf_i = vcf_from_table(d20_i, 29.0)
vcf_f = vcf_from_table(d20_f, 31.0)
wcf_i = wcf_from_density(d20_i)
wcf_f = wcf_from_density(d20_f)

sv_i = round(gov_i * vcf_i, 3)
sv_f = round(gov_f * vcf_f, 3)
sv_recv = round(sv_f - sv_i, 3)
wt_i = round(sv_i * wcf_i, 3)
wt_f = round(sv_f * wcf_f, 3)
wt_recv = round(wt_f - wt_i, 3)

print("\n--- Volume Chain ---")
print(f"  StdVol Initial  : {sv_i}   expected 470.357")
print(f"  StdVol Final    : {sv_f}  expected 1786.285")
print(f"  StdVol Received : {sv_recv}  expected 1316.029")
print(f"  Weight Initial  : {wt_i}   expected 349.281")
print(f"  Weight Final    : {wt_f}  expected 1356.216")
print(f"  Weight Received : {wt_recv}   expected 986.835")
print(f"\nResult: {'ALL PASS' if all_ok else 'SOME FAILURES'}")
