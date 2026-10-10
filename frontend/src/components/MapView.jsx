import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { Compass, Eye, Filter, Flame, Layers, MapPin, RotateCcw, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';

// Key Mumbai Hotspot clusters from data/processed/mumbai_final_planning_matrix.geojson
const DATASET_HOTSPOTS = [
  { code: 'K/W', name: 'Andheri West', cat: 'HIGH', cehi: 100.0, mt: '8,633 MT', lat: 19.126244, lon: 72.827402, radius: 2400 },
  { code: 'S', name: 'Powai / Bhandup', cat: 'HIGH', cehi: 88.8, mt: '7,530 MT', lat: 19.132883, lon: 72.929436, radius: 2200 },
  { code: 'H/W', name: 'Bandra West', cat: 'HIGH', cehi: 65.5, mt: '3,675 MT', lat: 19.064958, lon: 72.8314, radius: 1800 },
  { code: 'K/E', name: 'Andheri East', cat: 'HIGH', cehi: 64.1, mt: '7,474 MT', lat: 19.113823, lon: 72.865495, radius: 2100 },
  { code: 'D', name: 'Malabar / Grant Rd', cat: 'HIGH', cehi: 63.4, mt: '3,748 MT', lat: 18.962339, lon: 72.810047, radius: 1700 },
  { code: 'R/S', name: 'Kandivali', cat: 'MEDIUM', cehi: 58.8, mt: '6,440 MT', lat: 19.204478, lon: 72.859998, radius: 1600 },
  { code: 'L', name: 'Kurla / Sakinaka', cat: 'MEDIUM', cehi: 52.1, mt: '6,523 MT', lat: 19.087556, lon: 72.88667, radius: 1600 },
  { code: 'R/C', name: 'Borivali', cat: 'MEDIUM', cehi: 46.8, mt: '6,057 MT', lat: 19.231247, lon: 72.842988, radius: 1500 },
  { code: 'G/N', name: 'Dadar / Dharavi', cat: 'MEDIUM', cehi: 45.6, mt: '4,343 MT', lat: 19.03404, lon: 72.845168, radius: 1400 },
  { code: 'P/N', name: 'Malad', cat: 'MEDIUM', cehi: 37.2, mt: '7,264 MT', lat: 19.184367, lon: 72.826816, radius: 1400 }
];

export default function MapView({
  wardsGeojson,
  facilities,
  poisGeojson,
  metricChoice,
  setMetricChoice,
  showFacilities,
  setShowFacilities,
  showBuffers,
  setShowBuffers,
  showPois,
  setShowPois,
  selectedWard,
  onSelectWard
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const geojsonLayerRef = useRef(null);
  const facilitiesLayerRef = useRef(null);
  const buffersLayerRef = useRef(null);
  const poisLayerRef = useRef(null);
  const wardLabelsLayerRef = useRef(null);
  const hotspotBeaconsLayerRef = useRef(null);
  const hotspotHalosLayerRef = useRef(null);

  const [hoveredWard, setHoveredWard] = useState(null);
  const [showHotspotBeacons, setShowHotspotBeacons] = useState(true);
  const [showWardLabels, setShowWardLabels] = useState(true);

  // Initialize Map with Esri World Dark Gray Canvas (Zero Watermark & Zero API Key)
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [19.0760, 72.8777],
      zoom: 11,
      zoomControl: true,
      preferCanvas: true,
      attributionControl: false
    });

    // Native High-Contrast Dark Canvas Tile Layer
    const tileLayer = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: false
      }
    );

    // Fallback to OpenStreetMap if offline or blocked
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

    // Dark Gray Reference Overlay Layer (Streets & Locality Labels)
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 19,
        maxNativeZoom: 16,
        attribution: false
      }
    ).addTo(map);

    mapInstanceRef.current = map;

    // Refresh layout size after mount
    setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Compute choropleth styling per feature
  const getFeatureStyle = (properties) => {
    const isSelected = selectedWard && properties.name === selectedWard.name;

    let fillColor = '#15281a';
    let fillOpacity = 0.40;
    let strokeColor = 'rgba(104, 239, 63, 0.25)';
    let strokeWidth = 1.2;

    if (metricChoice === 'hotspot_tier') {
      const cat = properties.hotspot_category || 'LOW';
      if (cat === 'HIGH') {
        fillColor = '#68ef3f'; // Electric Sprout
        fillOpacity = 0.55;
        strokeColor = '#68ef3f';
        strokeWidth = 2.2;
      } else if (cat === 'MEDIUM') {
        fillColor = '#2dd4bf'; // Neon Cyan/Teal
        fillOpacity = 0.40;
        strokeColor = '#2dd4bf';
        strokeWidth = 1.5;
      } else {
        fillColor = '#15281a'; // Deep Forest
        fillOpacity = 0.35;
        strokeColor = 'rgba(104, 239, 63, 0.2)';
        strokeWidth = 1;
      }
    } else if (metricChoice === 'annual_generation') {
      const val = properties.ewaste_gen_annual_mt_baseline || 0;
      if (val > 7000) {
        fillColor = '#68ef3f';
        fillOpacity = 0.65;
        strokeColor = '#68ef3f';
      } else if (val > 5000) {
        fillColor = '#22c55e';
        fillOpacity = 0.50;
        strokeColor = '#22c55e';
      } else if (val > 3000) {
        fillColor = '#0ea5e9';
        fillOpacity = 0.40;
        strokeColor = '#0ea5e9';
      } else {
        fillColor = '#15281a';
        fillOpacity = 0.30;
        strokeColor = 'rgba(255, 255, 255, 0.15)';
      }
    } else if (metricChoice === 'gap_status') {
      const gap = properties.collection_gap_status || '';
      if (gap.includes('CRITICAL')) {
        fillColor = '#f43f5e'; // High Alert Rose
        fillOpacity = 0.60;
        strokeColor = '#f43f5e';
        strokeWidth = 2;
      } else if (gap.includes('MODERATE')) {
        fillColor = '#f59e0b'; // Amber Warning
        fillOpacity = 0.50;
        strokeColor = '#f59e0b';
        strokeWidth = 1.5;
      } else {
        fillColor = '#10b981'; // Covered Green
        fillOpacity = 0.40;
        strokeColor = '#10b981';
      }
    } else { // spatial density
      const dens = properties.ewaste_density_mt_per_sqkm || 0;
      if (dens > 350) {
        fillColor = '#68ef3f';
        fillOpacity = 0.65;
        strokeColor = '#68ef3f';
      } else if (dens > 250) {
        fillColor = '#2dd4bf';
        fillOpacity = 0.50;
        strokeColor = '#2dd4bf';
      } else if (dens > 150) {
        fillColor = '#0284c7';
        fillOpacity = 0.40;
        strokeColor = '#0284c7';
      } else {
        fillColor = '#15281a';
        fillOpacity = 0.30;
        strokeColor = 'rgba(255, 255, 255, 0.15)';
      }
    }

    return {
      fillColor,
      fillOpacity: isSelected ? 0.85 : fillOpacity,
      weight: isSelected ? 3 : strokeWidth,
      color: isSelected ? '#ffffff' : strokeColor,
      dashArray: isSelected ? '' : '2'
    };
  };

  // Render Ward Boundaries Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !wardsGeojson) return;

    if (geojsonLayerRef.current) {
      map.removeLayer(geojsonLayerRef.current);
    }

    const geojsonLayer = L.geoJSON(wardsGeojson, {
      style: (feature) => getFeatureStyle(feature.properties),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;

        layer.on({
          click: () => {
            onSelectWard(p.name);
            if (layer.getBounds) {
              map.fitBounds(layer.getBounds(), { padding: [40, 40], maxZoom: 14 });
            }
          },
          mouseover: (e) => {
            const l = e.target;
            l.setStyle({
              weight: 3,
              color: '#ffffff',
              fillOpacity: 0.90
            });
            l.bringToFront();
            setHoveredWard(p);
          },
          mouseout: (e) => {
            geojsonLayer.resetStyle(e.target);
            setHoveredWard(null);
          }
        });
      }
    }).addTo(map);

    geojsonLayerRef.current = geojsonLayer;
  }, [wardsGeojson, metricChoice, selectedWard]);

  // Hotspot Halos Layer (Dataset-driven intensity circles based on CEHI & tonnage)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hotspotHalosLayerRef.current) {
      map.removeLayer(hotspotHalosLayerRef.current);
      hotspotHalosLayerRef.current = null;
    }

    if (!showHotspotBeacons) return;

    const circles = [];
    DATASET_HOTSPOTS.forEach((hs) => {
      const isHigh = hs.cat === 'HIGH';
      const color = isHigh ? '#68ef3f' : '#2dd4bf';

      const circle = L.circle([hs.lat, hs.lon], {
        radius: hs.radius,
        color: color,
        weight: 1.5,
        dashArray: '4, 6',
        fillColor: color,
        fillOpacity: isHigh ? 0.16 : 0.10
      });

      circle.bindTooltip(
        `<b>${hs.name} (${hs.code})</b><br/>Hotspot Index (CEHI): <b>${hs.cehi}</b><br/>Annual Volume: <b>${hs.mt}</b>`,
        { direction: 'top', className: 'stealth-map-tooltip' }
      );

      circle.on('click', () => {
        onSelectWard(hs.code);
        map.flyTo([hs.lat, hs.lon], 13);
      });

      circles.push(circle);
    });

    const group = L.layerGroup(circles).addTo(map);
    hotspotHalosLayerRef.current = group;
  }, [showHotspotBeacons]);

  // Ward Centroid Labels Layer (Badges displaying Ward Name & Metric)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (wardLabelsLayerRef.current) {
      map.removeLayer(wardLabelsLayerRef.current);
      wardLabelsLayerRef.current = null;
    }

    if (!showWardLabels || !wardsGeojson || !wardsGeojson.features) return;

    const markers = [];
    wardsGeojson.features.forEach((f) => {
      const p = f.properties;
      if (!p.centroid_lat || !p.centroid_lon) return;

      const isHigh = p.hotspot_category === 'HIGH';
      const isMed = p.hotspot_category === 'MEDIUM';
      const isSelected = selectedWard && p.name === selectedWard.name;

      const badgeHtml = `
        <div class="ward-centroid-badge ${isHigh ? 'high' : ''} ${isMed ? 'medium' : ''} ${isSelected ? 'selected' : ''}">
          <span>${p.name}</span>
          <span style="opacity: 0.75; font-size: 9px; font-weight: normal;">
            ${p.hotspot_index_cehi ? p.hotspot_index_cehi.toFixed(0) : ''}
          </span>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-ward-label-container',
        html: badgeHtml,
        iconSize: [44, 20],
        iconAnchor: [22, 10]
      });

      const marker = L.marker([p.centroid_lat, p.centroid_lon], { icon, interactive: true });
      marker.on('click', () => {
        onSelectWard(p.name);
        map.flyTo([p.centroid_lat, p.centroid_lon], 13);
      });

      markers.push(marker);
    });

    const group = L.layerGroup(markers).addTo(map);
    wardLabelsLayerRef.current = group;
  }, [wardsGeojson, showWardLabels, selectedWard]);

  // Hotspot Pulsing Beacons Layer (Animated Radar for High & Medium Hotspots)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hotspotBeaconsLayerRef.current) {
      map.removeLayer(hotspotBeaconsLayerRef.current);
      hotspotBeaconsLayerRef.current = null;
    }

    if (!showHotspotBeacons || !wardsGeojson || !wardsGeojson.features) return;

    const beacons = [];
    wardsGeojson.features.forEach((f) => {
      const p = f.properties;
      if (!p.centroid_lat || !p.centroid_lon) return;
      if (p.hotspot_category !== 'HIGH' && p.hotspot_category !== 'MEDIUM') return;

      const isHigh = p.hotspot_category === 'HIGH';
      const beaconHtml = `
        <div class="hotspot-radar-beacon ${isHigh ? '' : 'medium'}">
          <div class="radar-wave-1"></div>
          <div class="radar-wave-2"></div>
          <div class="radar-core"></div>
        </div>
      `;

      const icon = L.divIcon({
        className: 'custom-hotspot-beacon-container',
        html: beaconHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const beaconMarker = L.marker([p.centroid_lat, p.centroid_lon], { icon });

      const popupHtml = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #ffffff; padding: 6px; min-width: 190px;">
          <div style="font-family: 'Space Mono', monospace; font-size: 10px; color: ${isHigh ? '#68ef3f' : '#2dd4bf'}; letter-spacing: 0.05em; font-weight: 700;">
            ${isHigh ? 'PRIMARY HOTSPOT CLUSTER' : 'SECONDARY HOTSPOT CLUSTER'}
          </div>
          <div style="font-size: 14px; font-weight: 700; margin-top: 3px; color: #ffffff;">
            Ward ${p.name} · ${p.ward_full_name?.split('/')[0] || ''}
          </div>
          <div style="margin-top: 6px; font-size: 11px; color: #a1a1aa; line-height: 1.4;">
            Hotspot Index (CEHI): <strong style="color: #ffffff;">${p.hotspot_index_cehi?.toFixed(1) || 'N/A'}/100</strong><br/>
            Annual Generation: <strong style="color: #68ef3f;">${Math.round(p.ewaste_gen_annual_mt_baseline || 0).toLocaleString()} MT/yr</strong><br/>
            Archetype: <strong style="color: #ffffff;">${p.cluster_archetype || 'Urban Core'}</strong><br/>
            Gap Status: <strong style="color: ${p.collection_gap_status?.includes('CRITICAL') ? '#f43f5e' : '#10b981'};">${p.collection_gap_status}</strong>
          </div>
        </div>
      `;

      beaconMarker.bindPopup(popupHtml, { maxWidth: 280 });
      beaconMarker.on('click', () => {
        onSelectWard(p.name);
      });

      beacons.push(beaconMarker);
    });

    const group = L.layerGroup(beacons).addTo(map);
    hotspotBeaconsLayerRef.current = group;
  }, [wardsGeojson, showHotspotBeacons]);

  // Facilities markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (facilitiesLayerRef.current) {
      map.removeLayer(facilitiesLayerRef.current);
      facilitiesLayerRef.current = null;
    }

    if (!showFacilities || !facilities || facilities.length === 0) return;

    const markers = [];
    facilities.forEach(fac => {
      if (!fac.latitude || !fac.longitude) return;

      const customIcon = L.divIcon({
        className: 'linear-mpcb-marker',
        html: `
          <div style="position: relative; width: 14px; height: 14px;">
            <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: rgba(104, 239, 63, 0.4);"></div>
            <div style="position: absolute; top: 3px; left: 3px; width: 8px; height: 8px; border-radius: 50%; background: #68ef3f; border: 1.5px solid #122314;"></div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([fac.latitude, fac.longitude], { icon: customIcon });

      const popupContent = `
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #ffffff; padding: 4px;">
          <div style="font-family: 'Space Mono', monospace; font-size: 10px; color: #68ef3f; letter-spacing: 0.05em; text-transform: uppercase;">
            MPCB AUTHORIZED RECYCLER
          </div>
          <div style="font-size: 13px; font-weight: 700; margin-top: 2px; color: #ffffff;">
            ${fac.facility_name}
          </div>
          <div style="font-size: 11px; color: #94a3b8; margin-top: 4px;">
            ${fac.address || 'MMR Industrial Cluster'}
          </div>
          <div style="margin-top: 6px; padding-top: 4px; border-top: 0.5px solid rgba(255,255,255,0.1); font-family: monospace; font-size: 10px; color: #68ef3f;">
            Capacity: ${fac.capacity_mta ? fac.capacity_mta.toLocaleString() + ' MTA' : 'Authorized'}
          </div>
        </div>
      `;
      marker.bindPopup(popupContent, { maxWidth: 260 });
      markers.push(marker);
    });

    const layerGroup = L.layerGroup(markers).addTo(map);
    facilitiesLayerRef.current = layerGroup;
  }, [facilities, showFacilities]);

  // Buffer circles (5km & 10km catchment)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (buffersLayerRef.current) {
      map.removeLayer(buffersLayerRef.current);
      buffersLayerRef.current = null;
    }

    if (!showBuffers || !facilities || facilities.length === 0) return;

    const circles = [];
    facilities.slice(0, 30).forEach(fac => {
      if (!fac.latitude || !fac.longitude) return;

      const c5 = L.circle([fac.latitude, fac.longitude], {
        radius: 5000,
        color: '#68ef3f',
        weight: 0.8,
        dashArray: '3, 4',
        fill: false,
        opacity: 0.35
      });

      const c10 = L.circle([fac.latitude, fac.longitude], {
        radius: 10000,
        color: '#94a3b8',
        weight: 0.8,
        dashArray: '4, 6',
        fill: false,
        opacity: 0.25
      });

      circles.push(c5, c10);
    });

    const layerGroup = L.layerGroup(circles).addTo(map);
    buffersLayerRef.current = layerGroup;
  }, [facilities, showBuffers]);

  // Commercial Electronics POIs
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (poisLayerRef.current) {
      map.removeLayer(poisLayerRef.current);
      poisLayerRef.current = null;
    }

    if (!showPois || !poisGeojson) return;

    const poiLayer = L.geoJSON(poisGeojson, {
      pointToLayer: (feature, latlng) => {
        return L.circleMarker(latlng, {
          radius: 3,
          fillColor: '#38bdf8',
          color: '#ffffff',
          weight: 0.5,
          opacity: 0.8,
          fillOpacity: 0.8
        });
      }
    }).addTo(map);

    poisLayerRef.current = poiLayer;
  }, [poisGeojson, showPois]);

  // Quick jump to a hotspot
  const handleFlyToHotspot = (hs) => {
    onSelectWard(hs.code);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([hs.lat, hs.lon], 13, { duration: 1.2 });
    }
  };

  // Reset view to city overview
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([19.0760, 72.8777], 11, { duration: 1.0 });
    }
  };

  return (
    <div className="map-terminal-frame">
      {/* Hotspots Quick Focus Rail (Dataset-driven with zero emojis) */}
      <div className="map-hotspots-jump-bar">
        <div className="jump-bar-label">
          <Flame size={13} color="#68ef3f" />
          <span>Hotspot Clusters:</span>
        </div>
        {DATASET_HOTSPOTS.map((hs) => {
          const isSelected = selectedWard && selectedWard.name === hs.code;
          return (
            <button
              key={hs.code}
              className={`hotspot-chip-btn ${isSelected ? 'active' : ''}`}
              onClick={() => handleFlyToHotspot(hs)}
              title={`Ward ${hs.code} (${hs.name}) - CEHI: ${hs.cehi}`}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                {hs.cat === 'HIGH' ? (
                  <Flame size={11} color={isSelected ? '#122314' : '#68ef3f'} />
                ) : (
                  <Zap size={11} color={isSelected ? '#122314' : '#2dd4bf'} />
                )}
              </span>
              <strong>{hs.name} ({hs.code})</strong>
              <span style={{ opacity: 0.75, fontSize: '10px' }}>{hs.cehi} CEHI</span>
            </button>
          );
        })}
      </div>

      {/* Metric Overlay & Layers Toolbar */}
      <div className="map-terminal-toolbar">
        <div className="map-toolbar-group">
          <span className="map-toolbar-label">METRIC OVERLAY:</span>
          <button
            className={`linear-pill ${metricChoice === 'hotspot_tier' ? 'active-acid' : ''}`}
            onClick={() => setMetricChoice('hotspot_tier')}
          >
            Hotspot Archetypes
          </button>
          <button
            className={`linear-pill ${metricChoice === 'annual_generation' ? 'active-acid' : ''}`}
            onClick={() => setMetricChoice('annual_generation')}
          >
            Annual Tonnage (MT)
          </button>
          <button
            className={`linear-pill ${metricChoice === 'gap_status' ? 'active-acid' : ''}`}
            onClick={() => setMetricChoice('gap_status')}
          >
            Collection Deserts
          </button>
          <button
            className={`linear-pill ${metricChoice === 'density' ? 'active-acid' : ''}`}
            onClick={() => setMetricChoice('density')}
          >
            Spatial Density
          </button>
        </div>

        <div className="map-toolbar-group">
          <span className="map-toolbar-label">LAYERS:</span>
          <button
            className={`linear-pill ${showHotspotBeacons ? 'active' : ''}`}
            onClick={() => setShowHotspotBeacons(!showHotspotBeacons)}
            title="Toggle animated pulse beacons on high & medium hotspots"
          >
            <Zap size={11} color="#68ef3f" />
            Hotspot Beacons
          </button>
          <button
            className={`linear-pill ${showWardLabels ? 'active' : ''}`}
            onClick={() => setShowWardLabels(!showWardLabels)}
            title="Toggle centroid ward labels"
          >
            <MapPin size={11} color="#68ef3f" />
            Ward Badges
          </button>
          <button
            className={`linear-pill ${showFacilities ? 'active' : ''}`}
            onClick={() => setShowFacilities(!showFacilities)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#68ef3f', display: 'inline-block' }}></span>
            MPCB Recyclers ({facilities?.length || 0})
          </button>
          <button
            className={`linear-pill ${showBuffers ? 'active' : ''}`}
            onClick={() => setShowBuffers(!showBuffers)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px dashed #94a3b8', display: 'inline-block' }}></span>
            5/10km Catchment
          </button>
          <button
            className={`linear-pill ${showPois ? 'active' : ''}`}
            onClick={() => setShowPois(!showPois)}
          >
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }}></span>
            Retail POIs (414)
          </button>
        </div>
      </div>

      {/* Map Viewport Container */}
      <div className="map-viewport-container">
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }}></div>

        {/* Coords & Reset View HUD (Cleanly pinned inside viewport) */}
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 1000, display: 'flex', gap: '8px' }}>
          <button
            onClick={handleResetView}
            className="btn-ghost"
            style={{
              background: 'rgba(18, 35, 20, 0.92)',
              borderColor: 'rgba(104, 239, 63, 0.35)',
              color: '#68ef3f',
              padding: '6px 12px',
              fontSize: '11px',
              borderRadius: '9999px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
            }}
            title="Reset to Full Mumbai View"
          >
            <RotateCcw size={12} />
            <span>Reset View</span>
          </button>

          <div className="map-hud-coords">
            <Compass size={12} color="#68ef3f" />
            <span>19.0760° N, 72.8777° E</span>
          </div>
        </div>

        {/* Hover / Live Ward HUD */}
        {hoveredWard && (
          <div className="map-hud-hover">
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#68ef3f', letterSpacing: '0.04em' }}>
              WARD SECTOR // {hoveredWard.name}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff', marginTop: '2px' }}>
              {hoveredWard.ward_full_name?.split('/')[0]}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '8px', fontSize: '11px' }}>
              <div>
                <span style={{ color: '#94a3b8' }}>Generation:</span>
                <div style={{ fontWeight: 600, color: '#ffffff' }}>
                  {Math.round(hoveredWard.ewaste_gen_annual_mt_baseline || 0)?.toLocaleString()} MT/yr
                </div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Hotspot Class:</span>
                <div style={{ fontWeight: 600, color: hoveredWard.hotspot_category === 'HIGH' ? '#68ef3f' : '#2dd4bf' }}>
                  {hoveredWard.hotspot_category} ({hoveredWard.hotspot_index_cehi?.toFixed(1)})
                </div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Nearest Unit:</span>
                <div style={{ fontWeight: 600, color: '#ffffff' }}>
                  {hoveredWard.nearest_facility_distance_km?.toFixed(1)} km
                </div>
              </div>
              <div>
                <span style={{ color: '#94a3b8' }}>Desert Status:</span>
                <div style={{ fontWeight: 600, color: hoveredWard.collection_gap_status?.includes('CRITICAL') ? '#f43f5e' : '#10b981' }}>
                  {hoveredWard.collection_gap_status}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Dynamic Legend */}
        <div className="map-hud-legend">
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#68ef3f', textTransform: 'uppercase', marginBottom: '6px', letterSpacing: '0.05em' }}>
            INDEX SCALE // {metricChoice.toUpperCase()}
          </div>
          {metricChoice === 'hotspot_tier' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1fae5', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#68ef3f', boxShadow: '0 0 6px #68ef3f' }}></span>
                <span>High Hotspot (CEHI &ge; 60)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1fae5', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2dd4bf' }}></span>
                <span>Medium Hotspot (35 - 59)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#94a3b8' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#15281a', border: '1px solid rgba(255,255,255,0.2)' }}></span>
                <span>Low / Suburban (&lt; 35)</span>
              </div>
            </>
          )}

          {metricChoice === 'gap_status' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fecdd3', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f43f5e' }}></span>
                <span>Critical Desert (&gt; 10km)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#fef3c7', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#f59e0b' }}></span>
                <span>Moderate Gap (5-10km)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1fae5' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981' }}></span>
                <span>Well Covered (&lt; 5km)</span>
              </div>
            </>
          )}

          {metricChoice === 'annual_generation' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1fae5', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#68ef3f' }}></span>
                <span>&gt; 7,000 MT/yr</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1fae5', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#22c55e' }}></span>
                <span>5,000 - 7,000 MT/yr</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#bae6fd' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#0ea5e9' }}></span>
                <span>3,000 - 5,000 MT/yr</span>
              </div>
            </>
          )}

          {metricChoice === 'density' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#d1fae5', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#68ef3f' }}></span>
                <span>&gt; 350 MT / km²</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#ccfbf1', marginBottom: '3px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#2dd4bf' }}></span>
                <span>250 - 350 MT / km²</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#bae6fd' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#0284c7' }}></span>
                <span>&lt; 250 MT / km²</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
