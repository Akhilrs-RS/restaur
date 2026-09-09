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
  Truck,
  Download,
  CheckCircle2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { api } from '../services/api';
import { playBumpClick } from '../services/sound';

export default function ReportsView() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

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

  const downloadPdfReport = () => {
    playBumpClick();
    if (!reportData) return;

    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const primaryColor = [22, 101, 52]; // Forest Emerald
      const darkText = [30, 41, 59]; // Slate 800
      const lightMuted = [100, 116, 139]; // Slate 500

      // 1. Restaurant Header / Letterhead
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('ROYAL SPICE RESTAURANT', 14, 20);

      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(lightMuted[0], lightMuted[1], lightMuted[2]);
      doc.text('Authentic Multi-Cuisine & Grill  |  GSTIN: 33AAAAA0000A1Z5  |  FSSAI: 12423001000123', 14, 26);
      doc.text('No. 45, Anna Salai, Chennai - 600002  |  Phone: +91 98765 43210  |  www.royalspice.in', 14, 31);

      // Decorative divider
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.6);
      doc.line(14, 35, 196, 35);

      // 2. Report Title & Generation Meta
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text('OFFICIAL SALES & MULTI-CHANNEL PERFORMANCE REPORT', 14, 43);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(lightMuted[0], lightMuted[1], lightMuted[2]);
      const now = new Date();
      doc.text(`Generated: ${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at ${now.toLocaleTimeString('en-IN')}`, 14, 48);
      doc.text('Report Coverage: Daily, Monthly, Yearly Sales & Order Channel Distribution', 14, 53);

      // 3. Section: Executive Sales Summary Table
      autoTable(doc, {
        startY: 57,
        head: [['SALES KPI PERIOD', 'TOTAL REVENUE (INR)', 'STATUS']],
        body: [
          ['Daily Sales Income (Today)', `Rs. ${reportData.dailySales.toFixed(2)}`, 'Reconciled'],
          ['Monthly Sales Income (Month-to-Date)', `Rs. ${reportData.monthlySales.toFixed(2)}`, 'Active MTD'],
          ['Yearly Sales Income (Year-to-Date)', `Rs. ${reportData.yearlySales.toFixed(2)}`, 'Active YTD']
        ],
        headStyles: {
          fillColor: [22, 101, 52],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          textColor: darkText,
          fontSize: 9.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        theme: 'striped',
        margin: { left: 14, right: 14 }
      });

      // 4. Section: Channel Revenue & Order Distribution
      const finalY = doc.lastAutoTable.finalY + 12;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(darkText[0], darkText[1], darkText[2]);
      doc.text('CHANNEL REVENUE & VOLUME BREAKDOWN', 14, finalY);

      const cs = reportData.channelStats || {};
      const totalChannelRevenue = (cs.dineInRevenue || 0) + (cs.takeawayRevenue || 0) + (cs.swiggyRevenue || 0) + (cs.directDeliveryRevenue || 0);
      const totalChannelOrders = (cs.dineInCount || 0) + (cs.takeawayCount || 0) + (cs.swiggyCount || 0) + (cs.directDeliveryCount || 0);

      const getPct = (val) => totalChannelRevenue > 0 ? `${((val / totalChannelRevenue) * 100).toFixed(1)}%` : '0.0%';

      autoTable(doc, {
        startY: finalY + 4,
        head: [['CHANNEL', 'ORDER VOLUME', 'TOTAL REVENUE (INR)', 'CONTRIBUTION %']],
        body: [
          ['Dine-In Restaurant Orders', `${cs.dineInCount || 0} Orders`, `Rs. ${(cs.dineInRevenue || 0).toFixed(2)}`, getPct(cs.dineInRevenue || 0)],
          ['Takeaway (Parcel Counter)', `${cs.takeawayCount || 0} Orders`, `Rs. ${(cs.takeawayRevenue || 0).toFixed(2)}`, getPct(cs.takeawayRevenue || 0)],
          ['Swiggy Online Delivery', `${cs.swiggyCount || 0} Orders`, `Rs. ${(cs.swiggyRevenue || 0).toFixed(2)}`, getPct(cs.swiggyRevenue || 0)],
          ['Restaurant Direct Delivery', `${cs.directDeliveryCount || 0} Orders`, `Rs. ${(cs.directDeliveryRevenue || 0).toFixed(2)}`, getPct(cs.directDeliveryRevenue || 0)],
          ['TOTAL (ALL CHANNELS COMBINED)', `${totalChannelOrders} Orders`, `Rs. ${totalChannelRevenue.toFixed(2)}`, '100.0%']
        ],
        headStyles: {
          fillColor: [37, 99, 235],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 10
        },
        bodyStyles: {
          textColor: darkText,
          fontSize: 9.5
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didParseCell: function(data) {
          if (data.row.index === 4) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
          }
        },
        theme: 'striped',
        margin: { left: 14, right: 14 }
      });

      // 5. Footer & Confidentiality
      const footerY = doc.lastAutoTable.finalY + 14;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(lightMuted[0], lightMuted[1], lightMuted[2]);
      doc.text('System-generated certified financial report from Royal Spice Restaurant POS.', 14, footerY);
      doc.text('Confidential • For Internal Management Use Only • Royal Spice RestoPulse Enterprise', 14, footerY + 5);

      // Save file
      const filename = `Royal_Spice_Sales_Report_${now.toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert(`Could not generate PDF: ${err.message}`);
    }
  };

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--font-family-display)', fontSize: '22px', fontWeight: 800, color: 'var(--text-white)' }}>
            Sales Reports
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: 2 }}>
            Daily, Monthly, and Yearly Sales Performance & Channel Analytics
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {downloadSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '13px', color: 'var(--accent-emerald)', fontWeight: 600 }}>
              <CheckCircle2 size={16} /> PDF Downloaded!
            </div>
          )}
          <button 
            className="btn-bump ready" 
            style={{ width: 'auto', padding: '8px 18px' }}
            onClick={downloadPdfReport}
            title="Download full report as PDF"
          >
            <Download size={15} /> Download PDF
          </button>
          <button 
            className="btn-bump served" 
            style={{ width: 'auto', padding: '8px 16px' }}
            onClick={() => { fetchReports(); playBumpClick(); }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
        </div>
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
