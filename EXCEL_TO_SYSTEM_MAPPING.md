# Excel to System Field Mapping Reference

## Overview
This document maps the fields from the SHORE TANK CALCULATION EXCELL.xlsx file to the implementation in the Django system.

## Manual Input Fields (Yellow in Excel)

| Excel Field | System Model Field | Type | Unit | Notes |
|-------------|-------------------|------|------|-------|
| Overall Dip | `overall_dip_initial_mm` / `overall_dip_final_mm` | Float | mm | Initial and final readings |
| Water Dip | `water_dip_initial_mm` / `water_dip_final_mm` | Float | mm | Initial and final readings |
| Product Dip | `product_dip_initial_mm` / `product_dip_final_mm` | Float | mm | Initial and final readings |
| Tank Temperature | `tank_temperature_initial_c` / `tank_temperature_final_c` | Float | °C | Initial and final readings |
| Sample Temperature | `sample_temperature_initial_c` / `sample_temperature_final_c` | Float | °C | Not used in standard volume calc |
| Gross Observed Volume | `gross_observed_initial_m3` / `gross_observed_final_m3` | Float | m³ | From tank calibration |
| Roof Displacement | `roof_displacement_initial_m3` / `roof_displacement_final_m3` | Float | m³ | For floating roof tanks |
| Water Volume | `water_volume_initial_m3` / `water_volume_final_m3` | Float | m³ | Calculated or measured |
| Density (BOL) | `density_initial_kg_l` / `density_final_kg_l` | Float | kg/l | From Bill of Lading |

## Auto-Calculated Fields (Blue in Excel)

| Excel Field | System Calculation | Formula | Result Field | Unit |
|-------------|-------------------|---------|--------------|------|
| Density @20 | `ASTMD1250Calculator.get_density_at_reference_temp()` | ρ_20 = ρ_t / (1 + α × (T - 20)) | Not stored (computed) | kg/m³ |
| VCF | `ASTMD1250Calculator.calculate_vcf()` | VCF = 1 / (1 + α × (T - 20)) | `vcf_initial` / `vcf_final` | dimensionless |
| WCF | `ASTMD1250Calculator.calculate_wcf()` | WCF = ρ_20 - 0.0011 | Not stored (computed) | kg/l |
| Net Observed Volume | `ShoreTankCalculationEngine._calculate_net_observed()` | Net = Gross - Roof - Water | (computed property) | m³ |
| Standard Volume @20 | `ShoreTankCalculationEngine._calculate_standard_volume()` | Std = Net × VCF | (computed property) | m³ |
| Received Volume | Property calculation | Final Net - Initial Net | `received_observed_volume_m3` | m³ |
| Weight in Air | `ShoreTankCalculationEngine._calculate_weight()` | Weight = Std Vol × WCF | (computed property) | MT |
| Received Weight | Property calculation | Final Weight - Initial Weight | `received_weight_air_mt` | MT |

## Terminal Summary Fields (Grey in Excel)

| Excel Field | System Calculation | Method | Source |
|-------------|-------------------|--------|--------|
| Terminal Observed Volume | `ShoreTankCalculation.terminal_observed_volume_m3` | Sum of all tank items | Property |
| Terminal Standard Volume | `ShoreTankCalculation.terminal_standard_volume_m3` | Sum of all tank items | Property |
| Terminal Weight in Air | `ShoreTankCalculation.terminal_weight_air_mt` | Sum of all tank items | Property |
| Difference Obs. Volume | `ShoreTankCalculation.difference_observed_volume_m3` | Terminal - Vessel | Property |
| Difference Std. Volume | `ShoreTankCalculation.difference_standard_volume_m3` | Terminal - Vessel | Property |
| Difference Weight | `ShoreTankCalculation.difference_weight_air_mt` | Terminal - Vessel | Property |

## Vessel Header Fields (Black in Excel)

| Excel Field | System Model Field | Type | Notes |
|-------------|-------------------|------|-------|
| Calculation Number | `calculation_number` | CharField | Auto-generated |
| Vessel Name | `vessel_name` | CharField | Manual input |
| Product Name | `product_name` | CharField | Manual input |
| Terminal | `terminal` | CharField | Manual input |
| Calculation Date | `calculation_date` | DateField | Manual input or auto-set |
| Vessel Density (BOL) | `vessel_density_kg_m3` | FloatField | Optional |
| Vessel Temperature | `vessel_temperature_c` | FloatField | Optional |
| Vessel Observed Volume | `vessel_observed_volume_m3` | FloatField | From vessel data |
| Vessel Standard Volume | `vessel_standard_volume_m3` | FloatField | From vessel data |
| Vessel Weight in Air | `vessel_weight_air_mt` | FloatField | From vessel data |
| Remarks | `remarks` | TextField | Optional notes |

## Excel Calculation Sheets vs Django Models

### Sheet Structure in Excel
```
Header Section (Vessel Info)
    ├─ Calculation Number
    ├─ Vessel Name
    ├─ Product Name
    ├─ Terminal
    └─ Date/Time

Tank Measurements Table
    ├─ Tank 1 (Initial | Final measurements)
    ├─ Tank 2 (Initial | Final measurements)
    └─ Tank N (Initial | Final measurements)

Summary Section (Terminal Totals)
    ├─ Vessel Summary
    ├─ Terminal Summary
    └─ Differences
```

### Django Model Structure
```
ShoreTankCalculation (Header)
    ├─ vessel_name
    ├─ product_name
    ├─ terminal
    ├─ calculation_date
    └─ vessel_* fields

ShoreTankCalculationItem (Tank Measurements - repeated)
    ├─ tank_no
    ├─ density_initial_kg_l
    ├─ density_final_kg_l
    ├─ gross_observed_initial_m3
    ├─ gross_observed_final_m3
    ├─ temperature_initial_c
    ├─ temperature_final_c
    └─ all other measurement fields
```

## Calculation Flow Diagram

```
Manual Input (User enters in UI)
    ↓
ShoreTankCalculationItem created with:
  - Overall dip, Water dip, Product dip
  - Tank & sample temperatures
  - Density (from BOL)
  - Gross observed volumes
  - Roof displacement, Water volumes
    ↓
POST /shore-tank-calculations/{id}/calculate/
    ↓
ShoreTankCalculationEngine.calculate_tank_item()
    ├─ Calculate Net Observed = Gross - Roof - Water
    ├─ ASTMD1250Calculator.calculate_vcf()
    │   └─ VCF = 1 / (1 + expansion_coeff × (T - 20))
    ├─ Calculate Standard Volume = Net × VCF
    ├─ ASTMD1250Calculator.get_density_at_reference_temp()
    │   └─ ρ_20 = ρ_t / (1 + expansion_coeff × (T - 20))
    ├─ ASTMD1250Calculator.calculate_wcf()
    │   └─ WCF = ρ_20 - 0.0011
    └─ Calculate Weight = Std Vol × WCF
    ↓
Results computed and aggregated
    ├─ Item-level calculations
    ├─ Initial & Final values
    └─ Differences (Received quantities)
    ↓
GET /shore-tank-calculations/{id}/generate_document/
    ↓
ShoreTankDocumentGenerator fills Word template
    ├─ Header info (Vessel, Terminal, Dates)
    ├─ Tank details table
    └─ Summary section
    ↓
Word document (.docx) download
```

## ASTM D1250 Thermal Expansion Coefficients

The system uses these coefficients based on product density:

| Density Range (kg/l) | Coefficient | Product Type |
|----------------------|------------|--------------|
| 0.60 - 0.70 | 0.000880 | Light naphtha |
| 0.70 - 0.75 | 0.000865 | Gasoline |
| 0.75 - 0.80 | 0.000850 | Kerosene |
| 0.80 - 0.85 | 0.000840 | Light gas oil |
| 0.85 - 0.90 | 0.000825 | Crude oil (typical) |
| 0.90 - 0.95 | 0.000815 | Heavy fuel oil |
| 0.95 - 1.00 | 0.000800 | Very heavy oils |

## Temperature Correction Example

### Scenario
- Density at tank temperature: 0.85 kg/l
- Tank temperature: 25°C
- Reference temperature: 20°C

### Calculations

1. **Get Expansion Coefficient** (for 0.85 kg/l range)
   - From table: 0.000825

2. **Calculate VCF**
   ```
   VCF = 1 / (1 + 0.000825 × (25 - 20))
   VCF = 1 / (1 + 0.000825 × 5)
   VCF = 1 / (1 + 0.004125)
   VCF = 1 / 1.004125
   VCF = 0.996896 ≈ 0.9969
   ```

3. **Calculate Density @20°C**
   ```
   ρ_20 = 0.85 / 1.004125
   ρ_20 = 0.8465 kg/l
   ρ_20 = 846.5 kg/m³
   ```

4. **Calculate WCF**
   ```
   WCF = 0.8465 - 0.0011
   WCF = 0.8454 kg/l
   ```

5. **Apply to Volume**
   ```
   Net Observed: 1000 m³
   Standard Volume = 1000 × 0.9969 = 996.9 m³
   Weight = 996.9 × 0.8454 = 842.77 MT
   ```

## API Request/Response Examples

### Create Shore Tank Calculation
```json
POST /api/shore-tank-calculations/

{
  "vessel_name": "VESSEL ABC",
  "product_name": "CRUDE OIL",
  "terminal": "PORT TERMINAL A",
  "calculation_date": "2026-05-02",
  "vessel_density_kg_m3": 850,
  "vessel_temperature_c": 25,
  "vessel_observed_volume_m3": 10000,
  "vessel_standard_volume_m3": 9969,
  "vessel_weight_air_mt": 8430,
  "pbpa_inspector_name": "John Inspector"
}
```

### Add Tank Item
```json
POST /api/shore-tank-calculation-items/

{
  "calculation": 1,
  "tank": 5,
  "tank_no": "T-001",
  "density_initial_kg_l": 0.85,
  "density_final_kg_l": 0.851,
  "gross_observed_initial_m3": 1000,
  "gross_observed_final_m3": 1050,
  "roof_displacement_initial_m3": 2,
  "roof_displacement_final_m3": 2,
  "water_volume_initial_m3": 1,
  "water_volume_final_m3": 1.5,
  "tank_temperature_initial_c": 25,
  "tank_temperature_final_c": 26
}
```

### Calculate Response
```json
POST /api/shore-tank-calculations/1/calculate/

{
  "detail": "Calculations completed successfully",
  "results": {
    "items": [
      {
        "net_observed_initial_m3": 997.0,
        "net_observed_final_m3": 1046.5,
        "standard_volume_initial_m3": 994.03,
        "standard_volume_final_m3": 1041.39,
        "received_standard_volume_m3": 47.36,
        "weight_in_air_initial_mt": 840.17,
        "weight_in_air_final_mt": 880.23,
        "received_weight_air_mt": 40.06
      }
    ],
    "total_received_observed_volume_m3": 49.5,
    "total_received_standard_volume_m3": 47.36,
    "total_received_weight_air_mt": 40.06,
    "errors": []
  }
}
```

## Common Mistakes & Corrections

| Mistake | Impact | Correction |
|---------|--------|-----------|
| Using density in kg/m³ instead of kg/l | VCF will be wrong | Divide by 1000: 850 kg/m³ = 0.85 kg/l |
| Not accounting for roof displacement | Volume too high | Always subtract roof volume for floating roof tanks |
| Using temperature above 50°C | Correction factor unreliable | ASTM D1250 designed for typical temps |
| Missing density value | Calculation fails | Provide from Bill of Lading or sample analysis |
| Final reading less than initial | Negative received quantity | Check measurements, may indicate tank drain |

---

**Document Version**: 1.0
**Last Updated**: May 2, 2026
**Status**: Complete & Ready for Production
