import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowUpTrayIcon, 
  DocumentArrowUpIcon, 
  SparklesIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon 
} from '@heroicons/react/24/outline';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function LeafletMaker() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState('leaflet');
  const fileInputRef = useRef();

  function handleFile(e) {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'application/pdf') {
      setFile(selectedFile);
      setResult(null);
    } else {
      alert('Please select a PDF file');
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setResult(null);
    } else {
      alert('Please drop a PDF file');
    }
  }

  function handleDragOver(e) {
    e.preventDefault();
  }

  async function handleGenerate(type) {
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('pdfFile', file);

    try {
      const endpoint = type === 'hybrid' ? '/api/leaflets/generate-hybrid' : '/api/leaflets/generate-leaflets';
      const response = await fetch(`http://localhost:5002${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        setResult({
          success: true,
          ...data
        });
      } else {
        setResult({
          success: false,
          error: data.error || 'Generation failed'
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error: ' + error.message
      });
    } finally {
      setLoading(false);
    }
  }

  function clearFile() {
    setFile(null);
    setResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  function downloadFile(downloadUrl) {
    const link = document.createElement('a');
    link.href = `http://localhost:5002${downloadUrl}`;
    link.download = '';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 24 }} 
      animate={{ opacity: 1, y: 0 }} 
      transition={{ duration: 0.5 }} 
      className="flex flex-col gap-8 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col gap-1 mb-2">
        <h1 className="text-xl font-light text-gray-100 flex items-center gap-2">
          <SparklesIcon className="w-6 h-6 text-accent" />
          Leaflet Maker
        </h1>
        <span className="text-muted text-sm">
          Generate personalized thank-you leaflets from Meesho order PDFs
        </span>
      </div>

      {/* Tab Buttons */}
      <div className="flex bg-card border border-border rounded-xl p-1">
        <button
          onClick={() => setActiveTab('leaflet')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'leaflet' 
              ? 'bg-accent text-white shadow-md' 
              : 'text-muted hover:text-gray-300'
          }`}
        >
          <DocumentTextIcon className="w-5 h-5" />
          Leaflet Generator
        </button>
        <button
          onClick={() => setActiveTab('hybrid')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
            activeTab === 'hybrid' 
              ? 'bg-accent text-white shadow-md' 
              : 'text-muted hover:text-gray-300'
          }`}
        >
          <SparklesIcon className="w-5 h-5" />
          Hybrid Bill
        </button>
      </div>

      {/* Upload Area */}
      <div
        className={`bg-card bg-card-gradient border-2 border-dashed border-border rounded-xl shadow-card p-10 flex flex-col items-center justify-center cursor-pointer min-h-[200px] transition-all duration-200 ${
          loading ? 'opacity-60 pointer-events-none' : 'hover:border-accent/60'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current.click()}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFile}
          ref={fileInputRef}
          className="hidden"
        />
        
        <ArrowUpTrayIcon className="w-12 h-12 text-accent mb-4" />
        
        <div className="text-center">
          <div className="text-muted font-medium mb-2 text-lg">
            {activeTab === 'leaflet' 
              ? 'Upload Meesho Order Label (PDF)' 
              : 'Upload Meesho Bill (PDF) for Hybrid Generation'
            }
          </div>
          <div className="text-sm text-muted/70">
            Drag & drop your PDF here, or click to select
          </div>
        </div>
        
        {file && (
          <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
            <div className="flex items-center gap-2 text-accent">
              <DocumentArrowUpIcon className="w-5 h-5" />
              <span className="font-medium">{file.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {file && (
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => handleGenerate(activeTab)}
            disabled={loading}
            className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 ${
              loading 
                ? 'bg-muted text-gray-600 cursor-not-allowed' 
                : 'bg-accent hover:bg-accent/80 text-white shadow-lg hover:shadow-xl'
            }`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                {activeTab === 'leaflet' ? 'Generate Leaflets' : 'Generate Hybrid Bill'}
              </>
            )}
          </button>
          
          {!loading && (
            <button
              onClick={clearFile}
              className="px-4 py-3 rounded-xl bg-muted text-gray-700 hover:bg-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && <LoadingSkeleton className="h-32 w-full rounded-xl" />}

      {/* Results */}
      {result && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.4 }} 
          className="bg-card bg-card-gradient border border-border rounded-xl shadow-card p-6"
        >
          {result.success ? (
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 text-green-400 mb-4">
                <SparklesIcon className="w-6 h-6" />
                <div className="font-semibold text-lg">
                  {activeTab === 'leaflet' ? 'Leaflets Ready!' : 'Hybrid Bill Ready!'}
                </div>
              </div>
              
              <div className="text-muted mb-4">
                Generated {activeTab === 'leaflet' ? 'leaflets' : 'hybrid bill'} for{' '}
                <span className="font-bold text-accent">{result.customerNames?.length || 0}</span> customers
              </div>
              
              {result.customerNames && result.customerNames.length > 0 && (
                <div className="mb-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                  <div className="text-sm font-medium text-accent mb-2">Customer Names Found:</div>
                  <div className="text-xs text-muted flex flex-wrap gap-2">
                    {result.customerNames.map((name, idx) => (
                      <span key={idx} className="bg-accent/20 px-2 py-1 rounded">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              <button
                onClick={() => downloadFile(result.downloadUrl)}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 mx-auto"
              >
                <ArrowDownTrayIcon className="w-5 h-5" />
                Download PDF
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-red-500 font-semibold mb-2">Error</div>
              <div className="text-muted">{result.error}</div>
            </div>
          )}
        </motion.div>
      )}

      {/* Feature Description */}
      <div className="bg-card bg-card-gradient border border-border rounded-xl shadow-card p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4 flex items-center gap-2">
          <SparklesIcon className="w-5 h-5 text-accent" />
          Features
        </h3>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="font-medium text-accent">📄 Leaflet Generator</div>
            <div className="text-sm text-muted leading-relaxed">
              Upload your Meesho Order Label PDF and automatically generate personalized 
              "Thank You" leaflets for each customer. Perfect for including in your packages 
              to build customer relationships and encourage reviews.
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="font-medium text-accent">✨ Hybrid Bill</div>
            <div className="text-sm text-muted leading-relaxed">
              Advanced feature that combines shipping labels with personalized leaflets 
              on one convenient sheet. Each page contains cropped shipping labels and 
              corresponding thank-you messages.
            </div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-lg">
          <div className="font-medium text-accent mb-2">📝 Leaflet Message Preview</div>
          <div className="text-xs text-muted leading-relaxed">
            Each leaflet includes: Personal greeting, thank you message, 5-star review request, 
            WhatsApp contact (+91 7860861434), and warm regards from "Team Mary Creations."
          </div>
        </div>
      </div>
    </motion.div>
  );
}
