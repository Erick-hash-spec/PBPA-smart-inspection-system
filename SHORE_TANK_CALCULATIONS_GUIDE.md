# Shore Tank Calculation Engine - Implementation Guide

## Overview

The shore tank calculation system has been enhanced to include:

1. **ASTM D1250 Calculator** - Calculates Volume Correction Factor (VCF) and Weight Correction Factor (WCF)
2. **Shore Tank Calculation Engine** - Performs all volume and weight calculations
3. **Document Generator** - Fills Word documents with calculated data
4. **REST API Endpoints** - Exposes calculation and document generation functions

## Key Calculations

### Manual Input Fields (Yellow in Excel)
- Overall dip (mm)
- Water dip (mm)
- Product dip (mm)
- Tank temperature (°C)
- Sample temperature (°C)
- Gross observed volume (m³)
- Roof displacement volume (m³)
- Water volume (m³)
- Vessel density in kg/litre

### Auto-Calculated Fields (Blue in Excel)

#### 1. Density @20°C (kg/m³)
Formula based on ASTM D1250:
```
ρ_20 = ρ_t / (1 + expansion_coeff * (T - 20))
```

Where:
- `ρ_t` = density at tank temperature
- `expansion_coeff` = thermal expansion coefficient (varies by density)
- `T` = tank temperature in °C

#### 2. VCF (Volume Correction Factor)
Formula:
```
VCF = 1 / (1 + expansion_coeff * (T - 20))
```

Used to convert observed volume to standard volume at 20°C.

#### 3. WCF (Weight Correction Factor)
Formula:
```
WCF = Density@20 - 0.0011
```

#### 4. Net Observed Volume (m³)
```
Net Observed = Gross Observed - Roof Displacement - Water Volume
```

#### 5. Standard Volume @20 (m³)
```
Standard Volume = Net Observed × VCF
```

#### 6. Standard Volume Received (m³)
```
Received Volume = Final Standard Volume - Initial Standard Volume
```

#### 7. Weight in Air (MT)
```
Weight (MT) = Standard Volume (m³) × WCF
```
*Note: 1 m³ of 1 kg/l = 1 MT (metric ton)*

#### 8. Weight in Air Received (MT)
```
Received Weight = Final Weight - Initial Weight
```

#### 9. Terminal Summary
- Total Observed Volume (m³) = Sum of all net observed volumes
- Total Standard Volume (m³) = Sum of all standard volumes
- Total Weight in Air (MT) = Sum of all weights

## API Endpoints

### Shore Tank Calculation Endpoints

#### Create Shore Tank Calculation
```
POST /api/shore-tank-calculations/
```

**Request Body:**
```json
{
  "vessel_name": "Vessel Name",
  "product_name": "Crude Oil",
  "terminal": "Terminal Name",
  "calculation_date": "2026-05-02",
  "vessel_density_kg_m3": 850,
  "vessel_temperature_c": 25,
  "vessel_observed_volume_m3": 1000,
  "vessel_standard_volume_m3": 980,
  "vessel_weight_air_mt": 830,
  "remarks": "Optional remarks"
}
```

#### Calculate All Tank Items
```
POST /api/shore-tank-calculations/{id}/calculate/
```

**Response:**
```json
{
  "detail": "Calculations completed successfully",
  "results": {
    "items": [...],
    "total_received_observed_volume_m3": 500.123,
    "total_received_standard_volume_m3": 490.456,
    "total_received_weight_air_mt": 415.890,
    "errors": []
  }
}
```

#### Generate Shore Tank Calculation Document
```
GET /api/shore-tank-calculations/{id}/generate_document/
```

**Query Parameters:**
- `template_path` (optional): Path to custom template document

**Response:** Word document file (.docx)

#### List Shore Tank Calculations
```
GET /api/shore-tank-calculations/
```

**Query Parameters:**
- `search`: Search by calculation_number, vessel_name, etc.
- `status`: Filter by status (draft, final)
- `ordering`: Order by field

#### Retrieve Specific Calculation
```
GET /api/shore-tank-calculations/{id}/
```

#### Update Calculation
```
PUT /api/shore-tank-calculations/{id}/
PATCH /api/shore-tank-calculations/{id}/
```

#### Finalize Calculation
```
POST /api/shore-tank-calculations/{id}/finalize/
```

### Product Receipt Certificate Endpoints

#### Generate Product Receipt Certificate Document
```
GET /api/product-receipt-certificates/{id}/generate_document/
```

**Query Parameters:**
- `template_path` (optional): Path to custom template document

**Response:** Word document file (.docx)

## Adding Tank Items

Tank items represent initial and final measurements for each tank:

```
POST /api/shore-tank-calculation-items/
```

**Request Body:**
```json
{
  "calculation": {id},
  "tank": {tank_id},
  "tank_no": "T-001",
  "overall_dip_initial_mm": 5000,
  "overall_dip_final_mm": 5500,
  "water_dip_initial_mm": 100,
  "water_dip_final_mm": 150,
  "product_dip_initial_mm": 4900,
  "product_dip_final_mm": 5350,
  "tank_temperature_initial_c": 25,
  "tank_temperature_final_c": 26,
  "sample_temperature_initial_c": 25,
  "sample_temperature_final_c": 26,
  "density_initial_kg_l": 0.85,
  "density_final_kg_l": 0.851,
  "gross_observed_initial_m3": 1000,
  "gross_observed_final_m3": 1050,
  "roof_displacement_initial_m3": 2,
  "roof_displacement_final_m3": 2,
  "water_volume_initial_m3": 1,
  "water_volume_final_m3": 1.5
}
```

## Using the Calculation Engine Programmatically

### Example: Calculate Single Tank Item

```python
from inspections.calculations import ShoreTankCalculationEngine
from inspections.models import ShoreTankCalculationItem

# Get tank item
tank_item = ShoreTankCalculationItem.objects.get(id=1)

# Create engine and calculate
engine = ShoreTankCalculationEngine()
results = engine.calculate_tank_item(tank_item)

print(f"Net Observed Initial: {results['net_observed_initial_m3']} m³")
print(f"Standard Volume Initial: {results['standard_volume_initial_m3']} m³")
print(f"Weight in Air Final: {results['weight_in_air_final_mt']} MT")
print(f"Received Volume: {results['received_standard_volume_m3']} m³")
```

### Example: Generate Word Document

```python
from inspections.models import ShoreTankCalculation
from inspections.shore_tank_utils import ShoreTankDocumentGenerator

# Get calculation
calc = ShoreTankCalculation.objects.get(id=1)

# Generate document
generator = ShoreTankDocumentGenerator()
doc_bytes = generator.fill_shore_tank_calculation_document(calc)

# Save to file
with open('shore_tank_calc.docx', 'wb') as f:
    f.write(doc_bytes.getvalue())
```

## ASTM D1250 Density Ranges and Expansion Coefficients

| Density Range (kg/l) | Expansion Coefficient |
|----------------------|-----------------------|
| 0.6 - 0.7           | 0.000880             |
| 0.7 - 0.75          | 0.000865             |
| 0.75 - 0.8          | 0.000850             |
| 0.8 - 0.85          | 0.000840             |
| 0.85 - 0.9          | 0.000825             |
| 0.9 - 0.95          | 0.000815             |
| 0.95 - 1.0          | 0.000800             |

## Document Templates

### Custom Template Placeholders

You can use custom Word document templates with the following placeholders (in {{format}}):

For Shore Tank Calculations:
- {{calculation_number}}
- {{vessel_name}}
- {{product_name}}
- {{terminal}}
- {{calculation_date}}
- {{vessel_density}}
- {{vessel_temperature}}
- {{vessel_observed_volume}}
- {{vessel_standard_volume}}
- {{vessel_weight}}

For Product Receipt Certificates:
- {{certificate_number}}
- {{vessel_name}}
- {{terminal}}
- {{receipt_date}}
- {{receipt_time}}
- {{total_volume}}
- {{total_weight}}

## Installation

1. Install python-docx:
```bash
pip install -r requirements.txt
```

2. Run database migrations (if any new models were added):
```bash
python manage.py migrate
```

3. Restart Django server:
```bash
python manage.py runserver
```

## Testing

Run the calculation tests:
```bash
python manage.py test inspections.tests.test_calculations
```

## Common Issues

### VCF not Calculated
- Ensure density_initial_kg_l or density_final_kg_l is provided
- Ensure tank_temperature_initial_c or tank_temperature_final_c is provided
- If missing, default VCF of 1.0 will be used

### Weight Calculation Returns 0
- Check that density @20°C is greater than 0.0011 kg/l
- WCF = density - 0.0011, so very low density products may have issues

### Document Not Generating
- Ensure python-docx is installed: `pip install python-docx`
- Check template file path is correct and readable
- Verify sufficient disk space for temporary files

## Support

For issues or questions, refer to the ASTM D1250 standard documentation or contact system support.
