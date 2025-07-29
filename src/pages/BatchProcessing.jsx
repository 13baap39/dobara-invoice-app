/**
 * Simple Batch Processing Page (Without external dependencies)
 * Basic interface for batch upload demonstration
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useParams } from 'react-router-dom';
// import { toast } from 'react-hot-toast';
import {
  QueueListIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
// import BatchUpload from '../components/BatchUpload.jsx';
// import BatchStatus from '../components/BatchStatus.jsx';
import { useAuth } from '../context/AuthContext.jsx';
// import { useSocket } from '../hooks/useSocket.js';
import api from '../api.js';

// Simple file upload component without react-dropzone
const SimpleBatchUpload = ({ onUpload, uploading = false }) => {
  const [files, setFiles] = useState([]);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const newFiles = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      status: 'ready'
    }));
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleUpload = () => {
    if (files.length === 0) return;
    
    const formData = new FormData();
    files.forEach(({ file }) => {
      formData.append('invoices', file);
    });

    onUpload(formData, files);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-dashed border-light-border dark:border-border rounded-xl p-8 text-center">
        <CloudArrowUpIcon className="w-16 h-16 mx-auto text-light-muted dark:text-muted mb-4" />
        <h3 className="text-lg font-medium text-light-text dark:text-text mb-2">
          Upload Multiple Invoices
        </h3>
        <p className="text-sm text-light-muted dark:text-muted mb-4">
          Select multiple PDF files to process
        </p>
        
        <input
          type="file"
          multiple
          accept=".pdf"
          onChange={handleFileChange}
          disabled={uploading}
          className="hidden"
          id="batch-upload"
        />
        <label
          htmlFor="batch-upload"
          className={`inline-block px-6 py-3 bg-accent hover:bg-accent/90 text-white rounded-lg cursor-pointer transition-colors ${
            uploading ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          {uploading ? 'Processing...' : 'Select PDF Files'}
        </label>
      </div>

      {files.length > 0 && (
        <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl">
          <div className="p-4 border-b border-light-border dark:border-border">
            <h3 className="font-medium text-light-text dark:text-text">
              Selected Files ({files.length})
            </h3>
          </div>
          
          <div className="max-h-64 overflow-y-auto">
            {files.map((fileItem) => (
              <div
                key={fileItem.id}
                className="p-4 border-b border-light-border dark:border-border last:border-b-0 flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <DocumentIcon className="w-8 h-8 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-light-text dark:text-text">
                      {fileItem.name}
                    </p>
                    <p className="text-xs text-light-muted dark:text-muted">
                      {formatFileSize(fileItem.size)}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => removeFile(fileItem.id)}
                  disabled={uploading}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded"
                >
                  <XMarkIcon className="w-4 h-4 text-red-500" />
                </button>
              </div>
            ))}
          </div>

          <div className="p-4">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full px-4 py-3 bg-accent hover:bg-accent/90 disabled:bg-light-muted disabled:dark:bg-muted text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? 'Processing Files...' : `Process ${files.length} File${files.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BatchProcessing = () => {
  const [view, setView] = useState('upload');
  const [currentBatch, setCurrentBatch] = useState(null);
  const [batchHistory, setBatchHistory] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { user } = useAuth();
  // const socket = useSocket();

  useEffect(() => {
    if (batchId) {
      setView('status');
      setCurrentBatch(batchId);
    } else {
      fetchBatchHistory();
    }
  }, [batchId]);

  // useEffect(() => {
  //   if (socket) {
  //     socket.on('batchUpdate', handleBatchUpdate);
  //     return () => {
  //       socket.off('batchUpdate', handleBatchUpdate);
  //     };
  //   }
  // }, [socket]);

  const fetchBatchHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/batch/batches?limit=20');
      if (response.data.success) {
        setBatchHistory(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch batch history:', error);
    } finally {
      setLoading(false);
    }
  };

  // const handleBatchUpdate = (update) => {
  //   setBatchHistory(prev => 
  //     prev.map(batch => 
  //       batch.batchId === update.batchId 
  //         ? { ...batch, ...update }
  //         : batch
  //     )
  //   );

  //   if (update.status === 'completed') {
  //     alert(`Batch processing completed! ${update.processedFiles}/${update.totalFiles} files processed.`);
  //   } else if (update.status === 'failed') {
  //     alert(`Batch processing failed. ${update.failedFiles} files had errors.`);
  //   }
  // };

  const handleUpload = async (formData, files) => {
    try {
      setUploading(true);
      
      const response = await api.post('/api/batch/batch', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const batchId = response.data.data.batchId;
        alert(`Batch upload started! Processing ${files.length} files.`);
        
        navigate(`/batch/${batchId}`);
        setCurrentBatch(batchId);
        setView('status');
      }
    } catch (error) {
      const message = error.response?.data?.error || 'Upload failed';
      alert('Error: ' + message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'processing':
        return <ArrowPathIcon className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700';
      case 'failed':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700';
      case 'processing':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700';
      default:
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700';
    }
  };

  return (
    <div className="min-h-screen bg-light dark:bg-dark px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-light-text dark:text-white mb-2">
            Batch Processing
          </h1>
          <p className="text-light-muted dark:text-muted">
            Upload and process multiple invoice PDFs simultaneously
          </p>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <div className="flex space-x-1 bg-light-border dark:bg-border p-1 rounded-xl w-fit">
            <button
              onClick={() => {
                setView('upload');
                navigate('/batch');
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                view === 'upload'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-light-text dark:text-text hover:bg-light-card dark:hover:bg-card'
              }`}
            >
              Upload Files
            </button>
            
            {currentBatch && (
              <button
                onClick={() => setView('status')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  view === 'status'
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-light-text dark:text-text hover:bg-light-card dark:hover:bg-card'
                }`}
              >
                Current Status
              </button>
            )}
            
            <button
              onClick={() => {
                setView('history');
                if (!batchHistory.length) fetchBatchHistory();
              }}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                view === 'history'
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-light-text dark:text-text hover:bg-light-card dark:hover:bg-card'
              }`}
            >
              History
            </button>
          </div>
        </motion.div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {view === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <SimpleBatchUpload onUpload={handleUpload} uploading={uploading} />
            </motion.div>
          )}

          {view === 'status' && currentBatch && (
            <motion.div
              key="status"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl p-6">
                <h2 className="text-xl font-semibold text-light-text dark:text-text mb-4">
                  Batch Status: {currentBatch}
                </h2>
                <p className="text-light-muted dark:text-muted">
                  Batch processing status will be displayed here with real-time updates.
                </p>
                <button
                  onClick={() => {
                    setView('upload');
                    navigate('/batch');
                  }}
                  className="mt-4 px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg"
                >
                  Back to Upload
                </button>
              </div>
            </motion.div>
          )}

          {view === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-light-text dark:text-white">
                  Batch History
                </h2>
                <button
                  onClick={fetchBatchHistory}
                  disabled={loading}
                  className="px-4 py-2 bg-accent hover:bg-accent/90 disabled:opacity-50 text-white rounded-lg text-sm"
                >
                  {loading ? 'Refreshing...' : 'Refresh'}
                </button>
              </div>

              {loading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-light-muted dark:text-muted">Loading batch history...</p>
                </div>
              ) : batchHistory.length === 0 ? (
                <div className="text-center py-12 bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl">
                  <QueueListIcon className="w-16 h-16 text-light-muted dark:text-muted mx-auto mb-4" />
                  <p className="text-light-text dark:text-text text-lg font-medium mb-2">
                    No batch history
                  </p>
                  <p className="text-light-muted dark:text-muted">
                    Upload your first batch to see processing history here
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {batchHistory.map((batch) => (
                    <motion.div
                      key={batch.batchId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          {getStatusIcon(batch.status)}
                          <div>
                            <h3 className="font-medium text-light-text dark:text-text">
                              Batch {batch.batchId.substring(0, 8)}...
                            </h3>
                            <p className="text-sm text-light-muted dark:text-muted">
                              {new Date(batch.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <div className={`px-3 py-1 rounded-full border text-sm font-medium ${getStatusColor(batch.status)}`}>
                          {batch.status}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <p className="text-xs text-light-muted dark:text-muted">Total Files</p>
                          <p className="font-medium text-light-text dark:text-text">{batch.totalFiles}</p>
                        </div>
                        <div>
                          <p className="text-xs text-light-muted dark:text-muted">Processed</p>
                          <p className="font-medium text-light-text dark:text-text">{batch.processedFiles}</p>
                        </div>
                        <div>
                          <p className="text-xs text-light-muted dark:text-muted">Success Rate</p>
                          <p className="font-medium text-light-text dark:text-text">{batch.successRate || 0}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-light-muted dark:text-muted">Orders Created</p>
                          <p className="font-medium text-light-text dark:text-text">{batch.stats?.totalOrders || 0}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => {
                            setCurrentBatch(batch.batchId);
                            setView('status');
                            navigate(`/batch/${batch.batchId}`);
                          }}
                          className="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm"
                        >
                          View Details
                        </button>
                        
                        {batch.status === 'completed' && (
                          <button
                            onClick={() => navigate('/orders', { 
                              state: { 
                                batchFilter: batch.batchId,
                                showBatchOrders: true 
                              }
                            })}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm"
                          >
                            View Orders
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default BatchProcessing;
