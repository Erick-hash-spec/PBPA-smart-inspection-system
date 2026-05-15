"""
Reverse-engineer the correct formula from document values.
"""

# Known inputs
sample_density_i = 0.735   # Specific Gravity (sample density kg/L) initial
sample_temp_i    = 30.0    # Sample Temp initial
tank_temp_i      = 29.0    # Tank Temp initial

sample_density_f = 0.742   # Specific Gravity final
sample_temp_f    = 28.0    # Sample Temp final
tank_temp_f      = 31.0    # Tank Temp final

# Known outputs from document
d20_i_expected = 0.7439
d20_f_expected = 0.7449
vcf_i_expected = 0.9890
vcf_f_expected = 0.9868
wcf_i_expected = 0.7428
wcf_f_expected = 0.7480

# Reverse-engineer expansion coefficient for density@20
# d20 = d_sample / (1 + exp * (T_sample - 20))
# => exp = (d_sample/d20 - 1) / (T_sample - 20)
exp_i = (sample_density_i / d20_i_expected - 1) / (sample_temp_i - 20)
exp_f = (sample_density_f / d20_f_expected - 1) / (sample_temp_f - 20)
print(f"Reverse-engineered expansion for density@20:")
print(f"  Initial: {exp_i:.6f}")
print(f"  Final:   {exp_f:.6f}")

# Reverse-engineer VCF expansion
# vcf = 1 / (1 + exp * (T_tank - 20))
# => exp = (1/vcf - 1) / (T_tank - 20)
vcf_exp_i = (1/vcf_i_expected - 1) / (tank_temp_i - 20)
vcf_exp_f = (1/vcf_f_expected - 1) / (tank_temp_f - 20)
print(f"\nReverse-engineered expansion for VCF:")
print(f"  Initial: {vcf_exp_i:.6f}")
print(f"  Final:   {vcf_exp_f:.6f}")

# Check WCF formula: WCF = d20 - 0.0011?
print(f"\nWCF check:")
print(f"  Initial: d20={d20_i_expected} - 0.0011 = {d20_i_expected - 0.0011:.4f}  expected: {wcf_i_expected}")
print(f"  Final:   d20={d20_f_expected} - 0.0011 = {d20_f_expected - 0.0011:.4f}  expected: {wcf_f_expected}")

# Try alternative: maybe density@20 uses a different reference
# ASTM Table 54B uses 15C as reference, not 20C
# Let's try: d20 = d_sample * (1 + exp*(T_sample - 20)) — opposite direction
print(f"\n--- Try OPPOSITE direction: d20 = d * (1 + exp*(T-20)) ---")
# d20 = d * (1 + exp*(T-20))
# exp = (d20/d - 1) / (T-20)
exp_i2 = (d20_i_expected / sample_density_i - 1) / (sample_temp_i - 20)
exp_f2 = (d20_f_expected / sample_density_f - 1) / (sample_temp_f - 20)
print(f"  exp initial: {exp_i2:.6f}")
print(f"  exp final:   {exp_f2:.6f}")

# Verify with exp = 0.001118 (ASTM Table 54 for gasoline at 15C ref)
# But we need 20C ref. Let's try common values
for exp in [0.001118, 0.00112, 0.00110, 0.00115, 0.00120]:
    d20_i_try = round(sample_density_i * (1 + exp * (sample_temp_i - 20)), 4)
    d20_f_try = round(sample_density_f * (1 + exp * (sample_temp_f - 20)), 4)
    print(f"  exp={exp}: d20_i={d20_i_try} (exp {d20_i_expected}), d20_f={d20_f_try} (exp {d20_f_expected})")

# Try: density correction using additive formula
# d20 = d_sample + exp * (T_sample - 20)
print(f"\n--- Try ADDITIVE: d20 = d + exp*(T-20) ---")
exp_add_i = (d20_i_expected - sample_density_i) / (sample_temp_i - 20)
exp_add_f = (d20_f_expected - sample_density_f) / (sample_temp_f - 20)
print(f"  exp initial: {exp_add_i:.6f}")
print(f"  exp final:   {exp_add_f:.6f}")

# These should be negative since density decreases with temperature
# d20 = d_sample - exp*(T_sample - 20) when T > 20
print(f"\n--- Try: d20 = d - exp*(T-20) ---")
exp_sub_i = (sample_density_i - d20_i_expected) / (sample_temp_i - 20)
exp_sub_f = (sample_density_f - d20_f_expected) / (sample_temp_f - 20)
print(f"  exp initial: {exp_sub_i:.6f}")
print(f"  exp final:   {exp_sub_f:.6f}")

for exp in [0.000700, 0.000720, 0.000740, 0.000760, 0.000780, 0.000800]:
    d20_i_try = round(sample_density_i - exp * (sample_temp_i - 20), 4)
    d20_f_try = round(sample_density_f - exp * (sample_temp_f - 20), 4)
    print(f"  exp={exp}: d20_i={d20_i_try} (exp {d20_i_expected}), d20_f={d20_f_try} (exp {d20_f_expected})")
