import React from 'react';
import { MapPin, Calculator, Truck, Crosshair, Search, User, LogOut, ShieldCheck, Lock, ArrowRight } from 'lucide-react';

export default function Navbar({
  activeSection,
  setActiveSection,
  onOpenCommandPalette,
  user,
  onOpenAuth,
  onLogout
}) {
  const handleProtectedClick = (section) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    setActiveSection(section);
  };

  return (
    <header className="site-nav-wrapper">
      <nav className="site-floating-nav" aria-label="Main Navigation">
        {/* Left: Brand Wordmark + Discrete Live Beacon */}
        <div className="nav-left">
          <div
            className="nav-logo-mark"
            onClick={() => setActiveSection('landing')}
            role="button"
            tabIndex={0}
            title="EcoDrop Mumbai — Return to Home"
          >
            <div className="botanical-glyph">
              <div className="botanical-glyph-sprout"></div>
            </div>
            <span className="nav-wordmark">ecodrop</span>
            <span className="nav-brand-slash">/</span>
            <span className="nav-brand-region">mumbai</span>
          </div>

          <div className="nav-live-pill" title="162 MPCB Licensed Facilities Online">
            <span className="live-dot-pulse"></span>
            <span>162 Hubs</span>
          </div>
        </div>

        {/* Center: Clean Seamless Navigation Tabs */}
        <div className="nav-center-tabs">
          <button
            className={`nav-pill-tab ${activeSection === 'locator' ? 'active' : ''}`}
            onClick={() => handleProtectedClick('locator')}
            title={!user ? 'Sign in to access Drop-Off Centers' : 'Find Nearest Drop-Off Point'}
          >
            <MapPin size={13} />
            <span>Drop-Offs</span>
            {!user && <Lock size={10} className="nav-lock-icon" />}
          </button>

          <button
            className={`nav-pill-tab ${activeSection === 'calculator' ? 'active' : ''}`}
            onClick={() => handleProtectedClick('calculator')}
            title={!user ? 'Sign in to calculate gadget metal value' : 'Calculate Scrap & Metal Value'}
          >
            <Calculator size={13} />
            <span>Calculator</span>
            {!user && <Lock size={10} className="nav-lock-icon" />}
          </button>

          <button
            className={`nav-pill-tab ${activeSection === 'society' ? 'active' : ''}`}
            onClick={() => handleProtectedClick('society')}
            title={!user ? 'Sign in to schedule society van' : 'Schedule Society Van Collection'}
          >
            <Truck size={13} />
            <span>Society Van</span>
            {!user && <Lock size={10} className="nav-lock-icon" />}
          </button>

          <button
            className={`nav-pill-tab ${activeSection === 'map' ? 'active' : ''}`}
            onClick={() => handleProtectedClick('map')}
            title={!user ? 'Sign in to view ward hotspot intelligence' : 'City Ward Map & Hotspots'}
          >
            <Crosshair size={13} />
            <span>City Map</span>
            {!user && <Lock size={10} className="nav-lock-icon" />}
          </button>

          {user && user.role === 'citizen' && (
            <button
              className={`nav-pill-tab ${activeSection === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveSection('dashboard')}
            >
              <User size={13} />
              <span>Inventory</span>
            </button>
          )}

          {user && user.role === 'admin' && (
            <button
              className={`nav-pill-tab ${activeSection === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveSection('admin')}
              style={{ color: 'var(--color-electric-sprout)' }}
            >
              <ShieldCheck size={13} />
              <span>Admin Console</span>
            </button>
          )}
        </div>

        {/* Right: Quick Search + Auth Cluster */}
        <div className="nav-right">
          <button
            onClick={onOpenCommandPalette}
            className="nav-search-trigger"
            title="Quick Action Palette (Ctrl+K)"
          >
            <Search size={12} />
            <span>Search</span>
            <kbd className="nav-kbd">Ctrl+K</kbd>
          </button>

          {user ? (
            <div className="nav-user-cluster">
              <button
                onClick={() => setActiveSection(user.role === 'admin' ? 'admin' : 'dashboard')}
                className="nav-user-pill"
              >
                <div className={`nav-user-dot ${user.role === 'admin' ? 'dot-admin' : 'dot-citizen'}`}></div>
                <span className="nav-user-name">{user.name.split(' ')[0]}</span>
                <span className="nav-user-role">({user.role})</span>
              </button>

              <button
                onClick={onLogout}
                className="nav-logout-btn"
                title="Sign Out"
              >
                <LogOut size={13} />
              </button>
            </div>
          ) : (
            <div className="nav-auth-cluster">
              <button
                className="nav-signin-ghost"
                onClick={onOpenAuth}
              >
                Sign In
              </button>

              <button
                className="nav-cta-sprout"
                onClick={onOpenAuth}
              >
                <span>Get Started</span>
                <ArrowRight size={13} />
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
}
