import React, { useState, useEffect } from 'react';

const Dashboard = () => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    checkBackend();
    fetchDashboardData();

    // Setup auto refresh setiap 10 detik
    const interval = setInterval(() => {
      console.log('🔄 Auto-refreshing dashboard data...');
      fetchDashboardData();
    }, 10000); // 10 detik

    // Cleanup interval ketika component unmount
    return () => clearInterval(interval);
  }, []);

  const checkBackend = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/health');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('error');
      }
    } catch (error) {
      setBackendStatus('disconnected');
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5001/api/dashboard/stats');
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
        setLastUpdate(new Date());
      } else {
        console.error('Failed to fetch dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const testEndpoints = async () => {
    const endpoints = [
      { name: 'Health', url: 'http://localhost:5001/api/health' },
      { name: 'Menu', url: 'http://localhost:5001/api/menu' },
      { name: 'Orders', url: 'http://localhost:5001/api/orders' },
      { name: 'Dashboard', url: 'http://localhost:5001/api/dashboard/stats' }
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url);
        const data = await response.json();
        console.log(`${endpoint.name}:`, data);
      } catch (error) {
        console.error(`${endpoint.name} error:`, error);
      }
    }
    
    fetchDashboardData();
  };

  // Hitung active orders dari ordersByStatus
  const calculateActiveOrders = () => {
    if (!dashboardData?.ordersByStatus) return 0;
    
    return dashboardData.ordersByStatus
      .filter(status => ['pending', 'confirmed', 'preparing', 'ready'].includes(status.status))
      .reduce((sum, status) => sum + status.count, 0);
  };

  // Format currency untuk revenue
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format waktu last update
  const formatLastUpdate = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Dashboard</h1>
        {lastUpdate && (
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            Last update: {formatLastUpdate(lastUpdate)}
          </div>
        )}
      </div>
      
      <div className="card">
        <h2>System Status</h2>
        <div style={{ 
          padding: '1rem',
          background: backendStatus === 'connected' ? '#d4edda' : '#f8d7da',
          border: `2px solid ${backendStatus === 'connected' ? '#c3e6cb' : '#f5c6cb'}`,
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          <strong>Backend Status:</strong> 
          <span style={{ 
            color: backendStatus === 'connected' ? '#155724' : '#721c24',
            marginLeft: '0.5rem',
            fontWeight: 'bold'
          }}>
            {backendStatus.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-primary"
            onClick={testEndpoints}
          >
            🔍 Test All Endpoints
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={() => {
              checkBackend();
              fetchDashboardData();
            }}
          >
            🔄 Refresh Now
          </button>

          <div style={{ 
            padding: '0.5rem 1rem', 
            background: '#e9ecef', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center'
          }}>
           
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Orders</h3>
          <div className="number">
            {loading ? '...' : (dashboardData?.totalOrders || 0)}
          </div>
          <div className="trend">
            {loading ? 'Loading...' : `Today: ${dashboardData?.todayOrders || 0} orders`}
          </div>
        </div>
        
        <div className="stat-card">
          <h3>Total Revenue</h3>
          <div className="number">
            {loading ? '...' : formatCurrency(dashboardData?.totalRevenue || 0)}
          </div>
          <div className="trend">
            {loading ? 'Loading...' : `Today: ${formatCurrency(dashboardData?.todayRevenue || 0)}`}
          </div>
        </div>
        
        <div className="stat-card">
          <h3>Active Orders</h3>
          <div className="number">
            {loading ? '...' : calculateActiveOrders()}
          </div>
          <div className="trend">
            {loading ? 'Loading...' : 'Pending + Confirmed + Preparing + Ready'}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <h2>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <a 
            href="/order" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-success"
          >
            🛒 Customer Order Page
          </a>
          <a 
            href="/menu" 
            className="btn btn-primary"
          >
            🍽️ Menu Management
          </a>
          <a 
            href="/orders" 
            className="btn btn-warning"
          >
            📋 Order Management
          </a>
        </div>
      </div>

      {/* Status Breakdown */}
      {dashboardData?.ordersByStatus && (
        <div className="card">
          <h2>Orders Breakdown</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {dashboardData.ordersByStatus.map((status, index) => (
              <div 
                key={index}
                style={{
                  padding: '0.75rem 1rem',
                  background: '#f8f9fa',
                  border: '1px solid #dee2e6',
                  borderRadius: '8px',
                  minWidth: '120px',
                  textAlign: 'center'
                }}
              >
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#666',
                  textTransform: 'capitalize'
                }}>
                  {status.status}
                </div>
                <div style={{ 
                  fontSize: '1.5rem', 
                  fontWeight: 'bold',
                  color: ['pending', 'confirmed', 'preparing', 'ready'].includes(status.status) ? '#dc3545' : '#28a745'
                }}>
                  {status.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;