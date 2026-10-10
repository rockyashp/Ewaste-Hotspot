import React from 'react';
import { Terminal, Truck, Target, Layers } from 'lucide-react';

export default function WardInspector({ ward, allWards, onSelectWard }) {
  if (!ward) return null;

  const cat = ward.hotspot_category || 'LOW';
  const cehi = ward.hotspot_index_cehi || 0;
  const gap = ward.collection_gap_status || '';

  const getCatTagClass = () => {
    if (cat === 'HIGH') return 'linear-tag-acid';
    if (cat === 'MEDIUM') return 'linear-tag-pulse';
    return 'linear-tag-neutral';
  };

  const getGapTagClass = () => {
    if (gap.includes('CRITICAL')) return 'linear-tag-coral';
    if (gap.includes('MODERATE')) return 'linear-tag-neutral';
    return 'linear-tag-pulse';
  };

  return (
    <div className="linear-panel">
      {/* Sector Header */}
      <div className="linear-panel-header">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '4px' }}>
            SECTOR PROFILE // WARD {ward.name}
          </div>
          <h2 className="linear-panel-title">
            Ward {ward.name}: {ward.ward_full_name?.split('/')[0]}
          </h2>
          <div className="linear-panel-meta">
            {ward.ward_full_name} • {ward.area_sqkm?.toFixed(2)} km² • {ward.pop_density_per_sqkm?.toLocaleString()} citizens / km²
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className={`linear-tag ${getCatTagClass()}`}>
            {cat} HOTSPOT ({cehi.toFixed(1)})
          </span>
          <span className={`linear-tag ${getGapTagClass()}`}>
            {gap}
          </span>
        </div>
      </div>

      {/* Ward Quick Selector Pill Row */}
      {allWards && allWards.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#62666d', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            WARD:
          </span>
          {allWards.map(w => (
            <button
              key={w.name}
              className={`linear-pill ${w.name === ward.name ? 'active-acid' : ''}`}
              style={{ padding: '3px 10px', fontSize: '11px', whiteSpace: 'nowrap' }}
              onClick={() => onSelectWard(w.name)}
            >
              {w.name}
            </button>
          ))}
        </div>
      )}

      {/* Metric Tiles 4-Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">ANNUAL GENERATION</div>
          <div className="linear-kpi-value">
            {Math.round(ward.ewaste_gen_annual_mt_baseline)?.toLocaleString()} <span className="linear-kpi-unit">MT</span>
          </div>
          <div className="linear-kpi-sub">
            {ward.ewaste_gen_daily_mt?.toFixed(1)} MT / day
          </div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">PER CAPITA RATE</div>
          <div className="linear-kpi-value">
            {ward.ewaste_per_capita_kg_year?.toFixed(2)} <span className="linear-kpi-unit">kg</span>
          </div>
          <div className="linear-kpi-sub">
            per citizen annually
          </div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">PC PENETRATION</div>
          <div className="linear-kpi-value">
            {ward.pct_total_pc?.toFixed(1)}%
          </div>
          <div className="linear-kpi-sub">
            Census Table HH-14
          </div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">NEAREST RECYCLER</div>
          <div className="linear-kpi-value" style={{ color: ward.nearest_facility_distance_km > 10 ? '#eb5757' : '#27a644' }}>
            {ward.nearest_facility_distance_km?.toFixed(1)} <span className="linear-kpi-unit">km</span>
          </div>
          <div className="linear-kpi-sub">
            {ward.facilities_within_10km} units in 10km radius
          </div>
        </div>
      </div>

      {/* Deconvolution Narrative */}
      <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '12px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#e4f222', textTransform: 'uppercase', marginBottom: '4px' }}>
          <Terminal size={11} />
          <span>DECONVOLUTION EXPLANATION // ARCHETYPE: {ward.archetype_name || 'IDENTIFIED'}</span>
        </div>
        <p style={{ fontSize: '13px', color: '#d0d6e0', lineHeight: 1.55 }}>
          {ward.explainability_text}
        </p>
      </div>

      {/* Factor Breakdown Bars with Acid Lime & Pulse Green */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', textTransform: 'uppercase', color: '#8a8f98', letterSpacing: '0.04em' }}>
          WEIGHTED FACTOR ATTRIBUTION (0 — 100)
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#d0d6e0' }}>Volume Scale (Weight 0.35)</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{ward.score_volume_component?.toFixed(1)} / 100</span>
          </div>
          <div style={{ height: '4px', background: 'var(--color-graphite)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ward.score_volume_component || 0}%`, background: 'var(--color-acid-lime)' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#d0d6e0' }}>Spatial Density (Weight 0.25)</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{ward.score_density_component?.toFixed(1)} / 100</span>
          </div>
          <div style={{ height: '4px', background: 'var(--color-graphite)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ward.score_density_component || 0}%`, background: '#84cc16' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#d0d6e0' }}>Electronic Affluence Index (Weight 0.25)</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{ward.score_affluence_component?.toFixed(1)} / 100</span>
          </div>
          <div style={{ height: '4px', background: 'var(--color-graphite)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ward.score_affluence_component || 0}%`, background: '#27a644' }}></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: '#d0d6e0' }}>Commercial Electronics POI Density (Weight 0.15)</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: '#ffffff' }}>{ward.score_commercial_component?.toFixed(1)} / 100</span>
          </div>
          <div style={{ height: '4px', background: 'var(--color-graphite)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${ward.score_commercial_component || 0}%`, background: '#02b8cc' }}></div>
          </div>
        </div>
      </div>

      {/* Logistics Recommendation Directive */}
      <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: 510, color: '#ffffff', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Target size={14} color="#e4f222" />
          <span>MUNICIPAL COLLECTION DIRECTIVE</span>
        </div>
        <div style={{ fontSize: '13px', color: '#ffffff', fontWeight: 510, marginBottom: '2px' }}>
          {ward.recommended_strategy}
        </div>
        <div style={{ fontSize: '12px', color: '#8a8f98', marginBottom: '10px' }}>
          {ward.strategy_rationale}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', borderTop: '0.5px solid var(--color-graphite)', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', color: '#27a644' }}>
            <Truck size={13} />
            <span>Scheduled Fleet: <b>{ward.weekly_collection_trips_needed}</b> trips / wk (2.5 MT Vans)</span>
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98' }}>
            STATUS: ACTIVE ALLOCATION
          </div>
        </div>
      </div>
    </div>
  );
}
