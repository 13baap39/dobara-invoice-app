/**
 * Batch Status Component
 * Real-time tracking of batch processing progress
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../api.js';

const BatchStatus = ({ batchId, onClose, socket }) => {
  const [batch, setBatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (batchId) {
      fetchBatchStatus();
      
      // Join batch room for real-time updates
      if (socket) {
        socket.emit('joinBatchRoom', batchId);
        socket.on('batchUpdate', handleBatchUpdate);
        
        return () => {
          socket.emit('leaveBatchRoom', batchId);
          socket.off('batchUpdate', handleBatchUpdate);
        };
      }
    }
  }, [batchId, socket]);

  const fetchBatchStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/batch/batch/${batchId}`);
      if (response.data.success) {
        setBatch(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch batch status');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchUpdate = (update) => {
    if (update.batchId === batchId) {
      setBatch(prev => prev ? { ...prev, ...update } : null);
    }
  };

  const handleRetry = async () => {
    try {
      setRetrying(true);
      const response = await api.post(`/api/batch/batch/${batchId}/retry`);
      if (response.data.success) {
        // Navigate to the new retry batch
        navigate(`/batch/${response.data.data.batchId}`);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to retry batch');
    } finally {
      setRetrying(false);
    }
  };

  const handleCancel = async () => {
    try {
      await api.post(`/api/batch/batch/${batchId}/cancel`);
      fetchBatchStatus(); // Refresh status
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to cancel batch');
    }
  };

  const downloadSummary = async () => {
    try {
      const response = await api.get(`/api/batch/batch/${batchId}/export?format=csv`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `batch-${batchId}-summary.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download summary');
    }
  };

  const viewOrders = () => {
    navigate('/orders', { 
      state: { 
        batchFilter: batchId,
        showBatchOrders: true 
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 dark:text-green-400';
      case 'failed':
        return 'text-red-600 dark:text-red-400';
      case 'processing':
        return 'text-blue-600 dark:text-blue-400';
      case 'cancelled':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-yellow-600 dark:text-yellow-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5" />;
      case 'processing':
        return <ArrowPathIcon className="w-5 h-5 animate-spin" />;
      case 'cancelled':
        return <XCircleIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const formatDuration = (ms) => {
    if (!ms) return 'N/A';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  if (loading) {
    return (
      <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl p-6">
        <div className="flex items-center justify-center space-x-3">
          <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin"></div>
          <span className="text-light-text dark:text-text">Loading batch status...</span>
        </div>
      </div>
    );
  }

  if (error || !batch) {
    return (
      <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl p-6">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-600 dark:text-red-400 mb-4">{error || 'Batch not found'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="p-6 border-b border-light-border dark:border-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-light-text dark:text-text mb-2">
              Batch Processing Status
            </h2>
            <p className="text-sm text-light-muted dark:text-muted">
              Batch ID: {batch.batchId}
            </p>
          </div>
          
          <div className={`flex items-center space-x-2 ${getStatusColor(batch.status)}`}>
            {getStatusIcon(batch.status)}
            <span className="font-medium capitalize">{batch.status}</span>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="p-6 space-y-6">
        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-light-text dark:text-text">
              Processing Progress
            </span>
            <span className="text-sm text-light-muted dark:text-muted">
              {batch.processedFiles}/{batch.totalFiles} files
            </span>
          </div>
          
          <div className="w-full bg-light-border dark:bg-border rounded-full h-3">
            <motion.div
              className="bg-accent h-3 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${batch.completionPercentage || 0}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className="flex justify-between text-xs text-light-muted dark:text-muted mt-1">
            <span>0%</span>
            <span className="font-medium">{batch.completionPercentage || 0}%</span>
            <span>100%</span>
          </div>
        </div>

        {/* Statistics Grid */}
        {batch.stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-light-border dark:bg-border rounded-lg">
              <p className="text-2xl font-bold text-accent">{batch.stats.totalOrders || 0}</p>
              <p className="text-xs text-light-muted dark:text-muted">Orders Created</p>
            </div>
            
            <div className="text-center p-3 bg-light-border dark:bg-border rounded-lg">
              <p className="text-2xl font-bold text-green-600">₹{(batch.stats.totalAmount || 0).toLocaleString()}</p>
              <p className="text-xs text-light-muted dark:text-muted">Total Amount</p>
            </div>
            
            <div className="text-center p-3 bg-light-border dark:bg-border rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{batch.stats.totalSKUs || 0}</p>
              <p className="text-xs text-light-muted dark:text-muted">SKUs Processed</p>
            </div>
            
            <div className="text-center p-3 bg-light-border dark:bg-border rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{batch.stats.uniqueCustomers || 0}</p>
              <p className="text-xs text-light-muted dark:text-muted">Unique Customers</p>
            </div>
          </div>
        )}

        {/* File Status */}
        {batch.files && batch.files.length > 0 && (
          <div>
            <h3 className="font-medium text-light-text dark:text-text mb-3">File Status</h3>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {batch.files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-light-border dark:bg-border rounded-lg"
                >
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <DocumentTextIcon className="w-5 h-5 text-light-muted dark:text-muted flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-light-text dark:text-text truncate">
                        {file.originalName}
                      </p>
                      {file.error && (
                        <p className="text-xs text-red-600 dark:text-red-400 truncate">
                          {file.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className={`flex items-center space-x-1 ${getStatusColor(file.status)}`}>
                    {getStatusIcon(file.status)}
                    <span className="text-xs font-medium capitalize">{file.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Processing Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-light-muted dark:text-muted">Started:</span>
            <p className="font-medium text-light-text dark:text-text">
              {batch.startedAt ? new Date(batch.startedAt).toLocaleString() : 'Not started'}
            </p>
          </div>
          
          <div>
            <span className="text-light-muted dark:text-muted">Duration:</span>
            <p className="font-medium text-light-text dark:text-text">
              {formatDuration(batch.processingDuration)}
            </p>
          </div>
          
          <div>
            <span className="text-light-muted dark:text-muted">Success Rate:</span>
            <p className="font-medium text-light-text dark:text-text">
              {batch.successRate || 0}%
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 bg-light-border dark:bg-border border-t border-light-border dark:border-border">
        <div className="flex flex-wrap gap-3">
          {batch.status === 'processing' && (
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
            >
              Cancel Processing
            </button>
          )}
          
          {batch.status === 'completed' && (
            <>
              <button
                onClick={viewOrders}
                className="flex items-center space-x-2 px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>View Orders</span>
              </button>
              
              <button
                onClick={downloadSummary}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download Summary</span>
              </button>
            </>
          )}
          
          {(batch.status === 'failed' || batch.failedFiles?.length > 0) && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white rounded-lg text-sm"
            >
              <ArrowPathIcon className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? 'Retrying...' : 'Retry Failed'}</span>
            </button>
          )}
          
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default BatchStatus;
