import React, { useEffect, useState } from 'react';
import api from '../api';

function StatCard({ title, value, icon, color }) {
  return (
    <div className={`flex items-center gap-4 bg-white rounded shadow p-6 border-l-4 ${color}`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <div className="text-gray-500 text-sm font-medium">{title}</div>
        <div className="text-2xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function Homepage() {
  const [summary, setSummary] = useState({ totalOrders: 0, totalRevenue: 0, topCities: [], repeatCustomers: [] });
  const [loading, setLoading] = useState(true);

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
        const summaryRes = await api.get('/stats/summary', { params: { from, to } });
        const citiesRes = await api.get('/stats/cities');
        const repeatRes = await api.get('/stats/repeat-customers');
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
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">Welcome to Dobara Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatCard title="Total Orders" value={loading ? '...' : summary.totalOrders} icon="📦" color="border-indigo-500" />
        <StatCard title="Total Revenue" value={loading ? '...' : `₹${summary.totalRevenue}`} icon="💰" color="border-green-500" />
        <StatCard title="Top City" value={loading ? '...' : (summary.topCities[0]?.['_id'] || 'N/A')} icon="🏙️" color="border-pink-500" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top 3 Cities</h2>
          {loading ? <div className="text-gray-400">Loading...</div> : (
            <ol className="list-decimal ml-6">
              {summary.topCities.map((city, idx) => (
                <li key={city._id} className="mb-1">{city._id} <span className="text-gray-500">({city.count} orders)</span></li>
              ))}
            </ol>
          )}
        </div>
        <div className="bg-white rounded shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Repeat Customers</h2>
          {loading ? <div className="text-gray-400">Loading...</div> : summary.repeatCustomers.length === 0 ? (
            <div className="text-gray-500">No repeat customers today</div>
          ) : (
            <ul className="text-sm">
              {summary.repeatCustomers.map((cust, idx) => (
                <li key={idx}>
                  <span className="font-medium">{cust._id.name}</span> ({cust._id.pincode}) <span className="text-gray-400">[{cust.months.map(m => `${m.month}/${m.year} (${m.count})`).join(', ')}]</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <div className="bg-white rounded shadow p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Activity & Analytics (Coming Soon)</h2>
        <div className="h-32 flex items-center justify-center text-gray-400">Charts and recent activity will appear here.</div>
      </div>
    </div>
  );
}

export default Homepage;
