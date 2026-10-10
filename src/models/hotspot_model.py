"""
Phase 3: Explainable Hotspot Detection & Unsupervised Machine Learning Clustering
Calculates Composite E-Waste Hotspot Index (CEHI: 0-100), applies K-Means and Hierarchical Clustering,
and provides natural-language explainability for every ward.
"""

import os
import json
import numpy as np
import pandas as pd
import geopandas as gpd
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.cluster import KMeans, AgglomerativeClustering
from sklearn.metrics import silhouette_score

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

def load_data():
    csv_path = os.path.join(PROCESSED_DIR, "mumbai_ewaste_estimates.csv")
    geojson_path = os.path.join(PROCESSED_DIR, "mumbai_wards_master.geojson")
    df = pd.read_csv(csv_path)
    gdf = gpd.read_file(geojson_path)
    return df, gdf

def calculate_composite_hotspot_index(df):
    """
    Computes the Composite E-Waste Hotspot Index (CEHI: 0 to 100).
    A multi-criteria evaluation combining 4 distinct dimensions:
    1. Absolute E-Waste Volume (MT/yr): 35% weight (demographic & consumption scale)
    2. Spatial Generation Density (MT/km²): 25% weight (spatial concentration)
    3. Electronic Asset Penetration (EAF): 20% weight (per-capita electronics intensity)
    4. Commercial & IT Concentration (CAF / density): 20% weight (institutional turnover)
    """
    scaler = MinMaxScaler()
    
    # Extract dimensions
    norm_vol = scaler.fit_transform(df[['ewaste_gen_annual_mt_baseline']]).flatten()
    norm_dens = scaler.fit_transform(df[['ewaste_density_mt_per_sqkm']]).flatten()
    norm_affluence = scaler.fit_transform(df[['eaf_asset_factor']]).flatten()
    norm_comm = scaler.fit_transform(df[['commercial_electronics_density']]).flatten()
    
    # Store normalized component scores (0-100) for explainability
    df['score_volume_component'] = (norm_vol * 100).round(1)
    df['score_density_component'] = (norm_dens * 100).round(1)
    df['score_affluence_component'] = (norm_affluence * 100).round(1)
    df['score_commercial_component'] = (norm_comm * 100).round(1)
    
    # Calculate weighted composite score
    raw_cehi = (
        0.35 * norm_vol +
        0.25 * norm_dens +
        0.20 * norm_affluence +
        0.20 * norm_comm
    )
    
    # Scale to 0 - 100
    df['hotspot_index_cehi'] = (scaler.fit_transform(raw_cehi.reshape(-1, 1)).flatten() * 100).round(2)
    
    # Classify into standard tiers
    # High: Top 25-30% or CEHI >= 60
    # Medium: 35 <= CEHI < 60
    # Low: CEHI < 35
    def assign_tier(score):
        if score >= 60.0:
            return 'HIGH'
        elif score >= 35.0:
            return 'MEDIUM'
        else:
            return 'LOW'
            
    df['hotspot_category'] = df['hotspot_index_cehi'].apply(assign_tier)
    
    return df

def run_unsupervised_clustering(df):
    """
    Applies K-Means and Agglomerative Hierarchical Clustering.
    Features:
    - Log-transformed annual generation
    - Generation density (MT/km²)
    - Population density (pop/km²)
    - Asset factor (EAF)
    - Commercial POI count
    """
    features = [
        'ewaste_gen_annual_mt_baseline',
        'ewaste_density_mt_per_sqkm',
        'pop_density_per_sqkm',
        'eaf_asset_factor',
        'commercial_electronics_poi_count'
    ]
    
    X = df[features].copy()
    
    # Standardization (Z-score)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Evaluate Silhouette Scores for k = 2, 3, 4, 5
    best_k = 4
    best_score = -1
    scores = {}
    for k in range(2, 6):
        km = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = km.fit_predict(X_scaled)
        score = silhouette_score(X_scaled, labels)
        scores[k] = round(score, 3)
        if score > best_score:
            best_score = score
            best_k = k
            
    print(f"Silhouette Scores across k: {scores} --> Optimal k = {best_k} (Score: {best_score:.3f})")
    
    # Fit K-Means with optimal k
    kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=20)
    df['cluster_id'] = kmeans.fit_predict(X_scaled)
    
    # Fit Hierarchical Clustering as cross-validation
    agg = AgglomerativeClustering(n_clusters=best_k)
    df['hierarchical_cluster_id'] = agg.fit_predict(X_scaled)
    
    # Characterize clusters distinctly using z-score relative rankings
    cluster_means = df.groupby('cluster_id')[features].mean()
    
    cluster_names = {}
    for cid in range(best_k):
        cm = cluster_means.loc[cid]
        # Compare relative to overall means
        vol_rel = cm['ewaste_gen_annual_mt_baseline'] / df['ewaste_gen_annual_mt_baseline'].mean()
        dens_rel = cm['ewaste_density_mt_per_sqkm'] / df['ewaste_density_mt_per_sqkm'].mean()
        aff_rel = cm['eaf_asset_factor'] / df['eaf_asset_factor'].mean()
        comm_rel = cm['commercial_electronics_poi_count'] / df['commercial_electronics_poi_count'].mean()
        
        if comm_rel > 2.0 or (vol_rel > 1.4 and aff_rel > 1.1):
            name = "Tier-1 Commercial IT & Mega Generation Hub"
        elif aff_rel > 1.15 and dens_rel > 1.2:
            name = "Affluent Urban Core / High Per-Capita Generators"
        elif dens_rel > 1.3 or cm['pop_density_per_sqkm'] > 45000:
            name = "Hyper-Dense Residential Corridors"
        else:
            name = "Moderate Residential & Peripheral Growth Zones"
        cluster_names[cid] = name
        
    df['cluster_archetype'] = df['cluster_id'].map(cluster_names)
    
    return df, scores, best_k

def generate_explainability_reasoning(df):
    """
    Synthesizes natural language explainability for each ward:
    - Decomposes why it received its score
    - Identifies primary driver (Volume, Affluence, Density, Commercial)
    - Formulates auditable "Why is this a hotspot?" response
    """
    reasons = []
    primary_drivers = []
    
    for idx, row in df.iterrows():
        comp_scores = {
            'Demographic & Generation Volume': row['score_volume_component'],
            'Spatial Density Concentration': row['score_density_component'],
            'Electronic Asset Affluence': row['score_affluence_component'],
            'Commercial & IT Concentration': row['score_commercial_component']
        }
        
        # Sort components descending
        sorted_comps = sorted(comp_scores.items(), key=lambda x: -x[1])
        top_driver = sorted_comps[0][0]
        second_driver = sorted_comps[1][0]
        
        primary_drivers.append(top_driver)
        
        # Build natural language narrative
        cat = row['hotspot_category']
        vol = row['ewaste_gen_annual_mt_baseline']
        per_capita = row['ewaste_per_capita_kg_year']
        dens = row['ewaste_density_mt_per_sqkm']
        pop = row['pop_2024_projected']
        pc = row['pct_total_pc']
        pois = row['commercial_electronics_poi_count']
        
        narrative = (
            f"Ward {row['name']} ({row['ward_full_name']}) is classified as a {cat} HOTSPOT "
            f"(CEHI Score: {row['hotspot_index_cehi']:.1f}/100). "
            f"Primary factor: {top_driver} ({sorted_comps[0][1]:.1f}/100), accompanied by {second_driver} ({sorted_comps[1][1]:.1f}/100). "
            f"It generates an estimated {vol:,.0f} MT of e-waste/year ({per_capita:.1f} kg/capita) "
            f"across a population of {pop:,} residents with {pc:.1f}% household computer ownership, "
            f"{pois} commercial electronics POIs, and a spatial generation density of {dens:.1f} MT/km²."
        )
        reasons.append(narrative)
        
    df['primary_hotspot_driver'] = primary_drivers
    df['explainability_text'] = reasons
    return df

def run_hotspot_pipeline():
    print("="*80)
    print("PHASE 3: EXECUTING HOTSPOT DETECTION & ML CLUSTERING ENGINE")
    print("="*80)
    
    df, gdf = load_data()
    
    # 1. Composite Index Calculation
    df = calculate_composite_hotspot_index(df)
    tier_counts = df['hotspot_category'].value_counts().to_dict()
    print(f"Hotspot Tier Distribution: {tier_counts}")
    
    # 2. Unsupervised Clustering
    df, scores, best_k = run_unsupervised_clustering(df)
    print("\nCluster Archetype Distribution:")
    for arch, cnt in df['cluster_archetype'].value_counts().items():
        print(f"  • {arch}: {cnt} wards")
        
    # 3. Explainability Engine
    df = generate_explainability_reasoning(df)
    
    # Save CSV
    out_csv = os.path.join(PROCESSED_DIR, "mumbai_hotspots_classified.csv")
    df.to_csv(out_csv, index=False)
    print(f"\nSaved classified hotspots CSV to: {out_csv}")
    
    # Merge with Master GeoJSON
    drop_cols = [c for c in df.columns if c in gdf.columns and c != 'name']
    gdf_clean = gdf.drop(columns=drop_cols)
    gdf_classified = gdf_clean.merge(df, on='name', how='left')
    
    out_geojson = os.path.join(PROCESSED_DIR, "mumbai_hotspots_classified.geojson")
    gdf_classified.to_file(out_geojson, driver='GeoJSON')
    print(f"Saved classified hotspots GeoJSON to: {out_geojson}")
    
    print("\n" + "="*80)
    print("TOP 10 IDENTIFIED E-WASTE HOTSPOTS (RANKED BY CEHI):")
    print("="*80)
    display_cols = [
        'name', 'hotspot_category', 'hotspot_index_cehi', 'cluster_archetype',
        'primary_hotspot_driver', 'ewaste_gen_annual_mt_baseline', 'ewaste_density_mt_per_sqkm'
    ]
    top_hotspots = df[display_cols].sort_values(by='hotspot_index_cehi', ascending=False).head(10)
    print(top_hotspots.to_string(index=False))
    
    print("\n" + "="*80)
    print("SAMPLE EXPLAINABILITY BREAKDOWN (TOP 2 HOTSPOTS):")
    print("="*80)
    sorted_df = df.sort_values(by='hotspot_index_cehi', ascending=False)
    print("1.", sorted_df.iloc[0]['explainability_text'])
    print("\n2.", sorted_df.iloc[1]['explainability_text'])
    
    print("\nPhase 3 completed successfully.")
    return df

if __name__ == "__main__":
    run_hotspot_pipeline()
