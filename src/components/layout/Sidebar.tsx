import React from 'react';
import {
    LayoutDashboard,
    ArrowLeftRight,
    AlertCircle,
    BrainCircuit,
    ShieldCheck
} from 'lucide-react';
import NavLink from './NavLink';
import './Sidebar.css';

const Sidebar: React.FC = () => {
    return (
        <aside className="sidebar">
            {/* Brand Logo Section */}
            <div className="sidebar-logo">
                <ShieldCheck size={32} className="logo-icon" />
                <span className="logo-text">SentinelAI</span>
            </div>

            {/* Navigation Links */}
            <nav className="sidebar-nav">
                <NavLink
                    to="/dashboard"
                    icon={LayoutDashboard}
                    label="Dashboard"
                />
                <NavLink
                    to="/transactions"
                    icon={ArrowLeftRight}
                    label="Transactions"
                />
                <NavLink
                    to="/alerts"
                    icon={AlertCircle}
                    label="Alerts"
                />
                <NavLink
                    to="/predict"
                    icon={BrainCircuit}
                    label="Prediction"
                />
            </nav>

            {/* Bottom Footer (Optional) */}
            <div className="sidebar-footer">
                <div className="collapse-btn">
                    <span>&lt;</span>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;