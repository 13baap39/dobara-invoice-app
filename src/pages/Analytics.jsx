import React, { useEffect, useState } from 'react';
import api from '../api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { motion } from 'framer-motion';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Analytics() {
  const [cityStats, setCityStats] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [repeatCustomers, setRepeatCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const citiesRes = await api.get('/stats/cities');
        setCityStats(citiesRes.data || []);
        // Revenue trend for current month
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const monthStart = `${yyyy}-${mm}-01`;
        const days = Array.from({ length: today.getDate() }, (_, i) => {
          const d = new Date(today.getFullYear(), today.getMonth(), i + 1);
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        });
        const trend = [];
        for (const day of days) {
          const res = await api.get('/stats/summary', { params: { from: day, to: day } });
          trend.push({ date: day, revenue: res.data.totalRevenue || 0 });
        }
        setRevenueTrend(trend);
        const repeatRes = await api.get('/stats/repeat-customers');
        setRepeatCustomers(repeatRes.data || []);
      } catch (err) {
        setCityStats([]);
        setRevenueTrend([]);
        setRepeatCustomers([]);
      }
      setLoading(false);
    }
    fetchAnalytics();
  }, []);

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-xl font-light text-gray-100">Analytics</h1>
        <span className="text-muted text-sm">Trends & Performance</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-card bg-card-gradient border border-border rounded-xl shadow-card p-6">
          <div className="text-lg font-light text-gray-100 mb-2">Orders by City</div>
          {loading ? <LoadingSkeleton className="h-64 w-full rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={cityStats}>
                <XAxis dataKey="_id" stroke="#A0AEC0" />
                <YAxis stroke="#A0AEC0" />
                <Tooltip contentStyle={{ background: '#242526', color: '#F3F4F6', border: '1px solid #333' }} />
                <Bar dataKey="total" fill="#3B82F6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-card bg-card-gradient border border-border rounded-xl shadow-card p-6">
          <div className="text-lg font-light text-gray-100 mb-2">Revenue Trend (This Month)</div>
          {loading ? <LoadingSkeleton className="h-64 w-full rounded-xl" /> : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={revenueTrend}>
                <CartesianGrid stroke="#333" />
                <XAxis dataKey="date" stroke="#A0AEC0" />
                <YAxis stroke="#A0AEC0" />
                <Tooltip contentStyle={{ background: '#242526', color: '#F3F4F6', border: '1px solid #333' }} />
                <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-card bg-card-gradient border border-border rounded-xl shadow-card p-6">
        <div className="text-lg font-light text-gray-100 mb-2">Repeat Customers (This Month)</div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-dark border-b border-border">
              <tr>
                <th className="px-4 py-2 text-left text-muted font-semibold">Name</th>
                <th className="px-4 py-2 text-left text-muted font-semibold">Pincode</th>
                <th className="px-4 py-2 text-left text-muted font-semibold">Months</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted"><LoadingSkeleton className="h-6 w-full rounded" /></td></tr>
              ) : repeatCustomers.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-8 text-muted">No repeat customers</td></tr>
              ) : (
                repeatCustomers.map((cust, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 text-text">{cust._id.name}</td>
                    <td className="px-4 py-2 text-text">{cust._id.pincode}</td>
                    <td className="px-4 py-2 text-text">{cust.months.map(m => `${m.month}/${m.year} (${m.count})`).join(', ')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

