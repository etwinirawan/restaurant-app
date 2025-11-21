import React, { useState, useEffect } from 'react';
import { menuAPI } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category_id: '',
    preparation_time: 15,
    is_available: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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
      console.error('Error fetching data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError(null);
      
      const submitData = {
        ...formData,
        price: parseFloat(formData.price),
        category_id: parseInt(formData.category_id),
        preparation_time: parseInt(formData.preparation_time)
      };

      if (editingItem) {
        // Update existing item
        await menuAPI.update(editingItem.id, submitData);
      } else {
        // Create new item
        await menuAPI.create(submitData);
      }
      
      await fetchData(); // Refresh data
      resetForm();
      
    } catch (err) {
      console.error('Error saving menu item:', err);
      setError(err.response?.data?.message || 'Failed to save menu item');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category_id: '',
      preparation_time: 15,
      is_available: true
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category_id: item.category_id?.toString() || '',
      preparation_time: item.preparation_time || 15,
      is_available: item.is_available
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this menu item?')) {
      try {
        await menuAPI.delete(id);
        await fetchData(); // Refresh data
      } catch (err) {
        console.error('Error deleting menu item:', err);
        setError('Failed to delete menu item');
      }
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return <LoadingSpinner text="Loading menu..." />;
  }

  return (
    <div>
      {/* Page Header */}
      <div className="card-header">
        <h1>Menu Management</h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowForm(true)}
        >
          ➕ Add Menu Item
        </button>
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

      {/* Menu Form Modal */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="card-header">
              <h2>{editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}</h2>
              <button 
                onClick={resetForm}
                className="btn btn-secondary btn-sm"
              >
                ✕ Close
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Item Name *</label>
                <input
                  type="text"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter menu item name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Enter item description"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Price (IDR) *</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    placeholder="0"
                    min="0"
                    step="1000"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Preparation Time (minutes)</label>
                  <input
                    type="number"
                    className="form-control"
                    value={formData.preparation_time}
                    onChange={(e) => setFormData({...formData, preparation_time: e.target.value})}
                    min="1"
                    max="120"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Category *</label>
                <select
                  className="form-control"
                  value={formData.category_id}
                  onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => setFormData({...formData, is_available: e.target.checked})}
                  />
                  Available for ordering
                </label>
              </div>

              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  {editingItem ? '💾 Update Item' : '➕ Create Item'}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={resetForm}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Menu Items Table */}
      <div className="card">
        <div className="card-header">
          <h2>Menu Items ({menuItems.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ 
              padding: '0.25rem 0.75rem', 
              background: '#27ae60', 
              color: 'white',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: '500'
            }}>
              Available: {menuItems.filter(item => item.is_available).length}
            </span>
          </div>
        </div>

        {menuItems.length > 0 ? (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Prep Time</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: '600', color: '#2c3e50' }}>
                          {item.name}
                        </div>
                        {item.description && (
                          <div style={{ 
                            fontSize: '0.8rem', 
                            color: '#7f8c8d',
                            marginTop: '0.25rem'
                          }}>
                            {item.description.length > 60 
                              ? `${item.description.substring(0, 60)}...`
                              : item.description
                            }
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <span style={{ 
                        background: '#ecf0f1',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        fontSize: '0.8rem',
                        color: '#2c3e50'
                      }}>
                        {item.category_name}
                      </span>
                    </td>
                    <td style={{ fontWeight: '600', color: '#e74c3c' }}>
                      {formatCurrency(item.price)}
                    </td>
                    <td>
                      <span style={{ color: '#7f8c8d' }}>
                        {item.preparation_time} min
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${item.is_available ? 'status-completed' : 'status-cancelled'}`}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button 
                          className="btn btn-warning btn-sm"
                          onClick={() => handleEdit(item)}
                          title="Edit item"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(item.id)}
                          title="Delete item"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#7f8c8d' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
            <h3>No Menu Items</h3>
            <p>Get started by adding your first menu item.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowForm(true)}
              style={{ marginTop: '1rem' }}
            >
              ➕ Add First Item
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Modal overlay styles (add to App.css)
const modalStyles = `
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
  }

  .modal-content {
    background: white;
    border-radius: 12px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  }
`;

// Add styles to document
if (!document.querySelector('#modal-styles')) {
  const styleSheet = document.createElement("style");
  styleSheet.id = "modal-styles";
  styleSheet.innerText = modalStyles;
  document.head.appendChild(styleSheet);
}

export default MenuManagement;