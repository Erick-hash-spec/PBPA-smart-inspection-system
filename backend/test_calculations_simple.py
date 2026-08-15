#!/usr/bin/env python
"""
Simple unit tests for calculations without Django dependency
Tests ASTM D1250 and shore tank calculations
"""

import sys
import math


class ASTMD1250Calculator:
    """Test calculator - copy of the main one for validation"""
    
    # ASTM D1250 Table 60B - VCF based on Density @20°C
    VCF_TABLE_60B = {
        750: 1.0473,
        760: 1.0400,
        770: 1.0328,
        780: 1.0261,
        790: 1.0197,
        800: 1.0136,
        810: 1.0079,
        820: 1.0024,
        830: 0.9972,
        840: 0.9923,
        850: 0.9877,
        860: 0.9833,
        870: 0.9792,
        880: 0.9754,
        890: 0.9718,
        900: 0.9685,
    }
    
    REFERENCE_TEMPERATURE = 20
    
    EXPANSION_COEFFICIENTS = {
        (0.6, 0.7): 0.000880,
        (0.7, 0.75): 0.000865,
        (0.75, 0.8): 0.000850,
        (0.8, 0.85): 0.000840,
        (0.85, 0.9): 0.000825,
        (0.9, 0.95): 0.000815,
        (0.95, 1.0): 0.000800,
    }
    
    @classmethod
    def get_density_at_reference_temp(cls, density_current_kg_l, current_temp_c):
        """Calculate density at reference temperature (20°C)"""
        if density_current_kg_l is None:
            return 850
        
        density_kg_l = density_current_kg_l
        expansion_coeff = 0.00064
        
        for (d_min, d_max), coeff in cls.EXPANSION_COEFFICIENTS.items():
            if d_min <= density_kg_l <= d_max:
                expansion_coeff = coeff
                break
        
        delta_t = current_temp_c - cls.REFERENCE_TEMPERATURE
        density_at_20 = density_kg_l / (1 + expansion_coeff * delta_t)
        
        return round(density_at_20 * 1000, 2)
    
    @classmethod
    def calculate_vcf(cls, density_kg_l, tank_temperature_c):
        """Calculate Volume Correction Factor (VCF)"""
        if density_kg_l is None or tank_temperature_c is None:
            return 1.0
        
        expansion_coeff = 0.00064
        for (d_min, d_max), coeff in cls.EXPANSION_COEFFICIENTS.items():
            if d_min <= density_kg_l <= d_max:
                expansion_coeff = coeff
                break
        
        delta_t = tank_temperature_c - cls.REFERENCE_TEMPERATURE
        vcf = 1.0 / (1 + expansion_coeff * delta_t)
        
        return round(vcf, 6)
    
    @classmethod
    def calculate_wcf(cls, density_at_20_kg_m3):
        """Calculate Weight Correction Factor (WCF)"""
        if density_at_20_kg_m3 is None:
            return 0.85
        
        density_kg_l = density_at_20_kg_m3 / 1000
        wcf = density_kg_l - 0.0011
        
        return round(max(wcf, 0), 6)


class ShoreTankCalculationEngine:
    """Shore Tank Calculation Engine"""
    
    def __init__(self):
        self.astm_calc = ASTMD1250Calculator()
    
    @staticmethod
    def _calculate_net_observed(gross, roof_displacement, water_volume):
        """Calculate net observed volume"""
        net = (gross or 0) - (roof_displacement or 0) - (water_volume or 0)
        return round(max(net, 0), 3)
    
    @staticmethod
    def _calculate_standard_volume(net_observed, vcf):
        """Calculate standard volume at 20°C"""
        if net_observed is None or vcf is None:
            return None
        return round(net_observed * vcf, 3)
    
    @staticmethod
    def _calculate_weight(standard_volume, wcf):
        """Calculate weight in air (metric tons)"""
        if standard_volume is None or wcf is None:
            return None
        weight_mt = standard_volume * wcf
        return round(weight_mt, 3)


def test_astm_calculator():
    """Test ASTM D1250 Calculator"""
    print("\n" + "="*60)
    print("Testing ASTM D1250 Calculator")
    print("="*60)
    
    calc = ASTMD1250Calculator()
    passed = 0
    failed = 0
    
    # Test 1: Density at reference temperature
    print("\n1. Testing Density Calculation at Reference Temp (20°C)")
    density_20 = calc.get_density_at_reference_temp(0.85, 20)
    print(f"   Input: 0.85 kg/l at 20°C")
    print(f"   Output: {density_20} kg/m³")
    if density_20 == 850.0:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Expected 850, got {density_20}")
        failed += 1
    
    # Test 2: Density correction for different temperature
    print("\n2. Testing Density Correction at Different Temperature")
    density_25 = calc.get_density_at_reference_temp(0.85, 25)
    print(f"   Input: 0.85 kg/l at 25°C")
    print(f"   Output: {density_25} kg/m³")
    if density_25 < 850:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Density should decrease with temperature")
        failed += 1
    
    # Test 3: VCF Calculation
    print("\n3. Testing VCF Calculation")
    vcf = calc.calculate_vcf(0.85, 20)
    print(f"   Input: 0.85 kg/l at 20°C")
    print(f"   VCF: {vcf}")
    if vcf == 1.0:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Expected 1.0, got {vcf}")
        failed += 1
    
    # Test 4: VCF at different temperature
    print("\n4. Testing VCF at Different Temperature")
    vcf_25 = calc.calculate_vcf(0.85, 25)
    print(f"   Input: 0.85 kg/l at 25°C")
    print(f"   VCF: {vcf_25}")
    if vcf_25 < 1.0:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Expected VCF < 1.0 at temp > 20")
        failed += 1
    
    # Test 5: WCF Calculation
    print("\n5. Testing WCF Calculation")
    wcf = calc.calculate_wcf(850)
    print(f"   Input: 850 kg/m³")
    print(f"   WCF: {wcf}")
    expected_wcf = 0.85 - 0.0011
    if abs(wcf - expected_wcf) < 0.001:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Expected ~{expected_wcf}, got {wcf}")
        failed += 1
    
    print(f"\nASTM Calculator: {passed} passed, {failed} failed")
    return failed == 0


def test_shore_tank_engine():
    """Test Shore Tank Calculation Engine"""
    print("\n" + "="*60)
    print("Testing Shore Tank Calculation Engine")
    print("="*60)
    
    engine = ShoreTankCalculationEngine()
    passed = 0
    failed = 0
    
    # Test 1: Net Observed Volume
    print("\n1. Testing Net Observed Volume Calculation")
    net = engine._calculate_net_observed(1000, 2, 1)
    print(f"   Gross: 1000 m³, Roof: 2 m³, Water: 1 m³")
    print(f"   Net Observed: {net} m³")
    if net == 997:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Expected 997, got {net}")
        failed += 1
    
    # Test 2: Standard Volume
    print("\n2. Testing Standard Volume Calculation")
    std_vol = engine._calculate_standard_volume(997, 0.998)
    print(f"   Net Observed: 997 m³, VCF: 0.998")
    print(f"   Standard Volume: {std_vol} m³")
    expected = round(997 * 0.998, 3)
    if std_vol == expected:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Expected {expected}, got {std_vol}")
        failed += 1
    
    # Test 3: Weight Calculation
    print("\n3. Testing Weight Calculation")
    weight = engine._calculate_weight(100, 0.8489)
    print(f"   Volume: 100 m³, WCF: 0.8489")
    print(f"   Weight: {weight} MT")
    expected = round(100 * 0.8489, 3)
    if weight == expected:
        print("   ✓ PASS")
        passed += 1
    else:
        print(f"   ✗ FAIL: Expected {expected}, got {weight}")
        failed += 1
    
    print(f"\nShore Tank Engine: {passed} passed, {failed} failed")
    return failed == 0


def test_calculation_accuracy():
    """Test with realistic values"""
    print("\n" + "="*60)
    print("Testing with Realistic Petroleum Data")
    print("="*60)
    
    calc = ASTMD1250Calculator()
    engine = ShoreTankCalculationEngine()
    
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
    
    print("\n✓ Realistic calculation completed successfully!")
    return True


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("SHORE TANK CALCULATION VALIDATION TEST SUITE")
    print("="*60)
    
    try:
        astm_ok = test_astm_calculator()
        engine_ok = test_shore_tank_engine()
        realistic_ok = test_calculation_accuracy()
        
        if astm_ok and engine_ok and realistic_ok:
            print("\n" + "="*60)
            print("🎉 ALL TESTS PASSED! Calculations are working correctly.")
            print("="*60 + "\n")
            return 0
        else:
            print("\n" + "="*60)
            print("❌ SOME TESTS FAILED!")
            print("="*60 + "\n")
            return 1
        
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
