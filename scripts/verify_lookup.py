import json

with open('astm_table59b.json') as f:
    t59 = {float(k): v for k, v in json.load(f).items()}
with open('astm_table60b.json') as f:
    t60 = {float(k): v for k, v in json.load(f).items()}

# Check density key step size
keys59 = sorted(t59.keys())
steps = set(round(keys59[i+1]-keys59[i], 5) for i in range(min(20, len(keys59)-1)))
print("Table 59B density key steps:", steps)
print("Sample keys around 0.735:", [k for k in keys59 if 0.730 <= k <= 0.740])

keys60 = sorted(t60.keys())
print("Sample keys around 0.744:", [k for k in keys60 if 0.740 <= k <= 0.748])

# Check temperature key step size
temps = sorted(float(t) for t in t59[0.735].keys())
tsteps = set(round(temps[i+1]-temps[i], 5) for i in range(min(10, len(temps)-1)))
print("Temp key steps:", tsteps)
print("Temps around 28-32:", [t for t in temps if 27 <= t <= 33])

# Full verification against document
print("\n=== FULL DOCUMENT VERIFICATION ===")
# Table 59B: density=0.735, temp=30 -> d20
d20_i = t59[0.735][30.0]
d20_f = t59[0.742][28.0]
print(f"d20 initial: {d20_i} (expected 0.7439)")
print(f"d20 final:   {d20_f} (expected 0.7449)")

# Table 60B: d20 -> VCF at tank temp
# d20_i=0.7439 -> nearest key in t60
def lookup_vcf(d20, tank_temp):
    keys = sorted(t60.keys())
    # find nearest key
    nearest = min(keys, key=lambda k: abs(k - d20))
    temps = t60[nearest]
    if tank_temp in temps:
        return temps[tank_temp]
    # interpolate between nearest temps
    tkeys = sorted(temps.keys())
    lo = max((t for t in tkeys if t <= tank_temp), default=tkeys[0])
    hi = min((t for t in tkeys if t >= tank_temp), default=tkeys[-1])
    if lo == hi:
        return temps[lo]
    frac = (tank_temp - lo) / (hi - lo)
    return round(temps[lo] + frac * (temps[hi] - temps[lo]), 6)

vcf_i = lookup_vcf(d20_i, 29.0)
vcf_f = lookup_vcf(d20_f, 31.0)
print(f"VCF initial: {vcf_i} (expected 0.9890)")
print(f"VCF final:   {vcf_f} (expected 0.9868)")

# WCF
wcf_i = round(max(d20_i - 0.0011, 0), 4)
wcf_f = round(max(d20_f - 0.0011, 0), 4)
print(f"WCF initial: {wcf_i} (expected 0.7428)")
print(f"WCF final:   {wcf_f} (expected 0.7480)")

# Volume calcs
gov_i, gov_f = 475.588, 1810.281
nov_i, nov_f = gov_i, gov_f
sv20_i = round(nov_i * vcf_i, 3)
sv20_f = round(nov_f * vcf_f, 3)
sv20_recv = round(sv20_f - sv20_i, 3)
wt_i = round(sv20_i * wcf_i, 3)
wt_f = round(sv20_f * wcf_f, 3)
wt_recv = round(wt_f - wt_i, 3)
print(f"\nStdVol@20 Initial:  {sv20_i}  expected: 470.357")
print(f"StdVol@20 Final:   {sv20_f}  expected: 1786.285")
print(f"StdVol@20 Received:{sv20_recv}  expected: 1316.029")
print(f"Weight Air Initial: {wt_i}  expected: 349.281")
print(f"Weight Air Final:  {wt_f}  expected: 1356.216")
print(f"Weight Air Received:{wt_recv}  expected: 986.835")
