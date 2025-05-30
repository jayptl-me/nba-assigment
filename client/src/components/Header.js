import React from 'react';

const Header = () => {
  return (
    <header className="header">
      <div className="header-content">
        <div className="logo-section">
          <div className="basketball-icon">🏀</div>
          <div className="header-text">
            <h1>NBA Live Tracker</h1>
            <p className="subtitle">Your Ultimate Basketball Experience</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">30</span>
            <span className="stat-label">Teams</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">Live</span>
            <span className="stat-label">Updates</span>
          </div>
        </div>
      </div>
      <div className="header-wave"></div>
    </header>
  );
};

export default Header;
