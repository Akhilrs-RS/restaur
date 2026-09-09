import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PosView from './views/PosView';
import KdsView from './views/KdsView';
import InventoryView from './views/InventoryView';
import BillingView from './views/BillingView';
import AnalyticsView from './views/AnalyticsView';
import { signalRService } from './services/signalr';
import { api } from './services/api';
import './styles/design-system.css';

export default function App() {
  const [activeTab, setActiveTab] = useState('pos');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTicketCount, setActiveTicketCount] = useState(0);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [unpaidBillsCount, setUnpaidBillsCount] = useState(0);

  const refreshGlobalMetrics = async () => {
    try {
      const [tickets, ingredients, bills] = await Promise.all([
        api.getKdsTickets(),
        api.getIngredients(),
        api.getActiveBills()
      ]);
      setActiveTicketCount(tickets.length);
      setLowStockCount(ingredients.filter(i => i.healthStatus === 'Low' || i.healthStatus === 'Depleted').length);
      setUnpaidBillsCount(bills.length);
    } catch (err) {
      console.warn('Metrics sync error:', err);
    }
  };

  useEffect(() => {
    // 1. Initial metrics load
    refreshGlobalMetrics();

    // 2. Start SignalR real-time event pipeline
    signalRService.start();

    const unsubConn = signalRService.on('connectionChanged', (connected) => {
      setIsConnected(connected);
      if (connected) refreshGlobalMetrics();
    });

    const unsubNewOrder = signalRService.on('ReceiveNewOrder', () => {
      refreshGlobalMetrics();
    });

    const unsubBump = signalRService.on('TicketBumped', () => {
      refreshGlobalMetrics();
    });

    const unsubRecall = signalRService.on('TicketRecalled', () => {
      refreshGlobalMetrics();
    });

    const unsubStock = signalRService.on('StockUpdated', () => {
      refreshGlobalMetrics();
    });

    const unsubSettled = signalRService.on('OrderSettled', () => {
      refreshGlobalMetrics();
    });

    return () => {
      unsubConn();
      unsubNewOrder();
      unsubBump();
      unsubRecall();
      unsubStock();
      unsubSettled();
    };
  }, []);

  return (
    <div className="app-container">
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab}
        activeTicketCount={activeTicketCount}
        lowStockCount={lowStockCount}
        unpaidBillsCount={unpaidBillsCount}
        isConnected={isConnected}
      />

      <main className="app-content">
        {activeTab === 'pos' && (
          <PosView onOrderSent={refreshGlobalMetrics} />
        )}
        {activeTab === 'kds' && (
          <KdsView />
        )}
        {activeTab === 'inventory' && (
          <InventoryView />
        )}
        {activeTab === 'billing' && (
          <BillingView onBillSettled={refreshGlobalMetrics} />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}
      </main>
    </div>
  );
}
