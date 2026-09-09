import React, { useState, useEffect } from 'react';
import { 
  Flame, 
  Clock, 
  RotateCcw, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  Layers, 
  Sparkles,
  RefreshCw,
  Eye
} from 'lucide-react';
import { api } from '../services/api';
import { playBumpClick } from '../services/sound';

export default function KdsView({ activeStation = 'Expo' }) {
  const [station, setStation] = useState(activeStation);
  const [tickets, setTickets] = useState([]);
  const [summary, setSummary] = useState([]);
  const [recalledTickets, setRecalledTickets] = useState([]);
  const [showRecallDrawer, setShowRecallDrawer] = useState(false);
  const [loading, setLoading] = useState(true);

  const stations = [
    { id: 'Expo', label: 'All Stations (Expo)' },
    { id: 'Grill', label: 'Grill & Meat' },
    { id: 'Fryer', label: 'Saute & Fryer' },
    { id: 'Salad', label: 'Cold & Salad' },
    { id: 'Bar', label: 'Bar & Beverages' }
  ];

  const fetchKdsData = async () => {
    try {
      const [ticketData, summaryData] = await Promise.all([
        api.getKdsTickets(station === 'Expo' ? null : station),
        api.getKdsSummary(station === 'Expo' ? null : station)
      ]);
      setTickets(ticketData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Failed to fetch KDS tickets:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKdsData();
    // Refresh tickets interval
    const interval = setInterval(fetchKdsData, 5000);
    return () => clearInterval(interval);
  }, [station]);

  // Local second-by-second timer update
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets(prevTickets => 
        prevTickets.map(t => {
          const newSeconds = t.elapsedSeconds + 1;
          const newMinutes = Math.floor(newSeconds / 60);
          const newUrgency = newMinutes < 10 ? 'Normal' : (newMinutes < 20 ? 'Warning' : 'Urgent');
          return {
            ...t,
            elapsedSeconds: newSeconds,
            elapsedMinutes: newMinutes,
            urgency: newUrgency
          };
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleBumpItem = async (itemId, currentStatus) => {
    playBumpClick();
    const nextStatus = currentStatus === 'Pending' ? 1 : (currentStatus === 'Cooking' ? 2 : 2); // 1: Cooking, 2: Ready
    try {
      await api.bumpKdsItem(itemId, nextStatus);
      fetchKdsData();
    } catch (err) {
      console.error('Error bumping item:', err);
    }
  };

  const handleBumpTicket = async (orderId, targetStatus) => {
    playBumpClick();
    // 2: Ready, 3: Served
    const statusVal = targetStatus === 'Ready' ? 2 : 3;
    try {
      await api.bumpKdsTicket(orderId, statusVal);
      fetchKdsData();
    } catch (err) {
      console.error('Error bumping ticket:', err);
    }
  };

  const openRecallDrawer = async () => {
    playBumpClick();
    setShowRecallDrawer(true);
    try {
      const data = await api.getRecalledTickets();
      setRecalledTickets(data);
    } catch (err) {
      console.error('Error getting recalled tickets:', err);
    }
  };

  const handleRecallTicket = async (orderId) => {
    playBumpClick();
    try {
      await api.recallTicket(orderId);
      setShowRecallDrawer(false);
      fetchKdsData();
    } catch (err) {
      console.error('Error recalling ticket:', err);
    }
  };

  const formatTimer = (totalSecs) => {
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div>
      {/* Top Header & Station Filter Bar */}
      <div className="kds-header-bar">
        <div className="station-filter-pills">
          {stations.map(st => (
            <button 
              key={st.id}
              className={`station-pill ${station === st.id ? 'active' : ''}`}
              onClick={() => { setStation(st.id); playBumpClick(); }}
            >
              {st.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="btn-bump served" 
            style={{ padding: '8px 14px', width: 'auto' }}
            onClick={openRecallDrawer}
          >
            <RotateCcw size={15} /> Recall Tickets
          </button>
          <button 
            className="icon-btn" 
            title="Refresh tickets"
            onClick={() => { fetchKdsData(); playBumpClick(); }}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Live Line Cook Summary Strip */}
      {summary.length > 0 && (
        <div className="cook-summary-strip">
          <span className="cook-summary-label">Items on Deck:</span>
          {summary.map((item, idx) => (
            <div key={idx} className="summary-chip">
              <span className="summary-count">{item.totalQuantity}x</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-white)' }}>
                {item.itemName}
              </span>
              <span className="station-badge">{item.station}</span>
            </div>
          ))}
        </div>
      )}

      {/* Tickets Grid */}
      {tickets.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--text-dim)' }}>
          <Flame size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-muted)' }}>Kitchen Board Clear</div>
          <div style={{ fontSize: '14px', marginTop: 4 }}>All orders prepared and bumped for this station.</div>
        </div>
      ) : (
        <div className="kds-tickets-grid">
          {tickets.map(ticket => {
            const urgencyClass = `urgency-${ticket.urgency.toLowerCase()}`;
            const timerClass = ticket.urgency.toLowerCase();

            return (
              <div key={ticket.id} className={`ticket-card ${urgencyClass}`}>
                {/* Header */}
                <div className="ticket-header">
                  <div className="ticket-id-group">
                    <span className="ticket-order-num">{ticket.orderNumber}</span>
                    <span className="ticket-table-badge">{ticket.tableNumber}</span>
                    {ticket.isPriority && (
                      <span className="nav-badge" style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Sparkles size={11} /> RUSH
                      </span>
                    )}
                  </div>

                  <div className={`ticket-timer ${timerClass}`}>
                    <Clock size={14} />
                    <span>{formatTimer(ticket.elapsedSeconds)}</span>
                  </div>
                </div>

                {/* Meta details */}
                <div className="ticket-meta-bar">
                  <span>Guest: {ticket.customerName}</span>
                  <span>Type: {ticket.type}</span>
                </div>

                {ticket.notes && (
                  <div style={{ padding: '6px 16px', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--accent-amber)', fontSize: '12px', fontWeight: 600 }}>
                    Note: "{ticket.notes}"
                  </div>
                )}

                {/* Items List */}
                <div className="ticket-items-list">
                  {ticket.items.map(item => {
                    let parsedModifiers = [];
                    try {
                      parsedModifiers = JSON.parse(item.modifiersJson || '[]');
                    } catch (e) {}

                    return (
                      <div 
                        key={item.id} 
                        className={`ticket-item-row status-${item.status}`}
                        onClick={() => handleBumpItem(item.id, item.status)}
                        title="Click to bump item status (Pending -> Cooking -> Ready)"
                      >
                        <div className="item-left">
                          <span className="item-qty">{item.quantity}x</span>
                          <div>
                            <div className="item-name">{item.itemName}</div>
                            {parsedModifiers.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {parsedModifiers.map((mod, i) => (
                                  <span key={i} className="modifier-tag">{mod}</span>
                                ))}
                              </div>
                            )}
                            {item.notes && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                                "{item.notes}"
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                          <span className="station-badge">{item.station}</span>
                          <span style={{ 
                            fontSize: '11px', 
                            fontWeight: 700, 
                            color: item.status === 'Ready' ? 'var(--accent-emerald)' : (item.status === 'Cooking' ? 'var(--primary)' : 'var(--text-dim)')
                          }}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bump Bar Actions Footer */}
                <div className="ticket-footer">
                  {ticket.status !== 'Ready' ? (
                    <button 
                      className="btn-bump ready"
                      onClick={() => handleBumpTicket(ticket.id, 'Ready')}
                    >
                      <Check size={16} /> Bump Ready
                    </button>
                  ) : (
                    <button 
                      className="btn-bump served"
                      onClick={() => handleBumpTicket(ticket.id, 'Served')}
                    >
                      <CheckCheck size={16} color="var(--accent-emerald)" /> Bump Served
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recall Drawer Modal */}
      {showRecallDrawer && (
        <div className="modal-overlay" onClick={() => setShowRecallDrawer(false)}>
          <div className="modal-card" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Recently Bumped Tickets (Last 45m)</div>
              <button className="icon-btn" onClick={() => setShowRecallDrawer(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
              {recalledTickets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-dim)' }}>
                  No recently bumped tickets found.
                </div>
              ) : (
                recalledTickets.map(ticket => (
                  <div 
                    key={ticket.id} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: 14, 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: 8, 
                      border: '1px solid var(--border-subtle)',
                      marginBottom: 10 
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: 'var(--text-white)', fontSize: '15px' }}>
                        {ticket.orderNumber} &bull; Table {ticket.table?.tableNumber || 'To-Go'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 2 }}>
                        Completed: {new Date(ticket.updatedAt).toLocaleTimeString()} &bull; {ticket.items?.length || 0} items
                      </div>
                    </div>

                    <button 
                      className="btn-bump ready" 
                      style={{ flex: 'none', padding: '8px 16px' }}
                      onClick={() => handleRecallTicket(ticket.id)}
                    >
                      <RotateCcw size={14} /> Unbump to Line
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-bump served" onClick={() => setShowRecallDrawer(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
