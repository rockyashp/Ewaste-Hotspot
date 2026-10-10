import React, { useState } from 'react';
import { X, Lock, Mail, User, Phone, MapPin, ShieldCheck, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [isAdminTab, setIsAdminTab] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [locality, setLocality] = useState('Andheri West');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = isRegister ? 'http://127.0.0.1:8000/api/auth/register' : 'http://127.0.0.1:8000/api/auth/login';
    const payload = isRegister
      ? { name, email, password, phone, locality }
      : { email, password };

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Authentication failed. Please check your details.');
      }

      // Save token and user in localStorage
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('auth_user', JSON.stringify(data.user));

      onAuthSuccess(data.user, data.access_token);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setIsRegister(false);
    setIsAdminTab(true);
    setEmail('admin@bmc.gov.in');
    setPassword('admin123');
  };

  const handleFillDemoCitizen = () => {
    setIsRegister(false);
    setIsAdminTab(false);
    setEmail('citizen@mumbai.in');
    setPassword('citizen123');
  };

  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--color-forest-depths)',
          border: '1px solid var(--color-onyx-olive)',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '460px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85), 0 0 24px rgba(104, 239, 63, 0.1)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{ padding: '22px 26px', borderBottom: '1px solid var(--color-onyx-olive)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(39, 63, 43, 0.25)' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--font-ozik)', fontSize: '20px', fontWeight: 700, color: 'var(--color-pure-white)', letterSpacing: '-0.01em' }}>
              {isRegister ? 'Create Citizen Account' : (isAdminTab ? 'Municipal Admin Sign In' : 'Sign In to EcoDrop')}
            </h3>
            <p style={{ fontFamily: 'var(--font-aeonik)', fontSize: '13px', color: 'var(--color-pale-fern)', marginTop: '3px' }}>
              {isRegister ? 'Track your recycled devices and manage pickup bookings' : 'Access Drop-Off Finder, Scrap Bounty, and City Maps'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--color-lichen-sage)', cursor: 'pointer', padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-onyx-olive)', background: 'rgba(18, 35, 20, 0.8)' }}>
          <button
            type="button"
            onClick={() => { setIsRegister(false); setIsAdminTab(false); setError(null); }}
            style={{
              flex: 1,
              padding: '12px 10px',
              fontFamily: 'var(--font-aeonik)',
              fontSize: '13px',
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              borderBottom: (!isRegister && !isAdminTab) ? '2px solid var(--color-electric-sprout)' : '2px solid transparent',
              color: (!isRegister && !isAdminTab) ? 'var(--color-pure-white)' : 'var(--color-lichen-sage)',
              cursor: 'pointer'
            }}
          >
            Citizen Sign In
          </button>

          <button
            type="button"
            onClick={() => { setIsRegister(true); setIsAdminTab(false); setError(null); }}
            style={{
              flex: 1,
              padding: '12px 10px',
              fontFamily: 'var(--font-aeonik)',
              fontSize: '13px',
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              borderBottom: isRegister ? '2px solid var(--color-electric-sprout)' : '2px solid transparent',
              color: isRegister ? 'var(--color-pure-white)' : 'var(--color-lichen-sage)',
              cursor: 'pointer'
            }}
          >
            New Citizen
          </button>

          <button
            type="button"
            onClick={() => { setIsRegister(false); setIsAdminTab(true); setError(null); }}
            style={{
              flex: 1,
              padding: '12px 10px',
              fontFamily: 'var(--font-aeonik)',
              fontSize: '13px',
              fontWeight: 500,
              background: 'transparent',
              border: 'none',
              borderBottom: (!isRegister && isAdminTab) ? '2px solid var(--color-electric-sprout)' : '2px solid transparent',
              color: (!isRegister && isAdminTab) ? 'var(--color-pure-white)' : 'var(--color-lichen-sage)',
              cursor: 'pointer'
            }}
          >
            Admin Portal
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {error && (
            <div style={{ background: 'rgba(235, 87, 87, 0.1)', border: '0.5px solid #eb5757', borderRadius: '6px', padding: '10px 12px', color: '#fca5a5', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={14} color="#eb5757" />
              <span>{error}</span>
            </div>
          )}

          {isRegister && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Full Name *</label>
                <div style={{ position: 'relative' }}>
                  <User size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#62666d' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="linear-input"
                    style={{ width: '100%', paddingLeft: '32px' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Mobile Number</label>
                  <div style={{ position: 'relative' }}>
                    <Phone size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#62666d' }} />
                    <input
                      type="tel"
                      placeholder="9820012345"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="linear-input"
                      style={{ width: '100%', paddingLeft: '32px' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Neighborhood</label>
                  <div style={{ position: 'relative' }}>
                    <MapPin size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#62666d' }} />
                    <input
                      type="text"
                      placeholder="e.g. Andheri West"
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      className="linear-input"
                      style={{ width: '100%', paddingLeft: '32px' }}
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Email Address *</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#62666d' }} />
              <input
                type="email"
                required
                placeholder={isAdminTab ? "admin@bmc.gov.in" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="linear-input"
                style={{ width: '100%', paddingLeft: '32px' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#8a8f98', marginBottom: '4px' }}>Password *</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: '#62666d' }} />
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="linear-input"
                style={{ width: '100%', paddingLeft: '32px' }}
              />
            </div>
          </div>

          <button
            type="submit"
            className="hero-primary-pill"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '10px' }}
          >
            <span>{loading ? 'Authenticating...' : (isRegister ? 'Register Citizen Account' : (isAdminTab ? 'Sign In as Admin' : 'Sign In to EcoDrop'))}</span>
            <ArrowRight size={15} />
          </button>

          {/* Quick Demo Credentials Helpers */}
          <div style={{ borderTop: '1px solid var(--color-onyx-olive)', paddingTop: '16px', marginTop: '8px', textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-lichen-sage)', letterSpacing: '0.06em', marginBottom: '8px', textTransform: 'uppercase' }}>
              Instant Demo Credentials:
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleFillDemoCitizen}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', borderColor: 'var(--color-onyx-olive)', color: 'var(--color-pure-white)' }}
              >
                Demo Citizen (Aarav)
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={handleFillDemoAdmin}
                style={{ fontSize: '12px', padding: '6px 14px', borderRadius: '20px', borderColor: 'var(--color-deep-verdant)', color: 'var(--color-electric-sprout)' }}
              >
                BMC Admin (Officer)
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
