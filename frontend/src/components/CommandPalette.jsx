import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Calculator, Truck, Compass, ArrowRight, X, Sparkles, Building2 } from 'lucide-react';

const COMMON_COMMANDS = [
  { id: 'c-loc', title: 'Find Nearest E-Waste Drop-Off Center', category: 'Drop-Off', icon: MapPin, targetSection: 'locator' },
  { id: 'c-calc', title: 'Calculate Gold, Copper & Scrap Value', category: 'Value Calculator', icon: Calculator, targetSection: 'calculator' },
  { id: 'c-soc', title: 'Schedule Society Collection Truck (Free Pickup)', category: 'Society Van', icon: Truck, targetSection: 'society' },
  { id: 'c-map', title: 'Explore Mumbai Ward Hotspot Map', category: 'City Overview', icon: Compass, targetSection: 'map' },
  { id: 'c-dash', title: 'View My Registered E-Waste Inventory', category: 'Citizen Account', icon: MapPin, targetSection: 'dashboard' },
  { id: 'c-admin', title: 'Open Municipal Admin Console', category: 'Admin Operations', icon: Building2, targetSection: 'admin' },
  { id: 'c-k-w', title: 'Inspect Ward K/W (Andheri West / Juhu)', category: 'Ward Inspection', icon: Building2, targetSection: 'map', wardCode: 'K/W' },
  { id: 'c-h-w', title: 'Inspect Ward H/W (Bandra West / Khar)', category: 'Ward Inspection', icon: Building2, targetSection: 'map', wardCode: 'H/W' },
  { id: 'c-g-s', title: 'Inspect Ward G/S (Worli / Lower Parel)', category: 'Ward Inspection', icon: Building2, targetSection: 'map', wardCode: 'G/S' },
  { id: 'c-s', title: 'Inspect Ward S (Powai / Hiranandani / Bhandup)', category: 'Ward Inspection', icon: Building2, targetSection: 'map', wardCode: 'S' },
  { id: 'c-d', title: 'Inspect Ward D (Malabar Hill / Grant Road)', category: 'Ward Inspection', icon: Building2, targetSection: 'map', wardCode: 'D' }
];

export default function CommandPalette({ isOpen, onClose, onSelectAction }) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          handleExecute(filteredCommands[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, query]);

  const filteredCommands = React.useMemo(() => {
    if (!query.trim()) return COMMON_COMMANDS;
    const q = query.toLowerCase();
    return COMMON_COMMANDS.filter(c =>
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      (c.wardCode && c.wardCode.toLowerCase().includes(q))
    );
  }, [query]);

  const handleExecute = (cmd) => {
    onSelectAction(cmd);
    onClose();
  };

  if (!isOpen) return null;

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
        zIndex: 3000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '12vh'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#0f1011',
          border: '1px solid #23252a',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '560px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '0.5px solid #23252a', gap: '10px' }}>
          <Search size={15} color="#8a8f98" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search objectives, wards, recyclers, or commands... (Esc to close)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#ffffff',
              fontSize: '14px',
              fontFamily: 'var(--font-inter)',
              width: '100%',
              letterSpacing: '-0.01em'
            }}
          />
          <button
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#8a8f98', cursor: 'pointer', padding: '2px' }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Results List */}
        <div style={{ maxHeight: '360px', overflowY: 'auto', padding: '8px' }}>
          {filteredCommands.length > 0 ? (
            filteredCommands.map((cmd, idx) => {
              const IconComp = cmd.icon;
              const isSelected = idx === selectedIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={() => handleExecute(cmd)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: '6px',
                    background: isSelected ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'background 0.1s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: isSelected ? 'var(--color-acid-lime)' : '#8a8f98' }}>
                      <IconComp size={15} />
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 510, color: isSelected ? '#ffffff' : '#d0d6e0' }}>
                        {cmd.title}
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: '#62666d' }}>
                        {cmd.category}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {isSelected && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--color-acid-lime)' }}>
                        Press ↵
                      </span>
                    )}
                    <ArrowRight size={12} color={isSelected ? '#ffffff' : '#62666d'} />
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#8a8f98', fontSize: '13px' }}>
              No matches found for "{query}".
            </div>
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div style={{ padding: '8px 16px', background: '#08090a', borderTop: '0.5px solid #23252a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'var(--font-mono)', fontSize: '11px', color: '#62666d' }}>
          <div>Navigation: ↑ ↓ Enter</div>
          <div>Linear // Precision Terminal</div>
        </div>
      </div>
    </div>
  );
}
