import React, { useEffect, useState } from 'react';
import api from '../api';
import StatsCard from '../components/StatsCard';
import { motion } from 'framer-motion';
import { UserGroupIcon, CurrencyRupeeIcon, BuildingOffice2Icon, ArrowPathIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const [summary, setSummary] = useState({ totalOrders: 0, totalRevenue: 0, topCities: [], repeatCustomers: [] });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        const from = `${yyyy}-${mm}-${dd}`;
        const to = `${yyyy}-${mm}-${dd}`;
        const summaryRes = await api.get('http://localhost:5002/stats/summary', { params: { from, to } });
        const citiesRes = await api.get('http://localhost:5002/stats/cities');
        const repeatRes = await api.get('http://localhost:5002/stats/repeat-customers');
        setSummary({
          totalOrders: summaryRes.data.totalOrders || 0,
          totalRevenue: summaryRes.data.totalRevenue || 0,
          topCities: citiesRes.data.slice(0, 3),
          repeatCustomers: repeatRes.data || []
        });
      } catch (err) {
        setSummary({ totalOrders: 0, totalRevenue: 0, topCities: [], repeatCustomers: [] });
      }
      setLoading(false);
    }
    fetchData();

    // Fetch user info for welcome message
    const token = localStorage.getItem('dobara_token') || sessionStorage.getItem('dobara_token');
    if (token) {
      fetch('http://localhost:5002/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => setUser(data));
    }
    // Listen for profile updates
    const handler = () => {
      const token = localStorage.getItem('dobara_token') || sessionStorage.getItem('dobara_token');
      if (token) {
        fetch('http://localhost:5002/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
          .then(res => res.json())
          .then(data => setUser(data));
      }
    };
    window.addEventListener('profile-updated', handler);
    return () => window.removeEventListener('profile-updated', handler);
  }, []);

  return (
    <div className="flex flex-col gap-8 px-4 md:px-0 py-8 max-w-5xl mx-auto">
      <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-2xl font-bold text-white mb-2">
        {user && (user.shopName || user.fullName || user.email) ? (
          <>Welcome, <span className="text-indigo-400">{user.shopName || user.fullName || user.email}</span>!</>
        ) : (
          'Dobara Dashboard'
        )}
      </motion.h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard title="Total Orders Today" value={loading ? '...' : summary.totalOrders} icon={<UserGroupIcon className="w-7 h-7" />} delay={0.05} />
        <StatsCard title="Total Revenue Today" value={loading ? '...' : `₹${summary.totalRevenue}`} icon={<CurrencyRupeeIcon className="w-7 h-7" />} delay={0.1} />
        <StatsCard title="Top 3 Cities" value={loading ? '...' : summary.topCities.map(c => c._id).join(', ') || 'N/A'} icon={<BuildingOffice2Icon className="w-7 h-7" />} delay={0.15} />
        <StatsCard title="Repeat Customers" value={loading ? '...' : summary.repeatCustomers.length} icon={<ArrowPathIcon className="w-7 h-7" />} delay={0.2} />
      </div>
      <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Top 3 Cities</h2>
          {loading ? <div className="text-muted">Loading...</div> : (
            <ol className="list-decimal ml-6 text-text">
              {summary.topCities.map((city, idx) => (
                <li key={city._id} className="mb-1">{city._id} <span className="text-muted">({city.count} orders)</span></li>
              ))}
            </ol>
          )}
        </div>
        <div className="bg-card border border-border rounded-xl shadow-card p-6">
          <h2 className="text-lg font-semibold text-text mb-4">Repeat Customers</h2>
          {loading ? <div className="text-muted">Loading...</div> : summary.repeatCustomers.length === 0 ? (
            <div className="text-muted">No repeat customers today</div>
          ) : (
            <ul className="text-sm text-text">
              {summary.repeatCustomers.map((cust, idx) => (
                <li key={idx}>
                  <span className="font-medium">{cust._id.name}</span> ({cust._id.pincode}) <span className="text-muted">[{cust.months.map(m => `${m.month}/${m.year} (${m.count})`).join(', ')}]</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </motion.section>
    </div>
  );
}
