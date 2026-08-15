#!/usr/bin/env python
"""
Test script to validate shore tank calculation engine
Run this after installation to verify everything works correctly

Usage: python manage.py shell < test_shore_tank_calculations.py
"""

from inspections.calculations import ASTMD1250Calculator, ShoreTankCalculationEngine
from inspections.shore_tank_utils import ShoreTankDocumentGenerator
from inspections.models import ShoreTankCalculation, ShoreTankCalculationItem, Tank


def test_astm_calculator():
    """Test ASTM D1250 Calculator"""
    print("\n" + "="*60)
    print("Testing ASTM D1250 Calculator")
    print("="*60)
    
    calc = ASTMD1250Calculator()
    
    # Test 1: Density at reference temperature
    print("\n1. Testing Density Calculation at Reference Temp (20°C)")
    density_20 = calc.get_density_at_reference_temp(0.85, 20)
    print(f"   Input: 0.85 kg/l at 20°C")
    print(f"   Output: {density_20} kg/m³")
    assert density_20 == 850.0, "Density at 20°C should be 850"
    print("   ✓ PASS")
    
    # Test 2: Density correction for different temperature
    print("\n2. Testing Density Correction at Different Temperature")
    density_25 = calc.get_density_at_reference_temp(0.85, 25)
    print(f"   Input: 0.85 kg/l at 25°C")
    print(f"   Output: {density_25} kg/m³")
    assert density_25 < 850, "Density should decrease with temperature"
    print("   ✓ PASS")
    
    # Test 3: VCF Calculation
    print("\n3. Testing VCF Calculation")
    vcf = calc.calculate_vcf(0.85, 20)
    print(f"   Input: 0.85 kg/l at 20°C")
    print(f"   VCF: {vcf}")
    assert vcf == 1.0, "VCF at reference temperature should be 1.0"
    print("   ✓ PASS")
    
    # Test 4: VCF at different temperature
    print("\n4. Testing VCF at Different Temperature")
    vcf_25 = calc.calculate_vcf(0.85, 25)
    print(f"   Input: 0.85 kg/l at 25°C")
    print(f"   VCF: {vcf_25}")
    assert vcf_25 < 1.0, "VCF should be less than 1.0 at temperature > 20"
    print("   ✓ PASS")
    
    # Test 5: WCF Calculation
    print("\n5. Testing WCF Calculation")
    wcf = calc.calculate_wcf(850)
    print(f"   Input: 850 kg/m³")
    print(f"   WCF: {wcf}")
    expected_wcf = 0.85 - 0.0011
    assert abs(wcf - expected_wcf) < 0.001, f"WCF should be ~{expected_wcf}"
    print("   ✓ PASS")
    
    print("\n✅ All ASTM Calculator tests passed!")


def test_shore_tank_engine():
    """Test Shore Tank Calculation Engine"""
    print("\n" + "="*60)
    print("Testing Shore Tank Calculation Engine")
    print("="*60)
    
    engine = ShoreTankCalculationEngine()
    
    # Test calculations
    print("\n1. Testing Net Observed Volume Calculation")
    net = engine._calculate_net_observed(1000, 2, 1)
    print(f"   Gross: 1000 m³, Roof: 2 m³, Water: 1 m³")
    print(f"   Net Observed: {net} m³")
    assert net == 997, "Net volume should be 997"
    print("   ✓ PASS")
    
    print("\n2. Testing Standard Volume Calculation")
    std_vol = engine._calculate_standard_volume(997, 0.998)
    print(f"   Net Observed: 997 m³, VCF: 0.998")
    print(f"   Standard Volume: {std_vol} m³")
    assert std_vol == round(997 * 0.998, 3), "Standard volume calculation incorrect"
    print("   ✓ PASS")
    
    print("\n3. Testing Weight Calculation")
    weight = engine._calculate_weight(100, 0.8489)
    print(f"   Volume: 100 m³, WCF: 0.8489")
    print(f"   Weight: {weight} MT")
    assert weight == round(100 * 0.8489, 3), "Weight calculation incorrect"
    print("   ✓ PASS")
    
    print("\n✅ All Shore Tank Engine tests passed!")


def test_document_generator():
    """Test Document Generator"""
    print("\n" + "="*60)
    print("Testing Document Generator")
    print("="*60)
    
    generator = ShoreTankDocumentGenerator()
    
    print("\n1. Testing Template Creation")
    doc = generator._create_shore_tank_template()
    print(f"   Created shore tank template")
    print(f"   Number of tables: {len(doc.tables)}")
    assert len(doc.tables) >= 3, "Template should have at least 3 tables"
    print("   ✓ PASS")
    
    print("\n2. Testing Product Receipt Template Creation")
    doc = generator._create_product_receipt_template()
    print(f"   Created product receipt template")
    print(f"   Number of tables: {len(doc.tables)}")
    assert len(doc.tables) >= 2, "Template should have at least 2 tables"
    print("   ✓ PASS")
    
    print("\n✅ All Document Generator tests passed!")


def test_calculation_accuracy():
    """Test with realistic values"""
    print("\n" + "="*60)
    print("Testing with Realistic Petroleum Data")
    print("="*60)
    
    calc = ASTMD1250Calculator()
    
    # Crude Oil example
    print("\n1. Crude Oil Calculation Example")
    print("   Initial: Density 0.85 kg/l at 25°C, Volume 1000 m³")
    print("   Final: Density 0.851 kg/l at 26°C, Volume 1050 m³")
    
    # Calculate density at reference
    dens_init_20 = calc.get_density_at_reference_temp(0.85, 25)
    dens_final_20 = calc.get_density_at_reference_temp(0.851, 26)
    
    print(f"   Density @ 20°C Initial: {dens_init_20} kg/m³")
    print(f"   Density @ 20°C Final: {dens_final_20} kg/m³")
    
    # Calculate VCF
    vcf_init = calc.calculate_vcf(0.85, 25)
    vcf_final = calc.calculate_vcf(0.851, 26)
    
    print(f"   VCF Initial: {vcf_init}")
    print(f"   VCF Final: {vcf_final}")
    
    # Calculate WCF
    wcf_init = calc.calculate_wcf(dens_init_20)
    wcf_final = calc.calculate_wcf(dens_final_20)
    
    print(f"   WCF Initial: {wcf_init}")
    print(f"   WCF Final: {wcf_final}")
    
    # Calculate volumes and weights
    engine = ShoreTankCalculationEngine()
    
    net_init = engine._calculate_net_observed(1000, 2, 1)
    net_final = engine._calculate_net_observed(1050, 2, 1.5)
    
    std_init = engine._calculate_standard_volume(net_init, vcf_init)
    std_final = engine._calculate_standard_volume(net_final, vcf_final)
    
    wt_init = engine._calculate_weight(std_init, wcf_init)
    wt_final = engine._calculate_weight(std_final, wcf_final)
    
    print(f"\n   Net Observed Initial: {net_init} m³")
    print(f"   Net Observed Final: {net_final} m³")
    print(f"   Standard Volume Initial: {std_init} m³")
    print(f"   Standard Volume Final: {std_final} m³")
    print(f"   Weight Initial: {wt_init} MT")
    print(f"   Weight Final: {wt_final} MT")
    print(f"   Received Volume: {round(std_final - std_init, 3)} m³")
    print(f"   Received Weight: {round(wt_final - wt_init, 3)} MT")
    
    print("\n✅ Realistic calculation completed successfully!")


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("SHORE TANK CALCULATION VALIDATION TEST SUITE")
    print("="*60)
    
    try:
        test_astm_calculator()
        test_shore_tank_engine()
        test_document_generator()
        test_calculation_accuracy()
        
        print("\n" + "="*60)
        print("🎉 ALL TESTS PASSED! System is ready to use.")
        print("="*60 + "\n")
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    sys.exit(main())
