import React from 'react';

const LoadingSpinner = ({ size = 'medium', text = 'Loading...' }) => {
  const sizes = {
    small: '20px',
    medium: '40px',
    large: '60px'
  };

  return (
    <div className="loading-spinner">
      <div 
        className="spinner" 
        style={{ 
          width: sizes[size], 
          height: sizes[size] 
        }}
      ></div>
      {text && (
        <div style={{ marginTop: '1rem', color: '#7f8c8d' }}>
          {text}
        </div>
      )}
    </div>
  );
};

export default LoadingSpinner;