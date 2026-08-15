"""
Verify ASTM calculations against sample document data.
Tank 5002, Gasoline
"""

# Sample data from document
sample_density_i = 0.735   # Specific Gravity initial
sample_temp_i    = 30.0    # Sample Temp initial
tank_temp_i      = 29.0    # Tank Temp initial

sample_density_f = 0.742   # Specific Gravity final
sample_temp_f    = 28.0    # Sample Temp final
tank_temp_f      = 31.0    # Tank Temp final

# Expected from document
expected = {
    'd20_i': 0.7439, 'd20_f': 0.7449,
    'vcf_i': 0.9890, 'vcf_f': 0.9868,
    'wcf_i': 0.7428, 'wcf_f': 0.7480,
}

# Volume data from document
gov_initial  = 475.588   # Gross Obs Volume initial (m3)
gov_final    = 1810.281  # Gross Obs Volume final (m3)
roof_i = 0; roof_f = 0
water_i = 0; water_f = 0

# Expected volume results
expected_nov_i = 475.588
expected_nov_f = 1810.281
expected_sv20_i = 470.357
expected_sv20_f = 1786.285
expected_sv20_received = 1316.029  # Standard Vol@20 Received
expected_wt_i = 349.281
expected_wt_f = 1356.216
expected_wt_received = 986.835  # Weight in Air Received


def test_expansion(exp_light, label):
    def d20(d, t):
        exp = 0.00064 if d >= 0.8 else exp_light
        return round(d / (1 + exp * (t - 20)), 4)

    def vcf(d20v, tank_t):
        exp = 0.00064 if d20v >= 0.8 else exp_light
        return round(1 / (1 + exp * (tank_t - 20)), 6)

    def wcf(d20v):
        return round(max(d20v - 0.0011, 0), 4)

    d20_i = d20(sample_density_i, sample_temp_i)
    d20_f = d20(sample_density_f, sample_temp_f)
    vcf_i = vcf(d20_i, tank_temp_i)
    vcf_f = vcf(d20_f, tank_temp_f)
    wcf_i = wcf(d20_i)
    wcf_f = wcf(d20_f)

    # Volume calculations
    nov_i = round(gov_initial - roof_i - water_i, 3)
    nov_f = round(gov_final - roof_f - water_f, 3)
    sv20_i = round(nov_i * vcf_i, 3)
    sv20_f = round(nov_f * vcf_f, 3)
    sv20_received = round(sv20_f - sv20_i, 3)
    wt_i = round(sv20_i * wcf_i, 3)
    wt_f = round(sv20_f * wcf_f, 3)
    wt_received = round(wt_f - wt_i, 3)

    print(f"\n=== {label} (exp_light={exp_light}) ===")
    print(f"  Density@20 Initial: {d20_i:7.4f}  expected: {expected['d20_i']}  {'OK' if d20_i == expected['d20_i'] else 'DIFF'}")
    print(f"  Density@20 Final:   {d20_f:7.4f}  expected: {expected['d20_f']}  {'OK' if d20_f == expected['d20_f'] else 'DIFF'}")
    print(f"  VCF Initial:        {vcf_i:8.4f}  expected: {expected['vcf_i']}  {'OK' if round(vcf_i,4) == expected['vcf_i'] else 'DIFF'}")
    print(f"  VCF Final:          {vcf_f:8.4f}  expected: {expected['vcf_f']}  {'OK' if round(vcf_f,4) == expected['vcf_f'] else 'DIFF'}")
    print(f"  WCF Initial:        {wcf_i:7.4f}  expected: {expected['wcf_i']}  {'OK' if wcf_i == expected['wcf_i'] else 'DIFF'}")
    print(f"  WCF Final:          {wcf_f:7.4f}  expected: {expected['wcf_f']}  {'OK' if wcf_f == expected['wcf_f'] else 'DIFF'}")
    print(f"  NOV Initial:        {nov_i:9.3f}  expected: {expected_nov_i}")
    print(f"  NOV Final:          {nov_f:9.3f}  expected: {expected_nov_f}")
    print(f"  StdVol@20 Initial:  {sv20_i:9.3f}  expected: {expected_sv20_i}")
    print(f"  StdVol@20 Final:    {sv20_f:9.3f}  expected: {expected_sv20_f}")
    print(f"  StdVol@20 Received: {sv20_received:9.3f}  expected: {expected_sv20_received}")
    print(f"  Weight Air Initial: {wt_i:9.3f}  expected: {expected_wt_i}")
    print(f"  Weight Air Final:   {wt_f:9.3f}  expected: {expected_wt_f}")
    print(f"  Weight Air Received:{wt_received:9.3f}  expected: {expected_wt_received}")


test_expansion(0.00075, "CURRENT (exp=0.00075 for <0.8)")
test_expansion(0.00090, "ASTM gasoline (exp=0.00090 for <0.8)")
test_expansion(0.00080, "exp=0.00080 for <0.8")
test_expansion(0.00085, "exp=0.00085 for <0.8")
