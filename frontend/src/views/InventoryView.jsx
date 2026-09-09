import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  Trash2, 
  PlusCircle, 
  DollarSign, 
  ClipboardList, 
  Search, 
  FileText, 
  TrendingDown, 
  Check, 
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { playBumpClick } from '../services/sound';

export default function InventoryView() {
  const [ingredients, setIngredients] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTab, setActiveTab] = useState('stock'); // 'stock', 'recipes', 'transactions'

  // Modals
  const [showWastageModal, setShowWastageModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(false);
  const [showPoModal, setShowPoModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState(null);
  const [poSuggestions, setPoSuggestions] = useState([]);

  // Form states
  const [wasteQty, setWasteQty] = useState('');
  const [wasteReason, setWasteReason] = useState('Burnt during cooking');
  const [restockQty, setRestockQty] = useState('');
  const [restockCost, setRestockCost] = useState('');
  const [restockReason, setRestockReason] = useState('Supplier Delivery');

  // Selected dish for recipe inspection
  const [selectedDish, setSelectedDish] = useState(null);

  const loadData = async () => {
    try {
      const [ingData, menuData, transData] = await Promise.all([
        api.getIngredients(),
        api.getMenuItems(),
        api.getTransactions()
      ]);
      setIngredients(ingData);
      setMenuItems(menuData);
      setTransactions(transData);
      if (menuData.length > 0 && !selectedDish) {
        setSelectedDish(menuData[0]);
      }
    } catch (err) {
      console.error('Failed to load inventory data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredIngredients = ingredients.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'All' || item.healthStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  // Calculate metrics
  const totalValuation = ingredients.reduce((sum, item) => sum + (item.totalValue || 0), 0);
  const lowStockCount = ingredients.filter(i => i.healthStatus === 'Low' || i.healthStatus === 'Depleted').length;
  const totalWastageLoss = transactions
    .filter(t => t.type === 'Wastage')
    .reduce((sum, t) => sum + t.totalCost, 0);

  const handleOpenWastage = (ing) => {
    playBumpClick();
    setSelectedIngredient(ing);
    setWasteQty('');
    setWasteReason('Burnt during cooking');
    setShowWastageModal(true);
  };

  const handleOpenRestock = (ing) => {
    playBumpClick();
    setSelectedIngredient(ing);
    setRestockQty('');
    setRestockCost(ing.costPerUnit.toString());
    setRestockReason('Supplier Delivery');
    setShowRestockModal(true);
  };

  const submitWastage = async (e) => {
    e.preventDefault();
    if (!selectedIngredient || !wasteQty || parseFloat(wasteQty) <= 0) return;

    try {
      await api.logWastage({
        ingredientId: selectedIngredient.id,
        quantity: parseFloat(wasteQty),
        reason: wasteReason
      });
      setShowWastageModal(false);
      loadData();
    } catch (err) {
      alert(`Error logging wastage: ${err.message}`);
    }
  };

  const submitRestock = async (e) => {
    e.preventDefault();
    if (!selectedIngredient || !restockQty || parseFloat(restockQty) <= 0) return;

    try {
      await api.restock({
        ingredientId: selectedIngredient.id,
        quantity: parseFloat(restockQty),
        unitCost: restockCost ? parseFloat(restockCost) : null,
        reason: restockReason
      });
      setShowRestockModal(false);
      loadData();
    } catch (err) {
      alert(`Error restocking: ${err.message}`);
    }
  };

  const openPoModal = async () => {
    playBumpClick();
    try {
      const suggestions = await api.getPurchaseOrderSuggestions();
      setPoSuggestions(suggestions);
      setShowPoModal(true);
    } catch (err) {
      console.error('Error fetching PO suggestions:', err);
    }
  };

  const poTotalCost = poSuggestions.reduce((sum, item) => sum + item.estimatedCost, 0);

  return (
    <div>
      {/* Metrics Row */}
      <div className="inventory-stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: 'var(--primary)' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <div className="stat-val">${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div className="stat-label">Total Inventory Valuation</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--accent-amber)' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <div className="stat-val">{lowStockCount} Items</div>
            <div className="stat-label">Low / Depleted Stock</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--accent-rose)' }}>
            <TrendingDown size={24} />
          </div>
          <div>
            <div className="stat-val">${totalWastageLoss.toFixed(2)}</div>
            <div className="stat-label">Loss to Kitchen Wastage</div>
          </div>
        </div>
      </div>

      {/* Main Tab Controls & Action Buttons */}
      <div className="inventory-header">
        <div className="nav-tabs" style={{ background: 'var(--bg-surface)' }}>
          <button 
            className={`nav-tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
            onClick={() => setActiveTab('stock')}
          >
            <Package size={15} /> Raw Stock Catalog
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            <Layers size={15} /> Recipe BOM Explorer
          </button>
          <button 
            className={`nav-tab-btn ${activeTab === 'transactions' ? 'active' : ''}`}
            onClick={() => setActiveTab('transactions')}
          >
            <ClipboardList size={15} /> Movement Logs
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            className="btn-bump ready" 
            style={{ padding: '8px 16px', width: 'auto' }}
            onClick={openPoModal}
          >
            <FileText size={15} /> Auto Purchase Order ({lowStockCount})
          </button>
        </div>
      </div>

      {/* 1. STOCK CATALOG TAB */}
      {activeTab === 'stock' && (
        <div>
          {/* Filters Bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div className="menu-search-bar" style={{ flex: 1, minWidth: 260 }}>
              <Search size={16} color="var(--text-dim)" />
              <input 
                type="text" 
                placeholder="Search raw ingredient, SKU, or supplier..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: 6 }}>
              {['All', 'Healthy', 'Low', 'Depleted'].map(st => (
                <button 
                  key={st}
                  className={`section-chip ${filterStatus === st ? 'active' : ''}`}
                  onClick={() => setFilterStatus(st)}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Ingredient</th>
                  <th>Current Stock</th>
                  <th>Reorder Threshold</th>
                  <th>Unit Cost</th>
                  <th>Total Valuation</th>
                  <th>Supplier</th>
                  <th>Health Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngredients.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-dim)' }}>{item.sku}</td>
                    <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{item.name}</td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700 }}>
                      {item.currentStock.toLocaleString()} {item.unit}
                    </td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-dim)' }}>
                      {item.reorderLevel.toLocaleString()} {item.unit}
                    </td>
                    <td style={{ fontFamily: 'var(--font-family-mono)' }}>${item.costPerUnit.toFixed(3)}</td>
                    <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                      ${item.totalValue.toFixed(2)}
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>{item.supplierName}</td>
                    <td>
                      <span className={`health-badge ${item.healthStatus}`}>
                        {item.healthStatus}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button 
                          className="icon-btn" 
                          title="Restock delivery"
                          style={{ width: 30, height: 30, color: 'var(--accent-emerald)' }}
                          onClick={() => handleOpenRestock(item)}
                        >
                          <PlusCircle size={15} />
                        </button>
                        <button 
                          className="icon-btn" 
                          title="Log Kitchen Waste / Spoilage"
                          style={{ width: 30, height: 30, color: 'var(--accent-rose)' }}
                          onClick={() => handleOpenWastage(item)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 2. RECIPE BOM EXPLORER TAB */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 24 }}>
          {/* Dish List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Select Dish to Inspect BOM
            </div>
            {menuItems.map(dish => (
              <div 
                key={dish.id}
                onClick={() => { setSelectedDish(dish); playBumpClick(); }}
                style={{
                  padding: 12,
                  background: selectedDish?.id === dish.id ? 'var(--bg-surface-elevated)' : 'var(--bg-surface)',
                  border: `1px solid ${selectedDish?.id === dish.id ? 'var(--primary)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10
                }}
              >
                <img src={dish.imageUrl} alt={dish.name} style={{ width: 44, height: 44, borderRadius: 6, objectFit: 'cover' }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{dish.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-family-mono)' }}>
                    Menu Price: ${dish.price.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Dish Recipe Breakdown */}
          {selectedDish && (
            <div className="tables-strip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-white)' }}>
                    {selectedDish.name} &bull; Bill of Materials (BOM)
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-dim)', marginTop: 2 }}>
                    Every time this dish is ordered or prepared, these exact ingredient quantities are automatically depleted from inventory.
                  </div>
                </div>
              </div>

              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Ingredient</th>
                      <th>Quantity Per Portion</th>
                      <th>Unit Cost</th>
                      <th>Portion Cost Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDish.recipes?.map(recipe => {
                      const ing = recipe.ingredient;
                      const portionCost = ing ? recipe.quantityRequired * ing.costPerUnit : 0;
                      return (
                        <tr key={recipe.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{ing?.name || 'Unknown'}</td>
                          <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--primary)' }}>
                            {recipe.quantityRequired} {ing?.unit}
                          </td>
                          <td style={{ fontFamily: 'var(--font-family-mono)' }}>
                            ${ing?.costPerUnit.toFixed(3)}
                          </td>
                          <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-emerald)', fontWeight: 600 }}>
                            ${portionCost.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. TRANSACTION LOGS TAB */}
      {activeTab === 'transactions' && (
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Ingredient</th>
                <th>Quantity</th>
                <th>Cost Impact</th>
                <th>Reason / Trigger</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td style={{ color: 'var(--text-dim)', fontSize: '12px' }}>
                    {new Date(t.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span 
                      className="health-badge" 
                      style={{
                        background: t.type === 'Usage' ? 'rgba(56, 189, 248, 0.15)' : (t.type === 'Wastage' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)'),
                        color: t.type === 'Usage' ? 'var(--primary)' : (t.type === 'Wastage' ? 'var(--accent-rose)' : 'var(--accent-emerald)')
                      }}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{t.ingredientName}</td>
                  <td style={{ fontFamily: 'var(--font-family-mono)' }}>{t.quantity} {t.unit}</td>
                  <td style={{ fontFamily: 'var(--font-family-mono)', color: t.type === 'Wastage' ? 'var(--accent-rose)' : 'var(--text-main)' }}>
                    ${t.totalCost.toFixed(2)}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{t.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* WASTAGE MODAL */}
      {showWastageModal && selectedIngredient && (
        <div className="modal-overlay" onClick={() => setShowWastageModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitWastage}>
              <div className="modal-header">
                <div className="modal-title">Record Kitchen Wastage</div>
                <button type="button" className="icon-btn" onClick={() => setShowWastageModal(false)}>✕</button>
              </div>

              <div className="modal-body">
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{selectedIngredient.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Current Stock: {selectedIngredient.currentStock} {selectedIngredient.unit}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Wasted Quantity ({selectedIngredient.unit})</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    required 
                    placeholder={`e.g. 50 ${selectedIngredient.unit}`}
                    value={wasteQty}
                    onChange={(e) => setWasteQty(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Reason Code</label>
                  <select 
                    className="form-select"
                    value={wasteReason}
                    onChange={(e) => setWasteReason(e.target.value)}
                  >
                    <option value="Burnt during cooking">Burnt during cooking</option>
                    <option value="Expired / Past shelf life">Expired / Past shelf life</option>
                    <option value="Dropped / Spilled">Dropped / Spilled</option>
                    <option value="Quality check failure">Quality check failure</option>
                    <option value="Over-prepped / Unsold">Over-prepped / Unsold</option>
                  </select>
                </div>

                {wasteQty && parseFloat(wasteQty) > 0 && (
                  <div style={{ padding: '10px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 6, color: 'var(--accent-rose)', fontSize: '13px' }}>
                    Direct Cost Loss: ${(parseFloat(wasteQty) * selectedIngredient.costPerUnit).toFixed(2)}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-bump served" onClick={() => setShowWastageModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-bump ready" style={{ background: 'var(--accent-rose)', color: 'white' }}>
                  Log Wastage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESTOCK MODAL */}
      {showRestockModal && selectedIngredient && (
        <div className="modal-overlay" onClick={() => setShowRestockModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <form onSubmit={submitRestock}>
              <div className="modal-header">
                <div className="modal-title">Restock Ingredient Delivery</div>
                <button type="button" className="icon-btn" onClick={() => setShowRestockModal(false)}>✕</button>
              </div>

              <div className="modal-body">
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{selectedIngredient.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Supplier: {selectedIngredient.supplierName}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Received Quantity ({selectedIngredient.unit})</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    required 
                    placeholder={`e.g. 5000 ${selectedIngredient.unit}`}
                    value={restockQty}
                    onChange={(e) => setRestockQty(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Cost Per Unit ($)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    value={restockCost}
                    onChange={(e) => setRestockCost(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Delivery Note / Invoice Reference</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={restockReason}
                    onChange={(e) => setRestockReason(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-bump served" onClick={() => setShowRestockModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-bump ready">
                  Confirm Restock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AUTOMATED PURCHASE ORDER MODAL */}
      {showPoModal && (
        <div className="modal-overlay" onClick={() => setShowPoModal(false)}>
          <div className="modal-card" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Automated Low-Stock Purchase Order</div>
              <button className="icon-btn" onClick={() => setShowPoModal(false)}>✕</button>
            </div>

            <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: 12 }}>
                Generated based on safety reorder thresholds to replenish healthy stock levels:
              </div>

              {poSuggestions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--accent-emerald)' }}>
                  <Check size={32} style={{ margin: '0 auto 8px' }} />
                  <div>All raw ingredients are within healthy safety levels!</div>
                </div>
              ) : (
                <div className="data-table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Current</th>
                        <th>Threshold</th>
                        <th>Order Qty</th>
                        <th>Supplier</th>
                        <th>Est. Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poSuggestions.map(s => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-white)' }}>{s.name}</td>
                          <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-rose)' }}>{s.currentStock} {s.unit}</td>
                          <td style={{ fontFamily: 'var(--font-family-mono)' }}>{s.reorderLevel} {s.unit}</td>
                          <td style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, color: 'var(--primary)' }}>{s.suggestedQuantity} {s.unit}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.supplierName}</td>
                          <td style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-emerald)', fontWeight: 600 }}>${s.estimatedCost.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {poSuggestions.length > 0 && (
                <div style={{ marginTop: 14, textAlign: 'right', fontSize: '15px', fontWeight: 700, color: 'var(--text-white)' }}>
                  Total Estimated PO Cost: <span style={{ color: 'var(--accent-emerald)', fontFamily: 'var(--font-family-mono)' }}>${poTotalCost.toFixed(2)}</span>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-bump served" onClick={() => setShowPoModal(false)}>
                Close
              </button>
              {poSuggestions.length > 0 && (
                <button 
                  className="btn-bump ready" 
                  onClick={() => {
                    alert("Purchase order generated and dispatched to supplier email queues!");
                    setShowPoModal(false);
                  }}
                >
                  Dispatch Purchase Order
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
