import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis, Cell, PieChart, Pie, Legend, CartesianGrid
} from 'recharts';
import { BarChart3, ScatterChart as ScatterIcon, PieChart as PieIcon } from 'lucide-react';

export default function AnalyticsSection({ wardsData }) {
  const [activeTab, setActiveTab] = useState('ranking');

  if (!wardsData || wardsData.length === 0) return null;

  const rankingData = [...wardsData]
    .sort((a, b) => b.ewaste_gen_annual_mt_baseline - a.ewaste_gen_annual_mt_baseline)
    .map(w => ({
      name: `Ward ${w.name}`,
      ward_code: w.name,
      tonnage: Math.round(w.ewaste_gen_annual_mt_baseline),
      tier: w.hotspot_category,
      per_capita: w.ewaste_per_capita_kg_year
    }));

  const scatterData = wardsData.map(w => ({
    name: `Ward ${w.name} (${w.ward_full_name?.split('/')[0]})`,
    pc_penetration: parseFloat(w.pct_total_pc.toFixed(1)),
    per_capita: parseFloat(w.ewaste_per_capita_kg_year.toFixed(2)),
    population: w.pop_2024_projected,
    tier: w.hotspot_category
  }));

  const gapCounts = {};
  wardsData.forEach(w => {
    const s = w.collection_gap_status;
    gapCounts[s] = (gapCounts[s] || 0) + 1;
  });
  const pieData = Object.keys(gapCounts).map(k => ({
    name: k,
    value: gapCounts[k]
  }));

  const getTierColor = (tier) => {
    if (tier === 'HIGH') return '#e4f222'; // Acid Lime
    if (tier === 'MEDIUM') return '#27a644'; // Pulse Green
    return '#23252a'; // Graphite
  };

  const getGapColor = (name) => {
    if (name.includes('CRITICAL')) return '#eb5757'; // Coral Red
    if (name.includes('MODERATE')) return '#d97706';
    return '#27a644';
  };

  return (
    <div className="linear-panel">
      {/* Header */}
      <div className="linear-panel-header">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '4px' }}>
            STATISTICAL TELEMETRY // WARD DISTRIBUTIONS
          </div>
          <h2 className="linear-panel-title">
            Geospatial Analytics & Diagnostic Decks
          </h2>
          <div className="linear-panel-meta">
            Comparative empirical distributions across all 24 administrative wards of Greater Mumbai.
          </div>
        </div>

        {/* 9999px Pill Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            className={`linear-pill ${activeTab === 'ranking' ? 'active-acid' : ''}`}
            onClick={() => setActiveTab('ranking')}
          >
            <BarChart3 size={13} />
            <span>Tonnage Ranking</span>
          </button>

          <button
            className={`linear-pill ${activeTab === 'scatter' ? 'active-acid' : ''}`}
            onClick={() => setActiveTab('scatter')}
          >
            <ScatterIcon size={13} />
            <span>Affluence vs. Rate</span>
          </button>

          <button
            className={`linear-pill ${activeTab === 'gap' ? 'active-acid' : ''}`}
            onClick={() => setActiveTab('gap')}
          >
            <PieIcon size={13} />
            <span>Desert Distribution</span>
          </button>
        </div>
      </div>

      {/* Charts Viewports */}
      <div style={{ minHeight: '360px' }}>
        {activeTab === 'ranking' && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', marginBottom: '14px', textTransform: 'uppercase' }}>
              DISTRIBUTION OF ANNUAL E-WASTE GENERATION (METRIC TONNES / YEAR)
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={rankingData} margin={{ top: 10, right: 10, left: 0, bottom: 35 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#23252a" />
                <XAxis dataKey="ward_code" angle={-45} textAnchor="end" tick={{ fontSize: 11, fill: '#8a8f98' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8a8f98' }} />
                <Tooltip
                  formatter={(val) => [`${val.toLocaleString()} MT/yr`, 'Generation']}
                  contentStyle={{
                    backgroundColor: '#0f1011',
                    border: '0.5px solid #383b3f',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontFamily: 'Inter',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="tonnage" radius={[2, 2, 0, 0]}>
                  {rankingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getTierColor(entry.tier)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'scatter' && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', marginBottom: '14px', textTransform: 'uppercase' }}>
              CORRELATION: HOUSEHOLD PC PENETRATION (%) VS. PER-CAPITA RATE (KG/YEAR)
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <ScatterChart margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="2 2" stroke="#23252a" />
                <XAxis
                  type="number"
                  dataKey="pc_penetration"
                  name="PC Penetration (%)"
                  unit="%"
                  tick={{ fontSize: 11, fill: '#8a8f98' }}
                  label={{ value: 'Household PC Penetration (%)', position: 'insideBottom', offset: -10, fill: '#8a8f98', fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="per_capita"
                  name="Per Capita E-Waste"
                  unit=" kg"
                  tick={{ fontSize: 11, fill: '#8a8f98' }}
                  label={{ value: 'Per Capita (kg/year)', angle: -90, position: 'insideLeft', fill: '#8a8f98', fontSize: 11 }}
                />
                <ZAxis type="number" dataKey="population" range={[60, 400]} name="Population" />
                <Tooltip
                  cursor={{ strokeDasharray: '2 2' }}
                  contentStyle={{
                    backgroundColor: '#0f1011',
                    border: '0.5px solid #383b3f',
                    borderRadius: '6px',
                    color: '#ffffff',
                    fontSize: '12px'
                  }}
                />
                <Scatter name="Wards" data={scatterData}>
                  {scatterData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.tier === 'HIGH' ? '#e4f222' : (entry.tier === 'MEDIUM' ? '#27a644' : '#383b3f')} stroke="#08090a" strokeWidth={1} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'gap' && (
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', marginBottom: '14px', textTransform: 'uppercase' }}>
              INFRASTRUCTURE GAP CLASSIFICATION RATIO (24 ADMINISTRATIVE WARDS)
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  innerRadius={55}
                  dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getGapColor(entry.name)} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f1011',
                    border: '0.5px solid #383b3f',
                    borderRadius: '6px',
                    color: '#ffffff'
                  }}
                />
                <Legend wrapperStyle={{ color: '#8a8f98', fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
