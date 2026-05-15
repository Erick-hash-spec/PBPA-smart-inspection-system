"""
ASTM D1250 / API MPMS Ch.11 Table Lookup Engine
Loads Table 59B (Density @20°C) and Table 60B (VCF) directly from the
PBPA Excel workbook and performs exact lookup with bilinear interpolation.

Table 59B: observed density (kg/L) + sample temperature (°C) -> density @20°C
Table 60B: density @20°C (kg/L) + tank temperature (°C)      -> VCF
"""

import os
import bisect

# ── lazy-loaded table cache ──────────────────────────────────────────────────
_TABLE_59B = None   # {density_key: {temp_key: d20_value}}
_TABLE_60B = None   # {density_key: {temp_key: vcf_value}}

_EXCEL_PATH = os.path.join(os.path.dirname(__file__), '..', 'SHORE TANK CALCULATION EXCELL.xlsx')


def _load_tables():
    global _TABLE_59B, _TABLE_60B
    if _TABLE_59B is not None:
        return

    try:
        import openpyxl
        wb = openpyxl.load_workbook(
            os.path.abspath(_EXCEL_PATH), data_only=True, read_only=True
        )
        _TABLE_59B = _parse_sheet(wb['Table 59B'])
        _TABLE_60B = _parse_sheet(wb['Table 60B'])
        wb.close()
    except Exception as e:
        # Fallback: tables unavailable — callers will use formula fallback
        _TABLE_59B = {}
        _TABLE_60B = {}


def _parse_sheet(ws):
    """Parse an ASTM lookup sheet into {density: {temp: value}}."""
    # Row 9 (index 8) contains temperature headers starting at column D (index 3)
    temp_row = next(ws.iter_rows(min_row=9, max_row=9, values_only=True))
    temps = [float(v) for v in temp_row[3:] if v is not None]

    table = {}
    for row in ws.iter_rows(min_row=10, values_only=True):
        d_key = row[2]
        if d_key is None or not isinstance(d_key, (int, float)):
            continue
        d_key = round(float(d_key), 4)
        row_dict = {}
        for i, v in enumerate(row[3:]):
            if i < len(temps) and v is not None:
                row_dict[float(temps[i])] = float(v)
        if row_dict:
            table[d_key] = row_dict
    return table


def _sorted_keys(d):
    return sorted(d.keys())


def _interp1d(x0, x1, y0, y1, x):
    """Linear interpolation."""
    if x1 == x0:
        return y0
    return y0 + (y1 - y0) * (x - x0) / (x1 - x0)


def _lookup(table, density, temperature):
    """
    Bilinear lookup in an ASTM table.
    Interpolates between the two nearest density rows and two nearest temp cols.
    Returns None if inputs are out of range.
    """
    if not table or density is None or temperature is None:
        return None

    d_keys = _sorted_keys(table)
    t_min = min(temperature for row in table.values() for temperature in row)
    t_max = max(temperature for row in table.values() for temperature in row)
    d_min, d_max = d_keys[0], d_keys[-1]

    if not (d_min <= density <= d_max) or not (t_min <= temperature <= t_max):
        return None  # out of range

    # Find surrounding density rows
    idx = bisect.bisect_left(d_keys, density)
    if idx == 0:
        d_lo = d_hi = d_keys[0]
    elif idx >= len(d_keys):
        d_lo = d_hi = d_keys[-1]
    elif d_keys[idx] == density:
        d_lo = d_hi = d_keys[idx]
    else:
        d_lo, d_hi = d_keys[idx - 1], d_keys[idx]

    def _row_lookup(d_key, temp):
        row = table[d_key]
        t_keys = _sorted_keys(row)
        tidx = bisect.bisect_left(t_keys, temp)
        if tidx == 0:
            return row[t_keys[0]]
        if tidx >= len(t_keys):
            return row[t_keys[-1]]
        if t_keys[tidx] == temp:
            return row[t_keys[tidx]]
        t0, t1 = t_keys[tidx - 1], t_keys[tidx]
        return _interp1d(t0, t1, row[t0], row[t1], temp)

    v_lo = _row_lookup(d_lo, temperature)
    if d_lo == d_hi:
        return round(v_lo, 6)
    v_hi = _row_lookup(d_hi, temperature)
    return round(_interp1d(d_lo, d_hi, v_lo, v_hi, density), 6)


# ── Public API ───────────────────────────────────────────────────────────────

def density_at_20_from_table(sample_density_kg_l, sample_temperature_c):
    """
    Table 59B lookup: observed sample density + sample temperature -> density @20°C.
    Returns None if inputs are None or out of table range.
    """
    _load_tables()
    if sample_density_kg_l is None or sample_temperature_c is None:
        return None
    result = _lookup(_TABLE_59B, sample_density_kg_l, sample_temperature_c)
    return round(result, 4) if result is not None else None


def vcf_from_table(density_at_20_kg_l, tank_temperature_c):
    """
    Table 60B lookup: density @20°C + tank temperature -> VCF.
    Returns None if inputs are None or out of table range.
    """
    _load_tables()
    if density_at_20_kg_l is None or tank_temperature_c is None:
        return None
    result = _lookup(_TABLE_60B, density_at_20_kg_l, tank_temperature_c)
    return round(result, 6) if result is not None else None


def wcf_from_density(density_at_20_kg_l):
    """WCF = Density@20°C - 0.0011 (no table needed)."""
    if density_at_20_kg_l is None:
        return None
    return round(max(density_at_20_kg_l - 0.0011, 0), 4)


def table_range():
    """Return the density and temperature ranges covered by the loaded tables."""
    _load_tables()
    if not _TABLE_59B:
        return None
    d_keys = _sorted_keys(_TABLE_59B)
    sample_row = _TABLE_59B[d_keys[0]]
    t_keys = _sorted_keys(sample_row)
    return {
        'density_min': d_keys[0], 'density_max': d_keys[-1],
        'temp_min': t_keys[0], 'temp_max': t_keys[-1],
        'density_step': round(d_keys[1] - d_keys[0], 4),
        'temp_step': round(t_keys[1] - t_keys[0], 2),
    }
