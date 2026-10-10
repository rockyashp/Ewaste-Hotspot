import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { Truck, Calendar, Building, Phone, CheckCircle2, Share2, Printer, ArrowRight, ShieldCheck, AlertCircle, MapPin, Navigation, Compass } from 'lucide-react';

const MUMBAI_WARDS_PICKUP = [
  { code: 'K/W', name: 'Andheri West / Juhu / Oshiwara', defaultVan: 'Van Fleet #KW-04', lat: 19.1364, lng: 72.8277, depot: 'Versova Municipal Depot' },
  { code: 'K/E', name: 'Andheri East / Marol / SEEPZ', defaultVan: 'Van Fleet #KE-02', lat: 19.1136, lng: 72.8697, depot: 'Marol Fire Station Hub' },
  { code: 'H/W', name: 'Bandra West / Khar / Santacruz', defaultVan: 'Van Fleet #HW-01', lat: 19.0596, lng: 72.8295, depot: 'Bandra Reclamation Yard' },
  { code: 'H/E', name: 'Bandra East / BKC / Kalina', defaultVan: 'Van Fleet #HE-03', lat: 19.0688, lng: 72.8550, depot: 'BKC Transport Depot' },
  { code: 'G/S', name: 'Worli / Prabhadevi / Lower Parel', defaultVan: 'Van Fleet #GS-02', lat: 19.0130, lng: 72.8258, depot: 'Worli Engineering Works' },
  { code: 'D', name: 'Malabar Hill / Breach Candy / Grant Rd', defaultVan: 'Van Fleet #D-01', lat: 18.9696, lng: 72.8193, depot: 'Tardeo Municipal Garage' },
  { code: 'R/S', name: 'Kandivali / Charkop', defaultVan: 'Van Fleet #RS-05', lat: 19.2062, lng: 72.8534, depot: 'Charkop Sector 8 Depot' },
  { code: 'R/C', name: 'Borivali / IC Colony / Gorai', defaultVan: 'Van Fleet #RC-03', lat: 19.2307, lng: 72.8567, depot: 'Borivali West Garage' },
  { code: 'S', name: 'Bhandup / Powai / Hiranandani', defaultVan: 'Van Fleet #S-02', lat: 19.1176, lng: 72.9060, depot: 'Powai Lake Transit Post' },
  { code: 'M/W', name: 'Chembur / Tilak Nagar', defaultVan: 'Van Fleet #MW-01', lat: 19.0622, lng: 72.8974, depot: 'Chembur Naka Ward Yard' },
  { code: 'F/N', name: 'Matunga / Sion / Wadala', defaultVan: 'Van Fleet #FN-03', lat: 19.0300, lng: 72.8550, depot: 'Wadala TT Municipal Shed' }
];

export default function CitizenSocietyPickup({ onLocateDropoff, user, token }) {
  const [societyName, setSocietyName] = useState('');
  const [contactPerson, setContactPerson] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [wardCode, setWardCode] = useState('K/W');
  const [address, setAddress] = useState('');
  const [pickupDate, setPickupDate] = useState('2024-11-17'); // Next Sunday
  const [estLaptops, setEstLaptops] = useState(12);
  const [estPhones, setEstPhones] = useState(35);
  const [estAppliances, setEstAppliances] = useState(4);
  const [estBatteries, setEstBatteries] = useState(20);

  const [submittedManifest, setSubmittedManifest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedWard = MUMBAI_WARDS_PICKUP.find(w => w.code === wardCode) || MUMBAI_WARDS_PICKUP[0];

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  const totalDevices = estLaptops + estPhones + estAppliances + estBatteries;
  const estWeightKg = Math.round((estLaptops * 2.2) + (estPhones * 0.2) + (estAppliances * 35) + (estBatteries * 0.5));

  // Initialize Ward Van Fleet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [selectedWard.lat, selectedWard.lng],
      zoom: 13,
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

    layersGroupRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map when Ward changes or when Manifest is submitted
  useEffect(() => {
    if (!mapInstanceRef.current || !layersGroupRef.current) return;

    layersGroupRef.current.clearLayers();

    const wardLat = selectedWard.lat;
    const wardLng = selectedWard.lng;
    // Depot offset slightly from ward center for realistic route
    const depotLat = wardLat - 0.008;
    const depotLng = wardLng - 0.009;
    // Society gate position
    const societyLat = wardLat + 0.006;
    const societyLng = wardLng + 0.007;

    // 1. Depot Marker
    const depotIconHtml = `
      <div style="background: #1e293b; border: 1.5px solid #64748b; border-radius: 6px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.6);">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#68ef3f" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M8 10h.01"/><path d="M16 10h.01"/><path d="M8 14h.01"/><path d="M16 14h.01"/></svg>
      </div>
    `;
    const depotIcon = L.divIcon({
      html: depotIconHtml,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([depotLat, depotLng], { icon: depotIcon })
      .bindTooltip(`<b>${selectedWard.depot}</b><br/>Ward ${selectedWard.code} Fleet Base`, {
        direction: 'top',
        className: 'stealth-map-tooltip'
      })
      .addTo(layersGroupRef.current);

    // 2. Society Gate Marker
    const societyIconHtml = `
      <div class="radar-user-beacon">
        <div class="beacon-pulse"></div>
        <div class="beacon-core" style="background: var(--color-accent);"></div>
      </div>
    `;
    const societyIcon = L.divIcon({
      html: societyIconHtml,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    L.marker([societyLat, societyLng], { icon: societyIcon })
      .bindTooltip(`<b>${societyName.trim() || 'Society Gate / Staging'}</b><br/>Ward ${selectedWard.code} Collection Point`, {
        direction: 'top',
        className: 'stealth-map-tooltip'
      })
      .addTo(layersGroupRef.current);

    // 3. Van Midpoint Marker
    const vanMidLat = (depotLat + societyLat) / 2;
    const vanMidLng = (depotLng + societyLng) / 2 + 0.003;
    const vanIconHtml = `
      <div style="background: var(--color-accent); border: 1.5px solid #ffffff; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px var(--color-accent);">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#122314" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
      </div>
    `;
    const vanIcon = L.divIcon({
      html: vanIconHtml,
      className: '',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    L.marker([vanMidLat, vanMidLng], { icon: vanIcon })
      .bindTooltip(`<b>${selectedWard.defaultVan}</b><br/>Dedicated 2.5 MT Electric Van`, {
        direction: 'top',
        className: 'stealth-map-tooltip'
      })
      .addTo(layersGroupRef.current);

    // 4. Animated Transit Route from Depot -> Van -> Society
    const routeCoords = [
      [depotLat, depotLng],
      [vanMidLat, vanMidLng],
      [societyLat, societyLng]
    ];

    L.polyline(routeCoords, {
      color: '#10b981',
      weight: 3.5,
      opacity: 0.9,
      className: 'animated-transit-route'
    }).addTo(layersGroupRef.current);

    // Fit bounds smoothly
    const bounds = L.latLngBounds(routeCoords);
    mapInstanceRef.current.flyToBounds(bounds.pad(0.35), { duration: 1.0 });

  }, [wardCode, societyName, submittedManifest]);

  const handleGenerateTicket = async (e) => {
    e.preventDefault();
    if (!societyName.trim() || !contactPerson.trim() || !phone.trim()) {
      alert('Please fill out the Society Name, Coordinator Name, and Mobile Number.');
      return;
    }

    setSubmitting(true);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch('http://127.0.0.1:8000/api/tickets/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          society_name: societyName.trim(),
          coordinator_name: contactPerson.trim(),
          contact_phone: phone.trim(),
          ward_code: wardCode,
          address: address.trim() || `Main Society Gate, Ward ${wardCode}`,
          pickup_date: pickupDate,
          total_devices: totalDevices,
          est_weight_kg: estWeightKg,
          assigned_van: selectedWard.defaultVan,
          assigned_recycler: 'EcoRecycle Maharashtra MPCB Hub #08'
        })
      });

      if (res.ok) {
        const ticketData = await res.json();
        setSubmittedManifest({
          ticketId: ticketData.ticket_number,
          societyName: ticketData.society_name,
          contactPerson: ticketData.coordinator_name,
          phone: ticketData.contact_phone,
          ward: selectedWard,
          address: ticketData.address,
          pickupDate: ticketData.pickup_date,
          totalDevices: ticketData.total_devices,
          estWeightKg: ticketData.est_weight_kg,
          assignedVan: ticketData.assigned_van,
          assignedRecycler: ticketData.assigned_recycler,
          status: 'SCHEDULED_CONFIRMED'
        });
      } else {
        alert('Could not schedule van. Please try again.');
      }
    } catch (err) {
      console.error('Error creating van ticket:', err);
      alert('Failed to connect to server.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShareWhatsApp = () => {
    if (!submittedManifest) return;
    const msg = encodeURIComponent(
      `*BMC E-Waste Society Collection Drive Scheduled!*\n\n` +
      `*Society:* ${submittedManifest.societyName}\n` +
      `*Date:* ${submittedManifest.pickupDate} (Sunday 10:00 AM - 1:00 PM)\n` +
      `*Assigned:* BMC Dedicated E-Waste Van (${submittedManifest.assignedVan})\n` +
      `*Target:* ${submittedManifest.totalDevices} old electronics (~${submittedManifest.estWeightKg} kg)\n` +
      `*Ticket ID:* ${submittedManifest.ticketId}\n\n` +
      `Please keep all old laptops, broken phones, chargers & dead batteries ready at the society clubhouse/gate! Let us keep Mumbai clean.`
    );
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank');
  };

  return (
    <div className="linear-panel">
      {/* Panel Header */}
      <div className="linear-panel-header">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-accent)', textTransform: 'uppercase', marginBottom: '4px' }}>
            COMMUNITY ZERO-WASTE FLEET // RESIDENTIAL DISPATCH
          </div>
          <h2 className="linear-panel-title">
            Request a Dedicated Municipal Collection Van
          </h2>
          <div className="linear-panel-meta">
            For Co-operative Housing Societies (CHS), educational colleges, and office complexes with 15+ accumulated electronics. Free municipal pickup.
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="linear-tag linear-tag-pulse">
            ZERO CITIZEN FEE
          </span>
          <span className="linear-tag" style={{ border: '1px solid var(--color-border)', color: '#94a3b8' }}>
            WARD {selectedWard.code}
          </span>
        </div>
      </div>

      {/* Interactive Ward Van Dispatch & Route Map */}
      <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', background: 'var(--color-elevated)', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="landing-pulse-dot"></span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-accent)', letterSpacing: '0.04em' }}>
              MUNICIPAL FLEET ROUTE RADAR // WARD {selectedWard.code} ({selectedWard.name.split('/')[0]})
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', fontFamily: 'var(--font-mono)', color: '#8292a8' }}>
            <span>BASE: <b style={{ color: '#fff' }}>{selectedWard.depot}</b></span>
            <span>•</span>
            <span>ASSIGNED: <b style={{ color: 'var(--color-accent)' }}>{selectedWard.defaultVan}</b></span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 280px', minHeight: '260px' }}>
          <div style={{ position: 'relative', minHeight: '260px' }}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: '260px', background: '#090c10' }}></div>
            <div style={{ position: 'absolute', bottom: '10px', left: '10px', zIndex: 500, background: 'rgba(9,12,16,0.85)', backdropFilter: 'blur(6px)', border: '1px solid var(--color-border)', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
              LIVE SUNDAY TRANSIT TRAIL
            </div>
          </div>

          <div style={{ padding: '16px', background: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8292a8', fontFamily: 'var(--font-mono)' }}>DISPATCH SUMMARY</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginTop: '4px' }}>
                {societyName.trim() ? societyName : 'Your Housing Society'}
              </div>
              <div style={{ fontSize: '12px', color: '#8292a8', marginTop: '2px' }}>
                {address.trim() ? address : `Ward ${selectedWard.code} Pickup Point`}
              </div>

              <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: '#8292a8' }}>Municipal Depot:</span>
                  <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{selectedWard.depot.split(' ')[0]} Hub</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '6px' }}>
                  <span style={{ color: '#8292a8' }}>Time Slot:</span>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>10:00 AM – 1:00 PM</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                  <span style={{ color: '#8292a8' }}>Fleet Vehicle:</span>
                  <span style={{ color: '#fff' }}>2.5 MT Electric Van</span>
                </div>
              </div>
            </div>

            <div style={{ background: 'rgba(16, 185, 129, 0.06)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '6px', padding: '8px 10px', fontSize: '11px', color: '#a7f3d0' }}>
              Route optimized for zero-congestion Sunday collection
            </div>
          </div>
        </div>
      </div>

      {!submittedManifest ? (
        <form onSubmit={handleGenerateTicket} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {/* Left Column: Society & Contact Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '2px' }}>
              STEP 1: SOCIETY & LOGISTICS COORDINATOR
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>
                Housing Society / Complex Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sea Breeze CHS / Palm Heights"
                className="linear-input"
                style={{ width: '100%' }}
                value={societyName}
                onChange={(e) => setSocietyName(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>
                  Secretary / Coordinator *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Sharma"
                  className="linear-input"
                  style={{ width: '100%' }}
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>
                  Mobile Number (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9820012345"
                  className="linear-input"
                  style={{ width: '100%' }}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>
                BMC Administrative Ward *
              </label>
              <select
                className="linear-input"
                style={{ width: '100%', background: 'var(--color-carbon)' }}
                value={wardCode}
                onChange={(e) => setWardCode(e.target.value)}
              >
                {MUMBAI_WARDS_PICKUP.map((w) => (
                  <option key={w.code} value={w.code}>
                    Ward {w.code} — {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>
                Society Gate / Clubhouse Address
              </label>
              <input
                type="text"
                placeholder="e.g. Plot 42, Link Road, near Metro Pillar 114"
                className="linear-input"
                style={{ width: '100%' }}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>
                Preferred Sunday Collection Date
              </label>
              <input
                type="date"
                className="linear-input"
                style={{ width: '100%', background: 'var(--color-carbon)' }}
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
              />
            </div>
          </div>

          {/* Right Column: Estimated Device Counts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '2px' }}>
              STEP 2: ESTIMATED ACCUMULATION POOL
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', color: '#d0d6e0', marginBottom: '6px' }}>Laptops & PCs</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="linear-input"
                    style={{ width: '70px', textAlign: 'center' }}
                    value={estLaptops}
                    onChange={(e) => setEstLaptops(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: '11px', color: '#8a8f98' }}>devices</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', color: '#d0d6e0', marginBottom: '6px' }}>Phones & Tablets</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="linear-input"
                    style={{ width: '70px', textAlign: 'center' }}
                    value={estPhones}
                    onChange={(e) => setEstPhones(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: '11px', color: '#8a8f98' }}>devices</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', color: '#d0d6e0', marginBottom: '6px' }}>Large Appliances / TVs</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="linear-input"
                    style={{ width: '70px', textAlign: 'center' }}
                    value={estAppliances}
                    onChange={(e) => setEstAppliances(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: '11px', color: '#8a8f98' }}>units</span>
                </div>
              </div>

              <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-graphite)', borderRadius: '8px', padding: '12px' }}>
                <div style={{ fontSize: '12px', color: '#d0d6e0', marginBottom: '6px' }}>Batteries & Cables</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    min="0"
                    className="linear-input"
                    style={{ width: '70px', textAlign: 'center' }}
                    value={estBatteries}
                    onChange={(e) => setEstBatteries(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                  <span style={{ fontSize: '11px', color: '#8a8f98' }}>items</span>
                </div>
              </div>
            </div>

            {/* Estimated Van Dispatch Payload Card */}
            <div style={{ background: 'var(--color-carbon)', border: '0.5px solid var(--color-smoke)', borderRadius: '8px', padding: '14px', marginTop: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98' }}>ESTIMATED SOCIETY HAUL</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--color-acid-lime)', fontWeight: 510 }}>
                  ~{estWeightKg} kg ({totalDevices} items)
                </span>
              </div>

              <div style={{ fontSize: '12px', color: '#8a8f98', lineHeight: 1.4, marginBottom: '12px' }}>
                Municipal 2.5 MT van will arrive with certified digital scale, tamper-evident seals, and MPCB waste receipt vouchers for each contributing flat owner.
              </div>

              <button
                type="submit"
                className="btn-acid-lime"
                style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
                disabled={totalDevices === 0}
              >
                <Truck size={14} />
                <span>Confirm & Generate BMC Van Dispatch Manifest</span>
              </button>
            </div>
          </div>
        </form>
      ) : (
        /* Generated Manifest Screen */
        <div style={{ background: 'var(--color-carbon)', border: '1px solid rgba(228, 242, 34, 0.4)', borderRadius: '12px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '0.5px solid var(--color-graphite)', paddingBottom: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(39, 166, 68, 0.1)', border: '0.5px solid #27a644', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={20} color="#27a644" />
              </div>
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#27a644' }}>
                  DISPATCH ORDER CONFIRMED // LOGISTICS ACTIVE
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 510, color: '#ffffff', letterSpacing: '-0.01em' }}>
                  BMC E-Waste Special Van Manifest #{submittedManifest.ticketId}
                </h3>
              </div>
            </div>

            <span className="linear-tag linear-tag-pulse">
              SLOT RESERVED
            </span>
          </div>

          {/* Manifest Data Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '24px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8a8f98' }}>HOUSING SOCIETY</div>
              <div style={{ fontSize: '14px', fontWeight: 510, color: '#ffffff' }}>{submittedManifest.societyName}</div>
              <div style={{ fontSize: '12px', color: '#8a8f98' }}>{submittedManifest.address}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#8a8f98' }}>COORDINATOR CONTACT</div>
              <div style={{ fontSize: '14px', fontWeight: 510, color: '#ffffff' }}>{submittedManifest.contactPerson}</div>
              <div style={{ fontSize: '12px', color: '#8a8f98' }}>+91 {submittedManifest.phone}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#8a8f98' }}>WARD & DISPATCH VEHICLE</div>
              <div style={{ fontSize: '14px', fontWeight: 510, color: '#ffffff' }}>Ward {submittedManifest.ward.code}</div>
              <div style={{ fontSize: '12px', color: 'var(--color-acid-lime)' }}>{submittedManifest.assignedVan}</div>
            </div>

            <div>
              <div style={{ fontSize: '11px', color: '#8a8f98' }}>PICKUP SCHEDULE</div>
              <div style={{ fontSize: '14px', fontWeight: 510, color: '#ffffff' }}>{submittedManifest.pickupDate}</div>
              <div style={{ fontSize: '12px', color: '#8a8f98' }}>Window: 10:00 AM – 1:00 PM</div>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', borderTop: '0.5px solid var(--color-graphite)', paddingTop: '16px' }}>
            <button
              className="btn-acid-lime"
              onClick={handleShareWhatsApp}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Share2 size={13} />
              <span>Share Notice to Society WhatsApp Group</span>
            </button>

            <button
              className="btn-ghost"
              onClick={() => window.print()}
            >
              <Printer size={13} />
              <span>Print Gate Pass</span>
            </button>

            <button
              className="btn-ghost"
              onClick={() => setSubmittedManifest(null)}
              style={{ marginLeft: 'auto' }}
            >
              Schedule Another Society
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
