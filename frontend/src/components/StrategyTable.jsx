import React, { useState } from 'react';
import { Download, Search } from 'lucide-react';

export default function StrategyTable({ wardsData, onSelectWard }) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!wardsData || wardsData.length === 0) return null;

  const filtered = wardsData.filter(w => {
    const q = searchTerm.toLowerCase();
    return (
      w.name.toLowerCase().includes(q) ||
      w.ward_full_name.toLowerCase().includes(q) ||
      w.recommended_strategy.toLowerCase().includes(q) ||
      (w.archetype_name && w.archetype_name.toLowerCase().includes(q))
    );
  });

  const handleDownloadCsv = () => {
    window.open('http://127.0.0.1:8000/api/export', '_blank');
  };

  return (
    <div className="linear-panel">
      {/* Header */}
      <div className="linear-panel-header">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '4px' }}>
            POLICY DIRECTIVE // 24-WARD ACTION MATRIX
          </div>
          <h2 className="linear-panel-title">
            Municipal E-Waste Collection Action Matrix
          </h2>
          <div className="linear-panel-meta">
            Logistics routing schedules, fleet allocations, and policy justifications for all 24 administrative wards.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <div className="linear-input-with-icon">
            <Search size={13} className="linear-input-icon" />
            <input
              type="text"
              placeholder="Search ward or strategy..."
              className="linear-input"
              style={{ width: '220px' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <button className="btn-acid-lime" onClick={handleDownloadCsv}>
            <Download size={13} />
            <span>Download CSV</span>
          </button>
        </div>
      </div>

      {/* Linear Compact Table Container */}
      <div className="linear-table-container">
        <table className="linear-table">
          <thead>
            <tr>
              <th>Ward ID</th>
              <th>Locality</th>
              <th>Population (2024)</th>
              <th>Annual Tonnage</th>
              <th>Archetype Tier</th>
              <th>Desert Status</th>
              <th>Nearest Unit</th>
              <th>Logistics Strategy</th>
              <th>Fleet Trips</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((w) => {
              const catTag = w.hotspot_category === 'HIGH' ? 'linear-tag-acid' : (w.hotspot_category === 'MEDIUM' ? 'linear-tag-pulse' : 'linear-tag-neutral');
              const gapTag = w.collection_gap_status.includes('CRITICAL') ? 'linear-tag-coral' : (w.collection_gap_status.includes('MODERATE') ? 'linear-tag-neutral' : 'linear-tag-pulse');

              return (
                <tr key={w.name}>
                  <td>
                    <b style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-acid-lime)' }}>{w.name}</b>
                  </td>
                  <td>{w.ward_full_name.split('/')[0]}</td>
                  <td>{w.pop_2024_projected?.toLocaleString()}</td>
                  <td>
                    <b style={{ color: '#ffffff' }}>{Math.round(w.ewaste_gen_annual_mt_baseline)?.toLocaleString()} MT</b>
                  </td>
                  <td>
                    <span className={`linear-tag ${catTag}`}>
                      {w.hotspot_category}
                    </span>
                  </td>
                  <td>
                    <span className={`linear-tag ${gapTag}`}>
                      {w.collection_gap_status}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>
                    {w.nearest_facility_distance_km?.toFixed(1)} km
                  </td>
                  <td style={{ maxWidth: '260px', whiteSpace: 'normal', color: '#d0d6e0', fontSize: '12px' }}>
                    {w.recommended_strategy}
                  </td>
                  <td>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 510, color: '#27a644' }}>
                      {w.weekly_collection_trips_needed}
                    </span>
                    <span style={{ fontSize: '11px', color: '#8a8f98' }}> trips/wk</span>
                  </td>
                  <td>
                    <button
                      className="btn-ghost"
                      style={{ padding: '3px 8px', fontSize: '11px' }}
                      onClick={() => onSelectWard(w.name)}
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
