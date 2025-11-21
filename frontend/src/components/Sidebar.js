import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();

  const menuItems = [
    { path: '/', icon: '📊', label: 'Dashboard', description: 'Overview & Analytics' },
    { path: '/menu', icon: '🍽️', label: 'Menu Management', description: 'Manage Food Items' },
    { path: '/orders', icon: '📋', label: 'Order Management', description: 'Customer Orders' },
  ];

  return (
    <aside className="sidebar">
      <nav>
        <ul className="sidebar-nav">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link 
                to={item.path} 
                className={location.pathname === item.path ? 'active' : ''}
                title={item.description}
              >
                <span className="sidebar-icon">{item.icon}</span>
                <div>
                  <div style={{ fontWeight: '600' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '2px' }}>
                    {item.description}
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      
      {/* Quick Stats Section */}
      <div style={{ 
        padding: '1.5rem 2rem', 
        borderTop: '1px solid #34495e',
        marginTop: '2rem'
      }}>
        <div style={{ fontSize: '0.9rem', color: '#bdc3c7', marginBottom: '0.5rem' }}>
          Quick Access
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <a 
            href="/order" 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              background: '#34495e',
              color: 'white',
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              textAlign: 'center',
              transition: 'background 0.3s ease'
            }}
            onMouseOver={(e) => e.target.style.background = '#3498db'}
            onMouseOut={(e) => e.target.style.background = '#34495e'}
          >
            🛍️ New Order
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;