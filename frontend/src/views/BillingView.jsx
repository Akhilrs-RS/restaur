import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Printer, 
  Users, 
  Percent, 
  Check, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  DollarSign
} from 'lucide-react';
import { api } from '../services/api';
import { playBumpClick, playCashRegister } from '../services/sound';

export default function BillingView({ onBillSettled }) {
  const [bills, setBills] = useState([]);
  const [selectedBill, setSelectedBill] = useState(null);
  const [splitCount, setSplitCount] = useState(2);
  const [splitResult, setSplitResult] = useState(null);

  // Settlement Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState(0); // 0: Cash, 1: Card, 2: UPI
  const [tenderedAmount, setTenderedAmount] = useState('');
  const [tipPercent, setTipPercent] = useState(0);
  const [discountPercent, setDiscountPercent] = useState(0);

  // Thermal Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const loadBills = async () => {
    try {
      const data = await api.getActiveBills();
      setBills(data);
      if (data.length > 0 && !selectedBill) {
        setSelectedBill(data[0]);
      } else if (selectedBill) {
        const fresh = data.find(b => b.id === selectedBill.id);
        if (fresh) setSelectedBill(fresh);
      }
    } catch (err) {
      console.error('Failed to load active bills:', err);
    }
  };

  useEffect(() => {
    loadBills();
    const interval = setInterval(loadBills, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectBill = (bill) => {
    playBumpClick();
    setSelectedBill(bill);
    setSplitResult(null);
  };

  const handleCalculateSplit = async () => {
    if (!selectedBill) return;
    playBumpClick();
    try {
      const split = await api.calculateSplit(selectedBill.id, splitCount);
      setSplitResult(split);
    } catch (err) {
      console.error('Error calculating split:', err);
    }
  };

  const openPayModal = () => {
    if (!selectedBill) return;
    playBumpClick();
    setTenderedAmount(selectedBill.totalAmount.toString());
    setDiscountPercent(0);
    setTipPercent(0);
    setShowPayModal(true);
  };

  // Calculations inside pay modal
  const baseTotal = selectedBill ? selectedBill.subTotal : 0;
  const discountAmt = Math.round(baseTotal * (discountPercent / 100) * 100) / 100;
  const discountedSub = baseTotal - discountAmt;
  const taxAmt = Math.round(discountedSub * 0.05 * 100) / 100; // 5% GST
  const tipAmt = Math.round(discountedSub * (tipPercent / 100) * 100) / 100;
  const finalTotal = Math.round((discountedSub + taxAmt + tipAmt) * 100) / 100;
  const cashChange = payMethod === 0 && parseFloat(tenderedAmount || 0) >= finalTotal
    ? Math.round((parseFloat(tenderedAmount || 0) - finalTotal) * 100) / 100
    : 0;

  const handlePreviewReceipt = async () => {
    if (!selectedBill) return;
    playBumpClick();
    try {
      const receipt = await api.getReceiptData(selectedBill.id);
      setReceiptData(receipt);
      setShowReceiptModal(true);
    } catch (err) {
      alert(`Failed to load receipt: ${err.message}`);
    }
  };

  const handleSettlePayment = async () => {
    if (!selectedBill) return;

    try {
      await api.settleBill(selectedBill.id, {
        paymentMethod: payMethod,
        tenderedAmount: parseFloat(tenderedAmount || finalTotal),
        discountPercent,
        tipAmount: tipAmt
      });

      playCashRegister();
      setShowPayModal(false);

      // Fetch thermal receipt for display
      const receipt = await api.getReceiptData(selectedBill.id);
      setReceiptData(receipt);
      setShowReceiptModal(true);

      loadBills();
      if (onBillSettled) onBillSettled();
    } catch (err) {
      alert(`Settlement failed: ${err.message}`);
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
      {/* Left Column: Unpaid Bills List */}
      <div className="pos-cart-panel" style={{ height: 'auto', minHeight: 600 }}>
        <div className="cart-header">
          <div className="cart-title">
            <span>Open Checks</span>
            <span className="nav-badge" style={{ background: 'var(--primary)', color: '#082f49' }}>
              {bills.length} Active
            </span>
          </div>
        </div>

        <div className="cart-items-container">
          {bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-dim)' }}>
              <Receipt size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div>No open checks</div>
              <div style={{ fontSize: '12px', marginTop: 4 }}>All tables are settled or clear.</div>
            </div>
          ) : (
            bills.map(bill => {
              const isSelected = selectedBill?.id === bill.id;
              return (
                <div 
                  key={bill.id}
                  className={`cart-item-row ${isSelected ? 'selected' : ''}`}
                  style={{ 
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(0, 0, 0, 0.02)',
                    borderColor: isSelected ? 'var(--primary)' : 'var(--border-subtle)',
                    padding: 14
                  }}
                  onClick={() => handleSelectBill(bill)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 800, color: 'var(--text-white)' }}>{bill.orderNumber}</span>
                      <span className="ticket-table-badge">Table {bill.table?.tableNumber || 'To-Go'}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: 4 }}>
                      Guest: {bill.customerName} &bull; {bill.items?.length || 0} items
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        <Clock size={11} style={{ display: 'inline', marginRight: 4 }} />
                        {new Date(bill.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--accent-emerald)', fontSize: '15px' }}>
                        ₹{bill.totalAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Bill Details, Splitter & Checkout */}
      {selectedBill ? (
        <div className="tables-strip" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: 16 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-family-display)', fontSize: '20px', fontWeight: 800, color: 'var(--text-white)' }}>
                Check #{selectedBill.orderNumber} &bull; Table {selectedBill.table?.tableNumber || 'To-Go'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: 2 }}>
                Server: Shift Captain Alex &bull; Opened: {new Date(selectedBill.createdAt).toLocaleTimeString()}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                className="btn-bump served" 
                style={{ padding: '10px 18px', width: 'auto' }}
                onClick={handlePreviewReceipt}
              >
                <Printer size={16} /> Print Bill
              </button>
              <button 
                className="btn-bump ready" 
                style={{ padding: '10px 24px', width: 'auto' }}
                onClick={openPayModal}
              >
                <CreditCard size={16} /> Settle Check
              </button>
            </div>
          </div>

          {/* Itemized Breakdown */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Item Description</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {selectedBill.items?.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{item.itemName}</div>
                      {item.notes && (
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>"{item.notes}"</div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700 }}>{item.quantity}</td>
                    <td style={{ fontFamily: 'var(--font-family-mono)' }}>₹{item.unitPrice.toFixed(2)}</td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      ₹{(item.quantity * item.unitPrice).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subtotal / Tax / Total Box */}
          <div style={{ background: 'rgba(255, 255, 255, 0.2)', padding: 16, borderRadius: 8, border: '1px solid var(--border-subtle)', maxWidth: 400, marginLeft: 'auto', width: '100%' }}>
            <div className="cart-totals-row">
              <span>Subtotal</span>
              <span style={{ fontFamily: 'var(--font-family-mono)' }}>₹{selectedBill.subTotal.toFixed(2)}</span>
            </div>
            <div className="cart-totals-row">
              <span>CGST (2.5%)</span>
              <span style={{ fontFamily: 'var(--font-family-mono)' }}>₹{(selectedBill.taxAmount / 2).toFixed(2)}</span>
            </div>
            <div className="cart-totals-row">
              <span>SGST (2.5%)</span>
              <span style={{ fontFamily: 'var(--font-family-mono)' }}>₹{(selectedBill.taxAmount / 2).toFixed(2)}</span>
            </div>
            <div className="cart-totals-row grand-total">
              <span>Grand Total</span>
              <span style={{ color: 'var(--accent-emerald)' }}>₹{selectedBill.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Split Bill Section */}
          <div style={{ background: 'rgba(0, 0, 0, 0.02)', padding: 18, borderRadius: 10, border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: '15px', color: 'var(--text-white)', marginBottom: 12 }}>
              <Users size={18} color="var(--primary)" />
              Split Bill Calculator
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Split Equally Across:</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[2, 3, 4, 5, 6].map(num => (
                  <button 
                    key={num}
                    className={`section-chip ${splitCount === num ? 'active' : ''}`}
                    onClick={() => setSplitCount(num)}
                  >
                    {num} Guests
                  </button>
                ))}
              </div>

              <button 
                className="btn-bump served" 
                style={{ width: 'auto', padding: '6px 16px' }}
                onClick={handleCalculateSplit}
              >
                Compute Split Shares
              </button>
            </div>

            {splitResult && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 14 }}>
                {splitResult.splits.map(s => (
                  <div key={s.guestNumber} style={{ padding: 12, background: 'rgba(56, 189, 248, 0.08)', borderRadius: 6, border: '1px solid rgba(56, 189, 248, 0.2)', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Guest #{s.guestNumber}</div>
                    <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '18px', fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                      ₹{s.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '100px 20px', color: 'var(--text-dim)' }}>
          Select an open check from the left panel to inspect details and settle.
        </div>
      )}

      {/* PAYMENT SETTLEMENT MODAL */}
      {showPayModal && selectedBill && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal-card" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Settle Check #{selectedBill.orderNumber}</div>
              <button className="icon-btn" onClick={() => setShowPayModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              {/* Payment Method Selector */}
              <div className="form-group">
                <label className="form-label">Select Payment Mode</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  <button 
                    type="button"
                    className={`section-chip ${payMethod === 0 ? 'active' : ''}`}
                    style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderRadius: 8 }}
                    onClick={() => { setPayMethod(0); playBumpClick(); }}
                  >
                    <Banknote size={20} />
                    <span>Cash</span>
                  </button>
                  <button 
                    type="button"
                    className={`section-chip ${payMethod === 1 ? 'active' : ''}`}
                    style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderRadius: 8 }}
                    onClick={() => { setPayMethod(1); playBumpClick(); }}
                  >
                    <CreditCard size={20} />
                    <span>Credit Card</span>
                  </button>
                  <button 
                    type="button"
                    className={`section-chip ${payMethod === 2 ? 'active' : ''}`}
                    style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, borderRadius: 8 }}
                    onClick={() => { setPayMethod(2); playBumpClick(); }}
                  >
                    <QrCode size={20} />
                    <span>UPI / QR</span>
                  </button>
                </div>
              </div>

              {/* Discount / Promo */}
              <div className="form-group">
                <label className="form-label">Discount Promotion</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 5, 10, 15, 20].map(d => (
                    <button 
                      key={d}
                      type="button"
                      className={`section-chip ${discountPercent === d ? 'active' : ''}`}
                      onClick={() => setDiscountPercent(d)}
                    >
                      {d === 0 ? 'None' : `${d}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tip / Gratuity */}
              <div className="form-group">
                <label className="form-label">Tip / Gratuity</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 10, 15, 18, 20].map(t => (
                    <button 
                      key={t}
                      type="button"
                      className={`section-chip ${tipPercent === t ? 'active' : ''}`}
                      onClick={() => setTipPercent(t)}
                    >
                      {t === 0 ? 'None' : `${t}%`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Totals Summary */}
              <div style={{ background: 'rgba(255, 255, 255, 0.25)', padding: 14, borderRadius: 8, border: '1px solid var(--border-subtle)' }}>
                {discountPercent > 0 && (
                  <div className="cart-totals-row" style={{ color: 'var(--accent-rose)' }}>
                    <span>Discount ({discountPercent}%)</span>
                    <span>-₹{discountAmt.toFixed(2)}</span>
                  </div>
                )}
                {tipPercent > 0 && (
                  <div className="cart-totals-row" style={{ color: 'var(--primary)' }}>
                    <span>Tip ({tipPercent}%)</span>
                    <span>+₹{tipAmt.toFixed(2)}</span>
                  </div>
                )}
                <div className="cart-totals-row grand-total" style={{ borderTop: 'none', margin: 0, padding: 0 }}>
                  <span>Final Payable Amount</span>
                  <span style={{ color: 'var(--accent-emerald)' }}>₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Cash Tendered & Change */}
              {payMethod === 0 && (
                <div className="form-group">
                  <label className="form-label">Tendered Cash Amount (₹)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    value={tenderedAmount}
                    onChange={(e) => setTenderedAmount(e.target.value)}
                  />
                  {cashChange > 0 && (
                    <div style={{ marginTop: 8, padding: 8, background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-emerald)', borderRadius: 6, fontWeight: 700 }}>
                      Change to Return: ₹{cashChange.toFixed(2)}
                    </div>
                  )}
                </div>
              )}

              {/* UPI QR Mock */}
              {payMethod === 2 && (
                <div style={{ textAlign: 'center', padding: 16, background: 'rgba(0, 0, 0, 0.05)', borderRadius: 8 }}>
                  <QrCode size={90} style={{ margin: '0 auto 8px', color: 'black' }} />
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Scan with UPI / Digital Wallet App to Pay ₹{finalTotal.toFixed(2)}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-bump served" onClick={() => setShowPayModal(false)}>
                Cancel
              </button>
              <button className="btn-bump ready" onClick={handleSettlePayment}>
                <CheckCircle2 size={16} /> Confirm Settlement & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 80mm ESC/POS THERMAL RECEIPT MODAL (English Only) */}
      {showReceiptModal && receiptData && (
        <div className="modal-overlay" onClick={() => setShowReceiptModal(false)}>
          <div className="modal-card" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Tax Invoice / Receipt</div>
              <button className="icon-btn" onClick={() => setShowReceiptModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ background: '#f3f4f6', padding: 20 }}>
              {/* ESC/POS 80mm/58mm thermal receipt container */}
              <div className="thermal-receipt-container">
                <div className="receipt-center">
                  <div style={{ fontSize: '16px', fontWeight: 900, letterSpacing: '0.5px' }}>
                    {receiptData.restaurant.name}
                  </div>
                  {receiptData.restaurant.tagline && (
                    <div style={{ fontSize: '11px', fontStyle: 'italic', marginBottom: 2 }}>
                      {receiptData.restaurant.tagline}
                    </div>
                  )}
                  <div>{receiptData.restaurant.address}</div>
                  <div>Phone: {receiptData.restaurant.phone}</div>
                  {receiptData.restaurant.gstin && (
                    <div style={{ fontWeight: 'bold' }}>GSTIN: {receiptData.restaurant.gstin}</div>
                  )}
                  {receiptData.restaurant.fssai && (
                    <div>FSSAI Lic: {receiptData.restaurant.fssai}</div>
                  )}
                  <div className="receipt-dashed-line" />
                  <div style={{ fontSize: '13px', fontWeight: 800, letterSpacing: '1px' }}>
                    *** TAX INVOICE ***
                  </div>
                  <div className="receipt-dashed-line" />
                </div>

                <div className="receipt-row">
                  <span>BILL NO: <b>{receiptData.invoice.invoiceNumber}</b></span>
                  <span>DATE: {receiptData.invoice.date}</span>
                </div>
                <div className="receipt-row">
                  <span>TYPE: <b>{receiptData.invoice.orderType}</b></span>
                  <span>TIME: {receiptData.invoice.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="receipt-row">
                  <span>TABLE: <b>{receiptData.invoice.table}</b></span>
                  <span>SERVER: {receiptData.invoice.server || 'Captain'}</span>
                </div>
                <div className="receipt-row">
                  <span>CASHIER: {receiptData.invoice.cashier || 'Counter 01'}</span>
                  <span>GUEST: {receiptData.invoice.guestName}</span>
                </div>

                <div className="receipt-dashed-line" />

                {/* Items Table */}
                <table className="receipt-table">
                  <thead>
                    <tr>
                      <th style={{ width: '48%' }}>ITEM</th>
                      <th className="text-center" style={{ width: '14%' }}>QTY</th>
                      <th className="text-right" style={{ width: '18%' }}>RATE</th>
                      <th className="text-right" style={{ width: '20%' }}>AMT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{item.itemName}</td>
                        <td className="text-center">{item.quantity}</td>
                        <td className="text-right">{item.unitPrice.toFixed(2)}</td>
                        <td className="text-right" style={{ fontWeight: 600 }}>{item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="receipt-dashed-line" />

                <div className="receipt-row">
                  <span>Sub Total:</span>
                  <span>₹{receiptData.summary.subTotal.toFixed(2)}</span>
                </div>
                {receiptData.summary.discount > 0 && (
                  <div className="receipt-row">
                    <span>Discount:</span>
                    <span>-₹{receiptData.summary.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="receipt-row">
                  <span>CGST @ 2.5%:</span>
                  <span>₹{(receiptData.summary.cgst ?? (receiptData.summary.tax / 2)).toFixed(2)}</span>
                </div>
                <div className="receipt-row">
                  <span>SGST @ 2.5%:</span>
                  <span>₹{(receiptData.summary.sgst ?? (receiptData.summary.tax / 2)).toFixed(2)}</span>
                </div>

                <div className="receipt-double-line" />

                <div className="receipt-row" style={{ fontWeight: 900, fontSize: '15px' }}>
                  <span>NET TOTAL:</span>
                  <span>₹{receiptData.summary.total.toFixed(2)}</span>
                </div>

                <div className="receipt-double-line" />

                <div className="receipt-row">
                  <span>Payment Mode:</span>
                  <span style={{ fontWeight: 'bold' }}>{receiptData.invoice.paymentMethod.toUpperCase()}</span>
                </div>
                {receiptData.invoice.paymentMethod.toLowerCase() === 'cash' && tenderedAmount && (
                  <>
                    <div className="receipt-row">
                      <span>Tendered:</span>
                      <span>₹{parseFloat(tenderedAmount).toFixed(2)}</span>
                    </div>
                    <div className="receipt-row">
                      <span>Change:</span>
                      <span>₹{Math.max(0, parseFloat(tenderedAmount) - receiptData.summary.total).toFixed(2)}</span>
                    </div>
                  </>
                )}

                <div className="receipt-dashed-line" />

                <div className="receipt-center" style={{ fontSize: '11px', color: '#111827', marginTop: 8, lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 'bold' }}>THANK YOU! VISIT AGAIN!</div>
                  <div>HAVE A WONDERFUL DAY</div>
                  {receiptData.restaurant.website && (
                    <div style={{ fontSize: '10px', color: '#6b7280', marginTop: 2 }}>{receiptData.restaurant.website}</div>
                  )}
                  <div style={{ marginTop: 8, letterSpacing: '3px', fontWeight: 'bold' }}>
                    {receiptData.invoice.status === 'Paid' ? '* * * PAID * * *' : '* * * GUEST CHECK * * *'}
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-bump served" onClick={() => setShowReceiptModal(false)}>
                Done
              </button>
              <button className="btn-bump ready" onClick={handlePrintReceipt}>
                <Printer size={16} /> Print Receipt (ESC/POS)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
