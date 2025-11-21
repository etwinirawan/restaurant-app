import React, { useState, useEffect } from 'react';
import { menuAPI, ordersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const CustomerOrder = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    table_number: ''
  });

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [menuResponse, categoriesResponse] = await Promise.all([
        menuAPI.getAll(),
        menuAPI.getCategories()
      ]);

      setMenuItems(menuResponse.data.data);
      setCategories(categoriesResponse.data.data);
    } catch (err) {
      console.error('Error fetching menu data:', err);
      setError('Failed to load menu. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (item) => {
    const existingItem = cart.find(cartItem => cartItem.id === item.id);
    
    if (existingItem) {
      setCart(cart.map(cartItem =>
        cartItem.id === item.id
          ? { ...cartItem, quantity: cartItem.quantity + 1 }
          : cartItem
      ));
    } else {
      setCart([...cart, { 
        ...item, 
        quantity: 1,
        notes: ''
      }]);
    }
  };

  const removeFromCart = (itemId) => {
    setCart(cart.filter(item => item.id !== itemId));
  };

  const updateQuantity = (itemId, newQuantity) => {
    if (newQuantity < 1) {
      removeFromCart(itemId);
      return;
    }
    
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const updateItemNotes = (itemId, notes) => {
    setCart(cart.map(item =>
      item.id === itemId
        ? { ...item, notes }
        : item
    ));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getItemCountInCart = (itemId) => {
    const item = cart.find(cartItem => cartItem.id === itemId);
    return item ? item.quantity : 0;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      setError('Please add items to your cart before ordering');
      return;
    }

    if (!customerInfo.name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!customerInfo.phone.trim()) {
      setError('Please enter your phone number');
      return;
    }

    try {
      setOrderLoading(true);
      setError(null);

      const orderData = {
        customer_name: customerInfo.name.trim(),
        customer_phone: customerInfo.phone.trim(),
        table_number: customerInfo.table_number.trim() || undefined,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        notes: ''
      };

      const response = await ordersAPI.create(orderData);
      
      setOrderSuccess(true);
      setCart([]);
      setCustomerInfo({ name: '', phone: '', table_number: '' });
      
      // Reset success message after 5 seconds
      setTimeout(() => {
        setOrderSuccess(false);
      }, 5000);

    } catch (err) {
      console.error('Error placing order:', err);
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setOrderLoading(false);
    }
  };

  const filteredItems = activeCategory === 'all' 
    ? menuItems 
    : menuItems.filter(item => item.category_id === parseInt(activeCategory));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="customer-order">
        <div className="order-container">
          <LoadingSpinner text="Loading menu..." />
        </div>
      </div>
    );
  }

  return (
    <div className="customer-order">
      <div className="order-container">
        <div className="order-header">
          <h1>🍽️ Welcome to Our Restaurant</h1>
          <p>Browse our menu and place your order below</p>
        </div>
        
        <div className="order-content">
          {/* Menu Section */}
          <div className="menu-section">
            {error && !orderSuccess && (
              <div style={{
                background: '#f8d7da',
                color: '#721c24',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #f5c6cb'
              }}>
                ❌ {error}
                <button 
                  onClick={() => setError(null)}
                  style={{
                    marginLeft: '1rem',
                    background: 'none',
                    border: 'none',
                    color: '#721c24',
                    cursor: 'pointer',
                    float: 'right'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {orderSuccess && (
              <div style={{
                background: '#d4edda',
                color: '#155724',
                padding: '1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #c3e6cb',
                textAlign: 'center'
              }}>
                ✅ <strong>Order Placed Successfully!</strong> Your food is being prepared.
              </div>
            )}

            <h2>Our Delicious Menu</h2>
            
            {/* Category Tabs */}
            <div className="category-tabs">
              <button
                className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
                onClick={() => setActiveCategory('all')}
              >
                🍕 All Items
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`category-tab ${activeCategory === category.id.toString() ? 'active' : ''}`}
                  onClick={() => setActiveCategory(category.id.toString())}
                >
                  {category.name}
                </button>
              ))}
            </div>
            
            {/* Menu Items Grid */}
            <div className="menu-grid">
              {filteredItems.map(item => (
                <div key={item.id} className="menu-item">
                  <h4>{item.name}</h4>
                  <div className="price">{formatCurrency(item.price)}</div>
                  <p className="description">{item.description}</p>
                  {item.preparation_time && (
                    <div className="prep-time">
                      ⏱️ Prep time: {item.preparation_time} minutes
                    </div>
                  )}
                  
                  <div className="quantity-controls">
                    <button 
                      className="quantity-btn"
                      onClick={() => updateQuantity(item.id, getItemCountInCart(item.id) - 1)}
                      disabled={getItemCountInCart(item.id) === 0}
                    >
                      -
                    </button>
                    
                    <span className="quantity-display">
                      {getItemCountInCart(item.id) > 0 ? (
                        <>In cart: {getItemCountInCart(item.id)}</>
                      ) : (
                        'Not in cart'
                      )}
                    </span>
                    
                    <button 
                      className="quantity-btn"
                      onClick={() => addToCart(item)}
                    >
                      +
                    </button>
                  </div>

                  {getItemCountInCart(item.id) > 0 && (
                    <div style={{ marginTop: '1rem' }}>
                      <input
                        type="text"
                        placeholder="Special instructions (optional)"
                        value={cart.find(cartItem => cartItem.id === item.id)?.notes || ''}
                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          border: '1px solid #bdc3c7',
                          borderRadius: '4px',
                          fontSize: '0.8rem'
                        }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#7f8c8d' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
                <h3>No items in this category</h3>
                <p>Please select a different category or check back later.</p>
              </div>
            )}
          </div>
          
          {/* Cart Section */}
          <div className="cart-section">
            <h2>🛒 Your Order</h2>
            
            <div className="cart-items">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <div className="icon">🛒</div>
                  <h3>Your cart is empty</h3>
                  <p>Add some delicious items from the menu!</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.name}</div>
                      <div className="cart-item-price">
                        {formatCurrency(item.price)} each
                      </div>
                      {item.notes && (
                        <div style={{ 
                          fontSize: '0.8rem', 
                          color: '#f39c12',
                          marginTop: '0.25rem',
                          fontStyle: 'italic'
                        }}>
                          📝 {item.notes}
                        </div>
                      )}
                    </div>
                    <div className="quantity-controls">
                      <button 
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="quantity-display">{item.quantity}</span>
                      <button 
                        className="quantity-btn"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                      <button 
                        className="btn btn-danger btn-sm"
                        style={{ marginLeft: '1rem' }}
                        onClick={() => removeFromCart(item.id)}
                        title="Remove item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {cart.length > 0 && (
              <>
                <div className="cart-total">
                  Total: {formatCurrency(getTotalAmount())}
                </div>
                
                <form className="order-form" onSubmit={handleSubmitOrder}>
                  <h3>👤 Customer Information</h3>
                  
                  <div className="form-group">
                    <label className="form-label">Your Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo({...customerInfo, name: e.target.value})}
                      placeholder="Enter your name"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Phone Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo({...customerInfo, phone: e.target.value})}
                      placeholder="Enter your phone number"
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label className="form-label">Table Number (if dining in)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={customerInfo.table_number}
                      onChange={(e) => setCustomerInfo({...customerInfo, table_number: e.target.value})}
                      placeholder="e.g., Table 1, Table 5"
                    />
                  </div>
                  
                  <button 
                    type="submit" 
                    className="btn btn-success" 
                    style={{ 
                      width: '100%', 
                      padding: '1rem',
                      fontSize: '1.1rem',
                      fontWeight: 'bold'
                    }}
                    disabled={orderLoading || cart.length === 0}
                  >
                    {orderLoading ? (
                      <>
                        <div className="spinner" style={{ 
                          width: '20px', 
                          height: '20px',
                          display: 'inline-block',
                          marginRight: '0.5rem'
                        }}></div>
                        Placing Order...
                      </>
                    ) : (
                      `🎯 Place Order - ${formatCurrency(getTotalAmount())}`
                    )}
                  </button>

                  <div style={{ 
                    textAlign: 'center', 
                    marginTop: '1rem',
                    fontSize: '0.8rem',
                    color: '#7f8c8d'
                  }}>
                    By placing order, you agree to our terms and conditions
                  </div>
                </form>
              </>
            )}

            {/* Restaurant Info */}
            <div style={{ 
              marginTop: '2rem', 
              padding: '1rem',
              background: '#f8f9fa',
              borderRadius: '8px',
              fontSize: '0.9rem',
              color: '#7f8c8d'
            }}>
              <h4 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>ℹ️ Restaurant Info</h4>
              <div>🕒 Open: 10:00 AM - 10:00 PM</div>
              <div>📞 Phone: (021) 1234-5678</div>
              <div>📍 Address: Jl. Restaurant No. 123</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerOrder;