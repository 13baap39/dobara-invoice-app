import React from 'react';
import { motion } from 'framer-motion';

export default function StatsCard({ title, value, icon, children, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-card bg-card-gradient border border-border rounded-xl shadow-card p-6 flex flex-col gap-2 min-w-[200px] hover:-translate-y-1 hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-center gap-3">
        <div className="text-accent text-2xl">{icon}</div>
        <div className="text-gray-100 text-lg font-light">{title}</div>
      </div>
      <div className="text-3xl font-bold text-white mt-2">{value}</div>
      {children}
    </motion.div>
  );
}
