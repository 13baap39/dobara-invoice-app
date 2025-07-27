import React, { useState, useRef } from 'react';
import api from '../api';
import { motion } from 'framer-motion';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { ArrowUpTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

export default function Upload() {
  const [files, setFiles] = useState([]);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
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
    const formData = new FormData();
    files.forEach(file => formData.append('bills', file));
    try {
      const res = await api.post('/upload-bills', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setResult(res.data);
    } catch (err) {
      setResult({ error: err.message });
    }
    setUploading(false);
    setLoading(false);
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
        <h1 className="text-xl font-light text-gray-100">Upload</h1>
        <span className="text-muted text-sm">Upload Meesho Bills (PDF)</span>
      </div>
      <div
        className={`bg-card bg-card-gradient border-2 border-dashed border-border rounded-xl shadow-card p-10 flex flex-col items-center justify-center cursor-pointer min-h-[200px] transition-all duration-200 ${uploading ? 'opacity-60 pointer-events-none' : 'hover:border-accent/60'}`}
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
        <div className="text-muted font-medium mb-2 text-lg">Drag & drop PDF files here, or click to select</div>
        {files.length > 0 && (
          <ul className="mb-2 text-sm text-muted w-full max-w-xs">
            {files.map((file, idx) => (
              <li key={idx} className="truncate flex items-center gap-2"><DocumentArrowUpIcon className="w-4 h-4 text-accent" />{file.name}</li>
            ))}
          </ul>
        )}
        <button
          onClick={handleUpload}
          disabled={uploading || files.length === 0}
          className={`mt-2 px-6 py-2 rounded-lg text-white font-medium transition-all duration-200 ${uploading || files.length === 0 ? 'bg-muted' : 'bg-accent hover:bg-accent/80'}`}
        >
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        {files.length > 0 && !uploading && (
          <button
            onClick={clearFiles}
            className="mt-2 px-3 py-1 rounded bg-muted text-gray-700 hover:bg-gray-600 text-xs"
          >
            Clear
          </button>
        )}
        {uploading && <LoadingSkeleton className="w-full h-2 mt-4 rounded" />}
      </div>
      {loading && uploading && <LoadingSkeleton className="h-32 w-full rounded-xl" />}
      {result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="bg-card bg-card-gradient border border-border rounded-xl shadow-card p-6">
          {result.error ? (
            <div className="text-red-500">Error: {result.error}</div>
          ) : (
            <div>
              <div className="font-semibold text-accent mb-2">Upload Result</div>
              <div className="mb-1">Uploaded: <span className="font-bold text-green-400">{result.uploaded}</span></div>
              <div>Skipped (duplicates): <span className="font-bold text-yellow-400">{result.skipped}</span></div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
