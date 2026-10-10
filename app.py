"""
E-Waste Hotspot & Collection Planner
Main Application Entry Point (Streamlit)
Municipal Environmental Intelligence Platform for Greater Mumbai (BMC)
"""

import os
import streamlit as st
import geopandas as gpd
import pandas as pd
from streamlit_folium import st_folium

from src.app.styles import CUSTOM_CSS
from src.app.map_view import create_mumbai_map
from src.app.components import render_kpi_cards, render_ward_inspector, render_analytics_charts

# Page Configuration
st.set_page_config(
    page_title="E-Waste Hotspot & Collection Planner | Mumbai",
    page_icon="♻️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Apply serious, clean environmental intelligence CSS
st.html(CUSTOM_CSS)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROCESSED_DIR = os.path.join(BASE_DIR, "data", "processed")

@st.cache_data
def load_datasets():
    geojson_path = os.path.join(PROCESSED_DIR, "mumbai_final_planning_matrix.geojson")
    fac_path = os.path.join(PROCESSED_DIR, "mpcb_authorized_facilities.csv")
    poi_path = os.path.join(PROCESSED_DIR, "mumbai_electronics_pois.geojson")
    
    gdf_wards = gpd.read_file(geojson_path)
    df_fac = pd.read_csv(fac_path)
    
    gdf_pois = None
    if os.path.exists(poi_path):
        try:
            gdf_pois = gpd.read_file(poi_path)
        except Exception:
            gdf_pois = None
            
    return gdf_wards, df_fac, gdf_pois

# Load Data
gdf_wards, df_facilities, gdf_pois = load_datasets()

# Sidebar Controls
st.sidebar.markdown("### 🗺️ GIS Layer Controls")

metric_choice = st.sidebar.selectbox(
    "Choropleth Visual Layer",
    options=[
        "Hotspot Tier (High / Med / Low)",
        "Annual Generation (MT/year)",
        "Generation Density (MT/km²)",
        "Infrastructure Gap Status"
    ],
    index=0,
    help="Select which calculated metric to visualize across the 24 BMC ward boundaries."
)

st.sidebar.markdown("---")
st.sidebar.markdown("### 🏢 Infrastructure Overlays")
show_facilities = st.sidebar.checkbox("Show MPCB Licensed Recyclers (MMR)", value=True)
show_buffers = st.sidebar.checkbox("Show 5km Facility Service Buffers", value=True)
show_pois = st.sidebar.checkbox("Show Electronics Retail & Repair POIs", value=False)

st.sidebar.markdown("---")
st.sidebar.markdown("### 🎯 Ward Selector")
ward_options = sorted(gdf_wards['name'].tolist())
ward_labels = {w: f"Ward {w} - {gdf_wards[gdf_wards['name'] == w].iloc[0]['ward_full_name'].split('/')[0].strip()}" for w in ward_options}

selected_ward_code = st.sidebar.selectbox(
    "Select Ward to Inspect",
    options=ward_options,
    format_func=lambda x: ward_labels[x],
    index=ward_options.index('K/W') if 'K/W' in ward_options else 0,
    help="Choose a ward to view detailed demographic drivers, e-waste burden, and collection recommendations."
)

st.sidebar.markdown("---")
st.sidebar.markdown("### ℹ️ Data Provenance & Methodology")
st.sidebar.info(
    "• **Boundaries:** BMC 24 Wards GeoJSON (458.3 km²)\n"
    "• **Demographics:** Census 2011 Primary Census Abstract & Table HH-14 Asset Amenities\n"
    "• **Recyclers:** Maharashtra Pollution Control Board (MPCB) Registry (March 2024, 236 facilities)\n"
    "• **POI Density:** OpenStreetMap (OSM) Western Zone extract (414 verified electronics POIs)\n"
    "• **Benchmark:** Rajya Sabha Parliamentary Data (1.75M MT national total)"
)

# Header
st.html("""
<div class="platform-header">
    <div class="platform-title">
        <span>♻️</span> E-Waste Hotspot & Collection Planner
    </div>
    <div class="platform-subtitle">
        Municipal Environmental Intelligence & Decision Support System • Brihanmumbai Municipal Corporation (BMC)
    </div>
</div>
""")

# Top KPI Metric Cards
render_kpi_cards(gdf_wards, df_facilities)

st.markdown("<div style='height: 1rem;'></div>", unsafe_allow_html=True)

# Main Application Layout: Map on Left (7 cols), Ward Inspector on Right (5 cols)
col_map, col_inspector = st.columns([7, 5])

with col_map:
    st.markdown(f"##### 📍 Spatial Map: {metric_choice}")
    
    # Create Folium Map
    folium_map = create_mumbai_map(
        gdf_wards=gdf_wards,
        df_facilities=df_facilities,
        gdf_pois=gdf_pois,
        metric_choice=metric_choice,
        show_facilities=show_facilities,
        show_buffers=show_buffers,
        show_pois=show_pois,
        selected_ward_name=selected_ward_code
    )
    
    # Render with streamlit-folium
    map_data = st_folium(
        folium_map,
        width="100%",
        height=580,
        returned_objects=["last_active_drawing"]
    )
    
    # If user clicks on a polygon on the map, update selected ward dynamically
    if map_data and map_data.get("last_active_drawing"):
        clicked_props = map_data["last_active_drawing"].get("properties", {})
        if "name" in clicked_props and clicked_props["name"] in ward_options:
            selected_ward_code = clicked_props["name"]

with col_inspector:
    st.markdown("##### 🔍 Ward Deep-Dive & Strategy Recommender")
    # Extract selected ward row
    selected_row = gdf_wards[gdf_wards['name'] == selected_ward_code].iloc[0]
    render_ward_inspector(selected_row)

st.markdown("<hr style='border:none; border-top:1px solid #E2E8F0; margin:1.5rem 0;'>", unsafe_allow_html=True)

# Comparative Analytics Section
st.markdown("### 📈 Citywide Comparative Analytics")
render_analytics_charts(gdf_wards)

st.markdown("<hr style='border:none; border-top:1px solid #E2E8F0; margin:1.5rem 0;'>", unsafe_allow_html=True)

# Municipal Planning Master Table & Export
st.markdown("### 📋 Municipal Collection Planning Master Table")
st.markdown("Complete multi-criteria planning matrix across all 24 administrative wards:")

table_cols = [
    'name', 'ward_full_name', 'pop_2024_projected', 'ewaste_gen_annual_mt_baseline', 
    'ewaste_per_capita_kg_year', 'hotspot_category', 'hotspot_index_cehi',
    'collection_gap_status', 'nearest_facility_distance_km', 'recommended_strategy', 
    'recommended_frequency', 'weekly_collection_trips_needed'
]
rename_dict = {
    'name': 'Ward ID',
    'ward_full_name': 'Locality Name',
    'pop_2024_projected': '2024 Population',
    'ewaste_gen_annual_mt_baseline': 'Annual E-Waste (MT)',
    'ewaste_per_capita_kg_year': 'Per Capita (kg/yr)',
    'hotspot_category': 'Hotspot Tier',
    'hotspot_index_cehi': 'CEHI Score',
    'collection_gap_status': 'Gap Status',
    'nearest_facility_distance_km': 'Nearest Facility (km)',
    'recommended_strategy': 'Recommended Strategy',
    'recommended_frequency': 'Frequency',
    'weekly_collection_trips_needed': 'Weekly Trips (2.5T)'
}

display_df = gdf_wards[table_cols].rename(columns=rename_dict).sort_values(by='Annual E-Waste (MT)', ascending=False)
st.dataframe(display_df, use_container_width=True, hide_index=True)

# CSV Download
csv_data = display_df.to_csv(index=False).encode('utf-8')
st.download_button(
    label="📥 Download Municipal Collection Planning Report (CSV)",
    data=csv_data,
    file_name="mumbai_ewaste_collection_plan.csv",
    mime="text/csv"
)

st.caption("E-Waste Hotspot & Collection Planner • Developed for Mumbai Metropolitan Municipal Planning")
