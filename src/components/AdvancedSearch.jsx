/**
 * Advanced Search Component
 * Provides comprehensive search functionality for orders
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDownIcon, 
  ChevronUpIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  BookmarkIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { debounce } from 'lodash';

const AdvancedSearch = ({ 
  onSearch, 
  loading = false, 
  initialValues = {},
  onSaveSearch,
  savedSearches = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchParams, setSearchParams] = useState({
    customerName: '',
    customerCity: '',
    startDate: '',
    endDate: '',
    orderNumber: '',
    skuContains: '',
    minAmount: '',
    maxAmount: '',
    hsnCode: '',
    sortBy: 'orderDate',
    sortOrder: 'desc',
    ...initialValues
  });

  const [suggestions, setSuggestions] = useState({
    customerName: [],
    customerCity: [],
    skuContains: []
  });

  const [showSuggestions, setShowSuggestions] = useState({
    customerName: false,
    customerCity: false,
    skuContains: false
  });

  // Debounced function to fetch suggestions
  const fetchSuggestions = useCallback(
    debounce(async (field, query) => {
      if (!query || query.length < 2) {
        setSuggestions(prev => ({ ...prev, [field]: [] }));
        return;
      }

      try {
        const response = await fetch(`/api/orders/search/suggestions?field=${field}&query=${encodeURIComponent(query)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('dobara_token')}`
          }
        });
        const data = await response.json();
        setSuggestions(prev => ({ ...prev, [field]: data.suggestions || [] }));
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions(prev => ({ ...prev, [field]: [] }));
      }
    }, 300),
    []
  );

  // Handle input changes
  const handleInputChange = (field, value) => {
    setSearchParams(prev => ({ ...prev, [field]: value }));
    
    // Fetch suggestions for autocomplete fields
    if (['customerName', 'customerCity', 'skuContains'].includes(field)) {
      fetchSuggestions(field, value);
      setShowSuggestions(prev => ({ ...prev, [field]: true }));
    }
  };

  // Handle search execution
  const handleSearch = () => {
    // Remove empty values
    const cleanParams = Object.fromEntries(
      Object.entries(searchParams).filter(([_, value]) => value !== '')
    );
    onSearch(cleanParams);
  };

  // Reset all search parameters
  const handleReset = () => {
    setSearchParams({
      customerName: '',
      customerCity: '',
      startDate: '',
      endDate: '',
      orderNumber: '',
      skuContains: '',
      minAmount: '',
      maxAmount: '',
      hsnCode: '',
      sortBy: 'orderDate',
      sortOrder: 'desc'
    });
    onSearch({});
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (field, value) => {
    handleInputChange(field, value);
    setShowSuggestions(prev => ({ ...prev, [field]: false }));
  };

  // Save current search
  const handleSaveSearch = () => {
    const searchName = prompt('Enter a name for this search:');
    if (searchName && onSaveSearch) {
      onSaveSearch(searchName, searchParams);
    }
  };

  return (
    <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl shadow-card mb-6">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-light-border/50 dark:hover:bg-border/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-accent" />
          <span className="font-medium text-light-text dark:text-white">Advanced Search</span>
          {Object.values(searchParams).some(value => value !== '' && value !== 'orderDate' && value !== 'desc') && (
            <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full">
              Active
            </span>
          )}
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-5 h-5 text-light-muted dark:text-muted" />
        ) : (
          <ChevronDownIcon className="w-5 h-5 text-light-muted dark:text-muted" />
        )}
      </div>

      {/* Search Form */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="border-t border-light-border dark:border-border p-4 space-y-4"
          >
            {/* Customer Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Customer Name
                </label>
                <input
                  type="text"
                  value={searchParams.customerName}
                  onChange={(e) => handleInputChange('customerName', e.target.value)}
                  onFocus={() => setShowSuggestions(prev => ({ ...prev, customerName: true }))}
                  onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, customerName: false })), 200)}
                  placeholder="Search by customer name..."
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
                {/* Suggestions dropdown */}
                {showSuggestions.customerName && suggestions.customerName.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-light-border dark:border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.customerName.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                        onClick={() => handleSuggestionSelect('customerName', suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Customer City
                </label>
                <input
                  type="text"
                  value={searchParams.customerCity}
                  onChange={(e) => handleInputChange('customerCity', e.target.value)}
                  onFocus={() => setShowSuggestions(prev => ({ ...prev, customerCity: true }))}
                  onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, customerCity: false })), 200)}
                  placeholder="Search by city..."
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
                {/* Suggestions dropdown */}
                {showSuggestions.customerCity && suggestions.customerCity.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-light-border dark:border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.customerCity.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                        onClick={() => handleSuggestionSelect('customerCity', suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Order Number
                </label>
                <input
                  type="text"
                  value={searchParams.orderNumber}
                  onChange={(e) => handleInputChange('orderNumber', e.target.value)}
                  placeholder="Exact order number..."
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  HSN Code
                </label>
                <input
                  type="text"
                  value={searchParams.hsnCode}
                  onChange={(e) => handleInputChange('hsnCode', e.target.value)}
                  placeholder="HSN code..."
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  SKU Contains
                </label>
                <input
                  type="text"
                  value={searchParams.skuContains}
                  onChange={(e) => handleInputChange('skuContains', e.target.value)}
                  onFocus={() => setShowSuggestions(prev => ({ ...prev, skuContains: true }))}
                  onBlur={() => setTimeout(() => setShowSuggestions(prev => ({ ...prev, skuContains: false })), 200)}
                  placeholder="Search within SKUs..."
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
                {/* Suggestions dropdown */}
                {showSuggestions.skuContains && suggestions.skuContains.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-light-border dark:border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {suggestions.skuContains.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-sm"
                        onClick={() => handleSuggestionSelect('skuContains', suggestion)}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={searchParams.startDate}
                  onChange={(e) => handleInputChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={searchParams.endDate}
                  onChange={(e) => handleInputChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            {/* Amount Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Min Amount (₹)
                </label>
                <input
                  type="number"
                  value={searchParams.minAmount}
                  onChange={(e) => handleInputChange('minAmount', e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Max Amount (₹)
                </label>
                <input
                  type="number"
                  value={searchParams.maxAmount}
                  onChange={(e) => handleInputChange('maxAmount', e.target.value)}
                  placeholder="999999"
                  min="0"
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Sort By
                </label>
                <select
                  value={searchParams.sortBy}
                  onChange={(e) => handleInputChange('sortBy', e.target.value)}
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  <option value="orderDate">Order Date</option>
                  <option value="totalAmount">Total Amount</option>
                  <option value="customerName">Customer Name</option>
                  <option value="searchScore">Relevance</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-light-text dark:text-white mb-1">
                  Sort Order
                </label>
                <select
                  value={searchParams.sortOrder}
                  onChange={(e) => handleInputChange('sortOrder', e.target.value)}
                  className="w-full px-3 py-2 border border-light-border dark:border-border rounded-lg bg-light-card dark:bg-card text-light-text dark:text-white focus:ring-2 focus:ring-accent focus:border-accent"
                >
                  <option value="desc">Descending</option>
                  <option value="asc">Ascending</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                ) : (
                  <MagnifyingGlassIcon className="w-4 h-4" />
                )}
                Search
              </button>

              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-light-muted dark:bg-muted hover:bg-gray-300 dark:hover:bg-gray-600 text-light-text dark:text-white rounded-lg font-medium transition-colors"
              >
                <XMarkIcon className="w-4 h-4" />
                Reset
              </button>

              {onSaveSearch && (
                <button
                  onClick={handleSaveSearch}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                >
                  <BookmarkIcon className="w-4 h-4" />
                  Save Search
                </button>
              )}
            </div>

            {/* Saved Searches */}
            {savedSearches.length > 0 && (
              <div className="pt-4 border-t border-light-border dark:border-border">
                <label className="block text-sm font-medium text-light-text dark:text-white mb-2">
                  Saved Searches
                </label>
                <div className="flex flex-wrap gap-2">
                  {savedSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setSearchParams(search.params);
                        onSearch(search.params);
                      }}
                      className="px-3 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded-full text-sm transition-colors"
                    >
                      {search.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedSearch;
