import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './App.css';

// Components
import Header from './components/Header';
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './pages/Dashboard';
import MenuManagement from './pages/MenuManagement';
import OrderManagement from './pages/OrderManagement';
import CustomerOrder from './pages/CustomerOrder';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Customer Order Page (No Sidebar) */}
          <Route path="/order" element={<CustomerOrder />} />
          
          {/* Admin Routes (With Sidebar) */}
          <Route path="/*" element={<AdminLayout />} />
        </Routes>
      </div>
    </Router>
  );
}

// Admin Layout Component
const AdminLayout = () => {
  return (
    <div className="admin-layout">
      <Header />
      <div className="admin-container">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/menu" element={<MenuManagement />} />
            <Route path="/orders" element={<OrderManagement />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default App;