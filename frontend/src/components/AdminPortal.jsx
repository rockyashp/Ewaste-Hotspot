import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { ShieldCheck, Truck, Users, Package, CheckCircle2, Clock, Filter, AlertCircle, RefreshCw, Edit3, Compass, MapPin } from 'lucide-react';
import { API_BASE } from '../config';

const WARD_COORDS = {
  'K/W': [19.1364, 72.8277],
  'K/E': [19.1176, 72.8687],
  'H/W': [19.0596, 72.8295],
  'H/E': [19.0657, 72.8687],
  'G/S': [18.9953, 72.8290],
  'D': [18.9600, 72.8147],
  'R/S': [19.2050, 72.8500],
  'R/C': [19.2307, 72.8567],
  'S': [19.1176, 72.9060],
  'M/W': [19.0622, 72.8974],
  'F/N': [19.0178, 72.8478]
};

export default function AdminPortal({ adminUser, token }) {
  const [overview, setOverview] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [citizens, setCitizens] = useState([]);
  const [ewasteItems, setEwasteItems] = useState([]);
  const [activeTab, setActiveTab] = useState('tickets'); // 'tickets' | 'dispatch_map' | 'citizens' | 'ewaste'

  const [wardFilter, setWardFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const adminMapRef = useRef(null);
  const adminMapInstanceRef = useRef(null);
  const adminMarkersGroupRef = useRef(null);

  useEffect(() => {
    fetchAllAdminData();
  }, [token, wardFilter, statusFilter]);

  const fetchAllAdminData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let ticketsUrl = `${API_BASE}/api/admin/tickets`;
      const params = new URLSearchParams();
      if (wardFilter) params.append('ward', wardFilter);
      if (statusFilter) params.append('status_filter', statusFilter);
      if (params.toString()) ticketsUrl += `?${params.toString()}`;

      const [overviewRes, ticketsRes, usersRes, ewasteRes] = await Promise.all([
        fetch(`${API_BASE}/api/admin/overview`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(ticketsUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_BASE}/api/admin/ewaste`, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (overviewRes.ok) setOverview(await overviewRes.json());
      if (ticketsRes.ok) setTickets(await ticketsRes.json());
      if (usersRes.ok) setCitizens(await usersRes.json());
      if (ewasteRes.ok) setEwasteItems(await ewasteRes.json());
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (ticketId, newStatus) => {
    setUpdatingId(ticketId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/tickets/${ticketId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (res.ok) {
        fetchAllAdminData();
      } else {
        alert('Could not update ticket status.');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  // Initialize Fleet Dispatch Map when tab is selected
  useEffect(() => {
    if (activeTab !== 'dispatch_map') {
      if (adminMapInstanceRef.current) {
        adminMapInstanceRef.current.remove();
        adminMapInstanceRef.current = null;
      }
      return;
    }

    if (!adminMapRef.current) return;
    if (adminMapInstanceRef.current) return;

    const map = L.map(adminMapRef.current, {
      center: [19.0760, 72.8777],
      zoom: 11,
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

    adminMarkersGroupRef.current = L.layerGroup().addTo(map);
    adminMapInstanceRef.current = map;
  }, [activeTab]);

  // Plot tickets onto the Dispatch Map
  useEffect(() => {
    if (activeTab !== 'dispatch_map' || !adminMapInstanceRef.current) return;

    if (adminMarkersGroupRef.current) {
      adminMarkersGroupRef.current.clearLayers();
    }

    tickets.forEach((t) => {
      const coords = WARD_COORDS[t.ward_code] || [19.0760, 72.8777];
      const isCompleted = t.status === 'Completed';
      const isDispatched = t.status === 'Van Dispatched';
      const pinColor = isCompleted ? '#3b82f6' : (isDispatched ? '#10b981' : '#f59e0b');

      const pinHtml = `
        <div style="background: ${pinColor}; width: 26px; height: 26px; border-radius: 50%; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 12px ${pinColor}; color: #090c10;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
        </div>
      `;

      const icon = L.divIcon({
        html: pinHtml,
        className: 'admin-van-pin',
        iconSize: [26, 26],
        iconAnchor: [13, 13]
      });

      const popupHtml = `
        <div style="color: #090c10; font-family: var(--font-body); min-width: 180px;">
          <b style="font-size: 14px;">${t.society_name}</b><br/>
          <span style="font-size: 11px; color: #475569;">Ticket: ${t.ticket_number} (Ward ${t.ward_code})</span><br/>
          <div style="margin-top: 6px; font-size: 12px;">
            <b>Date:</b> ${t.pickup_date}<br/>
            <b>Haul:</b> ~${t.est_weight_kg} kg (${t.total_devices} devices)<br/>
            <b>Status:</b> <span style="color: ${pinColor}; font-weight: 600;">${t.status}</span>
          </div>
        </div>
      `;

      L.marker(coords, { icon })
        .bindPopup(popupHtml)
        .addTo(adminMarkersGroupRef.current);
    });
  }, [activeTab, tickets]);

  return (
    <div className="linear-panel">
      {/* Header */}
      <div className="linear-panel-header">
        <div>
          <div className="section-eyebrow">
            MUNICIPAL CONTROL CONSOLE // BMC ENVIRONMENTAL CELL
          </div>
          <h2 className="linear-panel-title">
            Municipal Operations & Fleet Logistics
          </h2>
          <p className="linear-panel-meta">
            Live management of housing society collection trucks, registered citizens, and citywide e-waste material flow.
          </p>
        </div>

        <button
          className="btn-ghost"
          onClick={fetchAllAdminData}
          style={{ fontSize: '12px' }}
        >
          <RefreshCw size={13} className={loading ? 'spin' : ''} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Overview Metric Cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">REGISTERED CITIZENS</div>
          <div className="linear-kpi-value">{overview?.total_citizens || 0}</div>
          <div className="linear-kpi-sub">{overview?.total_users || 0} total accounts</div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">COLLECTION TICKETS</div>
          <div className="linear-kpi-value" style={{ color: 'var(--color-accent)' }}>
            {overview?.total_tickets || 0}
          </div>
          <div className="linear-kpi-sub">{overview?.scheduled_tickets || 0} active / scheduled</div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">TOTAL PLEDGED DEVICES</div>
          <div className="linear-kpi-value">{overview?.total_devices_pledged || 0}</div>
          <div className="linear-kpi-sub">Across housing societies</div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">ESTIMATED TRUCK HAUL</div>
          <div className="linear-kpi-value" style={{ color: 'var(--color-accent)' }}>
            {overview?.total_weight_kg || 0} <span className="linear-kpi-unit">kg</span>
          </div>
          <div className="linear-kpi-sub">Diverted from landfills</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--color-border)', paddingBottom: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          className={`linear-pill ${activeTab === 'tickets' ? 'active-acid' : ''}`}
          onClick={() => setActiveTab('tickets')}
        >
          <Truck size={13} />
          <span>Society Collection Tickets ({tickets.length})</span>
        </button>

        <button
          className={`linear-pill ${activeTab === 'dispatch_map' ? 'active-acid' : ''}`}
          onClick={() => setActiveTab('dispatch_map')}
        >
          <Compass size={13} />
          <span>Live Fleet Dispatch Map</span>
        </button>

        <button
          className={`linear-pill ${activeTab === 'citizens' ? 'active-acid' : ''}`}
          onClick={() => setActiveTab('citizens')}
        >
          <Users size={13} />
          <span>Registered Citizens ({citizens.length})</span>
        </button>

        <button
          className={`linear-pill ${activeTab === 'ewaste' ? 'active-acid' : ''}`}
          onClick={() => setActiveTab('ewaste')}
        >
          <Package size={13} />
          <span>Logged E-Waste Items ({ewasteItems.length})</span>
        </button>
      </div>

      {/* Tab 1: Society Collection Tickets */}
      {activeTab === 'tickets' && (
        <div>
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <select
              className="linear-input"
              style={{ background: 'var(--color-elevated)' }}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Ticket Statuses</option>
              <option value="Approved & Scheduled">Approved & Scheduled</option>
              <option value="Van Dispatched">Van Dispatched</option>
              <option value="Completed">Completed</option>
              <option value="Pending Review">Pending Review</option>
            </select>

            <select
              className="linear-input"
              style={{ background: 'var(--color-elevated)' }}
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
            >
              <option value="">All BMC Wards</option>
              <option value="K/W">Ward K/W (Andheri West)</option>
              <option value="H/W">Ward H/W (Bandra West)</option>
              <option value="G/S">Ward G/S (Worli / Lower Parel)</option>
              <option value="S">Ward S (Powai / Bhandup)</option>
              <option value="D">Ward D (Malabar Hill)</option>
            </select>
          </div>

          {/* Tickets Table */}
          <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
            <table className="linear-table">
              <thead>
                <tr>
                  <th>TICKET ID</th>
                  <th>HOUSING SOCIETY & WARD</th>
                  <th>COORDINATOR</th>
                  <th>SCHEDULE DATE</th>
                  <th>EST. HAUL</th>
                  <th>ASSIGNED VAN</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-accent)', fontWeight: 600 }}>
                        {t.ticket_number}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-white)' }}>{t.society_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ward {t.ward_code} • {t.address}</div>
                    </td>
                    <td>
                      <div>{t.coordinator_name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>+91 {t.contact_phone}</div>
                    </td>
                    <td>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{t.pickup_date}</div>
                    </td>
                    <td>
                      <div>~{t.est_weight_kg} kg</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{t.total_devices} devices</div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-body)' }}>{t.assigned_van}</span>
                    </td>
                    <td>
                      <span className={`linear-tag ${t.status === 'Completed' ? 'status-tag-live' : (t.status === 'Van Dispatched' ? 'linear-tag-iris' : 'status-tag-live')}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <select
                        className="linear-input"
                        style={{ fontSize: '11px', padding: '4px 6px', background: 'var(--color-elevated)' }}
                        value={t.status}
                        disabled={updatingId === t.id}
                        onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                      >
                        <option value="Approved & Scheduled">Scheduled</option>
                        <option value="Van Dispatched">Dispatched</option>
                        <option value="Completed">Completed</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                ))}

                {tickets.length === 0 && (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                      No van collection tickets found matching the selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Live Fleet Dispatch Map (Front & Center Map Experience!) */}
      {activeTab === 'dispatch_map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              Real-time map view of active society pickups across Greater Mumbai. Click pins to view haul details.
            </span>
            <div style={{ display: 'flex', gap: '10px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
              <span style={{ color: '#f59e0b' }}>● Scheduled</span>
              <span style={{ color: '#10b981' }}>● Dispatched</span>
              <span style={{ color: '#3b82f6' }}>● Completed</span>
            </div>
          </div>

          <div style={{ height: '520px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--color-border)', position: 'relative' }}>
            <div ref={adminMapRef} style={{ width: '100%', height: '100%', background: '#090c10' }}></div>
          </div>
        </div>
      )}

      {/* Tab 3: Registered Citizens */}
      {activeTab === 'citizens' && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <table className="linear-table">
            <thead>
              <tr>
                <th>CITIZEN NAME</th>
                <th>EMAIL</th>
                <th>PHONE</th>
                <th>LOCALITY</th>
                <th>ROLE</th>
                <th>JOIN DATE</th>
              </tr>
            </thead>
            <tbody>
              {citizens.map((c) => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-white)' }}>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.phone || '—'}</td>
                  <td>{c.locality || 'Mumbai'}</td>
                  <td>
                    <span className={`linear-tag ${c.role === 'admin' ? 'status-tag-live' : 'linear-tag-iris'}`}>
                      {c.role.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab 4: Logged E-Waste Items */}
      {activeTab === 'ewaste' && (
        <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: '10px' }}>
          <table className="linear-table">
            <thead>
              <tr>
                <th>ITEM ID</th>
                <th>DEVICE CATEGORY</th>
                <th>BRAND / MODEL</th>
                <th>QUANTITY</th>
                <th>CONDITION</th>
                <th>EST. VALUE</th>
                <th>GOLD (AU)</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {ewasteItems.map((item) => (
                <tr key={item.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-text-muted)' }}>#{item.id}</td>
                  <td style={{ fontWeight: 600, color: 'var(--color-text-white)' }}>{item.device_type}</td>
                  <td>{item.brand_model || '—'}</td>
                  <td>{item.quantity}</td>
                  <td>{item.condition}</td>
                  <td style={{ color: 'var(--color-accent)', fontWeight: 600 }}>₹{item.est_value_inr?.toLocaleString()}</td>
                  <td>{item.est_gold_g}g</td>
                  <td>
                    <span className="status-tag status-tag-live">{item.status}</span>
                  </td>
                </tr>
              ))}

              {ewasteItems.length === 0 && (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    No citizen e-waste items logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
