import React, { useState, useEffect } from 'react';
import { Plus, Package, Truck, Sparkles, Trash2, ArrowRight, CheckCircle2, Clock, MapPin, Award } from 'lucide-react';
import { API_BASE } from '../config';

const DEVICE_TYPES = [
  { type: 'Smartphone / Tablet', defaultGold: 0.034, defaultLead: 1.5, estValue: 450 },
  { type: 'Laptop / Notebook', defaultGold: 0.22, defaultLead: 12.0, estValue: 1200 },
  { type: 'Desktop PC / Monitor', defaultGold: 0.45, defaultLead: 35.0, estValue: 1800 },
  { type: 'Television (LED/CRT)', defaultGold: 0.15, defaultLead: 50.0, estValue: 900 },
  { type: 'Chargers, Cables & Adapters', defaultGold: 0.005, defaultLead: 0.5, estValue: 80 },
  { type: 'Power Bank / Li-ion Battery', defaultGold: 0.0, defaultLead: 8.0, estValue: 150 },
  { type: 'Large Appliance (AC/Fridge)', defaultGold: 0.05, defaultLead: 25.0, estValue: 2500 }
];

export default function UserDashboard({ user, token, onOpenBookVan }) {
  const [items, setItems] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form state for logging new item
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedDeviceType, setSelectedDeviceType] = useState(DEVICE_TYPES[0].type);
  const [brandModel, setBrandModel] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [condition, setCondition] = useState('Broken / Scrap');
  const [intent, setIntent] = useState('Drop-Off at Center');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, [user, token]);

  const fetchUserData = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [itemsRes, ticketsRes] = await Promise.all([
        fetch(`${API_BASE}/api/ewaste/my-items`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_BASE}/api/tickets/my-tickets`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (itemsRes.ok) {
        const itemsData = await itemsRes.json();
        setItems(itemsData);
      }
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData);
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogItem = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    const devMeta = DEVICE_TYPES.find(d => d.type === selectedDeviceType) || DEVICE_TYPES[0];
    const estVal = devMeta.estValue * quantity;
    const estGold = devMeta.defaultGold * quantity;
    const estLead = devMeta.defaultLead * quantity;

    try {
      const res = await fetch(`${API_BASE}/api/ewaste/log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          device_type: selectedDeviceType,
          brand_model: brandModel.trim() || 'Unspecified Brand',
          quantity: Number(quantity),
          condition,
          est_value_inr: estVal,
          est_gold_g: estGold,
          est_lead_g: estLead,
          disposal_intent: intent
        })
      });

      if (res.ok) {
        setBrandModel('');
        setQuantity(1);
        setShowLogModal(false);
        fetchUserData();
      } else {
        alert('Could not log item. Please try again.');
      }
    } catch (err) {
      console.error(err);
      alert('Error submitting item.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cumulative stats
  const totalValue = items.reduce((acc, curr) => acc + (curr.est_value_inr || 0), 0);
  const totalGold = items.reduce((acc, curr) => acc + (curr.est_gold_g || 0), 0);
  const totalLead = items.reduce((acc, curr) => acc + (curr.est_lead_g || 0), 0);
  const totalCount = items.reduce((acc, curr) => acc + (curr.quantity || 1), 0);

  return (
    <div className="linear-panel">
      {/* Header */}
      <div className="linear-panel-header">
        <div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#8a8f98', textTransform: 'uppercase', marginBottom: '4px' }}>
            CITIZEN ACCOUNT // {user?.locality || 'MUMBAI'}
          </div>
          <h2 className="linear-panel-title">
            Welcome, {user?.name || 'Citizen'}
          </h2>
          <div className="linear-panel-meta">
            Manage your registered electronic scrap, track collected items, and view your society van pickup bookings.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="btn-acid-lime"
            onClick={() => setShowLogModal(true)}
          >
            <Plus size={13} />
            <span>+ Log Electronic Item</span>
          </button>
        </div>
      </div>

      {/* Citizen Impact Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">REGISTERED DEVICES</div>
          <div className="linear-kpi-value">{totalCount} <span className="linear-kpi-unit">units</span></div>
          <div className="linear-kpi-sub">{items.length} unique items logged</div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">SALVAGEABLE VALUE</div>
          <div className="linear-kpi-value" style={{ color: 'var(--color-acid-lime)' }}>
            ₹{totalValue.toLocaleString()}
          </div>
          <div className="linear-kpi-sub">Secondary scrap recovery</div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">GOLD EXTRACTABLE</div>
          <div className="linear-kpi-value" style={{ color: '#ffffff' }}>
            {totalGold.toFixed(3)} <span className="linear-kpi-unit">grams</span>
          </div>
          <div className="linear-kpi-sub">24k pure circuit gold</div>
        </div>

        <div className="linear-kpi-cell">
          <div className="linear-kpi-label">TOXIC LEAD BLOCKED</div>
          <div className="linear-kpi-value" style={{ color: '#27a644' }}>
            {totalLead.toFixed(1)} <span className="linear-kpi-unit">grams</span>
          </div>
          <div className="linear-kpi-sub">Drinking water safe</div>
        </div>
      </div>

      {/* Two Column Layout: Logged Items (Left) + Society Bookings (Right) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
        {/* Logged Items List */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 590, color: '#ffffff' }}>
              Your Registered E-Waste ({items.length})
            </h3>
            <span style={{ fontSize: '11px', color: '#8a8f98' }}>Saved in PostgreSQL Database</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {items.map((item) => (
              <div
                key={item.id}
                style={{
                  background: 'var(--color-carbon)',
                  border: '0.5px solid var(--color-graphite)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 510, color: '#ffffff' }}>
                    {item.brand_model || item.device_type}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8a8f98', marginTop: '2px' }}>
                    Type: {item.device_type} • Qty: {item.quantity} • Condition: {item.condition}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-acid-lime)', marginTop: '4px' }}>
                    Scrap Yield: ₹{item.est_value_inr?.toLocaleString()} • Gold: ~{item.est_gold_g}g
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className="linear-tag linear-tag-pulse">
                    {item.status}
                  </span>
                  <div style={{ fontSize: '10px', color: '#62666d', marginTop: '4px' }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}

            {items.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--color-carbon)', borderRadius: '8px', border: '0.5px solid var(--color-graphite)' }}>
                <Package size={28} style={{ margin: '0 auto 8px', color: '#62666d' }} />
                <p style={{ fontSize: '13px', color: '#d0d6e0' }}>You haven't logged any old electronics yet.</p>
                <p style={{ fontSize: '11px', color: '#8a8f98', marginTop: '2px' }}>Click "+ Log Electronic Item" above to add your old phones, laptops, or appliances.</p>
              </div>
            )}
          </div>
        </div>

        {/* Booked Society Pickup Tickets */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 590, color: '#ffffff' }}>
              Your Society Van Bookings ({tickets.length})
            </h3>
            <button
              onClick={onOpenBookVan}
              className="btn-ghost"
              style={{ fontSize: '11px', padding: '3px 8px' }}
            >
              + Book New Van
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {tickets.map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'var(--color-carbon)',
                  border: '0.5px solid var(--color-graphite)',
                  borderRadius: '8px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--color-acid-lime)' }}>
                    {t.ticket_number}
                  </span>
                  <span className={`linear-tag ${t.status === 'Completed' ? 'linear-tag-pulse' : 'linear-tag-iris'}`}>
                    {t.status}
                  </span>
                </div>

                <div style={{ fontSize: '13px', fontWeight: 510, color: '#ffffff' }}>
                  {t.society_name} (Ward {t.ward_code})
                </div>

                <div style={{ fontSize: '11px', color: '#8a8f98' }}>
                  Scheduled Date: <b>{t.pickup_date}</b> • Est. Haul: ~{t.est_weight_kg} kg ({t.total_devices} devices)
                </div>

                <div style={{ fontSize: '11px', color: '#62666d' }}>
                  Assigned Vehicle: {t.assigned_van}
                </div>
              </div>
            ))}

            {tickets.length === 0 && (
              <div style={{ textAlign: 'center', padding: '36px 16px', background: 'var(--color-carbon)', borderRadius: '8px', border: '0.5px solid var(--color-graphite)' }}>
                <Truck size={28} style={{ margin: '0 auto 8px', color: '#62666d' }} />
                <p style={{ fontSize: '13px', color: '#d0d6e0' }}>No active society van pickup tickets.</p>
                <p style={{ fontSize: '11px', color: '#8a8f98', marginTop: '2px' }}>You can request a free dedicated municipal collection truck for your housing society.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Log Electronic Item Modal */}
      {showLogModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(8, 9, 10, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 3500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setShowLogModal(false)}
        >
          <div
            style={{
              background: '#0f1011',
              border: '1px solid #23252a',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '480px',
              padding: '24px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.85)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '17px', fontWeight: 590, color: '#ffffff', marginBottom: '4px' }}>
              Log Electronic Item for Disposal
            </h3>
            <p style={{ fontSize: '12px', color: '#8a8f98', marginBottom: '16px' }}>
              Add details of your old electronics to track their scrap value and schedule pickup.
            </p>

            <form onSubmit={handleLogItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Device Category *</label>
                <select
                  className="linear-input"
                  style={{ width: '100%', background: 'var(--color-carbon)' }}
                  value={selectedDeviceType}
                  onChange={(e) => setSelectedDeviceType(e.target.value)}
                >
                  {DEVICE_TYPES.map(d => (
                    <option key={d.type} value={d.type}>{d.type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Brand / Model Name</label>
                <input
                  type="text"
                  placeholder="e.g. Samsung Galaxy S8 / Old Dell Inspiron"
                  className="linear-input"
                  style={{ width: '100%' }}
                  value={brandModel}
                  onChange={(e) => setBrandModel(e.target.value)}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    className="linear-input"
                    style={{ width: '100%' }}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Condition</label>
                  <select
                    className="linear-input"
                    style={{ width: '100%', background: 'var(--color-carbon)' }}
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                  >
                    <option value="Broken / Scrap">Broken / Scrap</option>
                    <option value="Dead / Not Working">Dead / Not Working</option>
                    <option value="Working but Obsolete">Working but Obsolete</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Disposal Preference</label>
                <select
                  className="linear-input"
                  style={{ width: '100%', background: 'var(--color-carbon)' }}
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                >
                  <option value="Drop-Off at Center">I will drop off at nearest center</option>
                  <option value="Include in Society Van Pickup">Include in my housing society van collection</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setShowLogModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-acid-lime"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save to Inventory'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
