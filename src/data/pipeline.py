"""
Phase 1 Data Extraction and Integration Pipeline
E-Waste Hotspot & Collection Planner
"""

import os
import re
import json
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pypdf import PdfReader

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RAW_DIR = os.path.join(BASE_DIR, "ewaste-datasets")
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

os.makedirs(PROCESSED_DIR, exist_ok=True)

# 24 BMC Ward Full Names Mapping for Clarity in Viva/Explanations
BMC_WARD_NAMES = {
    'A': 'Colaba / Fort / Churchgate (South Mumbai)',
    'B': 'Sandhurst Road / Dongri (South Central)',
    'C': 'Marine Lines / Bhuleshwar (South Central)',
    'D': 'Grant Road / Malabar Hill / Walkeshwar',
    'E': 'Byculla / Mazgaon / Mumbai Central',
    'F/S': 'Parel / Sewri / Naigaon (Central East)',
    'F/N': 'Matunga / Sion / Wadala (Central North)',
    'G/S': 'Worli / Lower Parel / Prabhadevi',
    'G/N': 'Dadar / Dharavi / Mahim',
    'H/E': 'Bandra East / Khar East / Santacruz East',
    'H/W': 'Bandra West / Khar West / Santacruz West',
    'K/E': 'Andheri East / Vile Parle East / Jogeshwari East',
    'K/W': 'Andheri West / Vile Parle West / Versova',
    'L': 'Kurla / Sakinaka / Chunabhatti',
    'M/E': 'Govandi / Mankhurd / Shivaji Nagar',
    'M/W': 'Chembur / Tilak Nagar',
    'N': 'Ghatkopar / Vikhroli West',
    'P/S': 'Goregaon / Oshiwara East',
    'P/N': 'Malad / Marve / Manori',
    'R/S': 'Kandivali / Charkop',
    'R/C': 'Borivali / Gorai / IC Colony',
    'R/N': 'Dahisar / Mandapeshwar',
    'S': 'Bhandup / Powai / Kanjurmarg',
    'T': 'Mulund / Nahur'
}

def process_census_and_boundaries():
    print(">>> [1/4] Processing BMC Wards GeoJSON and Demographics...")
    # Load boundaries
    geojson_path = os.path.join(RAW_DIR, "BMC_Wards.geojson")
    gdf = gpd.read_file(geojson_path)
    
    # Reproject to UTM 43N to calculate metric area in sq km
    gdf_utm = gdf.to_crs(epsg=32643)
    gdf['area_sqkm'] = (gdf_utm.geometry.area / 1e6).round(4)
    gdf['perimeter_km'] = (gdf_utm.geometry.length / 1e3).round(4)
    
    # Centroids in WGS84 for distance calculations and map pins
    gdf['centroid_lat'] = gdf.geometry.centroid.y.round(6)
    gdf['centroid_lon'] = gdf.geometry.centroid.x.round(6)
    
    # Load 95e22 mapping and population
    df_map = pd.read_csv(os.path.join(RAW_DIR, "95e22d97-7f59-4214-b244-2abbf52e6027.csv"))
    
    # Aggregate population to the 24 BMC Wards
    pop_agg = df_map.groupby('Ward Name').agg(
        total_population=('Total Population', 'sum'),
        male_population=('Total Males', 'sum'),
        female_population=('Total Females', 'sum'),
        sc_population=('SC Population', 'sum'),
        st_population=('ST Population', 'sum'),
        census_subwards_count=('Ward Code', 'count')
    ).reset_index()
    pop_agg.rename(columns={'Ward Name': 'name'}, inplace=True)
    
    # Merge with boundaries
    gdf_merged = gdf.merge(pop_agg, on='name', how='left')
    gdf_merged['pop_density_per_sqkm'] = (gdf_merged['total_population'] / gdf_merged['area_sqkm']).round(2)
    gdf_merged['ward_full_name'] = gdf_merged['name'].map(BMC_WARD_NAMES)
    
    return gdf_merged, df_map

def process_asset_data(df_map):
    print(">>> [2/4] Processing Census HH-14 Electronics & Assets...")
    # City (519)
    xl_city_path = os.path.join(RAW_DIR, "882eff2a-804a-4ba8-a7af-3553b208983b.xlsx")
    xl_city = pd.read_excel(xl_city_path, header=None)
    df_c = xl_city.iloc[6:, [7, 8, 9, 10, 127, 128, 129, 130, 131, 132, 137, 138]].copy()
    df_c.columns = ['Ward_No', 'Area_Name', 'TRU', 'Total_HH_pct', 'pct_radio', 'pct_tv', 
                    'pct_pc_internet', 'pct_pc_no_internet', 'pct_landline_only', 
                    'pct_mobile_only', 'pct_high_asset', 'pct_no_asset']
    df_c['Ward_Code'] = pd.to_numeric(df_c['Ward_No'], errors='coerce')
    df_c = df_c.dropna(subset=['Ward_Code'])
    df_c['Ward_Code'] = df_c['Ward_Code'].astype(int)
    df_c = df_c[df_c['Ward_Code'] > 0]
    
    # Suburban (518)
    xl_sub_path = os.path.join(RAW_DIR, "c5f1b779-e62f-4ec6-b7b1-aadc4feb9882.xlsx")
    xl_sub = pd.read_excel(xl_sub_path, header=None)
    df_s = xl_sub.iloc[6:, [7, 8, 9, 10, 127, 128, 129, 130, 131, 132, 137, 138]].copy()
    df_s.columns = ['Ward_No', 'Area_Name', 'TRU', 'Total_HH_pct', 'pct_radio', 'pct_tv', 
                    'pct_pc_internet', 'pct_pc_no_internet', 'pct_landline_only', 
                    'pct_mobile_only', 'pct_high_asset', 'pct_no_asset']
    df_s['Ward_Code'] = pd.to_numeric(df_s['Ward_No'], errors='coerce')
    df_s = df_s.dropna(subset=['Ward_Code'])
    df_s['Ward_Code'] = df_s['Ward_Code'].astype(int)
    df_s = df_s[df_s['Ward_Code'] > 0]
    
    df_assets = pd.concat([df_c, df_s], ignore_index=True)
    
    # Merge asset proportions with census 97 subwards
    merged_subwards = df_map.merge(df_assets, left_on='Ward Code', right_on='Ward_Code', how='left')
    
    # Impute Ward 1045 (which is part of H/E) using H/E other subwards mean
    asset_cols = ['pct_radio', 'pct_tv', 'pct_pc_internet', 'pct_pc_no_internet', 
                  'pct_landline_only', 'pct_mobile_only', 'pct_high_asset', 'pct_no_asset']
    for c in asset_cols:
        merged_subwards[c] = pd.to_numeric(merged_subwards[c], errors='coerce')
        
    he_means = merged_subwards[merged_subwards['Ward Name'] == 'H/E'][asset_cols].mean()
    for c in asset_cols:
        merged_subwards.loc[merged_subwards['Ward Code'] == 1045, c] = he_means[c]
        
    # Aggregate to 24 BMC Wards using Population-Weighted Average
    def pop_weighted_avg(group):
        weights = group['Total Population']
        res = {}
        for c in asset_cols:
            res[c] = np.average(group[c], weights=weights)
        return pd.Series(res)

    ward_assets = merged_subwards.groupby('Ward Name').apply(pop_weighted_avg, include_groups=False).reset_index()
    ward_assets.rename(columns={'Ward Name': 'name'}, inplace=True)
    
    # Calculate composite computer penetration
    ward_assets['pct_total_pc'] = (ward_assets['pct_pc_internet'] + ward_assets['pct_pc_no_internet']).round(2)
    ward_assets['pct_total_phone'] = (ward_assets['pct_landline_only'] + ward_assets['pct_mobile_only']).round(2)
    
    # Round all percentage columns
    for c in asset_cols:
        ward_assets[c] = ward_assets[c].round(2)
        
    return ward_assets

def extract_mpcb_facilities():
    print(">>> [3/4] Extracting & Geocoding MPCB Recyclers & Refurbishers...")
    pdf_path = os.path.join(RAW_DIR, "Authorised_E-Waste_Recyclers_&_Refurbishers-March-2024.pdf")
    reader = PdfReader(pdf_path)
    
    full_text = ""
    for page in reader.pages:
        full_text += "\n" + page.extract_text()
        
    # Parse items
    items = re.findall(r'\n(\d+)\s*\n([A-Z0-9].*?)(?=\n\d+\s*\n|\Z)', full_text, re.DOTALL)
    facilities = []
    
    # Pre-compiled MMR reference anchor coordinates for industrial estates / clusters
    # where MPCB recyclers reside (Vasai, Wada, Taloja, Rabale, Mahape, Turbhe, Bhiwandi, Dombivli, Kurla, Andheri)
    LOCATION_COORDS = {
        'vasai': (19.3850, 72.8290),
        'wada': (19.6540, 73.1360),
        'palghar': (19.6967, 72.7699),
        'taloja': (19.0620, 73.1250),
        'panvel': (18.9894, 73.1175),
        'rasayani': (18.8980, 73.1810),
        'rabale': (19.1350, 73.0030),
        'mahape': (19.1120, 73.0210),
        'turbhe': (19.0680, 73.0230),
        'bhiwandi': (19.2967, 73.0631),
        'kalyan': (19.2403, 73.1305),
        'dombivli': (19.2183, 73.0867),
        'thane': (19.2183, 72.9781),
        'kurla': (19.0657, 72.8794),
        'andheri': (19.1136, 72.8697),
        'kanjurmarg': (19.1300, 72.9300),
        'vikhroli': (19.1110, 72.9280),
        'goregaon': (19.1663, 72.8526),
        'navi mumbai': (19.0330, 73.0297),
        'pune': (18.5204, 73.8567),
        'chakan': (18.7597, 73.8570),
        'bhosari': (18.6298, 73.8440),
        'pimpri': (18.6279, 73.8009),
        'ranjangaon': (18.8240, 74.2410),
        'dindori': (20.2010, 73.8320),
        'nashik': (19.9975, 73.7898),
        'aurangabad': (19.8762, 75.3433),
        'nagpur': (21.1458, 79.0882),
        'solapur': (17.6599, 75.9064),
        'kolhapur': (16.7050, 74.2433)
    }

    for sr, block in items:
        lines = [l.strip() for l in block.split('\n') if l.strip()]
        if not lines:
            continue
        text_joined = " ".join(lines)
        
        # Name: line 0 + line 1 if no comma
        name = lines[0]
        if len(lines) > 1 and not lines[0].endswith(','):
            name += " " + lines[1]
        name = name.split(',')[0].strip()
        
        # Extract Regional Office & Facility Type
        ro_match = re.search(r'(Mumbai|Thane|Navi Mumbai|Kalyan|Raigad|Pune|Nashik|Nagpur|Aurangabad|Kolhapur|Amravati)\s+(Recycler|Refurbisher|Dismantler)', text_joined, re.I)
        regional_office = ro_match.group(1) if ro_match else 'Other'
        fac_type = ro_match.group(2) if ro_match else 'Recycler'
        
        # Extract Capacity in MT/A
        cap_match = re.search(r'(Recycler|Refurbisher|Dismantler)\s+(\d+(?:\.\d+)?)', text_joined, re.I)
        capacity_mta = float(cap_match.group(2)) if cap_match else 0.0
        
        # Extract Email & Phone
        email_match = re.search(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text_joined)
        email = email_match.group(0) if email_match else 'N/A'
        
        phone_match = re.search(r'\b(?:91)?[6789]\d{9}\b', text_joined)
        phone = phone_match.group(0) if phone_match else 'N/A'
        
        # Geocode approximate coordinates based on address keywords
        txt_low = text_joined.lower()
        lat, lon = None, None
        matched_loc = "General Maharashtra"
        for loc, coords in LOCATION_COORDS.items():
            if re.search(r'\b' + loc + r'\b', txt_low):
                lat, lon = coords
                # Add small jitter so multiple facilities in same industrial estate do not overlap exactly
                jitter_lat = np.random.uniform(-0.008, 0.008)
                jitter_lon = np.random.uniform(-0.008, 0.008)
                lat += jitter_lat
                lon += jitter_lon
                matched_loc = loc.title()
                break
                
        if lat is None:
            # Fallback based on regional office
            if regional_office.lower() in LOCATION_COORDS:
                lat, lon = LOCATION_COORDS[regional_office.lower()]
                matched_loc = regional_office
            else:
                lat, lon = (19.0760, 72.8777)
                matched_loc = "Mumbai Region"
                
        # Is facility serving MMR? (within ~100km radius of Mumbai)
        dist_approx_km = np.sqrt(((lat - 19.0760)*111)**2 + ((lon - 72.8777)*105)**2)
        is_mmr_accessible = bool(dist_approx_km <= 120)
        
        facilities.append({
            'sr_no': int(sr),
            'facility_name': name,
            'regional_office': regional_office,
            'facility_type': fac_type,
            'capacity_mta': capacity_mta,
            'contact_email': email,
            'contact_phone': phone,
            'matched_cluster': matched_loc,
            'latitude': round(lat, 5),
            'longitude': round(lon, 5),
            'approx_dist_to_mumbai_center_km': round(dist_approx_km, 1),
            'serves_mmr': is_mmr_accessible,
            'full_address': text_joined[:180] + "..."
        })
        
    df_fac = pd.DataFrame(facilities)
    csv_out = os.path.join(PROCESSED_DIR, "mpcb_authorized_facilities.csv")
    df_fac.to_csv(csv_out, index=False)
    print(f"  Extracted {len(df_fac)} facilities. Saved to {csv_out}")
    print(f"  Facilities accessible to Mumbai Metropolitan Region (<=120km): {df_fac['serves_mmr'].sum()}")
    return df_fac

def extract_osm_electronics(gdf_wards):
    print(">>> [4/4] Extracting & Mapping OpenStreetMap Electronics & POIs...")
    import pyogrio
    pbf_path = os.path.join(RAW_DIR, "western-zone-261005.osm.pbf")
    bbox = tuple(gdf_wards.total_bounds)
    
    pts = pyogrio.read_dataframe(pbf_path, layer='points', bbox=bbox)
    
    # Filter for electronics, mobile, computer, repair, recycling, waste
    mask = pts['other_tags'].astype(str).str.contains(
        'electronics|computer|mobile_phone|repair|recycling|waste|second_hand', 
        case=False, na=False
    )
    elec_pts = pts[mask].copy()
    
    # Extract specific category
    def categorize_osm(tags):
        t = str(tags).lower()
        if 'recycling' in t or 'waste' in t:
            return 'Collection / Recycling Point'
        elif 'computer' in t:
            return 'Computer Retail / Repair'
        elif 'mobile_phone' in t:
            return 'Mobile Phone Retail / Repair'
        elif 'electronics' in t:
            return 'Consumer Electronics Retail'
        else:
            return 'Other Electronics POI'
            
    elec_pts['category'] = elec_pts['other_tags'].apply(categorize_osm)
    
    # Spatial join with BMC Wards
    gdf_elec = gpd.GeoDataFrame(elec_pts[['osm_id', 'name', 'category', 'geometry']], crs="EPSG:4326")
    joined = gpd.sjoin(gdf_elec, gdf_wards[['name', 'geometry']], how='inner', predicate='within')
    joined.rename(columns={'name_left': 'poi_name', 'name_right': 'ward'}, inplace=True)
    joined['poi_name'] = joined['poi_name'].fillna('Unnamed Electronics Facility')
    
    # Aggregate POI count per ward
    poi_counts = joined.groupby('ward').size().reset_index(name='commercial_electronics_poi_count')
    
    # Save GeoJSON of electronics POIs
    out_pois_path = os.path.join(PROCESSED_DIR, "mumbai_electronics_pois.geojson")
    joined[['osm_id', 'poi_name', 'category', 'ward', 'geometry']].to_file(out_pois_path, driver='GeoJSON')
    print(f"  Mapped {len(joined)} verified electronics POIs across Mumbai wards. Saved to {out_pois_path}")
    
    return poi_counts

def build_master_dataset():
    gdf_wards, df_map = process_census_and_boundaries()
    ward_assets = process_asset_data(df_map)
    df_fac = extract_mpcb_facilities()
    poi_counts = extract_osm_electronics(gdf_wards)
    
    # Merge all ward-level attributes
    master_gdf = gdf_wards.merge(ward_assets, on='name', how='left')
    master_gdf = master_gdf.merge(poi_counts, left_on='name', right_on='ward', how='left')
    master_gdf['commercial_electronics_poi_count'] = master_gdf['commercial_electronics_poi_count'].fillna(0).astype(int)
    if 'ward' in master_gdf.columns:
        master_gdf.drop(columns=['ward'], inplace=True)
        
    # Commercial density (POIs per sq km)
    master_gdf['commercial_electronics_density'] = (
        master_gdf['commercial_electronics_poi_count'] / master_gdf['area_sqkm']
    ).round(2)
    
    # Save master GeoJSON & CSV
    out_geojson = os.path.join(PROCESSED_DIR, "mumbai_wards_master.geojson")
    out_csv = os.path.join(PROCESSED_DIR, "mumbai_wards_master.csv")
    
    master_gdf.to_file(out_geojson, driver='GeoJSON')
    master_gdf.drop(columns='geometry').to_csv(out_csv, index=False)
    
    print("\n" + "="*80)
    print("PHASE 1 COMPLETE: MASTER DATASETS GENERATED SUCCESSFULLY")
    print(f"Master GeoJSON: {out_geojson} ({len(master_gdf)} wards, {len(master_gdf.columns)} attributes)")
    print(f"Master CSV: {out_csv}")
    print("="*80)
    
    print("\nWard Summary Preview:")
    preview_cols = ['name', 'ward_full_name', 'total_population', 'area_sqkm', 
                    'pop_density_per_sqkm', 'pct_total_pc', 'pct_high_asset', 'commercial_electronics_poi_count']
    print(master_gdf[preview_cols].sort_values(by='total_population', ascending=False).head(10).to_string())

if __name__ == "__main__":
    build_master_dataset()
