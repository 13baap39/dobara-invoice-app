import React, { useState, useRef } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { 
  ArrowUpTrayIcon, 
  DocumentArrowUpIcon, 
  DocumentTextIcon,
  DocumentMagnifyingGlassIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processedOrders, setProcessedOrders] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef();

  function handleFiles(e) {
    setFiles(Array.from(e.target.files));
    setResult(null);
  }

  function handleDrop(e) {
    e.preventDefault();
    setFiles(Array.from(e.dataTransfer.files));
    setResult(null);
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  async function handleUpload(e) {
    e.stopPropagation(); // Prevent event bubbling to parent div
    if (files.length === 0) return;
    setUploading(true);
    setLoading(true);
    setUploadProgress(0);
    setProcessedOrders([]);
    
    // Process each file one by one with progress tracking
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append('invoice', file);
      
      try {
        // Use the new invoice upload endpoint with progress tracking
        const res = await api.post('/api/invoices/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              ((i + (progressEvent.loaded / progressEvent.total)) / files.length) * 100
            );
            setUploadProgress(percentCompleted);
          }
        });
        
        // Add processed orders to state
        if (res.data.orders) {
          setProcessedOrders(prev => [...prev, ...res.data.orders]);
        }
        
        // Update result after each file
        setResult(prev => ({
          uploaded: (prev?.uploaded || 0) + res.data.uploaded,
          skipped: (prev?.skipped || 0) + res.data.skipped,
          fileUrl: res.data.fileUrl,
          thumbnailUrl: res.data.thumbnailUrl
        }));
      } catch (err) {
        setResult({ error: err.message });
        break;
      }
    }
    
    setUploading(false);
    setLoading(false);
  }
  
  function openPreview(url) {
    setPreviewUrl(url);
    setShowPreview(true);
  }
  
  function closePreview() {
    setShowPreview(false);
  }

  function clearFiles(e) {
    e.stopPropagation(); // Prevent event bubbling to parent div
    setFiles([]);
    setResult(null);
    fileInputRef.current.value = '';
  }

  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col gap-8 max-w-2xl mx-auto">
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-xl font-light text-light-text dark:text-gray-100">Upload</h1>
        <span className="text-light-muted dark:text-muted text-sm">Upload Meesho Bills (PDF)</span>
      </div>
      <div
        className={`bg-light-card dark:bg-card dark:bg-card-gradient border-2 border-dashed border-light-border dark:border-border rounded-xl shadow-card p-10 flex flex-col items-center justify-center cursor-pointer min-h-[200px] transition-all duration-200 ${uploading ? 'opacity-60 pointer-events-none' : 'hover:border-accent/60'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          type="file"
          multiple
          accept="application/pdf"
          onChange={handleFiles}
          ref={fileInputRef}
          className="hidden"
        />
        <ArrowUpTrayIcon className="w-12 h-12 text-accent mb-2" />
        <div className="text-light-muted dark:text-muted font-medium mb-2 text-lg">Drag & drop PDF files here, or click to select</div>
        {files.length > 0 && (
          <ul className="mb-2 text-sm text-light-muted dark:text-muted w-full max-w-xs">
            {files.map((file, idx) => (
              <li key={idx} className="truncate flex items-center gap-2"><DocumentArrowUpIcon className="w-4 h-4 text-accent" />{file.name}</li>
            ))}
          </ul>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className={`mt-2 px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${uploading || files.length === 0 ? 'bg-light-muted dark:bg-muted' : 'bg-accent hover:bg-accent/80'}`}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {files.length > 0 && !uploading && (
          <button
            onClick={clearFiles}
            className="mt-2 px-3 py-1 rounded bg-light-muted dark:bg-muted text-light-text dark:text-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-xs"
          >
            Clear
          </button>
        )}
        {uploading && (
          <div className="w-full mt-4">
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-light-muted dark:text-muted text-center mt-1">
              {uploadProgress}% Complete
            </div>
          </div>
        )}
      </div>
      
      {loading && uploading && <LoadingSkeleton className="h-32 w-full rounded-xl" />}
      
      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }} 
          className="bg-light-card dark:bg-card dark:bg-card-gradient border border-light-border dark:border-border rounded-xl shadow-card p-6"
        >
          {result.error ? (
            <div className="flex items-center gap-2 text-red-500">
              <XCircleIcon className="w-5 h-5" />
              Error: {result.error}
            </div>
          ) : (
            <div>
              <div className="font-semibold text-accent mb-4">Upload Result</div>
              <div className="flex items-center gap-2 mb-2 text-light-text dark:text-white">
                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                Uploaded: <span className="font-bold text-green-400">{result.uploaded}</span>
              </div>
              <div className="flex items-center gap-2 mb-4 text-light-text dark:text-white">
                <XCircleIcon className="w-5 h-5 text-yellow-400" />
                Skipped (duplicates): <span className="font-bold text-yellow-400">{result.skipped}</span>
              </div>
              
              {result.fileUrl && (
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => openPreview(result.fileUrl)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent/20 hover:bg-accent/30 text-accent rounded text-sm"
                  >
                    <DocumentMagnifyingGlassIcon className="w-4 h-4" />
                    View Invoice
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}
      
      {/* Processed Orders List */}
      {processedOrders.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }} 
          className="bg-light-card dark:bg-card dark:bg-card-gradient border border-light-border dark:border-border rounded-xl shadow-card p-6"
        >
          <div className="font-semibold text-accent mb-4">Processed Orders</div>
          <div className="space-y-4">
            {processedOrders.map((order, idx) => (
              <div key={idx} className="border-b border-light-border dark:border-border pb-4 last:border-0">
                <div className="font-medium text-light-text dark:text-white mb-1">
                  {order.customerName}
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-light-muted dark:text-muted">
                    Order: {order.orderNumber}
                  </div>
                  <div className="text-sm text-light-muted dark:text-muted">
                    Total: ₹{order.totalAmount}
                  </div>
                </div>
                <div className="text-xs text-light-muted dark:text-muted mt-1">
                  SKUs: {order.skus.length}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
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
    </motion.div>
  );
}
