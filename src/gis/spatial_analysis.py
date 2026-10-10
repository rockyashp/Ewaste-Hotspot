"""
Phase 4: GIS Spatial Infrastructure & Gap Analysis Engine
Evaluates spatial proximity, service buffers, capacity deficits, and calculates
the Infrastructure Gap Index (IGI) across all 24 BMC wards.
"""

import os
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from sklearn.preprocessing import MinMaxScaler

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Computes great-circle distance between coordinates in kilometers.
    """
    R = 6371.0 # Earth's radius in km
    phi1 = np.radians(lat1)
    phi2 = np.radians(lat2)
    delta_phi = np.radians(lat2 - lat1)
    delta_lambda = np.radians(lon2 - lon1)
    
    a = (np.sin(delta_phi / 2.0) ** 2 +
         np.cos(phi1) * np.cos(phi2) * (np.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * np.arctan2(np.sqrt(a), np.sqrt(1.0 - a))
    return R * c

def load_data():
    wards_path = os.path.join(PROCESSED_DIR, "mumbai_hotspots_classified.geojson")
    fac_path = os.path.join(PROCESSED_DIR, "mpcb_authorized_facilities.csv")
    
    gdf_wards = gpd.read_file(wards_path)
    df_fac = pd.read_csv(fac_path)
    
    # Filter facilities accessible to MMR (< 120km from Mumbai center)
    df_fac_mmr = df_fac[df_fac['serves_mmr'] == True].copy()
    return gdf_wards, df_fac_mmr

def compute_spatial_infrastructure_metrics(gdf_wards, df_fac):
    """
    For each ward centroid, computes:
    - Nearest facility name, distance (km), type, capacity (MT/A)
    - Nearest facility in Mumbai specifically vs in adjacent industrial hubs (Thane/Navi Mumbai/Palghar)
    - Facility counts within 5 km, 10 km, 20 km radii
    - Total accessible capacity within 15 km
    """
    metrics = []
    
    fac_lats = df_fac['latitude'].values
    fac_lons = df_fac['longitude'].values
    fac_names = df_fac['facility_name'].values
    fac_types = df_fac['facility_type'].values
    fac_caps = df_fac['capacity_mta'].values
    fac_ros = df_fac['regional_office'].values
    
    for idx, ward in gdf_wards.iterrows():
        w_lat = ward['centroid_lat']
        w_lon = ward['centroid_lon']
        
        # Calculate distances from this ward to all MMR facilities
        distances = haversine_distance(w_lat, w_lon, fac_lats, fac_lons)
        
        # 1. Absolute nearest facility
        min_idx = np.argmin(distances)
        nearest_dist_km = round(distances[min_idx], 2)
        nearest_fac_name = fac_names[min_idx]
        nearest_fac_type = fac_types[min_idx]
        nearest_fac_cap = fac_caps[min_idx]
        nearest_fac_ro = fac_ros[min_idx]
        
        # 2. Counts within radii
        count_5km = int(np.sum(distances <= 5.0))
        count_10km = int(np.sum(distances <= 10.0))
        count_20km = int(np.sum(distances <= 20.0))
        
        # 3. Sum of capacity within 15 km (service area)
        mask_15km = distances <= 15.0
        cap_within_15km = float(np.sum(fac_caps[mask_15km]))
        
        # 4. Nearest formal facility inside Greater Mumbai boundaries (RO == Mumbai)
        mumbai_mask = np.char.lower(fac_ros.astype(str)) == 'mumbai'
        if np.any(mumbai_mask):
            mumbai_dists = distances[mumbai_mask]
            min_mumbai_idx = np.argmin(mumbai_dists)
            nearest_mumbai_dist_km = round(mumbai_dists[min_mumbai_idx], 2)
        else:
            nearest_mumbai_dist_km = nearest_dist_km
            
        metrics.append({
            'name': ward['name'],
            'nearest_facility_name': nearest_fac_name,
            'nearest_facility_distance_km': nearest_dist_km,
            'nearest_facility_type': nearest_fac_type,
            'nearest_facility_capacity_mta': nearest_fac_cap,
            'nearest_facility_ro': nearest_fac_ro,
            'nearest_mumbai_facility_dist_km': nearest_mumbai_dist_km,
            'facilities_within_5km': count_5km,
            'facilities_within_10km': count_10km,
            'facilities_within_20km': count_20km,
            'accessible_capacity_15km_mta': cap_within_15km
        })
        
    df_metrics = pd.DataFrame(metrics)
    return df_metrics

def compute_gap_index(gdf_wards, df_metrics):
    """
    Computes Infrastructure Accessibility Score (IAS) and Infrastructure Gap Index (IGI).
    
    IAS combines:
    - Inverted distance to nearest facility (50% weight)
    - Number of facilities within 10 km (30% weight)
    - Accessible capacity within 15 km (20% weight)
    
    Infrastructure Gap Index (IGI: 0 to 100):
    IGI = CEHI * (1 - IAS)
    Represents the intersection of High E-Waste Burden + Low Infrastructure Access.
    """
    merged = gdf_wards.merge(df_metrics, on='name', how='left')
    scaler = MinMaxScaler()
    
    # 1. Distance penalty: closer is better, so invert normalized distance
    norm_dist = scaler.fit_transform(merged[['nearest_facility_distance_km']]).flatten()
    inv_dist_score = 1.0 - norm_dist # 1.0 = right next door, 0.0 = farthest away
    
    # 2. Count score within 10 km
    norm_count = scaler.fit_transform(merged[['facilities_within_10km']]).flatten()
    
    # 3. Capacity score within 15 km
    norm_cap = scaler.fit_transform(merged[['accessible_capacity_15km_mta']]).flatten()
    
    # Composite Infrastructure Accessibility Score (IAS: 0 to 100)
    raw_ias = (
        0.50 * inv_dist_score +
        0.30 * norm_count +
        0.20 * norm_cap
    )
    merged['infrastructure_access_score_ias'] = (scaler.fit_transform(raw_ias.reshape(-1, 1)).flatten() * 100).round(2)
    
    # Normalized Hotspot Index (0 to 1)
    norm_cehi = merged['hotspot_index_cehi'].values / 100.0
    norm_ias = merged['infrastructure_access_score_ias'].values / 100.0
    
    # Infrastructure Gap Index (IGI) = Hotspot Index * (1 - IAS)
    raw_igi = norm_cehi * (1.0 - norm_ias)
    merged['infrastructure_gap_index_igi'] = (scaler.fit_transform(raw_igi.reshape(-1, 1)).flatten() * 100).round(2)
    
    # Categorize Gap Priority
    def assign_gap_tier(row):
        igi = row['infrastructure_gap_index_igi']
        cat = row['hotspot_category']
        if igi >= 50.0 or (cat == 'HIGH' and row['nearest_facility_distance_km'] > 8.0):
            return 'CRITICAL GAP'
        elif igi >= 25.0:
            return 'MODERATE GAP'
        else:
            return 'WELL SERVED / LOW GAP'
            
    merged['collection_gap_status'] = merged.apply(assign_gap_tier, axis=1)
    
    # Calculate estimated unserved / at-risk e-waste volume (MT/year)
    # Assumes that wards with poor access lose a higher fraction to informal or unmonitored channels
    merged['estimated_unserved_volume_mt'] = (
        merged['ewaste_gen_annual_mt_baseline'] * (1.0 - (merged['infrastructure_access_score_ias'] / 100.0) * 0.70)
    ).round(1)
    
    return merged

def run_spatial_analysis():
    print("="*80)
    print("PHASE 4: EXECUTING GIS SPATIAL INFRASTRUCTURE & GAP ANALYSIS ENGINE")
    print("="*80)
    
    gdf_wards, df_fac = load_data()
    print(f"Loaded {len(gdf_wards)} classified wards and {len(df_fac)} MMR-accessible facilities.")
    
    # 1. Proximity & Buffer Metrics
    df_metrics = compute_spatial_infrastructure_metrics(gdf_wards, df_fac)
    print(f"Proximity Metrics Calculated across all {len(df_metrics)} wards.")
    print(f"Nearest facility distance range: {df_metrics['nearest_facility_distance_km'].min()} km to {df_metrics['nearest_facility_distance_km'].max()} km.")
    
    # 2. Gap Index Computation
    gdf_gap = compute_gap_index(gdf_wards, df_metrics)
    gap_dist = gdf_gap['collection_gap_status'].value_counts().to_dict()
    print(f"Collection Gap Status Distribution: {gap_dist}")
    
    # Save CSV
    out_csv = os.path.join(PROCESSED_DIR, "mumbai_infrastructure_gap.csv")
    gdf_gap.drop(columns='geometry').to_csv(out_csv, index=False)
    print(f"\nSaved Infrastructure Gap CSV to: {out_csv}")
    
    # Save GeoJSON
    out_geojson = os.path.join(PROCESSED_DIR, "mumbai_infrastructure_gap.geojson")
    gdf_gap.to_file(out_geojson, driver='GeoJSON')
    print(f"Saved Infrastructure Gap GeoJSON to: {out_geojson}")
    
    print("\n" + "="*80)
    print("TOP 8 CRITICAL COLLECTION GAP WARDS (RANKED BY IGI):")
    print("="*80)
    display_cols = [
        'name', 'hotspot_category', 'hotspot_index_cehi', 'infrastructure_access_score_ias',
        'infrastructure_gap_index_igi', 'collection_gap_status', 'nearest_facility_distance_km',
        'facilities_within_10km', 'ewaste_gen_annual_mt_baseline'
    ]
    top_gaps = gdf_gap[display_cols].sort_values(by='infrastructure_gap_index_igi', ascending=False).head(8)
    print(top_gaps.to_string(index=False))
    
    print("\nPhase 4 completed successfully.")
    return gdf_gap

if __name__ == "__main__":
    run_spatial_analysis()
