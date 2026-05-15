"""
FINAL VERIFICATION against PBPA document sample data.
Tank 5002, Gasoline, Vessel: MT NCC NAIMA, Date: 24-10-2025
"""

def alpha(d):
    return 0.00064 if d >= 0.8 else 0.001210

def density_at_20(d, t):
    if d is None or t is None: return None
    return round(d * (1 + alpha(d) * (t - 20)), 4)

def vcf(d20, tank_t):
    if d20 is None or tank_t is None: return 1.0
    return round(1 / (1 + alpha(d20) * (tank_t - 20)), 6)

def wcf(d20):
    if d20 is None: return None
    return round(max(d20 - 0.0011, 0), 4)

# Document inputs
sample_density_i, sample_temp_i, tank_temp_i = 0.735, 30.0, 29.0
sample_density_f, sample_temp_f, tank_temp_f = 0.742, 28.0, 31.0
gov_i, gov_f = 475.588, 1810.281
roof_i = roof_f = water_i = water_f = 0

# Compute
d20_i = density_at_20(sample_density_i, sample_temp_i)
d20_f = density_at_20(sample_density_f, sample_temp_f)
vcf_i = vcf(d20_i, tank_temp_i)
vcf_f = vcf(d20_f, tank_temp_f)
wcf_i = wcf(d20_i)
wcf_f = wcf(d20_f)

nov_i = round(gov_i - roof_i - water_i, 3)
nov_f = round(gov_f - roof_f - water_f, 3)
sv20_i = round(nov_i * vcf_i, 3)
sv20_f = round(nov_f * vcf_f, 3)
sv20_recv = round(sv20_f - sv20_i, 3)
wt_i = round(sv20_i * wcf_i, 3)
wt_f = round(sv20_f * wcf_f, 3)
wt_recv = round(wt_f - wt_i, 3)

OK = lambda got, exp: "OK" if abs(got - exp) < 0.002 else f"DIFF (got {got}, exp {exp})"

print("=" * 55)
print("PBPA SHORE TANK CALCULATION VERIFICATION")
print("Tank 5002 | Gasoline | MT NCC NAIMA")
print("=" * 55)
print(f"Density@20 Initial:   {d20_i:.4f}   expected: 0.7439  {OK(d20_i, 0.7439)}")
print(f"Density@20 Final:     {d20_f:.4f}   expected: 0.7449  {OK(d20_f, 0.7449)}")
print(f"VCF Initial:          {round(vcf_i,4):.4f}   expected: 0.9890  {OK(vcf_i, 0.9890)}")
print(f"VCF Final:            {round(vcf_f,4):.4f}   expected: 0.9868  {OK(vcf_f, 0.9868)}")
print(f"WCF Initial:          {wcf_i:.4f}   expected: 0.7428  {OK(wcf_i, 0.7428)}")
print(f"WCF Final:            {wcf_f:.4f}   expected: 0.7480  {OK(wcf_f, 0.7480)}")
print(f"NOV Initial:          {nov_i:.3f}  expected: 475.588 {OK(nov_i, 475.588)}")
print(f"NOV Final:           {nov_f:.3f} expected: 1810.281 {OK(nov_f, 1810.281)}")
print(f"StdVol@20 Initial:    {sv20_i:.3f}  expected: 470.357 {OK(sv20_i, 470.357)}")
print(f"StdVol@20 Final:     {sv20_f:.3f} expected: 1786.285 {OK(sv20_f, 1786.285)}")
print(f"StdVol@20 Received:  {sv20_recv:.3f} expected: 1316.029 {OK(sv20_recv, 1316.029)}")
print(f"Weight Air Initial:   {wt_i:.3f}  expected: 349.281  {OK(wt_i, 349.281)}")
print(f"Weight Air Final:    {wt_f:.3f} expected: 1356.216 {OK(wt_f, 1356.216)}")
print(f"Weight Air Received:  {wt_recv:.3f}  expected: 986.835  {OK(wt_recv, 986.835)}")
