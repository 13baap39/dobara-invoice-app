/**
 * Batch Processing Routes
 * Handles multiple PDF uploads and batch processing
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import authMiddleware from '../middleware/authMiddleware.js';
import Batch from '../models/Batch.js';
import Order from '../models/Order.js';

const router = express.Router();

// Configure multer for multiple file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'batch-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 50 // Maximum 50 files per batch
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

/**
 * @route POST /api/invoices/batch
 * @description Upload and process multiple PDF invoices
 * @access Private
 */
router.post('/batch', authMiddleware, upload.array('invoices', 50), async (req, res) => {
  try {
    const files = req.files;
    const { priority = 0 } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    console.log(`📦 Batch upload request: ${files.length} files from user ${req.user.id}`);

    // Get batch processor instance from app
    const batchProcessor = req.app.get('batchProcessor');
    
    if (!batchProcessor) {
      return res.status(500).json({
        success: false,
        error: 'Batch processing service not available'
      });
    }

    // Create batch job
    const batch = await batchProcessor.addBatchJob(
      { priority: parseInt(priority) },
      files,
      req.user.id
    );

    res.status(202).json({
      success: true,
      message: 'Batch processing started',
      data: {
        batchId: batch.batchId,
        totalFiles: batch.totalFiles,
        status: batch.status,
        estimatedTime: batch.totalFiles * 10 // Rough estimate: 10 seconds per file
      }
    });

  } catch (error) {
    console.error('❌ Batch upload error:', error);
    
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (cleanupError) {
          console.warn('⚠️ Could not clean up file:', file.path);
        }
      });
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/invoices/batch/:batchId
 * @description Get batch processing status
 * @access Private
 */
router.get('/batch/:batchId', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    const batchProcessor = req.app.get('batchProcessor');

    const batch = await batchProcessor.getBatchStatus(batchId, req.user.id);

    res.json({
      success: true,
      data: batch
    });

  } catch (error) {
    console.error('❌ Get batch status error:', error);
    res.status(404).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/batch/batches
 * @description Get user's batch history
 * @access Private
 */
router.get('/batches', authMiddleware, async (req, res) => {
  try {
    const { 
      status, 
      limit = 20, 
      page = 1,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const batchProcessor = req.app.get('batchProcessor');
    
    const options = {
      status,
      limit: parseInt(limit),
      page: parseInt(page)
    };

    const batches = await batchProcessor.getUserBatches(req.user.id, options);

    // Get total count for pagination
    const totalQuery = { userId: req.user.id };
    if (status) totalQuery.status = status;
    const total = await Batch.countDocuments(totalQuery);

    res.json({
      success: true,
      data: batches,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (error) {
    console.error('❌ Get batches error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/invoices/batch/:batchId/cancel
 * @description Cancel a batch processing job
 * @access Private
 */
router.post('/batch/:batchId/cancel', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    const batchProcessor = req.app.get('batchProcessor');

    const batch = await batchProcessor.cancelBatch(batchId, req.user.id);

    res.json({
      success: true,
      message: 'Batch cancelled successfully',
      data: batch
    });

  } catch (error) {
    console.error('❌ Cancel batch error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route POST /api/invoices/batch/:batchId/retry
 * @description Retry failed files in a batch
 * @access Private
 */
router.post('/batch/:batchId/retry', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    const batchProcessor = req.app.get('batchProcessor');

    const retryBatch = await batchProcessor.retryFailedFiles(batchId, req.user.id);

    res.json({
      success: true,
      message: 'Retry batch created successfully',
      data: retryBatch
    });

  } catch (error) {
    console.error('❌ Retry batch error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/invoices/batch/:batchId/summary
 * @description Get batch processing summary and statistics
 * @access Private
 */
router.get('/batch/:batchId/summary', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    
    const batch = await Batch.findOne({ batchId, userId: req.user.id })
      .populate('processedOrderIds');

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    // Calculate additional statistics
    const orders = batch.processedOrderIds;
    const customerStats = {};
    const cityStats = {};
    const dailyStats = {};

    orders.forEach(order => {
      // Customer statistics
      if (order.customerName) {
        customerStats[order.customerName] = (customerStats[order.customerName] || 0) + 1;
      }

      // City statistics
      if (order.customerCity) {
        cityStats[order.customerCity] = (cityStats[order.customerCity] || 0) + 1;
      }

      // Daily statistics
      if (order.orderDate) {
        const date = order.orderDate.toISOString().split('T')[0];
        if (!dailyStats[date]) {
          dailyStats[date] = { orders: 0, amount: 0 };
        }
        dailyStats[date].orders++;
        dailyStats[date].amount += order.totalAmount || 0;
      }
    });

    const summary = {
      batch: {
        batchId: batch.batchId,
        status: batch.status,
        totalFiles: batch.totalFiles,
        processedFiles: batch.processedFiles,
        failedFiles: batch.failedFiles.length,
        completionPercentage: batch.completionPercentage,
        successRate: batch.successRate,
        processingDuration: batch.processingDuration,
        createdAt: batch.createdAt,
        completedAt: batch.completedAt
      },
      statistics: batch.stats,
      breakdown: {
        topCustomers: Object.entries(customerStats)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, orderCount: count })),
        
        cityDistribution: Object.entries(cityStats)
          .sort(([,a], [,b]) => b - a)
          .map(([city, count]) => ({ city, orderCount: count })),
        
        dailyBreakdown: Object.entries(dailyStats)
          .sort(([a], [b]) => new Date(a) - new Date(b))
          .map(([date, data]) => ({ date, ...data }))
      },
      files: batch.files.map(file => ({
        originalName: file.originalName,
        status: file.status,
        error: file.error,
        orderCount: file.orderIds?.length || 0,
        processedAt: file.processedAt
      }))
    };

    res.json({
      success: true,
      data: summary
    });

  } catch (error) {
    console.error('❌ Get batch summary error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * @route GET /api/invoices/batch/:batchId/export
 * @description Export batch summary as CSV
 * @access Private
 */
router.get('/batch/:batchId/export', authMiddleware, async (req, res) => {
  try {
    const { batchId } = req.params;
    const { format = 'csv' } = req.query;
    
    const batch = await Batch.findOne({ batchId, userId: req.user.id })
      .populate('processedOrderIds');

    if (!batch) {
      return res.status(404).json({
        success: false,
        error: 'Batch not found'
      });
    }

    if (format === 'csv') {
      // Generate CSV for batch orders
      const orders = batch.processedOrderIds;
      const csvHeaders = [
        'Order Number',
        'Customer Name',
        'Customer City',
        'Order Date',
        'Total Amount',
        'SKU Count',
        'File Name'
      ];

      const csvRows = orders.map(order => {
        const fileInfo = batch.files.find(f => 
          f.orderIds?.some(id => id.toString() === order._id.toString())
        );
        
        return [
          order.orderNumber || '',
          order.customerName || '',
          order.customerCity || '',
          order.orderDate ? order.orderDate.toISOString().split('T')[0] : '',
          order.totalAmount || 0,
          order.skus?.length || 0,
          fileInfo?.originalName || ''
        ];
      });

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="batch-${batchId}-orders.csv"`);
      res.send(csvContent);
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported export format'
      });
    }

  } catch (error) {
    console.error('❌ Export batch error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
