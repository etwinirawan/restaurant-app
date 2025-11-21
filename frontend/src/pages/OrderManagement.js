import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const OrderManagement = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    fetchOrders();
    setupRealTimeConnection(); // 🔥 Setup real-time connection
    
    return () => {
      // Cleanup real-time connection
      if (window.orderEventSource) {
        window.orderEventSource.close();
      }
    };
  }, []);

  // 🔥 REAL-TIME CONNECTION FOR ORDERS
  const setupRealTimeConnection = () => {
    try {
      const eventSource = new EventSource('http://localhost:5001/api/orders/stream');
      window.orderEventSource = eventSource;
      
      eventSource.onopen = () => {
        console.log('🔗 Order real-time connection established');
        setIsRealTimeConnected(true);
      };
      
      eventSource.onmessage = (event) => {
        const update = JSON.parse(event.data);
        console.log('📨 Order real-time update received:', update);
        
        if (update.type === 'dashboard_update') {
          // Refresh orders when there are updates
          fetchOrders();
          setLastUpdate(new Date());
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('❌ Order real-time connection error:', error);
        setIsRealTimeConnected(false);
        // Attempt reconnect after 5 seconds
        setTimeout(setupRealTimeConnection, 5000);
      };
      
    } catch (error) {
      console.error('Error setting up order real-time connection:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      setError(null);
      const response = await ordersAPI.getAll();
      setOrders(response.data.data);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setError(null);
      await ordersAPI.updateStatus(orderId, newStatus);
      
      // Update local state optimistically
      setOrders(prevOrders =>
        prevOrders.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        )
      );
      
      setLastUpdate(new Date());
      
      // Show success message
      console.log(`✅ Order status updated to ${newStatus}`);
      
    } catch (err) {
      console.error('Error updating order status:', err);
      setError('Failed to update order status. Please try again.');
      
      // Revert optimistic update on error
      fetchOrders();
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { class: 'status-pending', label: 'Pending', icon: '⏳' },
      confirmed: { class: 'status-confirmed', label: 'Confirmed', icon: '✅' },
      preparing: { class: 'status-preparing', label: 'Preparing', icon: '👨‍🍳' },
      ready: { class: 'status-ready', label: 'Ready', icon: '🎯' },
      completed: { class: 'status-completed', label: 'Completed', icon: '📦' },
      cancelled: { class: 'status-cancelled', label: 'Cancelled', icon: '❌' }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <span className={`status-badge ${config.class}`}>
        {config.icon} {config.label}
      </span>
    );
  };

  const getNextStatusAction = (currentStatus) => {
    const statusFlow = {
      pending: { 
        next: 'confirmed', 
        label: 'Confirm Order', 
        icon: '✅',
        color: 'btn-success'
      },
      confirmed: { 
        next: 'preparing', 
        label: 'Start Preparing', 
        icon: '👨‍🍳',
        color: 'btn-warning'
      },
      preparing: { 
        next: 'ready', 
        label: 'Mark as Ready', 
        icon: '🎯',
        color: 'btn-primary'
      },
      ready: { 
        next: 'completed', 
        label: 'Complete Order', 
        icon: '📦',
        color: 'btn-success'
      }
    };
    
    return statusFlow[currentStatus];
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredOrders = filter === 'all' 
    ? orders 
    : orders.filter(order => order.status === filter);

  const statusCounts = {
    all: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    ready: orders.filter(o => o.status === 'ready').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  };

  if (loading && orders.length === 0) {
    return <LoadingSpinner text="Loading orders..." />;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="card-header">
        <h1>Order Management</h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <div style={{ 
              padding: '0.25rem 0.5rem',
              background: isRealTimeConnected ? '#d4edda' : '#f8d7da',
              color: isRealTimeConnected ? '#155724' : '#721c24',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: 'bold'
            }}>
              {isRealTimeConnected ? '🟢 LIVE' : '🔴 OFFLINE'}
            </div>
            {lastUpdate && (
              <span style={{ color: '#7f8c8d', fontSize: '0.8rem' }}>
                Updated: {formatTime(lastUpdate)}
              </span>
            )}
          </div>
          <button 
            className="btn btn-primary"
            onClick={fetchOrders}
            disabled={loading}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ borderLeft: '4px solid #e74c3c' }}>
          <div style={{ color: '#e74c3c', padding: '1rem' }}>
            <strong>Error:</strong> {error}
            <button 
              onClick={() => setError(null)}
              style={{ 
                marginLeft: '1rem',
                background: 'none',
                border: 'none',
                color: '#e74c3c',
                cursor: 'pointer',
                fontSize: '1.2rem'
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="card">
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {[
            { key: 'all', label: 'All Orders', icon: '📋' },
            { key: 'pending', label: 'Pending', icon: '⏳' },
            { key: 'confirmed', label: 'Confirmed', icon: '✅' },
            { key: 'preparing', label: 'Preparing', icon: '👨‍🍳' },
            { key: 'ready', label: 'Ready', icon: '🎯' },
            { key: 'completed', label: 'Completed', icon: '📦' },
            { key: 'cancelled', label: 'Cancelled', icon: '❌' }
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              className={`btn ${filter === key ? 'btn-primary' : 'btn-secondary'} btn-sm`}
              onClick={() => setFilter(key)}
              style={{ position: 'relative' }}
            >
              {icon} {label}
              <span style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                background: '#e74c3c',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                fontSize: '0.7rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {statusCounts[key]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="card-header">
          <h2>
            {filter === 'all' ? 'All Orders' : `${filter.charAt(0).toUpperCase() + filter.slice(1)} Orders`}
            <span style={{ color: '#7f8c8d', fontSize: '1rem', marginLeft: '1rem' }}>
              ({filteredOrders.length})
            </span>
          </h2>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            alignItems: 'center',
            color: '#7f8c8d', 
            fontSize: '0.9rem' 
          }}>
            <div style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%',
              background: isRealTimeConnected ? '#28a745' : '#dc3545',
              animation: isRealTimeConnected ? 'pulse 1.5s infinite' : 'none'
            }}></div>
            {isRealTimeConnected ? 'Live updates active' : 'Manual refresh only'}
          </div>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Order Details</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const nextAction = getNextStatusAction(order.status);
                  
                  return (
                    <tr key={order.id} className="order-row">
                      <td>
                        <div>
                          <strong style={{ color: '#2c3e50', fontSize: '1.1rem' }}>
                            {order.order_number}
                          </strong>
                          <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.25rem' }}>
                            {formatDateTime(order.created_at)}
                          </div>
                          {order.table_number && (
                            <div style={{ 
                              background: '#3498db',
                              color: 'white',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              display: 'inline-block',
                              marginTop: '0.25rem'
                            }}>
                              🪑 {order.table_number}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ fontWeight: '600' }}>{order.customer_name}</div>
                          <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                            {order.customer_phone || 'No phone'}
                          </div>
                          {order.notes && (
                            <div style={{ 
                              fontSize: '0.8rem', 
                              color: '#f39c12',
                              marginTop: '0.25rem',
                              fontStyle: 'italic'
                            }}>
                              📝 {order.notes}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div style={{ maxWidth: '200px' }}>
                          {order.items && order.items.map((item, index) => (
                            item.menu_item_name && (
                              <div key={index} style={{ 
                                marginBottom: '0.25rem',
                                fontSize: '0.85rem'
                              }}>
                                <span style={{ fontWeight: '500' }}>
                                  {item.quantity}x
                                </span> {item.menu_item_name}
                                {item.notes && (
                                  <div style={{ 
                                    fontSize: '0.75rem', 
                                    color: '#7f8c8d',
                                    marginLeft: '1rem'
                                  }}>
                                    • {item.notes}
                                  </div>
                                )}
                              </div>
                            )
                          ))}
                        </div>
                      </td>
                      <td style={{ fontWeight: 'bold', color: '#e74c3c' }}>
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td>
                        {getStatusBadge(order.status)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {nextAction && (
                            <button
                              className={`btn ${nextAction.color} btn-sm`}
                              onClick={() => updateOrderStatus(order.id, nextAction.next)}
                              disabled={loading}
                            >
                              {nextAction.icon} {nextAction.label}
                            </button>
                          )}
                          
                          {order.status === 'pending' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                if (window.confirm('Are you sure you want to cancel this order?')) {
                                  updateOrderStatus(order.id, 'cancelled');
                                }
                              }}
                              disabled={loading}
                            >
                              ❌ Cancel Order
                            </button>
                          )}
                          
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            👁️ View Details
                          </button>
                        </div>
                      </td>
                      <td style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                        <div>
                          {formatTime(order.created_at)}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                          {formatTime(order.updated_at)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#7f8c8d' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>
              {filter === 'all' ? '📋' : 
               filter === 'pending' ? '⏳' :
               filter === 'completed' ? '📦' : '🎯'}
            </div>
            <h3>No {filter === 'all' ? '' : filter} Orders</h3>
            <p>
              {filter === 'all' 
                ? "Orders will appear here when customers start ordering."
                : `No orders with status "${filter}" found.`
              }
            </p>
            {filter !== 'all' && (
              <button 
                className="btn btn-primary"
                onClick={() => setFilter('all')}
                style={{ marginTop: '1rem' }}
              >
                View All Orders
              </button>
            )}
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h2>Order Details - {selectedOrder.order_number}</h2>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="btn btn-secondary btn-sm"
              >
                ✕ Close
              </button>
            </div>

            <div style={{ padding: '2rem' }}>
              {/* Customer Information */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Customer Information</h3>
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr',
                  gap: '1rem',
                  background: '#f8f9fa',
                  padding: '1rem',
                  borderRadius: '8px'
                }}>
                  <div>
                    <strong>Name:</strong> {selectedOrder.customer_name}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedOrder.customer_phone || 'N/A'}
                  </div>
                  <div>
                    <strong>Table:</strong> {selectedOrder.table_number || 'Takeaway'}
                  </div>
                  <div>
                    <strong>Status:</strong> {getStatusBadge(selectedOrder.status)}
                  </div>
                </div>
                {selectedOrder.notes && (
                  <div style={{ 
                    background: '#fff3cd',
                    padding: '1rem',
                    borderRadius: '8px',
                    marginTop: '1rem',
                    border: '1px solid #ffeaa7'
                  }}>
                    <strong>Order Notes:</strong> {selectedOrder.notes}
                  </div>
                )}
              </div>

              {/* Order Items */}
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Order Items</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.items && selectedOrder.items.map((item, index) => (
                        item.menu_item_name && (
                          <tr key={index}>
                            <td>
                              <div>
                                <strong>{item.menu_item_name}</strong>
                                {item.notes && (
                                  <div style={{ fontSize: '0.8rem', color: '#7f8c8d', marginTop: '0.25rem' }}>
                                    Note: {item.notes}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td>{item.quantity}</td>
                            <td>{formatCurrency(item.price)}</td>
                            <td style={{ fontWeight: 'bold' }}>
                              {formatCurrency(item.price * item.quantity)}
                            </td>
                          </tr>
                        )
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'right', fontWeight: 'bold' }}>
                          Total:
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#e74c3c', fontSize: '1.1rem' }}>
                          {formatCurrency(selectedOrder.total_amount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Order Timeline */}
              <div>
                <h3 style={{ marginBottom: '1rem', color: '#2c3e50' }}>Order Timeline</h3>
                <div style={{ 
                  background: '#f8f9fa',
                  padding: '1rem',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '0.5rem' }}>
                    <strong>Created:</strong> {formatDateTime(selectedOrder.created_at)}
                  </div>
                  <div>
                    <strong>Last Updated:</strong> {formatDateTime(selectedOrder.updated_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CSS Animation for Live Indicator */}
      <style jsx>{`
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.5; }
          100% { opacity: 1; }
        }
        
        .order-row:hover {
          background-color: #f8f9fa;
          transition: background-color 0.2s ease;
        }
      `}</style>
    </div>
  );
};

export default OrderManagement;