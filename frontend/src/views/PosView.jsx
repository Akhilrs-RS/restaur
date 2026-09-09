import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  User, 
  Sparkles,
  Layers,
  ChefHat,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  Truck,
  MapPin,
  Phone,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { playBumpClick, playKitchenChime } from '../services/sound';

export default function PosView({ onOrderSent }) {
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Multi-Channel Order Details: 'DineIn' | 'Takeaway' | 'Swiggy' | 'DirectDelivery'
  const [orderChannel, setOrderChannel] = useState('DineIn');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState(30);
  const [swiggyOrderId, setSwiggyOrderId] = useState(() => `SWG-${Math.floor(1000 + Math.random() * 9000)}`);
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');
  const [pickupMinutes, setPickupMinutes] = useState(15);
  const [orderNotes, setOrderNotes] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState(null);

  // Modifier Modal
  const [activeModifierItem, setActiveModifierItem] = useState(null);
  const [selectedModifiers, setSelectedModifiers] = useState([]);
  const [itemNote, setItemNote] = useState('');

  const commonModifiers = [
    'No Onions', 'Extra Sauce', 'Spicy', 'Gluten-Free', 
    'Medium-Rare', 'Well-Done', 'Dressing On Side', 'Crispy'
  ];

  const loadData = async () => {
    try {
      const [tData, cData, mData] = await Promise.all([
        api.getTables(),
        api.getCategories(),
        api.getMenuItems()
      ]);
      setTables(tData);
      setCategories(cData);
      setMenuItems(mData);
    } catch (err) {
      console.error('Failed to load POS data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredTables = selectedSection === 'All' 
    ? tables 
    : tables.filter(t => t.section === selectedSection);

  const filteredMenuItems = menuItems.filter(item => {
    const matchesCategory = selectedCategory === 'All' || item.categoryId === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleTableClick = (table) => {
    playBumpClick();
    setSelectedTable(table);
    setOrderChannel('DineIn');
  };

  const handleChannelSelect = (channel) => {
    playBumpClick();
    setOrderChannel(channel);
    if (channel !== 'DineIn') {
      setSelectedTable(null);
    }
    if (channel === 'Swiggy' && !swiggyOrderId) {
      setSwiggyOrderId(`SWG-${Math.floor(1000 + Math.random() * 9000)}`);
    }
  };

  const generateNewSwiggyId = () => {
    playBumpClick();
    setSwiggyOrderId(`SWG-${Math.floor(1000 + Math.random() * 9000)}`);
  };

  const handleOpenModifierModal = (item) => {
    if (!item.isAvailable) return;
    playBumpClick();
    setActiveModifierItem(item);
    setSelectedModifiers([]);
    setItemNote('');
  };

  const toggleModifier = (mod) => {
    playBumpClick();
    setSelectedModifiers(prev => 
      prev.includes(mod) ? prev.filter(m => m !== mod) : [...prev, mod]
    );
  };

  const addCurrentItemToCart = () => {
    if (!activeModifierItem) return;
    playBumpClick();

    const existingIndex = cart.findIndex(c => 
      c.menuItemId === activeModifierItem.id && 
      JSON.stringify(c.modifiers) === JSON.stringify(selectedModifiers) &&
      c.notes === itemNote
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart(prev => [
        ...prev,
        {
          menuItemId: activeModifierItem.id,
          name: activeModifierItem.name,
          price: activeModifierItem.price,
          quantity: 1,
          modifiers: selectedModifiers,
          notes: itemNote,
          station: activeModifierItem.station
        }
      ]);
    }

    setActiveModifierItem(null);
  };

  const updateQuantity = (index, delta) => {
    playBumpClick();
    const updated = [...cart];
    updated[index].quantity += delta;
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1);
    }
    setCart(updated);
  };

  const removeItem = (index) => {
    playBumpClick();
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = Math.round(subtotal * 0.05 * 100) / 100; // 5% GST
  const activeDeliveryFee = orderChannel === 'DirectDelivery' ? parseFloat(deliveryFee || 0) : 0;
  const total = Math.round((subtotal + tax + activeDeliveryFee) * 100) / 100;

  const handleSendToKitchen = async () => {
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      let backendType = 0; // DineIn
      let backendProvider = 0; // None

      if (orderChannel === 'Takeaway') {
        backendType = 1;
        backendProvider = 0;
      } else if (orderChannel === 'Swiggy') {
        backendType = 2; // Delivery
        backendProvider = 2; // Swiggy
      } else if (orderChannel === 'DirectDelivery') {
        backendType = 2; // Delivery
        backendProvider = 1; // Direct
      }

      let finalCustomerName = customerName.trim();
      if (!finalCustomerName) {
        if (orderChannel === 'DineIn') finalCustomerName = selectedTable ? `Table ${selectedTable.tableNumber}` : 'Dine-In Guest';
        else if (orderChannel === 'Takeaway') finalCustomerName = 'Takeaway Guest';
        else if (orderChannel === 'Swiggy') finalCustomerName = 'Swiggy Customer';
        else finalCustomerName = 'Direct Delivery Customer';
      }

      const orderPayload = {
        tableId: orderChannel === 'DineIn' ? selectedTable?.id : null,
        type: backendType,
        deliveryProvider: backendProvider,
        customerName: finalCustomerName,
        customerPhone,
        deliveryAddress: (orderChannel === 'Swiggy' || orderChannel === 'DirectDelivery') ? deliveryAddress : '',
        deliveryFee: activeDeliveryFee,
        channelOrderId: orderChannel === 'Swiggy' ? swiggyOrderId : '',
        riderName: (orderChannel === 'Swiggy' || orderChannel === 'DirectDelivery') ? riderName : '',
        riderPhone: orderChannel === 'DirectDelivery' ? riderPhone : '',
        notes: orderNotes ? (orderChannel === 'Takeaway' ? `[Pickup ~${pickupMinutes}m] ${orderNotes}` : orderNotes) : (orderChannel === 'Takeaway' ? `Takeaway pickup in ~${pickupMinutes}m` : ''),
        isPriority,
        items: cart.map(c => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          modifiers: c.modifiers,
          notes: c.notes
        }))
      };

      const result = await api.createOrder(orderPayload);
      playKitchenChime();

      setSuccessNotice(`Order #${result.orderNumber} fired to kitchen!`);
      setCart([]);
      setOrderNotes('');
      setDeliveryAddress('');
      setRiderName('');
      setRiderPhone('');
      setCustomerName('');
      setCustomerPhone('');
      if (orderChannel === 'Swiggy') {
        setSwiggyOrderId(`SWG-${Math.floor(1000 + Math.random() * 9000)}`);
      }
      setIsPriority(false);
      loadData(); // reload table statuses

      if (onOrderSent) onOrderSent(result);

      setTimeout(() => {
        setSuccessNotice(null);
      }, 4000);
    } catch (err) {
      alert(`Error submitting order: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = ['All', 'Main Dining', 'Patio', 'Bar'];

  return (
    <div className="pos-layout">
      {/* Left Panel: Floor Plan & Menu */}
      <div className="pos-main-panel">
        {/* Table Floor Plan */}
        <div className="tables-strip">
          <div className="tables-header">
            <div className="tables-title">Interactive Floor Plan</div>
            <div className="section-filters">
              {sections.map(s => (
                <button 
                  key={s} 
                  className={`section-chip ${selectedSection === s ? 'active' : ''}`}
                  onClick={() => setSelectedSection(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="tables-grid">
            {filteredTables.map(t => (
              <div 
                key={t.id} 
                className={`table-box ${selectedTable?.id === t.id ? 'selected' : ''}`}
                onClick={() => handleTableClick(t)}
              >
                <div className="table-num">{t.tableNumber}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>{t.capacity} Seats</div>
                <div className={`table-status-pill status-${t.status}`}>
                  {t.status === 0 ? 'Available' : (t.status === 1 ? 'Occupied' : (t.status === 2 ? 'Billing' : 'Cleaning'))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Menu Section */}
        <div className="menu-explorer">
          {/* Search & Category Pills */}
          <div className="menu-search-bar">
            <Search size={18} color="var(--text-dim)" />
            <input 
              type="text" 
              placeholder="Search dishes by name or ingredients..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="menu-categories-scroll">
            <button 
              className={`cat-btn ${selectedCategory === 'All' ? 'active' : ''}`}
              onClick={() => { setSelectedCategory('All'); playBumpClick(); }}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button 
                key={cat.id} 
                className={`cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => { setSelectedCategory(cat.id); playBumpClick(); }}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Dishes Grid */}
          <div className="menu-items-grid">
            {filteredMenuItems.map(dish => (
              <div 
                key={dish.id} 
                className={`dish-card ${!dish.isAvailable ? 'disabled' : ''}`}
                onClick={() => handleOpenModifierModal(dish)}
              >
                <img src={dish.imageUrl} alt={dish.name} className="dish-card-img" />
                <div className="dish-card-body">
                  <div className="dish-name">{dish.name}</div>
                  <div className="dish-desc">{dish.description}</div>
                  <div className="dish-card-footer">
                    <span className="dish-price">₹{dish.price.toFixed(2)}</span>
                    <span className="dish-prep-time">
                      <Clock size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {dish.prepTimeMinutes}m
                    </span>
                  </div>
                  {!dish.isAvailable && (
                    <div style={{ marginTop: 8, fontSize: '11px', fontWeight: 700, color: 'var(--accent-rose)' }}>
                      86'D (OUT OF STOCK)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel: Order Cart */}
      <div className="pos-cart-panel">
        <div className="cart-header">
          <div className="cart-title">
            <span>Ticket Cart</span>
            {orderChannel === 'DineIn' && selectedTable && (
              <span className="ticket-table-badge">Table {selectedTable.tableNumber}</span>
            )}
            {orderChannel === 'Takeaway' && (
              <span className="ticket-channel-badge takeaway">
                <ShoppingBag size={11} /> Takeaway
              </span>
            )}
            {orderChannel === 'Swiggy' && (
              <span className="ticket-channel-badge swiggy">
                <Bike size={11} /> {swiggyOrderId}
              </span>
            )}
            {orderChannel === 'DirectDelivery' && (
              <span className="ticket-channel-badge direct">
                <Truck size={11} /> Direct Delivery
              </span>
            )}
          </div>

          {/* Order Channel Selector */}
          <div className="order-channel-selector">
            <button 
              type="button"
              className={`order-channel-btn ${orderChannel === 'DineIn' ? 'active channel-dinein' : ''}`}
              onClick={() => handleChannelSelect('DineIn')}
            >
              <UtensilsCrossed size={14} />
              <span>Dine-In</span>
            </button>
            <button 
              type="button"
              className={`order-channel-btn ${orderChannel === 'Takeaway' ? 'active channel-takeaway' : ''}`}
              onClick={() => handleChannelSelect('Takeaway')}
            >
              <ShoppingBag size={14} />
              <span>Takeaway</span>
            </button>
            <button 
              type="button"
              className={`order-channel-btn ${orderChannel === 'Swiggy' ? 'active channel-swiggy' : ''}`}
              onClick={() => handleChannelSelect('Swiggy')}
            >
              <Bike size={14} />
              <span>Swiggy</span>
            </button>
            <button 
              type="button"
              className={`order-channel-btn ${orderChannel === 'DirectDelivery' ? 'active channel-direct' : ''}`}
              onClick={() => handleChannelSelect('DirectDelivery')}
            >
              <Truck size={14} />
              <span>Direct</span>
            </button>
          </div>

          {/* Channel Specific Inputs */}
          {orderChannel === 'DineIn' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input 
                type="text" 
                placeholder="Guest Name / Cover (Optional)" 
                className="form-input" 
                style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <button 
                type="button"
                className={`icon-btn ${isPriority ? 'active' : ''}`}
                style={{ 
                  width: 'auto', 
                  padding: '0 8px', 
                  background: isPriority ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                  borderColor: isPriority ? 'var(--accent-rose)' : 'var(--border-subtle)',
                  color: isPriority ? 'var(--accent-rose)' : 'var(--text-muted)'
                }}
                onClick={() => { setIsPriority(!isPriority); playBumpClick(); }}
                title="Toggle High Priority / Rush Order"
              >
                <Sparkles size={14} style={{ marginRight: 4 }} /> VIP Rush
              </button>
            </div>
          )}

          {orderChannel === 'Takeaway' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, padding: 8, background: 'rgba(139, 92, 246, 0.06)', borderRadius: 6, border: '1px solid rgba(139, 92, 246, 0.2)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  className="form-input" 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Mobile Number" 
                  className="form-input" 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Pickup Est:</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[10, 15, 20, 30].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      className={`section-chip ${pickupMinutes === mins ? 'active' : ''}`}
                      style={{ padding: '2px 6px', fontSize: '10px' }}
                      onClick={() => setPickupMinutes(mins)}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
                <button 
                  type="button"
                  className={`icon-btn ${isPriority ? 'active' : ''}`}
                  style={{ 
                    width: 'auto', 
                    padding: '2px 6px', 
                    fontSize: '11px',
                    background: isPriority ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    borderColor: isPriority ? 'var(--accent-rose)' : 'var(--border-subtle)',
                    color: isPriority ? 'var(--accent-rose)' : 'var(--text-muted)'
                  }}
                  onClick={() => { setIsPriority(!isPriority); playBumpClick(); }}
                >
                  <Sparkles size={11} style={{ marginRight: 2 }} /> Rush
                </button>
              </div>
            </div>
          )}

          {orderChannel === 'Swiggy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, padding: 8, background: 'rgba(252, 128, 25, 0.06)', borderRadius: 6, border: '1px solid rgba(252, 128, 25, 0.2)' }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Swiggy Order ID" 
                  className="form-input" 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px', fontWeight: 600, color: '#ea580c' }}
                  value={swiggyOrderId}
                  onChange={(e) => setSwiggyOrderId(e.target.value)}
                />
                <button 
                  type="button" 
                  className="icon-btn" 
                  title="Generate new Swiggy ID" 
                  style={{ width: 28, height: 28 }}
                  onClick={generateNewSwiggyId}
                >
                  <RefreshCw size={12} />
                </button>
                <button 
                  type="button"
                  className={`icon-btn ${isPriority ? 'active' : ''}`}
                  style={{ 
                    width: 'auto', 
                    padding: '2px 6px', 
                    fontSize: '11px',
                    background: isPriority ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    borderColor: isPriority ? 'var(--accent-rose)' : 'var(--border-subtle)',
                    color: isPriority ? 'var(--accent-rose)' : 'var(--text-muted)'
                  }}
                  onClick={() => { setIsPriority(!isPriority); playBumpClick(); }}
                >
                  <Sparkles size={11} style={{ marginRight: 2 }} /> Rush
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  className="form-input" 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Customer Phone" 
                  className="form-input" 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <input 
                type="text" 
                placeholder="Delivery Address" 
                className="form-input" 
                style={{ width: '100%', padding: '5px 8px', fontSize: '12px' }}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
              <input 
                type="text" 
                placeholder="Swiggy Valet / Rider Name (Optional)" 
                className="form-input" 
                style={{ width: '100%', padding: '5px 8px', fontSize: '12px' }}
                value={riderName}
                onChange={(e) => setRiderName(e.target.value)}
              />
            </div>
          )}

          {orderChannel === 'DirectDelivery' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10, padding: 8, background: 'rgba(16, 185, 129, 0.06)', borderRadius: 6, border: '1px solid rgba(16, 185, 129, 0.2)' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  className="form-input" 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Customer Phone" 
                  className="form-input" 
                  style={{ flex: 1, padding: '5px 8px', fontSize: '12px' }}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>
              <input 
                type="text" 
                placeholder="Full Delivery Address & Landmark" 
                className="form-input" 
                style={{ width: '100%', padding: '5px 8px', fontSize: '12px' }}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
              />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fee ₹:</span>
                  <input 
                    type="number" 
                    placeholder="Fee" 
                    className="form-input" 
                    style={{ width: 65, padding: '4px 6px', fontSize: '12px' }}
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(e.target.value)}
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Assigned Rider" 
                  className="form-input" 
                  style={{ flex: 1, padding: '4px 6px', fontSize: '12px' }}
                  value={riderName}
                  onChange={(e) => setRiderName(e.target.value)}
                />
                <button 
                  type="button"
                  className={`icon-btn ${isPriority ? 'active' : ''}`}
                  style={{ 
                    width: 'auto', 
                    padding: '2px 6px', 
                    fontSize: '11px',
                    background: isPriority ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    borderColor: isPriority ? 'var(--accent-rose)' : 'var(--border-subtle)',
                    color: isPriority ? 'var(--accent-rose)' : 'var(--text-muted)'
                  }}
                  onClick={() => { setIsPriority(!isPriority); playBumpClick(); }}
                >
                  <Sparkles size={11} style={{ marginRight: 2 }} /> Rush
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Notification Toast */}
        {successNotice && (
          <div style={{ padding: '10px 16px', background: 'rgba(16, 185, 129, 0.15)', borderBottom: '1px solid var(--accent-emerald)', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', fontWeight: 600 }}>
            <CheckCircle2 size={16} />
            {successNotice}
          </div>
        )}

        {/* Cart Item Rows */}
        <div className="cart-items-container">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-dim)' }}>
              <UtensilsCrossed size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div>Cart is empty</div>
              <div style={{ fontSize: '12px', marginTop: 4 }}>Select a dish from the menu to add to ticket.</div>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div key={idx} className="cart-item-row">
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{item.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--accent-emerald)', fontFamily: 'var(--font-family-mono)' }}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </div>
                  {item.modifiers?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {item.modifiers.map(m => (
                        <span key={m} className="modifier-tag">{m}</span>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2, fontStyle: 'italic' }}>
                      "{item.notes}"
                    </div>
                  )}
                </div>

                <div className="cart-qty-ctrl">
                  <button className="cart-qty-btn" onClick={() => updateQuantity(idx, -1)}>
                    <Minus size={12} />
                  </button>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontWeight: 700, minWidth: 16, textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button className="cart-qty-btn" onClick={() => updateQuantity(idx, 1)}>
                    <Plus size={12} />
                  </button>
                  <button 
                    className="cart-qty-btn" 
                    style={{ marginLeft: 4, color: 'var(--accent-rose)' }} 
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer & Send to Kitchen */}
        <div className="cart-footer">
          <input 
            type="text" 
            placeholder="Special kitchen prep notes..." 
            className="form-input" 
            style={{ width: '100%', marginBottom: 12, padding: '8px 12px', fontSize: '12px' }}
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
          />

          <div className="cart-totals-row">
            <span>Subtotal</span>
            <span style={{ fontFamily: 'var(--font-family-mono)' }}>₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="cart-totals-row">
            <span>GST (5%)</span>
            <span style={{ fontFamily: 'var(--font-family-mono)' }}>₹{tax.toFixed(2)}</span>
          </div>
          {orderChannel === 'DirectDelivery' && activeDeliveryFee > 0 && (
            <div className="cart-totals-row">
              <span>Delivery Charge</span>
              <span style={{ fontFamily: 'var(--font-family-mono)' }}>₹{activeDeliveryFee.toFixed(2)}</span>
            </div>
          )}
          <div className="cart-totals-row grand-total">
            <span>Total</span>
            <span style={{ color: 'var(--accent-emerald)' }}>₹{total.toFixed(2)}</span>
          </div>

          <button 
            className="btn-send-kitchen"
            disabled={cart.length === 0 || isSubmitting}
            onClick={handleSendToKitchen}
          >
            <Send size={16} />
            {isSubmitting ? 'Firing to Kitchen...' : 'Fire Ticket to Kitchen'}
          </button>
        </div>
      </div>

      {/* Modifier Drawer / Modal */}
      {activeModifierItem && (
        <div className="modal-overlay" onClick={() => setActiveModifierItem(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">Customize: {activeModifierItem.name}</div>
              <button className="icon-btn" onClick={() => setActiveModifierItem(null)}>✕</button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', gap: 14 }}>
                <img 
                  src={activeModifierItem.imageUrl} 
                  alt={activeModifierItem.name} 
                  style={{ width: 90, height: 75, borderRadius: 8, objectFit: 'cover' }} 
                />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-white)' }}>{activeModifierItem.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0' }}>{activeModifierItem.description}</div>
                  <div style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--accent-emerald)', fontWeight: 700 }}>
                    ₹{activeModifierItem.price.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Special Modifiers & Instructions</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {commonModifiers.map(mod => {
                    const isSelected = selectedModifiers.includes(mod);
                    return (
                      <button 
                        key={mod}
                        type="button"
                        className={`section-chip ${isSelected ? 'active' : ''}`}
                        style={{ padding: '6px 12px', fontSize: '12px' }}
                        onClick={() => toggleModifier(mod)}
                      >
                        {mod}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Custom Cooking Notes</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="e.g. Extra crispy fries, allergy alert..."
                  value={itemNote}
                  onChange={(e) => setItemNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-bump served" 
                style={{ flex: 'none', padding: '10px 18px' }}
                onClick={() => setActiveModifierItem(null)}
              >
                Cancel
              </button>
              <button 
                className="btn-bump ready" 
                style={{ flex: 'none', padding: '10px 24px' }}
                onClick={addCurrentItemToCart}
              >
                Add to Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
