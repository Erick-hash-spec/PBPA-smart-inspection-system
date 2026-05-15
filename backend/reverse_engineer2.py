"""
Deep analysis - check if WCF uses raw sample density, and test ASTM table lookup approach.
"""

sample_density_i = 0.735
sample_temp_i    = 30.0
tank_temp_i      = 29.0

sample_density_f = 0.742
sample_temp_f    = 28.0
tank_temp_f      = 31.0

d20_i_expected = 0.7439
d20_f_expected = 0.7449
vcf_i_expected = 0.9890
vcf_f_expected = 0.9868
wcf_i_expected = 0.7428
wcf_f_expected = 0.7480

# Check 1: WCF = raw_sample_density - 0.0011?
print("=== WCF formula check ===")
print(f"WCF = sample_density - 0.0011:")
print(f"  Initial: {sample_density_i} - 0.0011 = {sample_density_i - 0.0011:.4f}  expected: {wcf_i_expected}")
print(f"  Final:   {sample_density_f} - 0.0011 = {sample_density_f - 0.0011:.4f}  expected: {wcf_f_expected}")

print(f"\nWCF = d20 - 0.0011:")
print(f"  Initial: {d20_i_expected} - 0.0011 = {d20_i_expected - 0.0011:.4f}  expected: {wcf_i_expected}")
print(f"  Final:   {d20_f_expected} - 0.0011 = {d20_f_expected - 0.0011:.4f}  expected: {wcf_f_expected}")

# WCF final: 0.7480 - what gives this?
# 0.7480 + 0.0011 = 0.7491 -- not matching d20_f=0.7449
# 0.7480 = sample_density_f - 0.0011 + something?
# 0.7480 = 0.742 - 0.0011 = 0.7409 -- no
# Maybe WCF final uses a different d20?
print(f"\nReverse WCF final: wcf_f + 0.0011 = {wcf_f_expected + 0.0011:.4f}")
# 0.7491 -- what density gives this?
# Could be density@20 using a different formula

# Check 2: ASTM Table 54B uses a polynomial correction
# For petroleum products, ASTM D1250 Table 54B:
# The correction factor K = 1 + alpha*(T-20) where alpha depends on density range
# For density 0.720-0.779 (gasoline): alpha ≈ 0.001118 per °C
# d_at_20 = d_observed / (1 + alpha*(T_obs - 20))  -- this is the standard form

# But wait -- let me re-read the document more carefully
# "Specific Gravity" = 0.735 at 30°C sample temp
# "Density @20°C" = 0.7439
# This means density INCREASED when corrected to 20°C (from 30°C to 20°C)
# That's correct -- density increases as temperature decreases
# So d20 > d_sample when T_sample > 20°C -- CORRECT

# The formula d20 = d / (1 + exp*(T-20)) gives d20 < d when T > 20 -- WRONG direction!
# The correct formula should be: d20 = d * (1 + exp*(T-20)) when T > 20 gives d20 > d -- CORRECT

print("\n=== Testing d20 = d * (1 + exp*(T-20)) ===")
# For initial: d20 = 0.735 * (1 + exp*(30-20)) = 0.7439
# 0.7439 / 0.735 = 1 + exp*10
# exp = (0.7439/0.735 - 1) / 10
exp_i = (d20_i_expected / sample_density_i - 1) / (sample_temp_i - 20)
exp_f = (d20_f_expected / sample_density_f - 1) / (sample_temp_f - 20)
print(f"Reverse-engineered exp: initial={exp_i:.6f}, final={exp_f:.6f}")
# These are different -- confirms it's a lookup table, not a single coefficient

# ASTM Table 54B for gasoline (density 0.720-0.779):
# The standard coefficient is 0.001118 per °C
# Let's test with 0.001118
for exp in [0.001118, 0.001200, 0.001210, 0.001215, 0.001220, 0.001225]:
    d20_i_try = round(sample_density_i * (1 + exp * (sample_temp_i - 20)), 4)
    d20_f_try = round(sample_density_f * (1 + exp * (sample_temp_f - 20)), 4)
    vcf_i_try = round(1 / (1 + exp * (tank_temp_i - 20)), 4)
    vcf_f_try = round(1 / (1 + exp * (tank_temp_f - 20)), 4)
    print(f"exp={exp:.6f}: d20_i={d20_i_try}(exp {d20_i_expected}), d20_f={d20_f_try}(exp {d20_f_expected}), vcf_i={vcf_i_try}(exp {vcf_i_expected}), vcf_f={vcf_f_try}(exp {vcf_f_expected})")

# Check VCF formula direction
# VCF = 1 / (1 + exp*(T_tank - 20))
# For T_tank=29 > 20: VCF < 1 -- correct (volume at 29°C > volume at 20°C, so VCF < 1)
# vcf_i = 0.9890 at T=29
# 1/0.9890 = 1.01112 = 1 + exp*9
# exp = 0.01112/9 = 0.001236
exp_vcf_i = (1/vcf_i_expected - 1) / (tank_temp_i - 20)
exp_vcf_f = (1/vcf_f_expected - 1) / (tank_temp_f - 20)
print(f"\nVCF reverse-engineered exp: initial={exp_vcf_i:.6f}, final={exp_vcf_f:.6f}")

# Check WCF with the correct d20
# If d20 uses exp=0.001220:
exp_best = 0.001220
d20_i_best = round(sample_density_i * (1 + exp_best * (sample_temp_i - 20)), 4)
d20_f_best = round(sample_density_f * (1 + exp_best * (sample_temp_f - 20)), 4)
print(f"\nWith exp=0.001220: d20_i={d20_i_best}, d20_f={d20_f_best}")
print(f"WCF_i = {d20_i_best} - 0.0011 = {d20_i_best - 0.0011:.4f}  expected: {wcf_i_expected}")
print(f"WCF_f = {d20_f_best} - 0.0011 = {d20_f_best - 0.0011:.4f}  expected: {wcf_f_expected}")

# Full volume calculation with best params
print("\n=== Full volume calculation with exp=0.001220 ===")
gov_i = 475.588
gov_f = 1810.281
nov_i = gov_i  # no roof, no water
nov_f = gov_f

vcf_i = round(1 / (1 + exp_best * (tank_temp_i - 20)), 6)
vcf_f = round(1 / (1 + exp_best * (tank_temp_f - 20)), 6)
wcf_i = round(max(d20_i_best - 0.0011, 0), 4)
wcf_f = round(max(d20_f_best - 0.0011, 0), 4)

sv20_i = round(nov_i * vcf_i, 3)
sv20_f = round(nov_f * vcf_f, 3)
sv20_recv = round(sv20_f - sv20_i, 3)
wt_i = round(sv20_i * wcf_i, 3)
wt_f = round(sv20_f * wcf_f, 3)
wt_recv = round(wt_f - wt_i, 3)

print(f"VCF_i={vcf_i} (exp 0.9890), VCF_f={vcf_f} (exp 0.9868)")
print(f"WCF_i={wcf_i} (exp 0.7428), WCF_f={wcf_f} (exp 0.7480)")
print(f"StdVol@20 Initial:  {sv20_i}  expected: 470.357")
print(f"StdVol@20 Final:    {sv20_f}  expected: 1786.285")
print(f"StdVol@20 Received: {sv20_recv}  expected: 1316.029")
print(f"Weight Air Initial: {wt_i}  expected: 349.281")
print(f"Weight Air Final:   {wt_f}  expected: 1356.216")
print(f"Weight Air Received:{wt_recv}  expected: 986.835")
