"""
Phase 5: Municipal Collection Strategy & Recommendation Engine
Translates analytical findings (Hotspots, Gap Index, Proximity, Density) into
actionable, peer-defensible municipal collection strategies and logistics plans.
"""

import os
import math
import numpy as np
import pandas as pd
import geopandas as gpd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

def load_data():
    gap_path = os.path.join(PROCESSED_DIR, "mumbai_infrastructure_gap.geojson")
    gdf = gpd.read_file(gap_path)
    return gdf

def evaluate_collection_recommendations(gdf):
    """
    Applies Multi-Criteria Decision Analysis (MCDA) to assign:
    1. Primary Recommended Collection Intervention
    2. Operational Collection Frequency
    3. Logistics Fleet Requirements (Estimated 2.5T vehicle trips/week)
    4. Auditable Policy Rationale ("Why was this recommended?")
    """
    strategies = []
    frequencies = []
    weekly_trips = []
    priority_tiers = []
    rationales = []
    
    for idx, row in gdf.iterrows():
        cat = row['hotspot_category']
        cehi = row['hotspot_index_cehi']
        gap_status = row['collection_gap_status']
        igi = row['infrastructure_gap_index_igi']
        dist_km = row['nearest_facility_distance_km']
        fac_10km = row['facilities_within_10km']
        pois = row['commercial_electronics_poi_count']
        annual_mt = row['ewaste_gen_annual_mt_baseline']
        daily_mt = row['ewaste_gen_daily_mt']
        pop_dens = row['pop_density_per_sqkm']
        nearest_fac = row['nearest_facility_name']
        
        # Calculate weekly generation and estimated collection trips (2.5 MT capacity vans)
        weekly_mt = (daily_mt * 7.0)
        trips_needed = max(1, math.ceil(weekly_mt / 2.5))
        
        # Decision Logic: Multi-Criteria Rule Engine
        if cat == 'HIGH' and dist_km > 8.0:
            strategy = "Establish Permanent Authorized E-Waste Depot"
            freq = "Daily Drop-Off Depot + Bi-Weekly Bulk Evacuation"
            priority = "PRIORITY 1 - URGENT CIVIC INFRASTRUCTURE"
            rationale = (
                f"High-volume e-waste generation ({annual_mt:,.0f} MT/yr) combined with critical distance "
                f"from existing licensed recyclers ({dist_km:.1f} km, 0 facilities within 10 km). "
                f"Requires a permanent authorized drop-off center at the ward municipal office/transit hub "
                f"to prevent toxic disposal into unmonitored scrap channels."
            )
        elif cat == 'HIGH' and (pois >= 40 or fac_10km >= 15):
            strategy = "Commercial IT & EPR Retailer Take-Back Integration"
            freq = "Semi-Weekly Commercial Sweep + Continuous Retailer Drop-Off"
            priority = "PRIORITY 1 - BULK PRODUCER PARTNERSHIP"
            rationale = (
                f"Extreme e-waste generation ({annual_mt:,.0f} MT/yr) concentrated in major commercial IT/retail clusters "
                f"({pois} electronics POIs). With {fac_10km} facilities within 10 km, establish mandatory Extended "
                f"Producer Responsibility (EPR) drop-off kiosks in retail malls and schedule direct commercial pick-ups."
            )
        elif (cat in ['HIGH', 'MEDIUM'] and pop_dens > 35000) or (gap_status == 'CRITICAL GAP'):
            strategy = "Scheduled Mobile Collection Van Drives"
            freq = "Twice Weekly Dedicated Mobile Van Routing"
            priority = "PRIORITY 2 - HIGH DENSITY CORRIDOR"
            rationale = (
                f"Significant e-waste generation ({annual_mt:,.0f} MT/yr) in a hyper-dense urban setting "
                f"({pop_dens:,.0f} people/km²) where land for permanent recycling depots is scarce. "
                f"Deploy scheduled municipal mobile collection vans stopping at designated residential housing societies."
            )
        elif gap_status == 'MODERATE GAP':
            strategy = "Monthly Community Drop-Off Drives & Ward Office Bins"
            freq = "Monthly Weekend Collection Drives"
            priority = "PRIORITY 3 - COMMUNITY AWARENESS DRIVE"
            rationale = (
                f"Moderate e-waste volume ({annual_mt:,.0f} MT/yr) located {dist_km:.1f} km from authorized facilities. "
                f"Deploy secure e-waste collection bins at ward municipal citizen service centers and organize monthly "
                f"weekend community collection campaigns."
            )
        else: # Well served / low gap
            strategy = "Direct Channeling to Existing Authorized Recyclers"
            freq = "On-Demand / Weekly Industrial Routing"
            priority = "PRIORITY 4 - LOGISTICAL CHANNELING"
            rationale = (
                f"Well-served area with authorized facility ({nearest_fac}) just {dist_km:.1f} km away "
                f"and {fac_10km} facilities within 10 km. Establish public awareness signage directing citizens and scrap "
                f"aggregators directly to nearby authorized MPCB facilities."
            )
            
        strategies.append(strategy)
        frequencies.append(freq)
        weekly_trips.append(trips_needed)
        priority_tiers.append(priority)
        rationales.append(rationale)
        
    gdf['recommended_strategy'] = strategies
    gdf['recommended_frequency'] = frequencies
    gdf['weekly_collection_trips_needed'] = weekly_trips
    gdf['municipal_priority_tier'] = priority_tiers
    gdf['recommendation_rationale'] = rationales
    
    return gdf

def run_recommendation_pipeline():
    print("="*80)
    print("PHASE 5: EXECUTING MUNICIPAL COLLECTION RECOMMENDATION ENGINE")
    print("="*80)
    
    gdf = load_data()
    print(f"Loaded {len(gdf)} gap-assessed wards.")
    
    gdf_rec = evaluate_collection_recommendations(gdf)
    
    # Strategy Distribution
    print("\nRecommended Collection Strategies Distribution:")
    for strat, cnt in gdf_rec['recommended_strategy'].value_counts().items():
        print(f"  • {strat}: {cnt} wards")
        
    print("\nMunicipal Priority Tiers Distribution:")
    for tier, cnt in gdf_rec['municipal_priority_tier'].value_counts().items():
        print(f"  • {tier}: {cnt} wards")
        
    total_trips = gdf_rec['weekly_collection_trips_needed'].sum()
    print(f"\nTotal Municipal Van Trips Required Citywide: {total_trips} trips/week (~{total_trips*2.5:,.1f} MT/week capacity)")
    
    # Save CSV
    out_csv = os.path.join(PROCESSED_DIR, "mumbai_final_planning_matrix.csv")
    gdf_rec.drop(columns='geometry').to_csv(out_csv, index=False)
    print(f"\nSaved Final Planning CSV to: {out_csv}")
    
    # Save GeoJSON
    out_geojson = os.path.join(PROCESSED_DIR, "mumbai_final_planning_matrix.geojson")
    gdf_rec.to_file(out_geojson, driver='GeoJSON')
    print(f"Saved Final Planning GeoJSON to: {out_geojson}")
    
    print("\n" + "="*80)
    print("TOP 6 PRIORITIZED WARDS & ACTIONABLE RECOMMENDATIONS:")
    print("="*80)
    display_cols = [
        'name', 'hotspot_category', 'collection_gap_status', 'municipal_priority_tier',
        'recommended_strategy', 'recommended_frequency', 'weekly_collection_trips_needed'
    ]
    top_plans = gdf_rec[display_cols].sort_values(by='weekly_collection_trips_needed', ascending=False).head(6)
    print(top_plans.to_string(index=False))
    
    print("\n" + "="*80)
    print("SAMPLE DETAILED RECOMMENDATION NARRATIVE (WARD D):")
    print("="*80)
    ward_d = gdf_rec[gdf_rec['name'] == 'D'].iloc[0]
    print(f"Ward D ({ward_d['ward_full_name']}):")
    print(f"• Priority: {ward_d['municipal_priority_tier']}")
    print(f"• Strategy: {ward_d['recommended_strategy']}")
    print(f"• Frequency: {ward_d['recommended_frequency']}")
    print(f"• Rationale: {ward_d['recommendation_rationale']}")
    
    print("\nPhase 5 completed successfully.")
    return gdf_rec

if __name__ == "__main__":
    run_recommendation_pipeline()
