const BASE_URL = '/api';

export async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }
  return response.json();
}

export const api = {
  // Tables
  getTables: () => request('/tables'),
  updateTableStatus: (id, status) => request(`/tables/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(status),
  }),

  // Menu
  getCategories: () => request('/menu/categories'),
  getMenuItems: () => request('/menu/items'),
  toggleAvailability: (id) => request(`/menu/items/${id}/toggle-availability`, { method: 'PUT' }),
  updateRecipe: (dto) => request('/menu/recipes', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),

  // Orders & POS
  getOrders: (status) => request(`/orders${status ? `?status=${status}` : ''}`),
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (orderDto) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(orderDto),
  }),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'PUT' }),

  // Kitchen Display System (KDS)
  getKdsTickets: (station) => request(`/kds/tickets${station ? `?station=${station}` : ''}`),
  getKdsSummary: (station) => request(`/kds/summary${station ? `?station=${station}` : ''}`),
  bumpKdsItem: (itemId, status) => request(`/kds/items/${itemId}/bump`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  bumpKdsTicket: (orderId, status) => request(`/kds/tickets/${orderId}/bump`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  }),
  getRecalledTickets: () => request('/kds/recalled'),
  recallTicket: (orderId) => request(`/kds/tickets/${orderId}/recall`, { method: 'PUT' }),

  // Inventory & BOM
  getIngredients: () => request('/inventory/ingredients'),
  logWastage: (dto) => request('/inventory/wastage', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),
  restock: (dto) => request('/inventory/restock', {
    method: 'POST',
    body: JSON.stringify(dto),
  }),
  getTransactions: () => request('/inventory/transactions'),
  getPurchaseOrderSuggestions: () => request('/inventory/purchase-order-suggestions'),

  // Billing & Settlement
  getActiveBills: () => request('/billing/active'),
  calculateSplit: (orderId, splitCount) => request(`/billing/${orderId}/split`, {
    method: 'POST',
    body: JSON.stringify({ splitCount }),
  }),
  settleBill: (orderId, settleDto) => request(`/billing/${orderId}/settle`, {
    method: 'POST',
    body: JSON.stringify(settleDto),
  }),
  getReceiptData: (orderId) => request(`/billing/${orderId}/receipt`),

  // Analytics
  getDashboardStats: () => request('/analytics/dashboard'),
};
