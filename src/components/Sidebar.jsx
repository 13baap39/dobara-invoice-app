import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { HomeIcon, TableCellsIcon, ChartBarIcon, ArrowUpTrayIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, UserIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext.jsx';

const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', to: '/', icon: <HomeIcon className="w-6 h-6" /> },
      { name: 'Orders', to: '/orders', icon: <TableCellsIcon className="w-6 h-6" /> },
    ]
  },
  {
    label: 'Reports',
    items: [
      { name: 'Analytics', to: '/analytics', icon: <ChartBarIcon className="w-6 h-6" /> },
      { name: 'Upload', to: '/upload', icon: <ArrowUpTrayIcon className="w-6 h-6" /> },
    ]
  }
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  
  const handleLogout = () => {
    setShowLogout(true);
  };
  
  const confirmLogout = () => {
    logout();
    setShowLogout(false);
    navigate('/login');
  };
  return (
    <aside className={`fixed top-0 left-0 h-full z-40 bg-card border-r border-border transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'} flex flex-col`}>  
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        <span className={`text-accent font-bold text-lg tracking-tight transition-all duration-300 ${collapsed ? 'hidden' : 'block'}`}>Dobara</span>
        <button onClick={() => setCollapsed(c => !c)} className="text-muted hover:text-accent transition-all">
          {collapsed ? <ChevronDoubleRightIcon className="w-5 h-5" /> : <ChevronDoubleLeftIcon className="w-5 h-5" />}
        </button>
      </div>
      <nav className="flex-1 flex flex-col gap-6 py-6">
        {navGroups.map(group => (
          <div key={group.label} className="flex flex-col gap-1 px-2">
            <span className={`text-xs uppercase tracking-wider text-muted font-semibold mb-2 ${collapsed ? 'hidden' : 'block'}`}>{group.label}</span>
            {group.items.map(item => (
              <NavLink
                key={item.name}
                to={item.to}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-text ${isActive ? 'bg-accent/10 text-accent' : 'hover:bg-accent/5 hover:text-accent'} ${collapsed ? 'justify-center' : ''}`
                }
                end={item.to === '/'}
              >
                {item.icon}
                <span className={`transition-all duration-300 ${collapsed ? 'hidden' : 'block'}`}>{item.name}</span>
              </NavLink>
            ))}
          </div>
        ))}
        <div className="px-2 flex flex-col gap-2 mt-auto mb-4">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 font-medium text-text ${isActive ? 'bg-indigo-700 text-white' : 'hover:bg-gray-800 text-gray-300'} ${collapsed ? 'justify-center' : ''}`
            }
          >
            <UserIcon className="w-6 h-6" />
            <span className={`transition-all duration-300 ${collapsed ? 'hidden' : 'block'}`}>Profile</span>
          </NavLink>
          {!collapsed && isAuthenticated && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-medium transition"
            >
              <ArrowRightOnRectangleIcon className="w-6 h-6" />
              <span>Logout</span>
            </button>
          )}
        </div>
        {showLogout && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div className="bg-gray-900 p-8 rounded-lg shadow-lg text-center">
              <div className="text-lg font-bold mb-4 text-white">Are you sure you want to logout?</div>
              <button
                onClick={confirmLogout}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded mr-4"
              >
                Yes, Logout
              </button>
              <button
                onClick={() => setShowLogout(false)}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-2 px-6 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </nav>
    </aside>
  );
}
