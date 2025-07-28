
import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { UserCircleIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function Header() {
  const { user, isLoading, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleProfileClick = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOpenProfile = () => {
    navigate('/profile');
    setIsDropdownOpen(false);
  };

  const handleEditProfile = () => {
    navigate('/profile');
    setIsDropdownOpen(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
    setIsDropdownOpen(false);
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-light-card dark:bg-dark border-b border-light-border dark:border-border h-16 flex items-center px-6 pl-20 md:pl-64 transition-all duration-300">
      <div className="flex items-center gap-3 flex-1">
        {!isLoading && user ? (
          <span className="text-xl font-light text-light-text dark:text-gray-100 tracking-tight">Welcome back, {user.fullName || user.email}!</span>
        ) : !isLoading ? (
          <span className="text-xl font-light text-light-text dark:text-gray-100 tracking-tight">Welcome!</span>
        ) : (
          <span className="text-xl font-light text-light-text dark:text-gray-100 tracking-tight">Loading...</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={toggleTheme}
          className="rounded-full p-2 border border-light-border dark:border-border bg-light-card dark:bg-card hover:bg-accent/20 transition-colors"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" /></svg>
          )}
        </button>
        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleProfileClick}
            className="rounded-full hover:ring-2 hover:ring-accent/30 transition-all"
          >
            {user && user.profilePicUrl ? (
              <img
                src={user.profilePicUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_BASE_URL}${user.profilePicUrl}` : user.profilePicUrl}
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500 bg-gray-100 dark:bg-gray-800"
              />
            ) : (
              <UserCircleIcon className="w-8 h-8 text-gray-600 dark:text-gray-300" />
            )}
          </button>
          
          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg z-50 border border-gray-200 dark:bg-gray-800 dark:border-gray-600">
              <div className="py-1">
                <button
                  onClick={handleOpenProfile}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <UserCircleIcon className="w-4 h-4 mr-3" />
                  Open Profile
                </button>
                <button
                  onClick={handleEditProfile}
                  className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit Profile
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-600" />
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

