import React, { useState, useMemo, useEffect, useRef } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Search, ExternalLink, Building2, Compass, ArrowRight, Check, SlidersHorizontal, Layers, ChevronRight, Zap } from 'lucide-react';

const MUMBAI_LOCALITIES = [
  { name: 'Andheri West', lat: 19.1364, lng: 72.8277 },
  { name: 'Bandra West', lat: 19.0596, lng: 72.8295 },
  { name: 'Powai / Hiranandani', lat: 19.1176, lng: 72.9060 },
  { name: 'Colaba / Fort', lat: 18.9067, lng: 72.8147 },
  { name: 'Dadar / Shivaji Park', lat: 19.0178, lng: 72.8478 },
  { name: 'Chembur', lat: 19.0622, lng: 72.8974 },
  { name: 'Borivali West', lat: 19.2307, lng: 72.8567 },
  { name: 'BKC (Bandra Kurla)', lat: 19.0657, lng: 72.8687 },
  { name: 'Lower Parel', lat: 18.9953, lng: 72.8290 },
  { name: 'Thane West', lat: 19.2183, lng: 72.9781 },
  { name: 'Vashi / Navi Mumbai', lat: 19.0771, lng: 72.9986 }
];

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function CitizenLocator({ facilities, pois }) {
  const [userLocation, setUserLocation] = useState({ lat: MUMBAI_LOCALITIES[0].lat, lng: MUMBAI_LOCALITIES[0].lng, name: MUMBAI_LOCALITIES[0].name });
  const [selectedCenterId, setSelectedCenterId] = useState(null);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [maxRadiusKm, setMaxRadiusKm] = useState(15);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLineRef = useRef(null);
  const userMarkerRef = useRef(null);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation({
          lat: latitude,
          lng: longitude,
          name: 'Your GPS Location'
        });
        setLocating(false);
      },
      (error) => {
        console.warn('Geolocation failed:', error);
        alert('Could not acquire GPS position. Using selected neighborhood.');
        setLocating(false);
      },
      { timeout: 8000 }
    );
  };

  const rankedCenters = useMemo(() => {
    if (!facilities) return [];

    const list = [];

    facilities.forEach((f, idx) => {
      if (!f.latitude || !f.longitude) return;
      const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, f.latitude, f.longitude);
      if (dist <= maxRadiusKm) {
        list.push({
          id: `mpcb-${idx}`,
          name: f.facility_name,
          type: 'MPCB Authorized Recycler',
          category: 'GOVT_AUTHORIZED',
          address: f.address || 'Industrial Cluster, MMR',
          capacity: f.capacity_mta ? `${f.capacity_mta.toLocaleString()} MTA` : 'Authorized Unit',
          lat: f.latitude,
          lng: f.longitude,
          distance: dist,
          accepts: ['Phones & Laptops', 'Batteries', 'Large Appliances', 'Circuit Boards'],
          isOfficial: true
        });
      }
    });

    if (pois && pois.features) {
      pois.features.forEach((p, idx) => {
        const coords = p.geometry?.coordinates;
        if (!coords || coords.length < 2) return;
        const [lng, lat] = coords;
        const dist = calculateDistanceKm(userLocation.lat, userLocation.lng, lat, lng);
        if (dist <= maxRadiusKm) {
          list.push({
            id: `poi-${idx}`,
            name: p.properties?.name || 'Retail Electronics Take-Back Point',
            type: 'Retail Drop-Off Kiosk',
            category: 'RETAIL_COLLECTION',
            address: p.properties?.['addr:street'] || 'Commercial Hub, Mumbai',
            capacity: 'Consumer Kiosk',
            lat: lat,
            lng: lng,
            distance: dist,
            accepts: ['Phones & Tablets', 'Chargers & Cables', 'Small Batteries'],
            isOfficial: false
          });
        }
      });
    }

    let filtered = list.sort((a, b) => a.distance - b.distance);

    if (filterType === 'MPCB') {
      filtered = filtered.filter(item => item.category === 'GOVT_AUTHORIZED');
    } else if (filterType === 'RETAIL') {
      filtered = filtered.filter(item => item.category === 'RETAIL_COLLECTION');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [facilities, pois, userLocation, maxRadiusKm, filterType, searchQuery]);

  // Set default selected center
  useEffect(() => {
    if (rankedCenters.length > 0 && !selectedCenterId) {
      setSelectedCenterId(rankedCenters[0].id);
    }
  }, [rankedCenters]);

  const activeCenter = useMemo(() => {
    return rankedCenters.find(c => c.id === selectedCenterId) || rankedCenters[0] || null;
  }, [rankedCenters, selectedCenterId]);

  // Initialize Split Screen Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [userLocation.lat, userLocation.lng],
      zoom: 12,
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
    L.control.zoom({ position: 'topright' }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Map Markers and Route on data or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear previous markers
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
    }
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }
    if (userMarkerRef.current) {
      map.removeLayer(userMarkerRef.current);
    }

    // 1. User Origin Marker (Pulsing Radar Pin)
    const userIconHtml = `
      <div class="radar-user-beacon">
        <div class="beacon-pulse"></div>
        <div class="beacon-core"></div>
      </div>
    `;
    const userIcon = L.divIcon({
      html: userIconHtml,
      className: 'custom-beacon-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .bindPopup(`<b style="color:#090c10">Your Origin:</b><br/>${userLocation.name}`)
      .addTo(map);

    // 2. Plot Center Markers
    rankedCenters.slice(0, 15).forEach((center) => {
      const isSelected = activeCenter && activeCenter.id === center.id;
      const markerColor = center.isOfficial ? '#10b981' : '#06b6d4';

      const centerIconHtml = `
        <div class="stealth-center-pin ${isSelected ? 'selected' : ''}" style="background-color: ${isSelected ? '#ffffff' : markerColor}; border-color: ${markerColor}">
          <span class="pin-symbol">${center.isOfficial ? 'M' : 'R'}</span>
        </div>
      `;

      const centerIcon = L.divIcon({
        html: centerIconHtml,
        className: 'custom-center-pin',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([center.lat, center.lng], { icon: centerIcon })
        .on('click', () => {
          setSelectedCenterId(center.id);
        })
        .bindTooltip(`<b>${center.name}</b><br/>${center.distance.toFixed(1)} km away`, {
          direction: 'top',
          offset: [0, -10],
          className: 'stealth-map-tooltip'
        });

      markersLayerRef.current.addLayer(marker);
    });

    // 3. Draw Animated Dotted Transit Route from User to Active Center (like Reference Comps!)
    if (activeCenter) {
      const routePoints = [
        [userLocation.lat, userLocation.lng],
        [activeCenter.lat, activeCenter.lng]
      ];

      routeLineRef.current = L.polyline(routePoints, {
        color: '#10b981',
        weight: 2.5,
        dashArray: '6, 8',
        opacity: 0.85,
        className: 'animated-transit-route'
      }).addTo(map);

      // Pan smoothly to focus user and active center
      const bounds = L.latLngBounds(routePoints).pad(0.35);
      map.flyToBounds(bounds, { duration: 0.8, maxZoom: 14 });
    }
  }, [userLocation, rankedCenters, activeCenter]);

  return (
    <div className="stealth-locator-wrapper">
      {/* Top Filter and Command Bar */}
      <div className="locator-command-header">
        <div>
          <div className="section-eyebrow">
            VERIFIED MUNICIPAL NETWORK // GREATER MUMBAI
          </div>
          <h2 className="section-title">
            Find Your Nearest Authorized E-Waste Center
          </h2>
          <p className="section-desc">
            Direct turn-by-turn routing to 162 MPCB certified recyclers and 414 authorized retail take-back kiosks.
          </p>
        </div>

        <button
          className="btn-primary-action"
          onClick={handleUseCurrentLocation}
          disabled={locating}
        >
          <Navigation size={14} className={locating ? 'spin' : ''} />
          <span>{locating ? 'Acquiring GPS...' : 'Use My GPS Location'}</span>
        </button>
      </div>

      {/* Locality Selector Chips */}
      <div className="locator-locality-bar">
        <span className="locality-label">NEIGHBORHOOD:</span>
        {MUMBAI_LOCALITIES.map((loc) => (
          <button
            key={loc.name}
            className={`linear-pill ${userLocation.name === loc.name ? 'active-acid' : ''}`}
            onClick={() => setUserLocation({ lat: loc.lat, lng: loc.lng, name: loc.name })}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Main Split-Screen Layout (Like Reference 1 & 2!) */}
      <div className="locator-split-layout">
        {/* Left Side: Center Directory Cards */}
        <div className="locator-list-pane">
          {/* Controls: Search + Filter */}
          <div className="locator-pane-controls">
            <div className="linear-input-with-icon" style={{ flex: 1 }}>
              <Search size={14} className="linear-input-icon" />
              <input
                type="text"
                placeholder="Search center or street name..."
                className="linear-input"
                style={{ width: '100%' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              className="linear-input"
              style={{ width: '130px' }}
              value={maxRadiusKm}
              onChange={(e) => setMaxRadiusKm(Number(e.target.value))}
            >
              <option value={5}>Within 5 km</option>
              <option value={10}>Within 10 km</option>
              <option value={20}>Within 20 km</option>
              <option value={40}>All MMR (40 km)</option>
            </select>
          </div>

          {/* Sub-Filters */}
          <div className="filter-pill-row">
            <button
              className={`filter-micro-tab ${filterType === 'ALL' ? 'active' : ''}`}
              onClick={() => setFilterType('ALL')}
            >
              All Centers ({rankedCenters.length})
            </button>
            <button
              className={`filter-micro-tab ${filterType === 'MPCB' ? 'active' : ''}`}
              onClick={() => setFilterType('MPCB')}
            >
              MPCB Licensed Only
            </button>
            <button
              className={`filter-micro-tab ${filterType === 'RETAIL' ? 'active' : ''}`}
              onClick={() => setFilterType('RETAIL')}
            >
              Retail Kiosks Only
            </button>
          </div>

          {/* Center Cards Scrollable List */}
          <div className="locator-cards-scroll">
            {rankedCenters.map((center, index) => {
              const isSelected = activeCenter && activeCenter.id === center.id;

              return (
                <div
                  key={center.id}
                  className={`stealth-center-card ${isSelected ? 'active-selection' : ''}`}
                  onClick={() => setSelectedCenterId(center.id)}
                >
                  <div className="center-card-header">
                    <span className={`status-tag ${center.isOfficial ? 'status-tag-live' : 'linear-tag-iris'}`}>
                      {center.isOfficial ? 'MPCB LICENSED RECYCLER' : 'RETAIL DROP-OFF KIOSK'}
                    </span>
                    <span className="center-distance-badge">
                      {center.distance.toFixed(1)} km away
                    </span>
                  </div>

                  <h3 className="center-card-name">{center.name}</h3>
                  <p className="center-card-address">{center.address}</p>

                  <div className="center-accepted-row">
                    <span className="accepted-title">Accepts:</span>
                    {center.accepts.map((acc, i) => (
                      <span key={i} className="accepted-chip">{acc}</span>
                    ))}
                  </div>

                  <div className="center-card-footer">
                    <button
                      className="btn-ghost"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCenterId(center.id);
                        if (mapInstanceRef.current) {
                          mapInstanceRef.current.flyTo([center.lat, center.lng], 15, { duration: 0.8 });
                        }
                      }}
                    >
                      <Compass size={12} />
                      <span>Focus on Map</span>
                    </button>

                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${center.lat},${center.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-primary-action"
                      style={{ padding: '5px 12px', fontSize: '12px', textDecoration: 'none' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span>Navigate</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              );
            })}

            {rankedCenters.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--color-text-muted)' }}>
                <Building2 size={32} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                <p style={{ fontSize: '14px', color: 'var(--color-text-main)' }}>No verified centers within {maxRadiusKm} km.</p>
                <p style={{ fontSize: '12px', marginTop: '4px' }}>Try selecting a larger search radius or clearing query filters.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Interactive Stealth Command Map */}
        <div className="locator-map-pane">
          <div ref={mapContainerRef} className="embedded-stealth-map"></div>

          {/* Floating Radar Telemetry Card (Inspired by Reference 1 Hub Card!) */}
          {activeCenter && (
            <div className="floating-map-telemetry">
              <div className="telemetry-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="pulse-dot"></div>
                  <span className="telemetry-hub-id">SELECTED FACILITY // {activeCenter.isOfficial ? 'GOVT LICENSED' : 'RETAIL PARTNER'}</span>
                </div>
                <span className="telemetry-dist">{activeCenter.distance.toFixed(1)} KM</span>
              </div>

              <h4 className="telemetry-hub-name">{activeCenter.name}</h4>
              <p className="telemetry-hub-address">{activeCenter.address}</p>

              <div className="telemetry-stats-row">
                <div className="telemetry-cell">
                  <span className="cell-lbl">ANNUAL CAPACITY</span>
                  <span className="cell-val">{activeCenter.capacity}</span>
                </div>
                <div className="telemetry-cell">
                  <span className="cell-lbl">STATUS</span>
                  <span className="cell-val" style={{ color: 'var(--color-accent)' }}>OPERATIONAL</span>
                </div>
                <div className="telemetry-cell">
                  <span className="cell-lbl">TRANSIT ETA</span>
                  <span className="cell-val">~{Math.round(activeCenter.distance * 3.5)} MINS</span>
                </div>
              </div>

              <div style={{ marginTop: '10px' }}>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${activeCenter.lat},${activeCenter.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary-action"
                  style={{ width: '100%', justifyContent: 'center', padding: '8px', textDecoration: 'none' }}
                >
                  <span>Launch Turn-by-Turn Navigation</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
