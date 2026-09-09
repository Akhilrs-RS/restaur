# RestoPulse — Restaurant Management & Kitchen POS System

A modern, high-performance Restaurant Management, Kitchen Display (KDS), Inventory & Bill of Materials (BOM) Tracking, and Billing/POS software suite.

Built with **ASP.NET Core Web API (.NET 8)** + **SignalR** on the backend and **React + Vite** on the frontend.

---

## 🍽️ Core Features

### 1. Point of Sale (POS) & Table Management
- Interactive table layout for multiple dining sections (Main Dining, Patio, Bar).
- Dine-In and Takeaway / Delivery workflows.
- Visual dish catalog with category filtering and real-time search.
- Dish modifier customizations (spice levels, special instructions).
- Direct order firing to the kitchen with instant status notifications.

### 2. Kitchen Display System (KDS) & Real-Time Tracking
- Real-time order dispatch powered by **ASP.NET Core SignalR WebSockets**.
- Station routing (Expo, Grill, Saute, Pizza, Salad/Prep, Bar).
- Live visual timers and color-coded urgency indicators (Normal, Warning, Overdue).
- Item-level and whole-ticket status controls: **Pending ➔ Preparing ➔ Ready ➔ Served**.
- Audio chimes for kitchen ticket arrival and status updates.

### 3. Kitchen Inventory & Bill of Materials (BOM) Auto-Depletion
- Track raw ingredients (Rice, Meat, Oil, Vegetables, Dairy, Bakery, etc.).
- **Automated Recipe Mapping (BOM):** Every time an order is placed, raw ingredient stock is automatically decremented from inventory (e.g., 1 Biryani ➔ Rice 250g + Chicken 150g).
- Kitchen wastage logging with instant financial cost impact.
- Low-stock visual warnings and automated Purchase Order (PO) reorder suggestions.
- Full audit log of inventory transactions (Usage, Restock, Wastage).

### 4. Billing, Checkout & Thermal Receipt Printing
- Open check tracking with real-time settlement.
- Flexible payment modes: **Cash, Credit Card, and UPI / QR Code**.
- One-click **Split Bill Calculator** for splitting checks equally among guests.
- **English-Only Thermal Tax Invoice:**
  - 80mm / 58mm POS printer layout (`window.print()` / ESC/POS).
  - Indian Restaurant 5% GST breakdown (**CGST 2.5% + SGST 2.5%**).
  - Restaurant metadata header (Name, Address, Phone, GSTIN, FSSAI License No).
  - Monospace itemized columns (`ITEM | QTY | RATE | AMT`).
  - One-click **Print Bill** (Guest Check before payment) and settled **Tax Invoice**.

### 5. Analytics & Reports
- Real-time sales metrics, order counts, average check sizes, and gross margins.
- Top-performing menu dishes.
- Shift breakdown and revenue trends.

---

## 🏗️ Tech Stack

- **Backend:** C# / .NET 8, ASP.NET Core Web API, Entity Framework Core, SQLite, SignalR
- **Frontend:** React 18, Vite, Lucide Icons, Vanilla CSS Design System
- **Real-Time Layer:** SignalR WebSockets for zero-latency kitchen and table sync

---

## 🚀 Getting Started

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js (v18+) & npm](https://nodejs.org/)

### 1. Run the Backend API
```bash
cd backend/RestaurantApi
dotnet run
```
Backend API will start at: `http://localhost:5000` or `https://localhost:7001`.
> SQLite database `restopulse.db` will be auto-created and pre-seeded with categories, tables, ingredients, recipes, and sample orders on first run.

### 2. Run the Frontend Client
```bash
cd frontend
npm install
npm run dev
```
Frontend will be available at: `http://localhost:5173`.
