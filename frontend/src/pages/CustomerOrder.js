import React, { useState, useEffect, useRef } from 'react';
import { menuAPI, ordersAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import './CustomerOrder.css';

const CustomerOrder = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCartPopup, setShowCartPopup] = useState(false);
  const [itemAdded, setItemAdded] = useState(null);
  const [cartPulse, setCartPulse] = useState(false);
  
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    table_number: ''
  });

  const cartRef = useRef(null);

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Gunakan API yang sebenarnya
      const [menuResponse, categoriesResponse] = await Promise.all([
        menuAPI.getAll(),
        menuAPI.getCategories()
      ]);

      console.log('Menu Response:', menuResponse.data);
      console.log('Categories Response:', categoriesResponse.data);

      // Sesuaikan dengan struktur response API Anda
      const menuData = menuResponse.data.data || menuResponse.data;
      const categoriesData = categoriesResponse.data.data || categoriesResponse.data;

      // Tambahkan gambar default jika tidak ada
      const menuWithImages = menuData.map(item => ({
        ...item,
        image: item.image || getDefaultImage(item.category_id || item.category?.id)
      }));

      setMenuItems(menuWithImages);
      setCategories(categoriesData);

    } catch (err) {
      console.error('Error fetching menu data:', err);
      setError('Failed to load menu. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mendapatkan gambar default berdasarkan kategori
  const getDefaultImage = (categoryId) => {
    const defaultImages = {
      1: '/images/coffee-default.jpg', // Coffee
      2: '/images/food-default.jpg',   // Food
      3: '/images/dessert-default.jpg', // Dessert
      4: '/images/drink-default.jpg',  // Drink
    };
    return defaultImages[categoryId] || '/images/menu-default.jpg';
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

    // Show added feedback
    setItemAdded(item.id);
    setCartPulse(true);
    
    setTimeout(() => {
      setItemAdded(null);
      setCartPulse(false);
    }, 1000);
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

  const getCartTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
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
        table_number: customerInfo.table_number.trim() || null,
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity,
          notes: item.notes || ''
        })),
        total_amount: getTotalAmount(),
        status: 'pending'
      };

      console.log('Submitting order:', orderData);
      
      const response = await ordersAPI.create(orderData);
      
      setOrderSuccess(true);
      setCart([]);
      setCustomerInfo({ name: '', phone: '', table_number: '' });
      setShowCartPopup(false);
      
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

  const clearCart = () => {
    setCart([]);
  };

  const quickAddItem = (item, quantity = 1) => {
    for (let i = 0; i < quantity; i++) {
      addToCart(item);
    }
  };

  // Filter items based on category and search term
  const filteredItems = menuItems.filter(item => {
    const matchesCategory = activeCategory === 'all' || 
                           item.category_id === parseInt(activeCategory) ||
                           item.category?.id === parseInt(activeCategory);
    
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

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
      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div 
          ref={cartRef}
          className={`floating-cart-button ${cartPulse ? 'cart-pulse' : ''}`}
          onClick={() => setShowCartPopup(true)}
          title="View Cart"
        >
          <div className="cart-icon">🛒</div>
          <div className="cart-badge">{getCartTotalItems()}</div>
          <div className="cart-total-preview">
            {formatCurrency(getTotalAmount())}
          </div>
        </div>
      )}

      <div className="order-container">
        <div className="order-header">
          <h1 className="title">
            <span className="title-icon">🍽️</span>
            Welcome to Kongkow Coffee
          </h1>
          <p className="subtitle">Browse our menu and place your order below</p>
          
          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <span className="stat-number">{menuItems.length}</span>
              <span className="stat-label">Menu Items</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{categories.length}</span>
              <span className="stat-label">Categories</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{getCartTotalItems()}</span>
              <span className="stat-label">In Your Cart</span>
            </div>
          </div>
        </div>
        
        {/* Menu Section */}
        <div className="menu-section">
          {error && !orderSuccess && (
            <div className="error-alert">
              <div className="alert-icon">❌</div>
              <div className="alert-content">
                {error}
                <button 
                  onClick={() => setError(null)}
                  className="close-button"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {orderSuccess && (
            <div className="success-alert">
              <div className="alert-icon">✅</div>
              <div className="alert-content">
                <strong>Order Placed Successfully!</strong> Your food is being prepared.
              </div>
            </div>
          )}

          <h2 className="section-title">
            <span className="section-icon">📋</span>
            Our Delicious Menu
          </h2>
          
          {/* Search Bar */}
          <div className="search-bar">
            <input
              type="text"
              placeholder="🔍 Search menu items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="clear-search-button"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
          
          {/* Category Tabs */}
          <div className="category-tabs">
            <button
              className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
              onClick={() => setActiveCategory('all')}
            >
              <span className="category-icon">🍕</span>
              All Items
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                className={`category-tab ${activeCategory === category.id.toString() ? 'active' : ''}`}
                onClick={() => setActiveCategory(category.id.toString())}
              >
                {category.icon || '🍽️'} {category.name}
              </button>
            ))}
          </div>

          {/* Search Results Info */}
          {searchTerm && (
            <div className="search-results">
              <strong>Search Results:</strong> Showing {filteredItems.length} item(s) for "{searchTerm}"
              <button 
                onClick={() => setSearchTerm('')}
                className="clear-search-button"
              >
                Clear Search
              </button>
            </div>
          )}
          
          {/* Menu Items Grid */}
          <div className="menu-grid">
            {filteredItems.map(item => (
              <div 
                key={item.id} 
                className={`menu-item ${itemAdded === item.id ? 'item-added' : ''} ${getItemCountInCart(item.id) > 0 ? 'item-in-cart' : ''}`}
                data-item-id={item.id}
              >
                {/* Item Image */}
                <div className="item-image-container">
                  <img 
                    src={item.image} 
                    alt={item.name}
                    className="item-image"
                    onError={(e) => {
                      e.target.src = '/images/menu-default.jpg';
                    }}
                  />
                  <div className="item-badges">
                    {item.is_popular && (
                      <span className="popular-badge">🔥 Popular</span>
                    )}
                    {item.is_new && (
                      <span className="new-badge">🆕 New</span>
                    )}
                    {item.is_available === false && (
                      <span className="unavailable-badge">🔴 Unavailable</span>
                    )}
                  </div>
                </div>

                <div className="item-content">
                  <div className="item-header">
                    <h4 className="item-name">{item.name}</h4>
                  </div>
                  
                  <div className="price">{formatCurrency(item.price)}</div>
                  <p className="description">{item.description || 'No description available'}</p>
                  
                  {item.preparation_time && (
                    <div className="prep-time">
                      ⏱️ Prep time: {item.preparation_time} minutes
                    </div>
                  )}
                  
                  <div className="quantity-controls">
                    <button 
                      className="quantity-btn"
                      onClick={() => updateQuantity(item.id, getItemCountInCart(item.id) - 1)}
                      disabled={getItemCountInCart(item.id) === 0 || item.is_available === false}
                      title="Decrease quantity"
                    >
                      -
                    </button>
                    
                    <span className="quantity-display">
                      {getItemCountInCart(item.id) > 0 ? (
                        <>
                          <span className="in-cart-icon">✅</span>
                          {getItemCountInCart(item.id)}
                        </>
                      ) : (
                        item.is_available === false ? 'Unavailable' : 'Add to cart'
                      )}
                    </span>
                    
                    <button 
                      className="quantity-btn"
                      onClick={() => addToCart(item)}
                      disabled={item.is_available === false}
                      title={item.is_available === false ? 'This item is currently unavailable' : 'Add to cart'}
                    >
                      +
                    </button>
                  </div>

             
                  {getItemCountInCart(item.id) > 0 && (
                    <div className="notes-container">
                      <input
                        type="text"
                        placeholder="💡 Special instructions (optional)"
                        value={cart.find(cartItem => cartItem.id === item.id)?.notes || ''}
                        onChange={(e) => updateItemNotes(item.id, e.target.value)}
                        className="notes-input"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="empty-menu">
              <div className="empty-icon">🔍</div>
              <h3 className="empty-title">No items found</h3>
              <p className="empty-text">
                {searchTerm 
                  ? `No items found for "${searchTerm}". Try a different search term or category.`
                  : 'No items in this category. Please select a different category or check back later.'
                }
              </p>
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="clear-search-button-large"
                >
                  Clear Search
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Cart Popup */}
      {showCartPopup && (
        <div className="popup-overlay" onClick={() => setShowCartPopup(false)}>
          <div className="popup-content" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h2 className="popup-title">
                <span className="cart-icon">🛒</span>
                Your Order
                {cart.length > 0 && (
                  <span className="cart-item-count">({getCartTotalItems()} items)</span>
                )}
              </h2>
              <div className="popup-header-actions">
                {cart.length > 0 && (
                  <button 
                    className="clear-cart-button"
                    onClick={clearCart}
                    title="Clear entire cart"
                  >
                    🗑️ Clear All
                  </button>
                )}
                <button 
                  className="close-popup-button"
                  onClick={() => setShowCartPopup(false)}
                  title="Close cart"
                >
                  ×
                </button>
              </div>
            </div>
            
            <div className="popup-body">
              {cart.length === 0 ? (
                <div className="empty-cart">
                  <div className="empty-cart-icon">🛒</div>
                  <h3 className="empty-cart-title">Your cart is empty</h3>
                  <p className="empty-cart-text">Add some delicious items from the menu!</p>
                  <button 
                    className="continue-shopping-button"
                    onClick={() => setShowCartPopup(false)}
                  >
                    Continue Shopping
                  </button>
                </div>
              ) : (
                <>
                  <div className="cart-items">
                    {cart.map(item => (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-image">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="cart-item-img"
                            onError={(e) => {
                              e.target.src = '/images/menu-default.jpg';
                            }}
                          />
                        </div>
                        <div className="cart-item-info">
                          <div className="cart-item-name">{item.name}</div>
                          <div className="cart-item-price">
                            {formatCurrency(item.price)} × {item.quantity}
                          </div>
                          {item.notes && (
                            <div className="cart-item-notes">
                              📝 {item.notes}
                            </div>
                          )}
                        </div>
                        <div className="cart-quantity-controls">
                          <button 
                            className="quantity-btn-small"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            title="Decrease quantity"
                          >
                            -
                          </button>
                          <span className="quantity-display-small">{item.quantity}</span>
                          <button 
                            className="quantity-btn-small"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            title="Increase quantity"
                          >
                            +
                          </button>
                          <button 
                            className="remove-button"
                            onClick={() => removeFromCart(item.id)}
                            title="Remove item"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="cart-summary">
                    <div className="cart-total">
                      <span>Total:</span>
                      <span className="total-amount">{formatCurrency(getTotalAmount())}</span>
                    </div>
                    <div className="item-count">
                      {getCartTotalItems()} items • {cart.length} unique items
                    </div>
                  </div>
                  
                  <form className="order-form" onSubmit={handleSubmitOrder}>
                    <h3 className="form-title">
                      <span className="form-icon">👤</span>
                      Customer Information
                    </h3>
                    
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
                      className={`submit-button ${orderLoading || cart.length === 0 ? 'disabled' : ''}`}
                      disabled={orderLoading || cart.length === 0}
                    >
                      {orderLoading ? (
                        <>
                          <div className="spinner"></div>
                          Placing Order...
                        </>
                      ) : (
                        <>
                          <span className="submit-icon">🎯</span>
                          Place Order - {formatCurrency(getTotalAmount())}
                        </>
                      )}
                    </button>

                    <div className="terms-text">
                      By placing order, you agree to our terms and conditions
                    </div>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrder;