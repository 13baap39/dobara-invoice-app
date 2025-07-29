/**
 * Search Results Component
 * Displays search results with highlighting, sorting, and export functionality
 */

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentArrowDownIcon, 
  DocumentMagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

// Utility function to highlight matching terms
const highlightText = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded">
        {part}
      </mark>
    ) : (
      part
    )
  );
};

// Export to CSV function
const exportToCSV = (data, filename = 'search-results') => {
  const headers = [
    'Order Number',
    'Customer Name', 
    'Customer City',
    'Order Date',
    'HSN Code',
    'Total Amount',
    'SKUs Count',
    'SKUs Details'
  ];

  const rows = data.map(order => [
    order.orderNumber,
    order.customerName,
    order.customerCity,
    new Date(order.orderDate).toLocaleDateString(),
    order.hsnCode || '',
    order.totalAmount,
    order.totalSkus || 0,
    order.skus ? order.skus.map(sku => `${sku.sku} (${sku.quantity}x)`).join('; ') : ''
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const SearchResults = ({ 
  results = [], 
  loading = false, 
  searchQuery = {}, 
  pagination = {}, 
  onPageChange,
  onInvoicePreview 
}) => {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  const openPreview = (url) => {
    setPreviewUrl(url);
    setShowPreview(true);
  };

  const closePreview = () => {
    setShowPreview(false);
  };

  const handleExport = () => {
    exportToCSV(results, 'order-search-results');
  };

  // Get search terms for highlighting
  const searchTerms = useMemo(() => {
    const terms = [];
    if (searchQuery.customerName) terms.push(searchQuery.customerName);
    if (searchQuery.customerCity) terms.push(searchQuery.customerCity);
    if (searchQuery.skuContains) terms.push(searchQuery.skuContains);
    return terms;
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl shadow-card p-8">
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!results.length) {
    return (
      <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl shadow-card p-8 text-center">
        <DocumentTextIcon className="w-16 h-16 text-light-muted dark:text-muted mx-auto mb-4" />
        <h3 className="text-lg font-medium text-light-text dark:text-white mb-2">
          No Results Found
        </h3>
        <p className="text-light-muted dark:text-muted">
          Try adjusting your search criteria or clearing some filters.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-light-muted dark:text-muted">
          Showing {results.length} of {pagination.total || 0} results
          {pagination.page > 1 && ` (Page ${pagination.page} of ${pagination.totalPages})`}
        </div>
        
        <button
          onClick={handleExport}
          disabled={!results.length}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <DocumentArrowDownIcon className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Results Table */}
      <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-light-border dark:bg-dark border-b border-light-border dark:border-border">
              <tr>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Invoice</th>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Customer</th>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">City</th>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Order #</th>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Date</th>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">SKUs</th>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Amount</th>
                <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {results.map((order, index) => (
                  <motion.tr
                    key={order._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="hover:bg-accent/5 transition-colors border-b border-light-border dark:border-border last:border-0"
                  >
                    {/* Invoice Thumbnail */}
                    <td className="px-4 py-3">
                      {order.invoiceThumbnailUrl ? (
                        <div 
                          className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden border border-light-border dark:border-border flex items-center justify-center cursor-pointer"
                          onClick={() => order.invoiceImageUrl && openPreview(order.invoiceImageUrl)}
                        >
                          <img 
                            src={order.invoiceThumbnailUrl} 
                            alt="Invoice thumbnail" 
                            className="object-cover w-full h-full"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = '/default-avatar.svg';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden border border-light-border dark:border-border flex items-center justify-center">
                          <DocumentTextIcon className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                    </td>

                    {/* Customer Name with highlighting */}
                    <td className="px-4 py-3 text-light-text dark:text-text">
                      <div className="font-medium">
                        {highlightText(order.customerName, searchQuery.customerName)}
                      </div>
                      {order.searchScore > 0 && (
                        <div className="text-xs text-accent">
                          Score: {order.searchScore}
                        </div>
                      )}
                    </td>

                    {/* City with highlighting */}
                    <td className="px-4 py-3 text-light-text dark:text-text">
                      {highlightText(order.customerCity, searchQuery.customerCity)}
                    </td>

                    {/* Order Number */}
                    <td className="px-4 py-3 text-light-text dark:text-text font-mono text-xs">
                      {order.orderNumber}
                    </td>

                    {/* Order Date */}
                    <td className="px-4 py-3 text-light-text dark:text-text">
                      {new Date(order.orderDate).toLocaleDateString()}
                    </td>

                    {/* SKUs with highlighting */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center justify-center bg-accent/10 text-accent text-xs font-medium rounded-full px-2 py-0.5">
                          {order.totalSkus || order.skus?.length || 0} items
                        </span>
                        {order.skus && searchQuery.skuContains && (
                          <div className="text-xs text-light-muted dark:text-muted max-w-32 truncate">
                            {order.skus
                              .filter(sku => sku.sku.toLowerCase().includes(searchQuery.skuContains.toLowerCase()))
                              .map(sku => highlightText(sku.sku, searchQuery.skuContains))
                              .slice(0, 2)
                              .map((sku, i) => (
                                <div key={i}>{sku}</div>
                              ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Total Amount */}
                    <td className="px-4 py-3 text-light-text dark:text-text font-medium">
                      ₹{order.totalAmount?.toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {order.invoiceImageUrl && (
                          <button 
                            onClick={() => openPreview(order.invoiceImageUrl)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded text-xs"
                          >
                            <DocumentMagnifyingGlassIcon className="w-3 h-3" />
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-light-muted dark:text-muted">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1 px-3 py-1.5 bg-light-muted dark:bg-muted hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-white rounded text-sm"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Previous
            </button>
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1 px-3 py-1.5 bg-light-muted dark:bg-muted hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-light-text dark:text-white rounded text-sm"
            >
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Invoice Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closePreview}>
          <div className="w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-lg" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="font-medium">Invoice Preview</div>
              <button onClick={closePreview} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <XCircleIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="h-[70vh] overflow-auto">
              <iframe src={previewUrl} className="w-full h-full" title="Invoice Preview"></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchResults;
