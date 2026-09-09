import React, { useState, useEffect } from 'react';
import { 
  UtensilsCrossed, 
  Flame, 
  Package, 
  Receipt, 
  BarChart3, 
  Volume2, 
  VolumeX, 
  Wifi, 
  WifiOff 
} from 'lucide-react';
import { toggleAudioMute, getAudioMuteState, playBumpClick } from '../services/sound';

export default function Navbar({ activeTab, setActiveTab, activeTicketCount, lowStockCount, unpaidBillsCount, isConnected }) {
  const [muted, setMuted] = useState(getAudioMuteState());

  const handleMuteToggle = () => {
    const isNowMuted = toggleAudioMute();
    setMuted(isNowMuted);
    if (!isNowMuted) playBumpClick();
  };

  return (
    <header className="app-header">
      {/* Brand & Status */}
      <div className="brand-section">
        <div className="brand-logo">
          <UtensilsCrossed size={22} />
        </div>
        <div>
          <div className="brand-name">
            RestoPulse <span className="brand-tag">PRO ERP</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="nav-tabs">
        <button 
          className={`nav-tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
          onClick={() => { setActiveTab('pos'); playBumpClick(); }}
        >
          <UtensilsCrossed size={16} />
          POS & Tables
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'kds' ? 'active' : ''}`}
          onClick={() => { setActiveTab('kds'); playBumpClick(); }}
        >
          <Flame size={16} />
          Kitchen Display (KDS)
          {activeTicketCount > 0 && (
            <span className="nav-badge">{activeTicketCount}</span>
          )}
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
          onClick={() => { setActiveTab('inventory'); playBumpClick(); }}
        >
          <Package size={16} />
          Inventory & BOM
          {lowStockCount > 0 && (
            <span className="nav-badge" style={{ background: 'var(--accent-amber)', color: '#78350f' }}>{lowStockCount}</span>
          )}
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'billing' ? 'active' : ''}`}
          onClick={() => { setActiveTab('billing'); playBumpClick(); }}
        >
          <Receipt size={16} />
          Billing & Checks
          {unpaidBillsCount > 0 && (
            <span className="nav-badge" style={{ background: 'var(--primary)', color: '#082f49' }}>{unpaidBillsCount}</span>
          )}
        </button>

        <button 
          className={`nav-tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => { setActiveTab('analytics'); playBumpClick(); }}
        >
          <BarChart3 size={16} />
          Analytics
        </button>
      </nav>

      {/* Right Controls */}
      <div className="header-actions">
        <div className="live-indicator" title={isConnected ? "SignalR Real-Time Connected" : "Connecting to SignalR..."}>
          {isConnected ? (
            <>
              <div className="live-pulse-dot" />
              <span>Real-Time Sync</span>
            </>
          ) : (
            <>
              <WifiOff size={14} color="var(--accent-rose)" />
              <span style={{ color: 'var(--accent-rose)' }}>Reconnecting</span>
            </>
          )}
        </div>

        <button 
          className="icon-btn" 
          onClick={handleMuteToggle}
          title={muted ? "Unmute Kitchen Chimes" : "Mute Kitchen Chimes"}
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
      </div>
    </header>
  );
}
