/**
 * Batch Processing Model
 * Schema for tracking batch invoice processing jobs
 */

import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema({
  batchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
    default: 'pending',
    index: true
  },
  totalFiles: {
    type: Number,
    required: true,
    min: 1
  },
  processedFiles: {
    type: Number,
    default: 0,
    min: 0
  },
  failedFiles: [{
    fileName: {
      type: String,
      required: true
    },
    error: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  processedOrderIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  }],
  // File metadata
  files: [{
    originalName: String,
    fileName: String,
    size: Number,
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    error: String,
    orderIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }],
    processedAt: Date
  }],
  // Processing statistics
  stats: {
    totalOrders: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      default: 0
    },
    totalSKUs: {
      type: Number,
      default: 0
    },
    uniqueCustomers: {
      type: Number,
      default: 0
    },
    processingTimeMs: {
      type: Number,
      default: 0
    }
  },
  // Queue information
  queueJobId: {
    type: String,
    index: true
  },
  priority: {
    type: Number,
    default: 0
  },
  // Timestamps
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for completion percentage
batchSchema.virtual('completionPercentage').get(function() {
  if (this.totalFiles === 0) return 0;
  return Math.round((this.processedFiles / this.totalFiles) * 100);
});

// Virtual for processing duration
batchSchema.virtual('processingDuration').get(function() {
  if (!this.startedAt) return 0;
  const endTime = this.completedAt || new Date();
  return endTime.getTime() - this.startedAt.getTime();
});

// Virtual for success rate
batchSchema.virtual('successRate').get(function() {
  if (this.totalFiles === 0) return 0;
  const successfulFiles = this.totalFiles - this.failedFiles.length;
  return Math.round((successfulFiles / this.totalFiles) * 100);
});

// Index for efficient queries
batchSchema.index({ userId: 1, createdAt: -1 });
batchSchema.index({ status: 1, createdAt: -1 });
batchSchema.index({ batchId: 1, userId: 1 });

// Instance methods
batchSchema.methods.updateProgress = function(fileUpdate) {
  const file = this.files.find(f => f.fileName === fileUpdate.fileName);
  if (file) {
    file.status = fileUpdate.status;
    file.error = fileUpdate.error;
    file.orderIds = fileUpdate.orderIds || [];
    file.processedAt = fileUpdate.status === 'completed' ? new Date() : file.processedAt;
  }

  // Update counters
  this.processedFiles = this.files.filter(f => 
    f.status === 'completed' || f.status === 'failed'
  ).length;

  // Update failed files array
  this.failedFiles = this.files
    .filter(f => f.status === 'failed')
    .map(f => ({
      fileName: f.originalName,
      error: f.error,
      timestamp: f.processedAt || new Date()
    }));

  // Update processed order IDs
  this.processedOrderIds = this.files
    .filter(f => f.status === 'completed')
    .flatMap(f => f.orderIds);

  // Update batch status
  if (this.processedFiles === this.totalFiles) {
    this.status = this.failedFiles.length === this.totalFiles ? 'failed' : 'completed';
    this.completedAt = new Date();
  } else if (this.processedFiles > 0 && this.status === 'pending') {
    this.status = 'processing';
    this.startedAt = this.startedAt || new Date();
  }

  return this.save();
};

batchSchema.methods.calculateStats = function(orders) {
  const stats = {
    totalOrders: orders.length,
    totalAmount: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
    totalSKUs: orders.reduce((sum, order) => sum + (order.skus?.length || 0), 0),
    uniqueCustomers: new Set(orders.map(order => order.customerName)).size,
    processingTimeMs: this.processingDuration
  };

  this.stats = stats;
  return this.save();
};

// Static methods
batchSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }

  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50)
    .populate('processedOrderIds', 'orderNumber customerName totalAmount');
};

batchSchema.statics.getRecentBatches = function(userId, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  return this.find({
    userId,
    createdAt: { $gte: since }
  }).sort({ createdAt: -1 });
};

export default mongoose.model('Batch', batchSchema);
