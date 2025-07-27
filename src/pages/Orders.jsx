import React, { useEffect, useState } from 'react';
import api from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState([]);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

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

  return (
    <div className="flex flex-col gap-8 px-4 md:px-0 py-8 max-w-6xl mx-auto">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-2xl font-bold text-white mb-2">Orders</motion.h1>
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="sticky top-16 z-10 bg-dark border-b border-border py-4 flex flex-wrap gap-4 items-end">
        <div className="flex items-center bg-card border border-border rounded-lg px-3 py-2 gap-2">
          <MagnifyingGlassIcon className="w-5 h-5 text-muted" />
          <input
            type="text"
            placeholder="Search by name or SKU"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="bg-transparent outline-none text-text placeholder:text-muted w-40"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1">City</label>
          <select
            value={city}
            onChange={e => setCity(e.target.value)}
            className="bg-card border border-border rounded-lg px-3 py-2 text-text"
          >
            <option value="">All</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1">From</label>
          <input
            type="date"
            value={dateRange.from}
            onChange={e => setDateRange(r => ({ ...r, from: e.target.value }))}
            className="bg-card border border-border rounded-lg px-3 py-2 text-text"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-xs text-muted mb-1">To</label>
          <input
            type="date"
            value={dateRange.to}
            onChange={e => setDateRange(r => ({ ...r, to: e.target.value }))}
            className="bg-card border border-border rounded-lg px-3 py-2 text-text"
          />
        </div>
      </motion.div>
      <div className="bg-card border border-border rounded-xl shadow-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-dark border-b border-border">
            <tr>
              <th className="px-4 py-3 text-left text-muted font-semibold">Customer Name</th>
              <th className="px-4 py-3 text-left text-muted font-semibold">City</th>
              <th className="px-4 py-3 text-left text-muted font-semibold">SKU</th>
              <th className="px-4 py-3 text-left text-muted font-semibold">Order Date</th>
              <th className="px-4 py-3 text-left text-muted font-semibold">Total Amount</th>
            </tr>
          </thead>
          <AnimatePresence>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-8 text-muted">No orders found</td></tr>
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
                    <td className="px-4 py-3 text-text">{order.name}</td>
                    <td className="px-4 py-3 text-text">{order.city}</td>
                    <td className="px-4 py-3 text-text">{order.sku}</td>
                    <td className="px-4 py-3 text-text">{order.orderDate ? new Date(order.orderDate).toLocaleDateString() : ''}</td>
                    <td className="px-4 py-3 text-text">₹{order.totalAmount}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </AnimatePresence>
        </table>
      </div>
    </div>
  );
}

