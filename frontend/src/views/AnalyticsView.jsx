import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  Flame, 
  TrendingUp, 
  AlertTriangle, 
  TrendingDown,
  ShoppingBag,
  Award,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { playBumpClick } from '../services/sound';

export default function AnalyticsView() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--text-dim)' }}>
        Loading Executive Dashboard...
      </div>
    );
  }

  const avgCheck = stats.todayOrdersCount > 0 
    ? (stats.totalRevenue / stats.todayOrdersCount).toFixed(2) 
    : '0.00';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Top Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-family-display)', fontSize: '22px', fontWeight: 800, color: 'var(--text-white)' }}>
            Operational Performance & Financial Analytics
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: 2 }}>
            Real-time telemetry across Kitchen, Floor Sales, and Inventory Loss.
          </div>
        </div>

        <button 
          className="btn-bump served" 
          style={{ width: 'auto', padding: '8px 16px' }}
          onClick={() => { fetchStats(); playBumpClick(); }}
        >
          <RefreshCw size={15} /> Refresh Analytics
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="inventory-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-val">₹{stats.totalRevenue.toFixed(2)}</div>
            <div className="stat-label">Total Settled Revenue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary)' }}>
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.totalOrdersCount} Checks</div>
            <div className="stat-label">Orders Processed</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <Clock size={24} />
          </div>
          <div>
            <div className="stat-val">{stats.avgPrepMinutes} mins</div>
            <div className="stat-label">Avg. Kitchen Ticket Prep Time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-rose)' }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <div className="stat-val">₹{stats.totalWastageCost.toFixed(2)}</div>
            <div className="stat-label">Culinary Wastage Loss</div>
          </div>
        </div>
      </div>

      {/* Breakdown Section: Kitchen Stations & Top Sellers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        {/* Active Kitchen Station Load */}
        <div className="tables-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '16px', color: 'var(--text-white)', marginBottom: 16 }}>
            <Flame size={18} color="var(--primary)" />
            Active Kitchen Station Workload
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {stats.stationLoad.map(st => (
              <div key={st.station} style={{ padding: 12, background: 'rgba(0, 0, 0, 0.02)', borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-white)' }}>{st.station} Station</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--primary)', fontWeight: 700 }}>
                    {st.activeItems} Active Items
                  </span>
                </div>
                <div style={{ height: 6, background: 'rgba(0, 0, 0, 0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #0284c7, #38bdf8)', 
                      width: `${Math.min(100, st.activeItems * 15)}%`,
                      borderRadius: 3
                    }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Revenue Dishes */}
        <div className="tables-strip">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '16px', color: 'var(--text-white)', marginBottom: 16 }}>
            <Award size={18} color="var(--accent-amber)" />
            Top Selling Culinary Creations
          </div>

          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Dish Name</th>
                  <th>Units Sold</th>
                  <th>Gross Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.topSellingDishes.map((dish, i) => (
                  <tr key={dish.name}>
                    <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>
                      <span style={{ color: 'var(--accent-amber)', marginRight: 8, fontWeight: 800 }}>#{i + 1}</span>
                      {dish.name}
                    </td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700 }}>{dish.totalSold} sold</td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                      ₹{dish.revenue.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
