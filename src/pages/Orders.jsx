import React, { useEffect, useState } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MagnifyingGlassIcon, 
  DocumentMagnifyingGlassIcon,
  XCircleIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    async function fetchCities() {
      const res = await api.get('/stats/cities');
      setCities(res.data.map(c => c._id));
    }
    fetchCities();
  }, []);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const params = { search, city, from: dateRange.from, to: dateRange.to };
        const res = await api.get('/orders', { params });
        setOrders(res.data || []);
      } catch (err) {
        setOrders([]);
      }
      setLoading(false);
    }
    fetchOrders();
  }, [search, city, dateRange]);
  
  function openPreview(url) {
    setPreviewUrl(url);
    setShowPreview(true);
  }
  
  function closePreview() {
    setShowPreview(false);
  }

  return (
    <div className="flex flex-col gap-8 px-4 md:px-0 py-8 max-w-6xl mx-auto">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-2xl font-bold text-light-text dark:text-white mb-2">Orders</motion.h1>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="sticky top-16 z-10 bg-light dark:bg-dark border-b border-light-border dark:border-border py-4 flex flex-wrap gap-4 items-end">
        <div className="flex items-center bg-light-card dark:bg-card border border-light-border dark:border-border rounded-lg px-3 py-2 gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-light-muted dark:text-muted" />
          <input
            type="text"
            placeholder="Search by name or SKU"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-light-text dark:text-text placeholder:text-light-muted dark:placeholder:text-muted w-40"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-light-muted dark:text-muted mb-1">City</label>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-lg px-3 py-2 text-light-text dark:text-text"
          >
            <option value="">All</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-light-muted dark:text-muted mb-1">From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
            className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-lg px-3 py-2 text-light-text dark:text-text"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-light-muted dark:text-muted mb-1">To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
            className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-lg px-3 py-2 text-light-text dark:text-text"
          />
        </div>
      </motion.div>
      <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl shadow-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-light-border dark:bg-dark border-b border-light-border dark:border-border">
            <tr>
              <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Invoice</th>
              <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Customer Name</th>
              <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">City</th>
              <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">SKUs</th>
              <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Order Date</th>
              <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Total Amount</th>
              <th className="px-4 py-3 text-left text-light-muted dark:text-muted font-semibold">Actions</th>
            </tr>
          </thead>
          <AnimatePresence>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-light-muted dark:text-muted">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-light-muted dark:text-muted">No orders found</td></tr>
              ) : (
                orders.map(order => (
                  <motion.tr
                    key={order._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-accent/5 transition"
                  >
                    <td className="px-4 py-3 text-light-text dark:text-text">
                      {order.invoiceThumbnailUrl ? (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden border border-light-border dark:border-border flex items-center justify-center cursor-pointer"
                             onClick={() => order.invoiceImageUrl && openPreview(order.invoiceImageUrl)}>
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
                    <td className="px-4 py-3 text-light-text dark:text-text">{order.customerName}</td>
                    <td className="px-4 py-3 text-light-text dark:text-text">{order.customerCity}</td>
                    <td className="px-4 py-3 text-light-text dark:text-text">
                      {order.skus ? (
                        <span className="inline-flex items-center justify-center bg-accent/10 text-accent text-xs font-medium rounded-full px-2 py-0.5">
                          {order.skus.length} {order.skus.length === 1 ? 'item' : 'items'}
                        </span>
                      ) : order.sku}
                    </td>
                    <td className="px-4 py-3 text-light-text dark:text-text">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-3 text-light-text dark:text-text">₹{order.totalAmount}</td>
                    <td className="px-4 py-3 text-light-text dark:text-text">
                      {order.invoiceImageUrl && (
                        <button 
                          onClick={() => openPreview(order.invoiceImageUrl)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-accent/10 hover:bg-accent/20 text-accent rounded text-xs"
                        >
                          <DocumentMagnifyingGlassIcon className="w-3 h-3" />
                          View
                        </button>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </AnimatePresence>
        </table>
      </div>
      
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
}

