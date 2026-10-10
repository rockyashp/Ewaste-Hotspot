"""
UI Components and Visual Analytics for Streamlit Platform
Includes KPI Cards, Ward Inspector Breakdown, and Plotly Analytics Charts.
Uses st.html() to render pure HTML without markdown code block interference.
"""

import streamlit as st
import plotly.express as px
import plotly.graph_objects as go
import pandas as pd

def render_kpi_cards(gdf_wards, df_facilities):
    total_pop = gdf_wards['pop_2024_projected'].sum()
    total_ewaste = gdf_wards['ewaste_gen_annual_mt_baseline'].sum()
    avg_per_capita = (total_ewaste * 1000) / total_pop
    high_hotspots = (gdf_wards['hotspot_category'] == 'HIGH').sum()
    crit_gaps = (gdf_wards['collection_gap_status'] == 'CRITICAL GAP').sum()
    total_facs = len(df_facilities)
    
    col1, col2, col3, col4, col5 = st.columns(5)
    
    with col1:
        st.html(f"""
<div class="kpi-card">
    <div class="kpi-label">Projected Population (2024)</div>
    <div class="kpi-value">{total_pop:,.0f}</div>
    <div class="kpi-sub">Across 24 BMC Wards</div>
</div>
""")
        
    with col2:
        st.html(f"""
<div class="kpi-card">
    <div class="kpi-label">Annual E-Waste Generation</div>
    <div class="kpi-value">{total_ewaste:,.0f} <span style="font-size:1rem; font-weight:500;">MT</span></div>
    <div class="kpi-sub">{avg_per_capita:.2f} kg/capita/year</div>
</div>
""")
        
    with col3:
        st.html(f"""
<div class="kpi-card">
    <div class="kpi-label">E-Waste Hotspots Identified</div>
    <div class="kpi-value" style="color: #DC2626;">{high_hotspots} <span style="font-size:1rem; color:#64748B;">High Tier</span></div>
    <div class="kpi-sub">5 Medium | 14 Baseline</div>
</div>
""")
        
    with col4:
        st.html(f"""
<div class="kpi-card">
    <div class="kpi-label">Critical Collection Gaps</div>
    <div class="kpi-value" style="color: #B91C1C;">{crit_gaps} <span style="font-size:1rem; color:#64748B;">Wards</span></div>
    <div class="kpi-sub">Zero facilities within 10km</div>
</div>
""")
        
    with col5:
        st.html(f"""
<div class="kpi-card">
    <div class="kpi-label">MPCB Authorized Recyclers</div>
    <div class="kpi-value" style="color: #047857;">{total_facs}</div>
    <div class="kpi-sub">In MMR / Maharashtra</div>
</div>
""")

def render_ward_inspector(ward_row):
    """
    Renders detailed drilldown for selected ward answering:
    - Where is it?
    - How much e-waste?
    - Why is it a hotspot?
    - How far is it from facilities?
    - What is the collection recommendation?
    """
    w_name = ward_row['name']
    full_name = ward_row['ward_full_name']
    cat = ward_row['hotspot_category']
    cehi = ward_row['hotspot_index_cehi']
    gen_mt = ward_row['ewaste_gen_annual_mt_baseline']
    daily_mt = ward_row['ewaste_gen_daily_mt']
    per_cap = ward_row['ewaste_per_capita_kg_year']
    pop = ward_row['pop_2024_projected']
    area = ward_row['area_sqkm']
    pop_dens = ward_row['pop_density_per_sqkm']
    pc_pct = ward_row['pct_total_pc']
    phone_pct = ward_row['pct_total_phone']
    high_asset_pct = ward_row['pct_high_asset']
    pois = ward_row['commercial_electronics_poi_count']
    
    dist_km = ward_row['nearest_facility_distance_km']
    nearest_fac = ward_row['nearest_facility_name']
    nearest_ro = ward_row['nearest_facility_ro']
    nearest_cap = ward_row['nearest_facility_capacity_mta']
    fac_10km = ward_row['facilities_within_10km']
    gap_status = ward_row['collection_gap_status']
    igi = ward_row['infrastructure_gap_index_igi']
    
    strat = ward_row['recommended_strategy']
    freq = ward_row['recommended_frequency']
    trips = ward_row['weekly_collection_trips_needed']
    priority = ward_row['municipal_priority_tier']
    rationale = ward_row['recommendation_rationale']
    
    # Badge class
    badge_cls = "badge-high" if cat == "HIGH" else ("badge-medium" if cat == "MEDIUM" else "badge-low")
    gap_cls = "badge-critical-gap" if "CRITICAL" in gap_status else ("badge-mod-gap" if "MODERATE" in gap_status else "badge-served")
    
    inspector_html = f"""
<div class="detail-card">
    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 0.8rem;">
        <div>
            <h3 style="margin:0; font-size:1.25rem; font-weight:700; color:#0F172A;">
                Ward {w_name}: {full_name}
            </h3>
            <span style="font-size:0.8rem; color:#64748B;">Land Area: {area:.2f} km² | Population Density: {pop_dens:,.0f}/km²</span>
        </div>
        <div style="display:flex; gap:0.4rem;">
            <span class="badge {badge_cls}">{cat} HOTSPOT ({cehi:.1f})</span>
            <span class="badge {gap_cls}">{gap_status}</span>
        </div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin-bottom: 1rem;">
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:0.6rem; border-radius:4px;">
            <div style="font-size:0.7rem; color:#64748B; font-weight:600;">ANNUAL E-WASTE</div>
            <div style="font-size:1.15rem; font-weight:700; color:#0F172A;">{gen_mt:,.0f} MT</div>
            <div style="font-size:0.7rem; color:#059669;">{daily_mt:.1f} MT/day</div>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:0.6rem; border-radius:4px;">
            <div style="font-size:0.7rem; color:#64748B; font-weight:600;">PER CAPITA RATE</div>
            <div style="font-size:1.15rem; font-weight:700; color:#0F172A;">{per_cap:.2f} kg</div>
            <div style="font-size:0.7rem; color:#64748B;">per person / yr</div>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:0.6rem; border-radius:4px;">
            <div style="font-size:0.7rem; color:#64748B; font-weight:600;">PC PENETRATION</div>
            <div style="font-size:1.15rem; font-weight:700; color:#0F172A;">{pc_pct:.1f}%</div>
            <div style="font-size:0.7rem; color:#64748B;">Households with PC</div>
        </div>
        <div style="background:#F8FAFC; border:1px solid #E2E8F0; padding:0.6rem; border-radius:4px;">
            <div style="font-size:0.7rem; color:#64748B; font-weight:600;">NEAREST FACILITY</div>
            <div style="font-size:1.15rem; font-weight:700; color:{'#DC2626' if dist_km > 10 else '#059669'};">{dist_km:.1f} km</div>
            <div style="font-size:0.7rem; color:#64748B;">{fac_10km} within 10km</div>
        </div>
    </div>
    
    <h4>1. Why is this Ward Classified as a Hotspot?</h4>
    <p style="font-size:0.85rem; color:#334155; line-height:1.5; margin-bottom: 0.6rem;">
        {ward_row['explainability_text']}
    </p>
    
    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
        <div style="background:#FFF; border:1px solid #E2E8F0; padding:0.5rem; border-radius:4px; text-align:center;">
            <span style="font-size:0.7rem; color:#64748B;">Volume Score</span><br/>
            <b style="font-size:0.95rem; color:#0F172A;">{ward_row['score_volume_component']:.1f}/100</b>
        </div>
        <div style="background:#FFF; border:1px solid #E2E8F0; padding:0.5rem; border-radius:4px; text-align:center;">
            <span style="font-size:0.7rem; color:#64748B;">Density Score</span><br/>
            <b style="font-size:0.95rem; color:#0F172A;">{ward_row['score_density_component']:.1f}/100</b>
        </div>
        <div style="background:#FFF; border:1px solid #E2E8F0; padding:0.5rem; border-radius:4px; text-align:center;">
            <span style="font-size:0.7rem; color:#64748B;">Asset Affluence</span><br/>
            <b style="font-size:0.95rem; color:#0F172A;">{ward_row['score_affluence_component']:.1f}/100</b>
        </div>
        <div style="background:#FFF; border:1px solid #E2E8F0; padding:0.5rem; border-radius:4px; text-align:center;">
            <span style="font-size:0.7rem; color:#64748B;">Commercial IT</span><br/>
            <b style="font-size:0.95rem; color:#0F172A;">{ward_row['score_commercial_component']:.1f}/100</b>
        </div>
    </div>
    
    <h4>2. Collection Infrastructure & Proximity</h4>
    <div style="font-size:0.825rem; color:#334155; line-height:1.5;">
        • <b>Nearest Licensed Recycler:</b> {nearest_fac} ({nearest_ro} Region) — <b>{dist_km:.2f} km</b> away.<br/>
        • <b>Licensed Capacity:</b> {nearest_cap:,.0f} MT/annum | <b>Facilities within 10 km:</b> {fac_10km} units.<br/>
        • <b>Infrastructure Gap Index (IGI):</b> {igi:.1f}/100 ({gap_status}).
    </div>
    
    <div class="policy-callout">
        <div class="policy-callout-title">
            RECOMMENDED ACTION: {strat.upper()} ({priority})
        </div>
        <div class="policy-callout-body">
            <b>Operational Frequency:</b> {freq}<br/>
            <b>Logistics Fleet Load:</b> Estimated <b>{trips} collection trips/week</b> (using 2.5 MT capacity vans)<br/>
            <b>Policy Justification:</b> {rationale}
        </div>
    </div>
</div>
"""
    st.html(inspector_html)

def render_analytics_charts(gdf_wards):
    """
    Renders high-value statistical charts comparing wards.
    """
    tab1, tab2, tab3 = st.tabs([
        "📊 Ward Generation Ranking", 
        "🔍 Affluence vs. Generation Scatter", 
        "🗺️ Infrastructure Gap Distribution"
    ])
    
    with tab1:
        fig = px.bar(
            gdf_wards.sort_values(by='ewaste_gen_annual_mt_baseline', ascending=True),
            x='ewaste_gen_annual_mt_baseline',
            y='name',
            orientation='h',
            color='hotspot_category',
            color_discrete_map={'HIGH': '#DC2626', 'MEDIUM': '#F59E0B', 'LOW': '#10B981'},
            hover_data=['ward_full_name', 'pop_2024_projected', 'ewaste_per_capita_kg_year'],
            labels={'ewaste_gen_annual_mt_baseline': 'Annual E-Waste Generation (MT/year)', 'name': 'BMC Ward'},
            title="Estimated Annual E-Waste Generation across all 24 BMC Wards"
        )
        fig.update_layout(height=520, margin=dict(l=10, r=10, t=40, b=10), template="plotly_white")
        st.plotly_chart(fig, use_container_width=True)
        
    with tab2:
        fig2 = px.scatter(
            gdf_wards,
            x='pct_total_pc',
            y='ewaste_per_capita_kg_year',
            size='pop_2024_projected',
            color='hotspot_category',
            color_discrete_map={'HIGH': '#DC2626', 'MEDIUM': '#F59E0B', 'LOW': '#10B981'},
            text='name',
            hover_data=['ward_full_name', 'ewaste_gen_annual_mt_baseline', 'commercial_electronics_poi_count'],
            labels={
                'pct_total_pc': 'Household Computer Penetration (%)',
                'ewaste_per_capita_kg_year': 'Per-Capita E-Waste Generation (kg/person/yr)'
            },
            title="Household ICT Asset Penetration vs. Per-Capita E-Waste Generation"
        )
        fig2.update_traces(textposition='top center')
        fig2.update_layout(height=480, margin=dict(l=10, r=10, t=40, b=10), template="plotly_white")
        st.plotly_chart(fig2, use_container_width=True)
        
    with tab3:
        gap_summary = gdf_wards['collection_gap_status'].value_counts().reset_index()
        gap_summary.columns = ['Status', 'Ward Count']
        fig3 = px.pie(
            gap_summary,
            names='Status',
            values='Ward Count',
            color='Status',
            color_discrete_map={'CRITICAL GAP': '#DC2626', 'MODERATE GAP': '#F59E0B', 'WELL SERVED / LOW GAP': '#2563EB'},
            hole=0.4,
            title="Distribution of Collection Infrastructure Gaps across BMC Wards"
        )
        fig3.update_layout(height=450, margin=dict(l=10, r=10, t=40, b=10), template="plotly_white")
        st.plotly_chart(fig3, use_container_width=True)
