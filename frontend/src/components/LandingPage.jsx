import React from 'react';
import {
  MapPin,
  Calculator,
  Truck,
  ArrowRight,
  Lock,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Zap
} from 'lucide-react';

export default function LandingPage({
  user,
  onSelectFeature,
  onOpenAuth,
  summary
}) {
  const handleFeatureClick = (featureKey) => {
    if (!user) {
      onOpenAuth();
      return;
    }
    onSelectFeature(featureKey);
  };

  const scrollToServices = () => {
    const el = document.getElementById('services-overview');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="tomorro-landing-page">
      {/* ======================================================================
          SECTION 1: HERO CANVAS (Forest Depths #122314)
          ====================================================================== */}
      <section className="tomorro-hero-section">
        {/* Decorative Atmospheric Sprout Orb (from DESIGN.md) */}
        <div className="hero-atmosphere-orb" aria-hidden="true"></div>

        <div className="hero-content-wrapper">
          {/* Event Announcement Pill (from DESIGN.md) */}
          <div className="hero-announcement-pill" onClick={scrollToServices}>
            <span className="announcement-beacon"></span>
            <span>Greater Mumbai Municipal Action</span>
            <span className="announcement-separator">•</span>
            <span className="announcement-highlight">162 Certified Kiosks</span>
            <ChevronRight size={13} className="announcement-chevron" />
          </div>

          {/* Signature Display Headline (Clean 2 Lines) */}
          <h1 className="hero-ozik-headline">
            Electronics reclaimed<br />
            for <span className="hero-sprout-accent">Mumbai</span>.
          </h1>

          {/* Editorial Subhead (Aeonik / Pale Fern copy) */}
          <p className="hero-aeonik-subhead">
            The official municipal contract network for certified electronics take-back,
            precious metal bounties, and residential collection vans. Sign in to unlock
            the city's verified disposal grid.
          </p>

          {/* Hero Dual CTA Row */}
          <div className="hero-cta-cluster">
            {user ? (
              <button
                className="hero-primary-pill"
                onClick={() => onSelectFeature('locator')}
              >
                <span>Enter Drop-Off Portal</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="hero-primary-pill"
                onClick={onOpenAuth}
              >
                <span>Sign In to Access</span>
                <ArrowRight size={15} />
              </button>
            )}

            <button
              className="hero-secondary-ghost"
              onClick={scrollToServices}
            >
              <span>Explore Services</span>
            </button>
          </div>

          {/* Authentication Access Guarantee Note */}
          <div className="hero-lock-notice">
            <Lock size={12} className="notice-lock-icon" />
            <span>
              {!user
                ? 'Sign in required to access Drop-Off Centers, Scrap Bounty Calculator, and Society Vans.'
                : 'Authenticated citizen session active. All network tools unlocked.'}
            </span>
          </div>

          {/* Trust Logo / Metric Proof Strip (from DESIGN.md) */}
          <div className="hero-trust-strip">
            <div className="trust-strip-caption">
              Certified by Maharashtra Pollution Control Board (MPCB) & BMC Urban Cell
            </div>
            <div className="trust-badges-row">
              <span className="trust-badge-item">162 Certified Centers</span>
              <span className="trust-badge-dot">•</span>
              <span className="trust-badge-item">24 Municipal Wards</span>
              <span className="trust-badge-dot">•</span>
              <span className="trust-badge-item">100% Zero-Landfill Guarantee</span>
              <span className="trust-badge-dot">•</span>
              <span className="trust-badge-item">Heavy Metal Leaching Shield</span>
            </div>
          </div>
        </div>

        {/* Floating Product Mockup Card (from DESIGN.md) */}
        <div className="hero-mockup-stage">
          <div className="floating-mockup-card">
            {/* Card Header Bar */}
            <div className="mockup-header-bar">
              <div className="mockup-window-controls">
                <span className="mockup-dot"></span>
                <span className="mockup-dot"></span>
                <span className="mockup-dot"></span>
              </div>
              <div className="mockup-badge-sprout-wash">
                <span className="sprout-status-dot"></span>
                <span>MPCB LIVE NETWORK</span>
              </div>
              <div className="mockup-header-ward">BMC WARD K/W</div>
            </div>

            {/* Mockup Card Inner Preview Content */}
            <div className="mockup-inner-content">
              {/* Featured Drop-Off Kiosk snippet */}
              <div className="mockup-kiosk-item">
                <div className="kiosk-left">
                  <div className="kiosk-pin-icon">
                    <MapPin size={16} color="var(--color-electric-sprout)" />
                  </div>
                  <div>
                    <div className="kiosk-title">EcoRecycle MMR Hub #04</div>
                    <div className="kiosk-subtitle">Andheri West • SV Road Junction</div>
                  </div>
                </div>
                <div className="kiosk-right">
                  <span className="kiosk-distance">0.8 km</span>
                  <span className="kiosk-status">Open Today</span>
                </div>
              </div>

              {/* Quick telemetry counter */}
              <div className="mockup-telemetry-row">
                <div className="mockup-telemetry-box">
                  <div className="telemetry-label">AVERAGE RECOVERY</div>
                  <div className="telemetry-val">₹1,850 <span className="telemetry-unit">per haul</span></div>
                </div>
                <div className="mockup-telemetry-box">
                  <div className="telemetry-label">GOLD & COPPER RECOVERY</div>
                  <div className="telemetry-val">34mg <span className="telemetry-unit">Au (24k)</span></div>
                </div>
              </div>

              {/* Gated Lock Bar Overlay (Forces/invites login) */}
              <div
                className="mockup-gated-banner"
                onClick={() => handleFeatureClick('locator')}
              >
                <div className="gated-banner-content">
                  <Lock size={14} color="var(--color-electric-sprout)" />
                  <span>
                    {!user
                      ? 'Sign in to access turn-by-turn directions and live drop-off kiosk status'
                      : 'Click to launch full drop-off center locator'}
                  </span>
                </div>
                <div className="gated-banner-cta">
                  {!user ? 'Sign In →' : 'Launch →'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION 2: LIGHT CONTRAST BAND (Pure White #ffffff & Bone White #f2f5eb)
          from DESIGN.md: "Alternate page sections between Forest Depths and Pure White"
          ====================================================================== */}
      <section id="services-overview" className="tomorro-light-section">
        <div className="light-section-container">
          <div className="light-section-header">
            <span className="light-kicker">MUNICIPAL NETWORK SERVICES</span>
            <h2 className="light-headline">Three verified ways to dispose of electronic waste</h2>
            <p className="light-subhead">
              Keep toxic lithium, cadmium, and lead out of Mumbai's drinking water and mangroves.
              Every service requires authenticated citizen verification.
            </p>
          </div>

          {/* 3 Bone White Cards (#f2f5eb) */}
          <div className="bone-cards-grid">
            {/* Service Card 1: Drop-Off Centers */}
            <div
              className="bone-feature-card"
              onClick={() => handleFeatureClick('locator')}
            >
              <div className="card-top-row">
                <div className="card-icon-pill">
                  <MapPin size={20} color="var(--color-moss-shadow)" />
                </div>
                <span className="card-lock-badge">
                  {user ? 'Unlocked' : 'Login Required'}
                </span>
              </div>
              <h3 className="card-title">162 Drop-Off Centers</h3>
              <p className="card-description">
                Locate certified government take-back units across all 24 BMC wards.
                Get verified operating hours and turn-by-turn Google Maps routing.
              </p>
              <div className="card-action-bar">
                <span>{user ? 'Open Center Locator' : 'Sign in to access'}</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Service Card 2: Scrap & Gold Bounty Calculator */}
            <div
              className="bone-feature-card"
              onClick={() => handleFeatureClick('calculator')}
            >
              <div className="card-top-row">
                <div className="card-icon-pill">
                  <Calculator size={20} color="var(--color-moss-shadow)" />
                </div>
                <span className="card-lock-badge">
                  {user ? 'Unlocked' : 'Login Required'}
                </span>
              </div>
              <h3 className="card-title">Scrap & Gold Calculator</h3>
              <p className="card-description">
                Audit old smartphones, laptops, and cables before surrendering.
                Calculate recovered 24k gold, high-grade copper, and cash scrap payout.
              </p>
              <div className="card-action-bar">
                <span>{user ? 'Calculate Scrap Value' : 'Sign in to access'}</span>
                <ArrowRight size={14} />
              </div>
            </div>

            {/* Service Card 3: Free Sunday Society Van */}
            <div
              className="bone-feature-card"
              onClick={() => handleFeatureClick('society')}
            >
              <div className="card-top-row">
                <div className="card-icon-pill">
                  <Truck size={20} color="var(--color-moss-shadow)" />
                </div>
                <span className="card-lock-badge">
                  {user ? 'Unlocked' : 'Login Required'}
                </span>
              </div>
              <h3 className="card-title">Sunday Society Van Pickup</h3>
              <p className="card-description">
                Co-operative housing societies with 15+ devices can schedule a municipal
                e-waste collection van directly to their building gate at zero fee.
              </p>
              <div className="card-action-bar">
                <span>{user ? 'Schedule Van Pickup' : 'Sign in to access'}</span>
                <ArrowRight size={14} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================================
          SECTION 3: CLOSING CALL-TO-ACTION (Forest Depths #122314)
          ====================================================================== */}
      <section className="tomorro-closing-section">
        <div className="closing-content">
          <span className="closing-eyebrow">READY TO PARTICIPATE?</span>
          <h2 className="closing-headline">
            Turn your old electronics into clean city impact.
          </h2>
          <p className="closing-subhead">
            Join thousands of Mumbai residents safely diverting hazardous materials
            through verified, government-certified recyclers.
          </p>

          <div className="closing-cta-row">
            {user ? (
              <button
                className="hero-primary-pill"
                onClick={() => onSelectFeature('dashboard')}
              >
                <span>Go to My Citizen Inventory</span>
                <ArrowRight size={15} />
              </button>
            ) : (
              <button
                className="hero-primary-pill"
                onClick={onOpenAuth}
              >
                <span>Sign In / Create Citizen Account</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
