import React from 'react';
import { Radio, Users, Flame, AlertOctagon, Factory, Truck } from 'lucide-react';

export default function KpiCards({ summary }) {
  if (!summary) return null;

  return (
    <div className="telemetry-grid">
      {/* 1. Annual Generation */}
      <div className="telemetry-pod">
        <div className="telemetry-pod-header">
          <span className="telemetry-pod-label">Annual E-Waste Generation</span>
          <Radio size={16} className="telemetry-pod-icon" />
        </div>
        <div className="telemetry-pod-value">
          {summary.total_annual_ewaste_mt?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
          <span className="telemetry-pod-unit">MT / yr</span>
        </div>
        <div className="telemetry-pod-sub telemetry-accent-green">
          <span>● {summary.avg_per_capita_kg_year} kg / capita / year benchmark</span>
        </div>
      </div>

      {/* 2. Projected Population */}
      <div className="telemetry-pod">
        <div className="telemetry-pod-header">
          <span className="telemetry-pod-label">Monitored Demographics</span>
          <Users size={16} className="telemetry-pod-icon" />
        </div>
        <div className="telemetry-pod-value">
          {(summary.projected_population_2024 / 1_000_000).toFixed(2)}
          <span className="telemetry-pod-unit">Million Pop</span>
        </div>
        <div className="telemetry-pod-sub">
          <span>24 BMC administrative wards (458.3 km²)</span>
        </div>
      </div>

      {/* 3. Critical Gaps */}
      <div className="telemetry-pod">
        <div className="telemetry-pod-header">
          <span className="telemetry-pod-label">Infrastructure Deserts</span>
          <AlertOctagon size={16} className="telemetry-pod-icon" />
        </div>
        <div className="telemetry-pod-value">
          {summary.gaps_count?.critical}
          <span className="telemetry-pod-unit">Critical Wards</span>
        </div>
        <div className="telemetry-pod-sub telemetry-accent-alert">
          <span>▲ Zero licensed recyclers within 10 km</span>
        </div>
      </div>

      {/* 4. MPCB Facilities */}
      <div className="telemetry-pod">
        <div className="telemetry-pod-header">
          <span className="telemetry-pod-label">Authorized Facilities</span>
          <Factory size={16} className="telemetry-pod-icon" />
        </div>
        <div className="telemetry-pod-value">
          {summary.mpcb_facilities?.accessible_mmr}
          <span className="telemetry-pod-unit">MMR Units</span>
        </div>
        <div className="telemetry-pod-sub telemetry-accent-blue">
          <span>236 registered across Maharashtra (MPCB)</span>
        </div>
      </div>

      {/* 5. Recommended Logistics Fleet */}
      <div className="telemetry-pod">
        <div className="telemetry-pod-header">
          <span className="telemetry-pod-label">Weekly Municipal Fleet</span>
          <Truck size={16} className="telemetry-pod-icon" />
        </div>
        <div className="telemetry-pod-value">
          837
          <span className="telemetry-pod-unit">Trips / Wk</span>
        </div>
        <div className="telemetry-pod-sub">
          <span>Optimized 2.5 MT van schedule citywide</span>
        </div>
      </div>
    </div>
  );
}
