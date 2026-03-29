import React from 'react';
import { Search, Bell } from 'lucide-react'; // Standard for modern dashboards
import './Navbar.css';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="nav-search-container">
        <Search size={18} color="#94a3b8" />
        <input
          type="text"
          className="nav-search-input"
          placeholder="Search transactions, alerts..."
        />
      </div>
      <div className="nav-right">
        {/* Bell Icon with the red notification badge from your screenshot */}
        <button className="nav-icon-btn">
          <Bell size={20} />
          <span className="notification-badge">6</span>
        </button>

        <div className="nav-profile">
          <div className="user-avatar">
            JD
          </div>
          <div className="user-info">
            <span className="user-name">James Donovan</span>
            <span className="user-role">Security Analyst</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;