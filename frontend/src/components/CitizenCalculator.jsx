import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Award, ShieldAlert, Leaf, Plus, Minus, RotateCcw,
  Printer, ArrowRight, Smartphone, Laptop, Monitor, Tv,
  BatteryCharging, Plug, Refrigerator, Sparkles, MapPin, Compass
} from 'lucide-react';

const DEVICE_PROFILES = [
  {
    id: 'smartphone',
    name: 'Smartphones & Tablets',
    icon: Smartphone,
    gold: 0.034,
    silver: 0.35,
    copper: 15,
    lead: 1.5,
    co2: 18,
    waterProtected: 60000
  },
  {
    id: 'laptop',
    name: 'Laptops & Notebooks',
    icon: Laptop,
    gold: 0.22,
    silver: 1.20,
    copper: 500,
    lead: 12.0,
    co2: 75,
    waterProtected: 250000
  },
  {
    id: 'desktop',
    name: 'Desktop PCs & Monitors',
    icon: Monitor,
    gold: 0.45,
    silver: 2.50,
    copper: 1500,
    lead: 35.0,
    co2: 140,
    waterProtected: 500000
  },
  {
    id: 'television',
    name: 'TV Screens (LED / CRT)',
    icon: Tv,
    gold: 0.15,
    silver: 1.80,
    copper: 1200,
    lead: 50.0,
    co2: 95,
    waterProtected: 400000
  },
  {
    id: 'battery',
    name: 'Li-ion Batteries & Power Banks',
    icon: BatteryCharging,
    gold: 0.00,
    silver: 0.05,
    copper: 80,
    lead: 8.0,
    co2: 12,
    waterProtected: 120000
  },
  {
    id: 'charger',
    name: 'Cables, Adapters & Accessories',
    icon: Plug,
    gold: 0.005,
    silver: 0.08,
    copper: 120,
    lead: 0.5,
    co2: 6,
    waterProtected: 20000
  },
  {
    id: 'appliance',
    name: 'Large Appliances (Fridges/AC)',
    icon: Refrigerator,
    gold: 0.05,
    silver: 0.50,
    copper: 3500,
    lead: 25.0,
    co2: 160,
    waterProtected: 350000
  }
];

export default function CitizenCalculator({ onFindDropoff }) {
  const [quantities, setQuantities] = useState({
    smartphone: 2,
    laptop: 1,
    desktop: 0,
    television: 0,
    battery: 1,
    charger: 3,
    appliance: 0
  });

  const [citizenName, setCitizenName] = useState('');
  const [showCertificate, setShowCertificate] = useState(false);
  const refineryMapRef = useRef(null);
  const refineryMapInstanceRef = useRef(null);

  const updateCount = (id, delta) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, (prev[id] || 0) + delta)
    }));
  };

  const handleReset = () => {
    setQuantities({
      smartphone: 0,
      laptop: 0,
      desktop: 0,
      television: 0,
      battery: 0,
      charger: 0,
      appliance: 0
    });
  };

  const totals = useMemo(() => {
    let goldGrams = 0;
    let silverGrams = 0;
    let copperGrams = 0;
    let leadPreventedGrams = 0;
    let co2SavedKg = 0;
    let waterLiters = 0;
    let totalItems = 0;

    DEVICE_PROFILES.forEach(dev => {
      const count = quantities[dev.id] || 0;
      totalItems += count;
      goldGrams += count * dev.gold;
      silverGrams += count * dev.silver;
      copperGrams += count * dev.copper;
      leadPreventedGrams += count * dev.lead;
      co2SavedKg += count * dev.co2;
      waterLiters += count * dev.waterProtected;
    });

    const monetaryValueInr = Math.round((goldGrams * 6500) + (silverGrams * 75) + (copperGrams * 0.8));
    const treeEquivalent = Math.round(co2SavedKg / 20);
    const gasolineLiters = Math.round(co2SavedKg / 2.3);

    return {
      totalItems,
      goldGrams: parseFloat(goldGrams.toFixed(3)),
      silverGrams: parseFloat(silverGrams.toFixed(2)),
      copperGrams: Math.round(copperGrams),
      leadPreventedGrams: parseFloat(leadPreventedGrams.toFixed(1)),
      co2SavedKg: Math.round(co2SavedKg),
      waterLiters,
      monetaryValueInr,
      treeEquivalent,
      gasolineLiters
    };
  }, [quantities]);

  const certificateId = useMemo(() => {
    return `BMC-EW-${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  // Initialize Refinery Corridor Map
  useEffect(() => {
    if (!refineryMapRef.current) return;
    if (refineryMapInstanceRef.current) return;

    const map = L.map(refineryMapRef.current, {
      center: [19.0650, 72.9700],
      zoom: 11,
      zoomControl: false,
      preferCanvas: true,
      attributionControl: false
    });

    const tileLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      maxNativeZoom: 16,
      attribution: false
    });

    tileLayer.on('tileerror', () => {
      if (!map._hasOsmFallback) {
        map._hasOsmFallback = true;
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          subdomains: 'abc'
        }).addTo(map);
      }
    });

    tileLayer.addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      maxNativeZoom: 16,
      attribution: false
    }).addTo(map);

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const layerGroup = L.layerGroup().addTo(map);

    // 1. Origin: Mumbai Drop-off Hub
    const originIcon = L.divIcon({
      html: `
        <div class="radar-user-beacon">
          <div class="beacon-pulse"></div>
          <div class="beacon-core" style="background: var(--color-accent);"></div>
        </div>
      `,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    L.marker([19.0596, 72.8295], { icon: originIcon })
      .bindTooltip('<b>Mumbai Drop-Off Hub</b><br/>Citizen Collection Point', { direction: 'top', className: 'stealth-map-tooltip' })
      .addTo(layerGroup);

    // 2. Destination: MPCB High-Tech Smelter / Refinery (Taloja MIDC)
    const smelterIcon = L.divIcon({
      html: `
        <div style="background: #e4f222; border: 2px solid #090c10; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px #e4f222;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#122314" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="m7 6 5 5"/></svg>
        </div>
      `,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });
    L.marker([19.0435, 73.1118], { icon: smelterIcon })
      .bindTooltip('<b>Taloja MPCB Metal Refinery</b><br/>High-Tech Smelting & Gold Extraction', { direction: 'top', className: 'stealth-map-tooltip' })
      .addTo(layerGroup);

    // 3. Animated Extraction Corridor Polyline
    const corridorCoords = [
      [19.0596, 72.8295], // Bandra
      [19.0620, 72.8800], // BKC / Kurla
      [19.0450, 72.9300], // Vashi Creek Bridge
      [19.0500, 73.0100], // Nerul / Belapur
      [19.0435, 73.1118]  // Taloja MIDC Smelter
    ];

    L.polyline(corridorCoords, {
      color: '#e4f222',
      weight: 3.5,
      opacity: 0.85,
      className: 'animated-transit-route'
    }).addTo(layerGroup);

    map.fitBounds(L.latLngBounds(corridorCoords).pad(0.2));
    refineryMapInstanceRef.current = map;

    return () => {
      map.remove();
      refineryMapInstanceRef.current = null;
    };
  }, []);

  return (
    <div className="linear-panel">
      {/* Panel Header */}
      <div className="linear-panel-header">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
            HOUSEHOLD SCRAP ESTIMATOR // PRECIOUS RESOURCE AUDIT
          </div>
          <h2 className="linear-panel-title">
            E-Waste Environmental & Material Value Calculator
          </h2>
          <div className="linear-panel-meta">
            Quantify precious metals, prevented toxic groundwater leaching, and carbon offset when you recycle your household electronics.
          </div>
        </div>

        <button
          className="btn-ghost"
          onClick={handleReset}
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          <RotateCcw size={12} />
          <span>Reset Inventory</span>
        </button>
      </div>

      {/* Main Grid: Device Steppers (Left) + Telemetry Readouts (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Device Selection Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '4px' }}>
            DEVICE INVENTORY CONFIGURATION:
          </div>

          {DEVICE_PROFILES.map((dev) => {
            const IconComp = dev.icon;
            const count = quantities[dev.id] || 0;

            return (
              <div
                key={dev.id}
                style={{
                  background: 'var(--color-carbon)',
                  border: count > 0 ? '0.5px solid var(--color-smoke)' : '0.5px solid var(--color-graphite)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'border-color 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '0.5px solid var(--color-graphite)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: count > 0 ? 'var(--color-acid-lime)' : '#8a8f98'
                    }}
                  >
                    <IconComp size={14} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 510, color: '#ffffff' }}>
                      {dev.name}
                    </div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#62666d' }}>
                      ~{dev.gold > 0 ? `${(dev.gold * 1000).toFixed(0)}mg Gold` : 'Toxics Shield'} • {dev.co2}kg CO₂e
                    </div>
                  </div>
                </div>

                {/* Compact Linear Stepper */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    className="btn-ghost"
                    style={{ padding: '2px 6px', borderRadius: '4px' }}
                    onClick={() => updateCount(dev.id, -1)}
                  >
                    <Minus size={11} />
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 510, minWidth: '18px', textAlign: 'center', color: '#ffffff' }}>
                    {count}
                  </span>
                  <button
                    className="btn-ghost"
                    style={{ padding: '2px 6px', borderRadius: '4px' }}
                    onClick={() => updateCount(dev.id, 1)}
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Impact Telemetry Gauges */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '4px' }}>
            RECOVERED RESOURCES & CLIMATE MITIGATION:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
            {/* Gold Element Tile */}
            <div className="linear-kpi-cell" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '8px', right: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#62666d' }}>
                79 / Au
              </div>
              <div className="linear-kpi-label">GOLD (AU) EXTRACTABLE</div>
              <div className="linear-kpi-value" style={{ color: '#e4f222' }}>
                {totals.goldGrams} <span className="linear-kpi-unit">grams</span>
              </div>
              <div className="linear-kpi-sub">
                Salvable 24k circuit gold ~₹{(totals.goldGrams * 6500).toLocaleString()}
              </div>
            </div>

            {/* Silver / Copper Tile */}
            <div className="linear-kpi-cell" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '8px', right: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#62666d' }}>
                29 / Cu • 47 / Ag
              </div>
              <div className="linear-kpi-label">PRECIOUS CONDUCTORS</div>
              <div className="linear-kpi-value">
                {totals.silverGrams}g <span className="linear-kpi-unit">Ag</span> / {(totals.copperGrams / 1000).toFixed(2)}kg <span className="linear-kpi-unit">Cu</span>
              </div>
              <div className="linear-kpi-sub">
                Replaces high-emission ore smelting
              </div>
            </div>

            {/* Lead diverted Tile */}
            <div className="linear-kpi-cell" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '8px', right: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#62666d' }}>
                82 / Pb (TOXIC)
              </div>
              <div className="linear-kpi-label">TOXIC LEAD CONFINED</div>
              <div className="linear-kpi-value" style={{ color: '#eb5757' }}>
                {totals.leadPreventedGrams} <span className="linear-kpi-unit">grams</span>
              </div>
              <div className="linear-kpi-sub" style={{ color: '#eb5757' }}>
                Groundwater shield active
              </div>
            </div>

            {/* Carbon Offset Tile */}
            <div className="linear-kpi-cell" style={{ position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '8px', right: '10px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#62666d' }}>
                CO₂e SHIELD
              </div>
              <div className="linear-kpi-label">NET CLIMATE MITIGATION</div>
              <div className="linear-kpi-value" style={{ color: '#27a644' }}>
                {totals.co2SavedKg} <span className="linear-kpi-unit">kg CO₂e</span>
              </div>
              <div className="linear-kpi-sub">
                = {totals.treeEquivalent} tree seedlings grown
              </div>
            </div>
          </div>

          {/* Cash Bounty & Recovery Banner */}
          <div style={{ background: 'rgba(228, 242, 34, 0.05)', border: '0.5px solid rgba(228, 242, 34, 0.3)', borderRadius: '8px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-acid-lime)', textTransform: 'uppercase', marginBottom: '2px' }}>
                ESTIMATED SECONDARY SCRAP YIELD VALUE
              </div>
              <div style={{ fontSize: '13px', color: '#ffffff' }}>
                Authorized MPCB recyclers pay or offset this material value on handoff.
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '20px', fontWeight: 590, color: 'var(--color-acid-lime)' }}>
                ₹{totals.monetaryValueInr.toLocaleString()}
              </div>
              <button
                className="btn-acid-lime"
                onClick={onFindDropoff}
                style={{ padding: '4px 10px', fontSize: '11px', marginTop: '4px' }}
              >
                Find Centers Near You <ArrowRight size={11} />
              </button>
            </div>
          </div>

          {/* Equivalence Benchmark Strip */}
          <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#27a644', textTransform: 'uppercase', marginBottom: '4px' }}>
              <Leaf size={11} />
              <span>CIRCULAR ECONOMY EQUIVALENCE BENCHMARK</span>
            </div>
            <div style={{ fontSize: '12px', color: '#d0d6e0', lineHeight: 1.5 }}>
              Pledging <b>{totals.totalItems} devices</b> diverts neurotoxic heavy metals and safeguards <b>{(totals.waterLiters / 1000).toLocaleString()} kiloliters of drinking water</b>. Prevents <b>{totals.co2SavedKg} kg CO₂</b> greenhouse emissions — equivalent to avoiding <b>{totals.gasolineLiters} liters of gasoline</b>.
            </div>
          </div>

          {/* Precious Metals Extraction & Smelting Corridor Map */}
          <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '10px', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: 'var(--color-elevated)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="landing-pulse-dot" style={{ background: '#e4f222', boxShadow: '0 0 8px #e4f222' }}></span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#e4f222', letterSpacing: '0.04em' }}>
                  REFINING & SMELTING CORRIDOR // MUMBAI TO MIDC TALOJA
                </span>
              </div>
              <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8292a8' }}>
                EXTRACTABLE: <b style={{ color: '#e4f222' }}>{totals.goldGrams}g Au</b> + <b style={{ color: '#38bdf8' }}>{(totals.copperGrams / 1000).toFixed(2)}kg Cu</b>
              </span>
            </div>

            <div style={{ position: 'relative', height: '220px' }}>
              <div ref={refineryMapRef} style={{ width: '100%', height: '100%', background: '#090c10' }}></div>
              <div style={{ position: 'absolute', bottom: '8px', left: '8px', zIndex: 500, background: 'rgba(9,12,16,0.88)', backdropFilter: 'blur(6px)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: '#e4f222' }}>
                TRANSIT ROUTE // 34 KM TO HIGH-TECH SMELTER
              </div>
            </div>
          </div>

          {/* Certificate Claim Action */}
          <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '14px' }}>
            <div style={{ fontSize: '13px', fontWeight: 510, color: '#ffffff', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Award size={14} color="#e4f222" />
              <span>Claim Official BMC Green Citizen Certificate</span>
            </div>
            <div style={{ fontSize: '12px', color: '#8a8f98', marginBottom: '10px' }}>
              Generate an exportable e-waste stewardship certificate for academic or housing society green audits.
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Enter Citizen / Society Name..."
                className="linear-input"
                style={{ flex: 1 }}
                value={citizenName}
                onChange={(e) => setCitizenName(e.target.value)}
              />

              <button
                className="btn-acid-lime"
                onClick={() => setShowCertificate(true)}
                disabled={totals.totalItems === 0}
              >
                <Sparkles size={13} />
                <span>View Certificate</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertificate && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(8, 9, 10, 0.90)',
            backdropFilter: 'blur(10px)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setShowCertificate(false)}
        >
          <div
            style={{
              background: '#0f1011',
              border: '1px solid rgba(228, 242, 34, 0.4)',
              borderRadius: '12px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ textAlign: 'center', borderBottom: '0.5px solid #23252a', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#e4f222', marginBottom: '6px' }}>
                <Award size={22} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 510, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  BRIHANMUMBAI MUNICIPAL CORPORATION
                </span>
              </div>
              <h2 style={{ fontSize: '22px', fontWeight: 510, color: '#ffffff', letterSpacing: '-0.02em' }}>
                Green Citizen E-Waste Stewardship Pass
              </h2>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#8a8f98', marginTop: '4px' }}>
                CERTIFICATE ID: {certificateId} // E-WASTE MANAGEMENT RULES 2022
              </div>
            </div>

            {/* Body */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <p style={{ fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                PRESENTED IN RECOGNITION TO
              </p>
              <h3 style={{ fontSize: '24px', fontWeight: 590, color: '#ffffff', margin: '6px 0 12px' }}>
                {citizenName.trim() || 'Distinguished Citizen / Housing Society'}
              </h3>
              <p style={{ fontSize: '13px', color: '#d0d6e0', lineHeight: 1.55 }}>
                For responsibly pledging <b>{totals.totalItems} electronic items</b> for certified MPCB recycling, recovering <b>{totals.goldGrams}g Gold</b> and <b>{(totals.copperGrams / 1000).toFixed(2)}kg Copper</b>, while safeguarding Mumbai's groundwater from <b>{totals.leadPreventedGrams}g Lead</b> and mitigating <b>{totals.co2SavedKg} kg CO₂e</b> greenhouse emissions.
              </p>
            </div>

            {/* Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', background: '#08090a', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '10px', color: '#8a8f98', textTransform: 'uppercase' }}>DEVICES PLEDGED</div>
                <div style={{ fontSize: '16px', fontWeight: 510, color: '#ffffff' }}>{totals.totalItems} Units</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#8a8f98', textTransform: 'uppercase' }}>CARBON AVOIDED</div>
                <div style={{ fontSize: '16px', fontWeight: 510, color: '#27a644' }}>{totals.co2SavedKg} kg CO₂e</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: '#8a8f98', textTransform: 'uppercase' }}>MATERIAL VALUE</div>
                <div style={{ fontSize: '16px', fontWeight: 510, color: '#e4f222' }}>₹{totals.monetaryValueInr.toLocaleString()}</div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                className="btn-ghost"
                onClick={() => setShowCertificate(false)}
                style={{ padding: '6px 14px' }}
              >
                Close
              </button>

              <button
                className="btn-acid-lime"
                onClick={() => window.print()}
                style={{ padding: '6px 14px' }}
              >
                <Printer size={13} />
                <span>Print Certificate</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
