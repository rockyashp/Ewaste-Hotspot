"""
Unit & Integration Test Suite for E-Waste Hotspot & Collection Planner
Validates data integrity, estimation bounds, hotspot classification, spatial metrics, and recommendation logic.
"""

import os
import unittest
import numpy as np
import pandas as pd
import geopandas as gpd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

class TestEWastePipeline(unittest.TestCase):
    
    @classmethod
    def setUpClass(cls):
        cls.geojson_path = os.path.join(PROCESSED_DIR, "mumbai_final_planning_matrix.geojson")
        cls.csv_path = os.path.join(PROCESSED_DIR, "mumbai_final_planning_matrix.csv")
        cls.fac_path = os.path.join(PROCESSED_DIR, "mpcb_authorized_facilities.csv")
        
        cls.gdf = gpd.read_file(cls.geojson_path)
        cls.df = pd.read_csv(cls.csv_path)
        cls.df_fac = pd.read_csv(cls.fac_path)
        
    def test_ward_count_and_completeness(self):
        """Validates that exactly all 24 BMC Administrative Wards exist with zero missing values."""
        self.assertEqual(len(self.gdf), 24, "Must contain exactly 24 BMC Wards")
        self.assertEqual(len(self.df), 24, "CSV must contain exactly 24 BMC Wards")
        
        # Check critical columns have no NaNs
        critical_cols = [
            'name', 'pop_2024_projected', 'area_sqkm', 'ewaste_gen_annual_mt_baseline',
            'hotspot_index_cehi', 'hotspot_category', 'nearest_facility_distance_km',
            'infrastructure_gap_index_igi', 'recommended_strategy'
        ]
        for col in critical_cols:
            self.assertFalse(self.df[col].isna().any(), f"Column {col} has missing values")
            
    def test_geographic_area_integrity(self):
        """Validates that total calculated land area matches Greater Mumbai geographical area (~458 km²)."""
        total_area = self.gdf['area_sqkm'].sum()
        self.assertAlmostEqual(total_area, 458.28, delta=2.0, 
                               msg=f"Total area {total_area} km² deviates from official BMC 458.3 km²")
        
    def test_population_projection_bounds(self):
        """Validates that projected 2024 population is realistic (13.0M to 14.5M)."""
        total_pop = self.df['pop_2024_projected'].sum()
        self.assertGreater(total_pop, 13000000, "Projected population too low")
        self.assertLess(total_pop, 14500000, "Projected population too high")
        
    def test_ewaste_estimation_calibration(self):
        """Validates that total estimated e-waste aligns with calibrated city benchmark (105k to 110k MT)."""
        total_ewaste = self.df['ewaste_gen_annual_mt_baseline'].sum()
        self.assertAlmostEqual(total_ewaste, 107500.0, delta=100.0, 
                               msg=f"Citywide annual e-waste {total_ewaste} deviates from calibrated target")
        
        # Check per capita range is defensible (between 4.0 and 15.0 kg/capita/year)
        self.assertTrue((self.df['ewaste_per_capita_kg_year'] >= 4.0).all())
        self.assertTrue((self.df['ewaste_per_capita_kg_year'] <= 15.0).all())
        
    def test_hotspot_scoring_range(self):
        """Validates that CEHI score ranges strictly from 0 to 100."""
        self.assertAlmostEqual(self.df['hotspot_index_cehi'].max(), 100.0, delta=0.5)
        self.assertGreaterEqual(self.df['hotspot_index_cehi'].min(), 0.0)
        
        # Validate that tiers contain expected categories
        tiers = set(self.df['hotspot_category'].unique())
        self.assertTrue({'HIGH', 'MEDIUM', 'LOW'}.issubset(tiers))
        
    def test_spatial_proximity_metrics(self):
        """Validates that nearest facility distance is positive and realistic within MMR."""
        self.assertTrue((self.df['nearest_facility_distance_km'] >= 0.0).all())
        self.assertTrue((self.df['nearest_facility_distance_km'] <= 25.0).all(), 
                        "Nearest facility distance shouldn't exceed 25 km within Mumbai")
        
    def test_facilities_dataset(self):
        """Validates that MPCB facilities dataset contains over 200 parsed facilities with valid capacities."""
        self.assertGreaterEqual(len(self.df_fac), 200, "Should have parsed >= 200 facilities from PDF")
        self.assertTrue((self.df_fac['capacity_mta'] >= 0).all(), "Capacities cannot be negative")
        self.assertGreater(self.df_fac['serves_mmr'].sum(), 100, "At least 100 facilities should serve MMR")
        
    def test_recommendation_and_fleet_logic(self):
        """Validates that every ward has an actionable recommendation and positive weekly fleet trips."""
        self.assertTrue((self.df['weekly_collection_trips_needed'] >= 1).all())
        for strat in self.df['recommended_strategy']:
            self.assertGreater(len(strat), 5, "Recommendation strategy text must not be empty")
        for rationale in self.df['recommendation_rationale']:
            self.assertGreater(len(rationale), 20, "Policy rationale must be comprehensive and non-empty")

if __name__ == "__main__":
    unittest.main()
