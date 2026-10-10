"""
Interactive Leaflet/Folium GIS Map View Component
Builds multilayer geospatial map for Mumbai E-Waste Hotspots, Facilities, and Gaps.
"""

import folium
from folium import plugins
import branca.colormap as cm
import json

def get_choropleth_color(feature, metric_choice):
    props = feature['properties']
    if metric_choice == 'Hotspot Tier (High / Med / Low)':
        cat = props.get('hotspot_category', 'LOW')
        if cat == 'HIGH':
            return '#DC2626'  # Crimson Red
        elif cat == 'MEDIUM':
            return '#D97706'  # Amber Orange
        else:
            return '#10B981'  # Emerald Green
    elif metric_choice == 'Annual Generation (MT/year)':
        val = props.get('ewaste_gen_annual_mt_baseline', 0)
        # Scale: 1,000 to 9,000
        if val > 7000:
            return '#991B1B'
        elif val > 5000:
            return '#EA580C'
        elif val > 3000:
            return '#F59E0B'
        else:
            return '#34D399'
    elif metric_choice == 'Infrastructure Gap Status':
        gap = props.get('collection_gap_status', 'WELL SERVED')
        if 'CRITICAL' in gap:
            return '#991B1B'
        elif 'MODERATE' in gap:
            return '#D97706'
        else:
            return '#2563EB'
    else: # Generation Density
        dens = props.get('ewaste_density_mt_per_sqkm', 0)
        if dens > 350:
            return '#7F1D1D'
        elif dens > 250:
            return '#C2410C'
        elif dens > 150:
            return '#F59E0B'
        else:
            return '#10B981'

def create_mumbai_map(gdf_wards, df_facilities, gdf_pois=None, 
                      metric_choice='Hotspot Tier (High / Med / Low)',
                      show_facilities=True, show_buffers=True, show_pois=False,
                      selected_ward_name=None):
    """
    Constructs Folium map centered on Greater Mumbai.
    """
    # Center of Greater Mumbai
    mumbai_center = [19.0760, 72.8777]
    
    # Initialize Folium Map with clean CartoDB Positron basemap
    m = folium.Map(
        location=mumbai_center,
        zoom_start=11,
        tiles='CartoDB positron',
        control_scale=True,
        prefer_canvas=True
    )
    
    # Convert GeoDataFrame to GeoJSON dict for styling
    geojson_data = json.loads(gdf_wards.to_json())
    
    # Add Ward Boundaries Layer
    def style_function(feature):
        w_name = feature['properties']['name']
        is_selected = (selected_ward_name is not None and w_name == selected_ward_name)
        fill_color = get_choropleth_color(feature, metric_choice)
        
        return {
            'fillColor': fill_color,
            'color': '#0F172A' if is_selected else '#475569',
            'weight': 3.5 if is_selected else 1.2,
            'fillOpacity': 0.75 if is_selected else 0.55,
            'dashArray': '3' if not is_selected else None
        }
        
    def highlight_function(feature):
        return {
            'weight': 3.0,
            'color': '#0284C7',
            'fillOpacity': 0.85
        }
        
    # Tooltip configuration
    tooltip = folium.GeoJsonTooltip(
        fields=[
            'name', 'ward_full_name', 'hotspot_category', 'hotspot_index_cehi',
            'ewaste_gen_annual_mt_baseline', 'pop_2024_projected',
            'nearest_facility_distance_km', 'collection_gap_status', 'recommended_strategy'
        ],
        aliases=[
            'Ward ID:', 'Locality:', 'Hotspot Class:', 'CEHI Score:',
            'Annual E-Waste (MT):', '2024 Population:',
            'Nearest Recycler (km):', 'Gap Status:', 'Recommended Plan:'
        ],
        localize=True,
        sticky=True,
        style="""
            background-color: #FFFFFF;
            border: 1px solid #CBD5E1;
            border-radius: 4px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            font-family: 'Inter', sans-serif;
            font-size: 11px;
            padding: 8px 12px;
            color: #1E293B;
        """
    )
    
    geojson_layer = folium.GeoJson(
        geojson_data,
        name='BMC Wards Assessment',
        style_function=style_function,
        highlight_function=highlight_function,
        tooltip=tooltip
    )
    geojson_layer.add_to(m)
    
    # Add MPCB Authorized Facilities Markers
    if show_facilities and df_facilities is not None:
        fac_group = folium.FeatureGroup(name='MPCB Authorized Recyclers (MMR)', show=True)
        
        # Display top MMR facilities within 40 km of Mumbai
        near_facs = df_facilities[df_facilities['approx_dist_to_mumbai_center_km'] <= 45.0]
        
        for idx, row in near_facs.iterrows():
            lat = row['latitude']
            lon = row['longitude']
            cap = row['capacity_mta']
            ro = row['regional_office']
            ftype = row['facility_type']
            name = row['facility_name']
            phone = row['contact_phone']
            email = row['contact_email']
            
            # Popup HTML
            popup_html = f"""
            <div style="font-family: 'Inter', sans-serif; font-size: 12px; width: 220px;">
                <b style="color: #0F172A; font-size: 13px;">{name}</b><br/>
                <span style="display:inline-block; margin: 4px 0; padding: 2px 6px; background: #DCFCE7; color: #166534; border-radius: 3px; font-weight:600; font-size: 10px;">
                    {ftype.upper()} ({ro})
                </span><br/>
                <b>Capacity:</b> {cap:,.0f} MT/annum<br/>
                <b>Phone:</b> {phone}<br/>
                <b>Email:</b> <a href="mailto:{email}" style="color:#0284C7;">{email}</a><br/>
                <hr style="margin: 6px 0; border: none; border-top: 1px solid #E2E8F0;"/>
                <small style="color: #64748B;">{row['full_address'][:100]}</small>
            </div>
            """
            
            # Marker Icon
            folium.CircleMarker(
                location=[lat, lon],
                radius=6 if cap < 3000 else (8 if cap < 10000 else 11),
                color='#047857',
                weight=1.5,
                fill=True,
                fill_color='#10B981',
                fill_opacity=0.85,
                popup=folium.Popup(popup_html, max_width=250),
                tooltip=f"<b>{name}</b> ({cap:,.0f} MT/A)"
            ).add_to(fac_group)
            
            # Optional Buffer Circles (5km and 10km) around key high-capacity facilities (>5000 MT/A)
            if show_buffers and cap >= 7500:
                folium.Circle(
                    location=[lat, lon],
                    radius=5000, # 5km
                    color='#059669',
                    weight=0.8,
                    dash_array='4',
                    fill=True,
                    fill_opacity=0.03,
                    tooltip=f"5km Primary Service Radius: {name}"
                ).add_to(fac_group)
                
        fac_group.add_to(m)
        
    # Add Verified Commercial Electronics POIs
    if show_pois and gdf_pois is not None:
        poi_cluster = plugins.MarkerCluster(name='Commercial Electronics & IT POIs', show=False)
        for idx, row in gdf_pois.iterrows():
            geom = row.geometry
            folium.CircleMarker(
                location=[geom.y, geom.x],
                radius=3,
                color='#3B82F6',
                fill=True,
                fill_color='#60A5FA',
                fill_opacity=0.7,
                tooltip=f"{row.get('poi_name', 'Electronics Outlet')} ({row.get('category', 'Retail')})"
            ).add_to(poi_cluster)
        poi_cluster.add_to(m)
        
    # Layer Control
    folium.LayerControl(position='topright', collapsed=False).add_to(m)
    
    return m
