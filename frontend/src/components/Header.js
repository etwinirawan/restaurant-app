import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();

  return (
    <header className="header">
      <div className="header-brand">
        <h1>🍽️ Restaurant Management System</h1>
      </div>
      <nav className="header-nav">
        <Link 
          to="/order" 
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary btn-sm"
        >
          🛒 Customer Order
        </Link>
        <span style={{ color: 'white', margin: '0 1rem' }}>|</span>
        <span style={{ color: 'white', fontSize: '0.9rem' }}>
          {new Date().toLocaleDateString('id-ID', { 
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}
        </span>
      </nav>
    </header>
  );
};

export default Header;