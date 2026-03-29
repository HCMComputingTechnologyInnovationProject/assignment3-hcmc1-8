import React from 'react';
import { NavLink as RouterNavLink } from 'react-router-dom';
import { type LucideIcon } from 'lucide-react';
import './Sidebar.css';

interface NavItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
}

const NavLink: React.FC<NavItemProps> = ({ to, icon: Icon, label }) => {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        `sidebar-link ${isActive ? 'active' : ''}`
      }
    >
      <Icon size={20} className="nav-icon" />
      <span className="nav-label">{label}</span>
    </RouterNavLink>
  );
};

export default NavLink;