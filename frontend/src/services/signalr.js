import * as signalR from '@microsoft/signalr';
import { playCashRegister, playKitchenChime } from './sound';

class SignalRService {
  constructor() {
    this.connection = null;
    this.listeners = new Map();
    this.isConnected = false;
  }

  start() {
    if (this.connection) return;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl('/hubs/restaurant')
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    this.connection.on('ReceiveNewOrder', (order) => {
      playKitchenChime();
      this.emit('ReceiveNewOrder', order);
    });

    this.connection.on('TicketBumped', (data) => {
      this.emit('TicketBumped', data);
    });

    this.connection.on('ItemStatusChanged', (data) => {
      this.emit('ItemStatusChanged', data);
    });

    this.connection.on('StockUpdated', (data) => {
      this.emit('StockUpdated', data);
    });

    this.connection.on('TableUpdated', (data) => {
      this.emit('TableUpdated', data);
    });

    this.connection.on('OrderSettled', (data) => {
      playCashRegister();
      this.emit('OrderSettled', data);
    });

    this.connection.on('TicketRecalled', (data) => {
      this.emit('TicketRecalled', data);
    });

    this.connection.on('OrderStatusChanged', (data) => {
      this.emit('OrderStatusChanged', data);
    });

    this.connection.start()
      .then(() => {
        this.isConnected = true;
        this.emit('connectionChanged', true);
      })
      .catch((err) => {
        console.warn('SignalR connection failed (will retry):', err);
        this.isConnected = false;
        this.emit('connectionChanged', false);
      });

    this.connection.onclose(() => {
      this.isConnected = false;
      this.emit('connectionChanged', false);
    });

    this.connection.onreconnecting(() => {
      this.isConnected = false;
      this.emit('connectionChanged', false);
    });

    this.connection.onreconnected(() => {
      this.isConnected = true;
      this.emit('connectionChanged', true);
    });
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event).filter(cb => cb !== callback);
    this.listeners.set(event, callbacks);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in SignalR listener for ${event}:`, err);
        }
      });
    }
  }
}

export const signalRService = new SignalRService();
