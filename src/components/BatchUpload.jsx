/**
 * Batch Upload Component
 * Drag-and-drop interface for multiple PDF uploads
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

const BatchUpload = ({ onUpload, uploading = false }) => {
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle accepted files
    const newFiles = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      status: 'ready'
    }));

    setFiles(prev => [...prev, ...newFiles]);

    // Handle rejected files
    const newErrors = rejectedFiles.map(rejection => ({
      id: Math.random().toString(36).substr(2, 9),
      fileName: rejection.file.name,
      errors: rejection.errors.map(e => e.message)
    }));

    setErrors(prev => [...prev, ...newErrors]);

    // Clear errors after 5 seconds
    if (newErrors.length > 0) {
      setTimeout(() => {
        setErrors(prev => prev.filter(error => 
          !newErrors.some(newError => newError.id === error.id)
        ));
      }, 5000);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 50,
    maxSize: 10 * 1024 * 1024, // 10MB
    disabled: uploading
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const clearAll = () => {
    setFiles([]);
    setErrors([]);
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
      {/* Error Messages */}
      <AnimatePresence>
        {errors.map(error => (
          <motion.div
            key={error.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-4"
          >
            <div className="flex items-start">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  {error.fileName}
                </p>
                <ul className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {error.errors.map((err, index) => (
                    <li key={index}>• {err}</li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Dropzone */}
      <motion.div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer
          ${isDragActive 
            ? 'border-accent bg-accent/5 scale-[1.02]' 
            : 'border-light-border dark:border-border hover:border-accent/50 hover:bg-accent/5'
          }
          ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        whileHover={!uploading ? { scale: 1.01 } : {}}
        whileTap={!uploading ? { scale: 0.99 } : {}}
      >
        <input {...getInputProps()} disabled={uploading} />
        
        <div className="space-y-4">
          <motion.div
            animate={isDragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <CloudArrowUpIcon className="w-16 h-16 mx-auto text-light-muted dark:text-muted" />
          </motion.div>
          
          <div>
            <p className="text-lg font-medium text-light-text dark:text-text mb-2">
              {isDragActive ? 'Drop files here' : 'Upload Multiple Invoices'}
            </p>
            <p className="text-sm text-light-muted dark:text-muted">
              Drag and drop PDF files here, or click to browse
            </p>
            <p className="text-xs text-light-muted dark:text-muted mt-2">
              Maximum 50 files • 10MB per file • PDF format only
            </p>
          </div>
        </div>

        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-dark/80 rounded-xl flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-light-text dark:text-text">Processing files...</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* File List */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-light-card dark:bg-card border border-light-border dark:border-border rounded-xl"
        >
          <div className="p-4 border-b border-light-border dark:border-border flex items-center justify-between">
            <h3 className="font-medium text-light-text dark:text-text">
              Selected Files ({files.length})
            </h3>
            <button
              onClick={clearAll}
              disabled={uploading}
              className="text-sm text-light-muted dark:text-muted hover:text-red-500 disabled:opacity-50"
            >
              Clear All
            </button>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <AnimatePresence>
              {files.map((fileItem) => (
                <motion.div
                  key={fileItem.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 border-b border-light-border dark:border-border last:border-b-0 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <DocumentIcon className="w-8 h-8 text-red-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-light-text dark:text-text truncate">
                        {fileItem.name}
                      </p>
                      <p className="text-xs text-light-muted dark:text-muted">
                        {formatFileSize(fileItem.size)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {fileItem.status === 'ready' && (
                      <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    )}
                    
                    <button
                      onClick={() => removeFile(fileItem.id)}
                      disabled={uploading}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded disabled:opacity-50"
                    >
                      <XMarkIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Upload Button */}
          <div className="p-4 bg-light-border dark:bg-border rounded-b-xl">
            <button
              onClick={handleUpload}
              disabled={files.length === 0 || uploading}
              className="w-full px-4 py-3 bg-accent hover:bg-accent/90 disabled:bg-light-muted disabled:dark:bg-muted text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Processing Files...</span>
                </div>
              ) : (
                `Process ${files.length} File${files.length === 1 ? '' : 's'}`
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BatchUpload;
