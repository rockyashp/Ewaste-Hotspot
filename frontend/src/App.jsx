import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LandingPage from './components/LandingPage';
import MapView from './components/MapView';
import WardInspector from './components/WardInspector';
import AnalyticsSection from './components/AnalyticsSection';
import StrategyTable from './components/StrategyTable';
import CitizenLocator from './components/CitizenLocator';
import CitizenCalculator from './components/CitizenCalculator';
import CitizenSocietyPickup from './components/CitizenSocietyPickup';
import UserDashboard from './components/UserDashboard';
import AdminPortal from './components/AdminPortal';
import AuthModal from './components/AuthModal';
import CommandPalette from './components/CommandPalette';
import { AlertCircle, MessageSquare, Mail } from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  const [summary, setSummary] = useState(null);
  const [wardsGeojson, setWardsGeojson] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [poisGeojson, setPoisGeojson] = useState(null);
  const [selectedWardCode, setSelectedWardCode] = useState('K/W');
  const [metricChoice, setMetricChoice] = useState('hotspot_tier');

  // Authentication State
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Active section: 'landing' (default when logged out) | 'locator' | 'calculator' | 'society' | 'map' | 'dashboard' | 'admin'
  const [activeSection, setActiveSection] = useState('landing');

  const [showFacilities, setShowFacilities] = useState(true);
  const [showBuffers, setShowBuffers] = useState(true);
  const [showPois, setShowPois] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Check saved authentication on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    if (savedToken && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsedUser);
        setActiveSection(parsedUser.role === 'admin' ? 'admin' : 'dashboard');
      } catch (e) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setActiveSection('landing');
      }
    } else {
      setActiveSection('landing');
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser, authToken) => {
    setUser(authenticatedUser);
    setToken(authToken);
    if (authenticatedUser.role === 'admin') {
      setActiveSection('admin');
    } else {
      setActiveSection('dashboard');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    setUser(null);
    setToken(null);
    setActiveSection('landing');
  };

  // Fetch all master datasets from FastAPI on mount
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [sumRes, wardsRes, facRes] = await Promise.all([
          fetch(`${API_BASE}/api/summary`),
          fetch(`${API_BASE}/api/wards`),
          fetch(`${API_BASE}/api/facilities`)
        ]);

        if (!sumRes.ok || !wardsRes.ok || !facRes.ok) {
          throw new Error('Failed to load datasets from backend.');
        }

        const sumData = await sumRes.json();
        const wardsData = await wardsRes.json();
        const facData = await facRes.json();

        setSummary(sumData);
        setWardsGeojson(wardsData);
        setFacilities(facData);

        // Fetch POIs in background
        fetch(`${API_BASE}/api/pois`)
          .then(res => res.ok ? res.json() : null)
          .then(data => { if (data) setPoisGeojson(data); })
          .catch(() => {});

        setError(null);
      } catch (err) {
        console.error(err);
        setError('Cannot connect to backend server. Please verify backend is running on port 8000.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  // Global Keyboard shortcuts: Cmd+K / Ctrl+K
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Selected ward object
  const selectedWard = React.useMemo(() => {
    if (!wardsGeojson || !wardsGeojson.features) return null;
    const feat = wardsGeojson.features.find(f => f.properties.name === selectedWardCode);
    return feat ? feat.properties : wardsGeojson.features[0]?.properties || null;
  }, [wardsGeojson, selectedWardCode]);

  // List of all wards properties
  const allWards = React.useMemo(() => {
    if (!wardsGeojson || !wardsGeojson.features) return [];
    return wardsGeojson.features.map(f => f.properties);
  }, [wardsGeojson]);

  // Callback to focus center on map from locator
  const handleFocusOnMap = (lat, lng, name) => {
    setActiveSection('map');
    window.scrollTo({ top: 120, behavior: 'smooth' });
  };

  // Safe Section Navigation Handler (Gated: Login required for any feature)
  const handleSelectSection = (section) => {
    if (section === 'landing') {
      setActiveSection('landing');
      return;
    }
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (section === 'admin' && user.role !== 'admin') {
      setIsAuthModalOpen(true);
      return;
    }
    setActiveSection(section);
  };

  // Command palette action execution
  const handleCommandAction = (cmd) => {
    if (cmd.wardCode) {
      setSelectedWardCode(cmd.wardCode);
    }
    if (cmd.targetSection) {
      if (cmd.targetSection !== 'landing' && !user) {
        setIsAuthModalOpen(true);
        return;
      }
      if (cmd.targetSection === 'admin' && (!user || user.role !== 'admin')) {
        setIsAuthModalOpen(true);
        return;
      }
      setActiveSection(cmd.targetSection);
    }
  };

  return (
    <div className="app-container">
      {/* Top Floating Pill Navigation */}
      <Navbar
        activeSection={activeSection}
        setActiveSection={handleSelectSection}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="main-content">
        {/* Loading / Error States */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-text-muted)' }}>
            <div style={{ width: '24px', height: '24px', border: '2px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }}></div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-main)' }}>
              Connecting to Mumbai E-Waste Network...
            </p>
          </div>
        )}

        {error && (
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-danger)', borderRadius: '8px', padding: '14px 18px', color: '#fca5a5', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={16} color="var(--color-danger)" />
            <div style={{ fontSize: '13px' }}>
              <b>Connection issue:</b> {error}
            </div>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* View 1: Default Landing Hero Page (always accessible, only view when logged out) */}
            {(activeSection === 'landing' || !user) && (
              <LandingPage
                user={user}
                onSelectFeature={handleSelectSection}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                summary={summary}
                facilities={facilities}
              />
            )}

            {/* Authenticated Feature Views (strictly require login) */}
            {user && (
              <>
                {/* View 2: Drop-Off Finder */}
                {activeSection === 'locator' && (
                  <CitizenLocator
                    facilities={facilities}
                    pois={poisGeojson}
                    onFocusOnMap={handleFocusOnMap}
                  />
                )}

                {/* View 3: Value & Scrap Calculator */}
                {activeSection === 'calculator' && (
                  <CitizenCalculator
                    onFindDropoff={() => setActiveSection('locator')}
                  />
                )}

                {/* View 4: Housing Society Bulk Collection Van */}
                {activeSection === 'society' && (
                  <CitizenSocietyPickup
                    onLocateDropoff={() => setActiveSection('locator')}
                    user={user}
                    token={token}
                  />
                )}

                {/* View 5: Citizen User Dashboard (My Devices & Bookings) */}
                {activeSection === 'dashboard' && (
                  <UserDashboard
                    user={user}
                    token={token}
                    onOpenBookVan={() => setActiveSection('society')}
                  />
                )}

                {/* View 6: Municipal Admin Operations Portal */}
                {activeSection === 'admin' && (
                  <AdminPortal
                    adminUser={user}
                    token={token}
                  />
                )}

                {/* View 7: City E-Waste Map & Ward Intelligence */}
                {activeSection === 'map' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <MapView
                      wardsGeojson={wardsGeojson}
                      facilities={facilities}
                      poisGeojson={poisGeojson}
                      metricChoice={metricChoice}
                      setMetricChoice={setMetricChoice}
                      showFacilities={showFacilities}
                      setShowFacilities={setShowFacilities}
                      showBuffers={showBuffers}
                      setShowBuffers={setShowBuffers}
                      showPois={showPois}
                      setShowPois={setShowPois}
                      selectedWard={selectedWard}
                      onSelectWard={setSelectedWardCode}
                    />

                    <WardInspector
                      ward={selectedWard}
                      allWards={allWards}
                      onSelectWard={setSelectedWardCode}
                    />

                    <AnalyticsSection wardsData={allWards} />

                    <StrategyTable
                      wardsData={allWards}
                      onSelectWard={(code) => {
                        setSelectedWardCode(code);
                        window.scrollTo({ top: 120, behavior: 'smooth' });
                      }}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* Floating Citizen Support Helpline */}
      <aside aria-label="Citizen Support" style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <a
          href="https://api.whatsapp.com/send?phone=918999228999&text=Hi%20BMC%20E-Waste%20Cell%2C%20I%20have%20old%20electronics%20to%20recycle."
          target="_blank"
          rel="noreferrer"
          className="btn-ghost"
          style={{
            background: 'rgba(18, 35, 20, 0.95)',
            borderColor: 'rgba(104, 239, 63, 0.35)',
            backdropFilter: 'blur(12px)',
            color: 'var(--color-accent)',
            padding: '8px 16px',
            fontSize: '12px',
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            borderRadius: '9999px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
          title="Chat with BMC E-Waste Helpline on WhatsApp"
        >
          <MessageSquare size={14} color="var(--color-accent)" />
          <span>BMC Helpline (+91 89992 28999)</span>
        </a>
      </aside>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Quick Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onSelectAction={handleCommandAction}
      />

      {/* Clean Consumer Footer */}
      <footer className="site-footer">
        <div>
          <b>EcoDrop Mumbai</b> — Greater Mumbai Municipal E-Waste Collection Network
        </div>
        <div className="footer-meta">
          <span>Brihanmumbai Municipal Corporation (BMC)</span>
          <span>•</span>
          <span>162 MPCB Authorized Centers</span>
          <span>•</span>
          <span>Free Sunday Housing Society Vans</span>
          <span>•</span>
          <a
            href="https://api.whatsapp.com/send?phone=918999228999&text=Hi%20BMC%20E-Waste%20Cell%2C%20I%20have%20old%20electronics%20to%20recycle."
            target="_blank"
            rel="noreferrer"
          >
            <MessageSquare size={12} />
            <span>WhatsApp: +91 89992 28999</span>
          </a>
          <span>•</span>
          <a
            href="mailto:mybmcassist.support@mcgm.gov.in"
          >
            <Mail size={12} />
            <span>mybmcassist.support@mcgm.gov.in</span>
          </a>
        </div>
      </footer>
    </div>
  );
}
