import React from 'react';
import { UserCircleIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext.js';

export default function Header() {
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-30 w-full bg-dark border-b border-border h-16 flex items-center px-6 pl-20 md:pl-64 transition-all duration-300">
      <div className="flex items-center gap-3 flex-1">
        {!isLoading && user ? (
          <span className="text-xl font-light text-gray-100 tracking-tight">Welcome back, {user.fullName || user.email}!</span>
        ) : !isLoading ? (
          <span className="text-xl font-light text-gray-100 tracking-tight">Welcome!</span>
        ) : (
          <span className="text-xl font-light text-gray-100 tracking-tight">Loading...</span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <MagnifyingGlassIcon className="w-5 h-5 text-muted absolute left-2 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search (coming soon)"
            className="bg-card border border-border rounded-lg pl-8 pr-3 py-2 text-text placeholder:text-muted w-40 focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
            disabled
          />
        </div>
        {user && user.profilePicUrl ? (
          <img
            src={user.profilePicUrl.startsWith('/uploads') ? `${import.meta.env.VITE_API_BASE_URL}${user.profilePicUrl}` : user.profilePicUrl}
            alt="Profile"
            className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500 bg-gray-800"
          />
        ) : (
          <UserCircleIcon className="w-8 h-8 text-muted" />
        )}
      </div>
    </header>
  );
}
