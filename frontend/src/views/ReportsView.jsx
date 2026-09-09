import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Calendar,
  CalendarDays,
  TrendingUp,
  RefreshCw,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Truck
} from 'lucide-react';
import { api } from '../services/api';
import { playBumpClick } from '../services/sound';

export default function ReportsView() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await api.getReportsData();
      setReportData(data);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading || !reportData) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-dim)' }}>
        Loading Sales Reports...
      </div>
    );
  }

  const cs = reportData.channelStats || {};
  const channels = [
    {
      name: 'Dine-In Orders',
      revenue: cs.dineInRevenue || 0,
      count: cs.dineInCount || 0,
      icon: UtensilsCrossed,
      color: '#2563eb',
      bg: 'rgba(59, 130, 246, 0.12)'
    },
    {
      name: 'Takeaway (Parcel)',
      revenue: cs.takeawayRevenue || 0,
      count: cs.takeawayCount || 0,
      icon: ShoppingBag,
      color: '#7c3aed',
      bg: 'rgba(139, 92, 246, 0.12)'
    },
    {
      name: 'Swiggy Online',
      revenue: cs.swiggyRevenue || 0,
      count: cs.swiggyCount || 0,
      icon: Bike,
      color: '#ea580c',
      bg: 'rgba(252, 128, 25, 0.12)'
    },
    {
      name: 'Direct Delivery',
      revenue: cs.directDeliveryRevenue || 0,
      count: cs.directDeliveryCount || 0,
      icon: Truck,
      color: '#059669',
      bg: 'rgba(16, 185, 129, 0.12)'
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-family-display)', fontSize: '22px', fontWeight: 800, color: 'var(--text-white)' }}>
            Sales Reports
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: 2 }}>
            Daily, Monthly, and Yearly Sales Performance & Channel Analytics
          </div>
        </div>

        <button 
          className="btn-bump served" 
          style={{ width: 'auto', padding: '8px 16px' }}
          onClick={() => { fetchReports(); playBumpClick(); }}
        >
          <RefreshCw size={15} /> Refresh Data
        </button>
      </div>

      {/* KPI Grid */}
      <div className="inventory-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div className="stat-val">₹{reportData.dailySales.toFixed(2)}</div>
            <div className="stat-label">Daily Sales Income</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary)' }}>
            <CalendarDays size={24} />
          </div>
          <div>
            <div className="stat-val">₹{reportData.monthlySales.toFixed(2)}</div>
            <div className="stat-label">Monthly Sales Income</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <Calendar size={24} />
          </div>
          <div>
            <div className="stat-val">₹{reportData.yearlySales.toFixed(2)}</div>
            <div className="stat-label">Yearly Sales Income</div>
          </div>
        </div>
      </div>

      {/* Channel Performance Grid */}
      <div className="tables-strip">
        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-white)', marginBottom: 14 }}>
          Channel Revenue & Order Distribution
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {channels.map(c => {
            const Icon = c.icon;
            return (
              <div 
                key={c.name}
                style={{ 
                  background: 'var(--bg-surface-elevated)', 
                  border: '1px solid var(--border-subtle)', 
                  borderRadius: 10, 
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ background: c.bg, color: c.color, padding: 6, borderRadius: 8, display: 'flex' }}>
                      <Icon size={18} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-white)' }}>{c.name}</span>
                  </div>
                  <span className="nav-badge" style={{ fontSize: '11px' }}>{c.count} Orders</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Revenue:</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 800, fontSize: '17px', color: 'var(--accent-emerald)' }}>
                    ₹{c.revenue.toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
