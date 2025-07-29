/**
 * Invoice API Routes
 * Handles uploading, retrieving, and managing invoice files
 */

import express from 'express';
import { uploadMiddleware, generatePdfThumbnail, getFileUrl } from '../services/fileStorage.js';
import Order from '../models/Order.js';
import { parseBill } from '../billParser.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * @route POST /api/invoices/upload
 * @description Upload and process invoice PDF
 * @access Private (requires authentication)
 */
router.post('/upload', authMiddleware, uploadMiddleware.single('invoice'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    console.log('📤 Invoice upload request received');
    console.log('👤 User ID:', req.user.id);
    console.log('📁 File:', req.file.originalname);
    
    let fileUrl, thumbnailUrl;
    
    // Handle file URL based on storage type
    if (process.env.STORAGE_TYPE === 'cloud') {
      // For Cloudinary, the path is the URL
      fileUrl = req.file.path;
    } else {
      // For local storage, construct URL from filename
      fileUrl = getFileUrl(req.file.filename);
    }
    
    // Generate thumbnail for the PDF
    if (process.env.STORAGE_TYPE === 'cloud') {
      thumbnailUrl = await generatePdfThumbnail(fileUrl);
    } else {
      // For local storage, we'll use a simple thumbnail reference
      // In a production app, you might use a PDF rendering library
      thumbnailUrl = fileUrl;
    }
    
    // Parse the PDF to extract order information
    let filePath = req.file.path;
    if (!filePath && req.file.destination) {
      // For local storage, construct the full file path
      filePath = `${req.file.destination}/${req.file.filename}`;
    }
    
    // For local storage, read the file buffer
    let fileData;
    if (process.env.STORAGE_TYPE !== 'cloud') {
      const fs = await import('fs');
      fileData = fs.readFileSync(filePath);
    } else {
      // For cloud storage, we need to fetch the file
      const fetch = await import('node-fetch');
      const response = await fetch.default(fileUrl);
      fileData = Buffer.from(await response.arrayBuffer());
    }
    
    // Parse the invoice
    const parsedOrders = await parseBill(fileData);
    
    // Process each order from the parsed PDF
    let uploaded = 0, skipped = 0;
    const processedOrders = [];
    
    for (const order of parsedOrders) {
      // Check for duplicates using orderNumber
      const duplicateQuery = {
        userId: req.user.id,
        orderNumber: order.orderId
      };
      
      console.log('🔍 Checking for duplicate order:', order.orderId);
      const exists = await Order.findOne(duplicateQuery);
      
      if (exists) {
        console.log(`⏭️ Skipping duplicate: Order ${order.orderId}`);
        skipped++;
        continue;
      }
      
      // Create new order record with invoice image URLs
      const newOrder = await Order.create({
        userId: req.user.id,
        customerName: order.name,
        address: order.address,
        customerCity: order.city,
        state: order.state,
        pincode: order.pincode,
        orderNumber: order.orderId,
        invoiceId: order.invoiceId,
        originalInvoiceId: order.originalInvoiceId || order.invoiceId.split('_')[0],
        orderDate: new Date(order.orderDate.split('.').reverse().join('-')), // Convert DD.MM.YYYY to YYYY-MM-DD
        hsnCode: order.hsnCode,
        skus: order.skus.map(sku => ({
          sku: sku.name,
          color: sku.color,
          size: sku.size || 'Free Size',
          quantity: sku.quantity || 1,
          price: sku.price
        })),
        totalAmount: order.totalAmount,
        isRepeatCustomer: false,
        invoiceImageUrl: fileUrl,
        invoiceThumbnailUrl: thumbnailUrl,
        createdAt: new Date()
      });
      
      processedOrders.push(newOrder);
      uploaded++;
    }
    
    console.log('🎯 Upload complete - Uploaded:', uploaded, 'Skipped:', skipped);
    res.json({ 
      success: true, 
      uploaded, 
      skipped,
      fileUrl,
      thumbnailUrl,
      orders: processedOrders
    });
    
  } catch (error) {
    console.error('❌ Invoice upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/invoices/:id
 * @description Get invoice details by order ID
 * @access Private (requires authentication)
 */
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ 
      userId: req.user.id,
      _id: req.params.id
    });
    
    if (!order) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json({
      orderNumber: order.orderNumber,
      invoiceId: order.invoiceId,
      invoiceImageUrl: order.invoiceImageUrl,
      invoiceThumbnailUrl: order.invoiceThumbnailUrl,
      customerName: order.customerName,
      orderDate: order.orderDate
    });
    
  } catch (error) {
    console.error('Error getting invoice:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
