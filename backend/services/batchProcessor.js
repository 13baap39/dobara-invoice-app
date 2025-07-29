/**
 * Job Queue Service for Batch Processing
 * Handles PDF processing jobs using Bull queue with Redis
 */

import Bull from 'bull';
import { v4 as uuidv4 } from 'uuid';
import { parsePdfBill } from '../billParser.js';
import { uploadFileToStorage } from '../services/fileStorage.js';
import Order from '../models/Order.js';
import Batch from '../models/Batch.js';
import fs from 'fs/promises';
import path from 'path';

// Create job queue
const pdfProcessingQueue = new Bull('pdf processing', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  defaultJobOptions: {
    removeOnComplete: 100,  // Keep last 100 completed jobs
    removeOnFail: 50,       // Keep last 50 failed jobs
    attempts: 3,            // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
});

/**
 * Process a batch of PDF files
 */
class BatchProcessor {
  constructor(io) {
    this.io = io; // Socket.io instance for real-time updates
    this.setupQueueEvents();
  }

  /**
   * Add a new batch job to the queue
   */
  async addBatchJob(batchData, files, userId) {
    try {
      const batchId = uuidv4();
      
      // Create batch record in database
      const batch = new Batch({
        batchId,
        userId,
        totalFiles: files.length,
        files: files.map(file => ({
          originalName: file.originalname,
          fileName: file.filename,
          size: file.size,
          status: 'pending'
        })),
        status: 'pending'
      });

      await batch.save();

      // Add job to queue
      const job = await pdfProcessingQueue.add('processBatch', {
        batchId,
        userId,
        files: files.map(file => ({
          originalName: file.originalname,
          fileName: file.filename,
          filePath: file.path,
          size: file.size
        }))
      }, {
        priority: batchData.priority || 0,
        jobId: batchId
      });

      // Update batch with queue job ID
      batch.queueJobId = job.id;
      await batch.save();

      console.log(`📦 Batch job created: ${batchId} with ${files.length} files`);
      
      // Emit real-time update
      this.emitBatchUpdate(userId, batch);

      return batch;
    } catch (error) {
      console.error('❌ Error creating batch job:', error);
      throw error;
    }
  }

  /**
   * Get batch status
   */
  async getBatchStatus(batchId, userId) {
    try {
      const batch = await Batch.findOne({ batchId, userId })
        .populate('processedOrderIds', 'orderNumber customerName totalAmount orderDate');
      
      if (!batch) {
        throw new Error('Batch not found');
      }

      return batch;
    } catch (error) {
      console.error('❌ Error getting batch status:', error);
      throw error;
    }
  }

  /**
   * Cancel a batch job
   */
  async cancelBatch(batchId, userId) {
    try {
      const batch = await Batch.findOne({ batchId, userId });
      
      if (!batch) {
        throw new Error('Batch not found');
      }

      if (batch.status === 'completed') {
        throw new Error('Cannot cancel completed batch');
      }

      // Cancel queue job
      if (batch.queueJobId) {
        const job = await pdfProcessingQueue.getJob(batch.queueJobId);
        if (job) {
          await job.discard();
        }
      }

      // Update batch status
      batch.status = 'cancelled';
      await batch.save();

      console.log(`🚫 Batch cancelled: ${batchId}`);
      
      // Emit real-time update
      this.emitBatchUpdate(userId, batch);

      return batch;
    } catch (error) {
      console.error('❌ Error cancelling batch:', error);
      throw error;
    }
  }

  /**
   * Retry failed files in a batch
   */
  async retryFailedFiles(batchId, userId) {
    try {
      const batch = await Batch.findOne({ batchId, userId });
      
      if (!batch) {
        throw new Error('Batch not found');
      }

      const failedFiles = batch.files.filter(f => f.status === 'failed');
      
      if (failedFiles.length === 0) {
        throw new Error('No failed files to retry');
      }

      // Create new batch for retry
      const retryBatchId = uuidv4();
      const retryBatch = new Batch({
        batchId: retryBatchId,
        userId,
        totalFiles: failedFiles.length,
        files: failedFiles.map(file => ({
          originalName: file.originalName,
          fileName: file.fileName,
          size: file.size,
          status: 'pending'
        })),
        status: 'pending'
      });

      await retryBatch.save();

      // Add retry job to queue
      const job = await pdfProcessingQueue.add('processBatch', {
        batchId: retryBatchId,
        userId,
        files: failedFiles.map(file => ({
          originalName: file.originalName,
          fileName: file.fileName,
          filePath: path.join('uploads', file.fileName),
          size: file.size
        })),
        isRetry: true,
        originalBatchId: batchId
      }, {
        priority: 10, // Higher priority for retries
        jobId: retryBatchId
      });

      retryBatch.queueJobId = job.id;
      await retryBatch.save();

      console.log(`🔄 Retry batch created: ${retryBatchId} for ${failedFiles.length} failed files`);
      
      // Emit real-time update
      this.emitBatchUpdate(userId, retryBatch);

      return retryBatch;
    } catch (error) {
      console.error('❌ Error retrying batch:', error);
      throw error;
    }
  }

  /**
   * Get user's batch history
   */
  async getUserBatches(userId, options = {}) {
    try {
      return await Batch.findByUser(userId, options);
    } catch (error) {
      console.error('❌ Error getting user batches:', error);
      throw error;
    }
  }

  /**
   * Set up queue event listeners
   */
  setupQueueEvents() {
    // Job progress updates
    pdfProcessingQueue.on('progress', (job, progress) => {
      console.log(`📊 Job ${job.id} progress: ${progress}%`);
    });

    // Job completed
    pdfProcessingQueue.on('completed', (job, result) => {
      console.log(`✅ Job ${job.id} completed: ${result.processedFiles}/${result.totalFiles} files`);
    });

    // Job failed
    pdfProcessingQueue.on('failed', (job, err) => {
      console.log(`❌ Job ${job.id} failed: ${err.message}`);
    });

    // Job stalled
    pdfProcessingQueue.on('stalled', (job) => {
      console.log(`⏰ Job ${job.id} stalled`);
    });
  }

  /**
   * Emit real-time batch updates via Socket.io
   */
  emitBatchUpdate(userId, batch) {
    if (this.io) {
      this.io.to(`user_${userId}`).emit('batchUpdate', {
        batchId: batch.batchId,
        status: batch.status,
        completionPercentage: batch.completionPercentage,
        processedFiles: batch.processedFiles,
        totalFiles: batch.totalFiles,
        failedFiles: batch.failedFiles.length,
        stats: batch.stats
      });
    }
  }
}

/**
 * Queue worker process - handles individual batch jobs
 */
pdfProcessingQueue.process('processBatch', async (job) => {
  const { batchId, userId, files } = job.data;
  
  console.log(`🔄 Processing batch: ${batchId} with ${files.length} files`);
  
  try {
    const batch = await Batch.findOne({ batchId });
    if (!batch) {
      throw new Error('Batch not found');
    }

    // Update batch status to processing
    batch.status = 'processing';
    batch.startedAt = new Date();
    await batch.save();

    const allOrders = [];
    let processedCount = 0;

    // Process each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileProgress = Math.round(((i + 1) / files.length) * 100);
      
      try {
        console.log(`📄 Processing file ${i + 1}/${files.length}: ${file.originalName}`);
        
        // Update job progress
        job.progress(fileProgress);

        // Check if file exists
        try {
          await fs.access(file.filePath);
        } catch (error) {
          throw new Error(`File not found: ${file.filePath}`);
        }

        // Read the file content first
        const fileContent = await fs.readFile(file.filePath);
        
        // Parse PDF with the file content buffer
        const orders = await parsePdfBill(fileContent);
        
        // Ensure we have valid results
        if (!orders || !Array.isArray(orders)) {
          throw new Error('PDF parsing failed: Invalid result format');
        }
        
        // Create a compatible parseResult object for the rest of the code
        const parseResult = { orders };

        // Upload file to storage
        let invoiceImageUrl = null;
        let invoiceThumbnailUrl = null;
        
        try {
          const uploadResult = await uploadFileToStorage(file.filePath, file.originalName);
          invoiceImageUrl = uploadResult.url;
          invoiceThumbnailUrl = uploadResult.thumbnailUrl;
        } catch (uploadError) {
          console.warn(`⚠️ File upload failed for ${file.originalName}:`, uploadError.message);
        }

        // Save orders to database
        const ordersToSave = parseResult.orders.map(order => ({
          ...order,
          userId,
          invoiceImageUrl,
          invoiceThumbnailUrl,
          batchId
        }));

        const savedOrders = await Order.insertMany(ordersToSave);
        allOrders.push(...savedOrders);

        // Update batch progress
        await batch.updateProgress({
          fileName: file.fileName,
          status: 'completed',
          orderIds: savedOrders.map(o => o._id)
        });

        processedCount++;
        console.log(`✅ File processed: ${file.originalName} - ${savedOrders.length} orders created`);

      } catch (fileError) {
        console.error(`❌ Error processing file ${file.originalName}:`, fileError.message);
        
        // Update batch with file error
        await batch.updateProgress({
          fileName: file.fileName,
          status: 'failed',
          error: fileError.message
        });
      }

      // Clean up temporary file
      try {
        await fs.unlink(file.filePath);
      } catch (cleanupError) {
        console.warn(`⚠️ Could not clean up file ${file.filePath}:`, cleanupError.message);
      }
    }

    // Calculate final statistics
    await batch.calculateStats(allOrders);

    console.log(`🎉 Batch processing completed: ${batchId} - ${processedCount}/${files.length} files successful`);

    return {
      batchId,
      processedFiles: processedCount,
      totalFiles: files.length,
      totalOrders: allOrders.length,
      success: true
    };

  } catch (error) {
    console.error(`❌ Batch processing failed: ${batchId}`, error);
    
    // Update batch status to failed
    try {
      const batch = await Batch.findOne({ batchId });
      if (batch) {
        batch.status = 'failed';
        batch.completedAt = new Date();
        await batch.save();
      }
    } catch (updateError) {
      console.error('❌ Error updating batch status:', updateError);
    }

    throw error;
  }
});

export { pdfProcessingQueue, BatchProcessor };
