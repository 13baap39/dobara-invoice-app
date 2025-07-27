import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import Order from './models/Order.js';
import authMiddleware from './middleware/authMiddleware.js';
import authRoutes from './routes/auth.js';
import { parseBill } from './billParser.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());
app.use(express.json());

// Create a test ObjectId for development
  // Testing: Use a consistent test user ID for development
  const testUserId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011'); // Fixed test user ID

// Serve uploads directory (outside project root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// MongoDB connection
const MONGO_URI = 'mongodb://localhost:27017/dobara';
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

const storage = multer.memoryStorage();
const upload = multer({ storage });

// TODO: Add routes and PDF parsing logic

app.get('/', (req, res) => {
  res.send('Dobara backend running');
});

// Auth routes
app.use('/auth', authRoutes);

// Test endpoint to check auth
app.get('/test-auth', authMiddleware, (req, res) => {
  res.json({ message: 'Auth working', userId: req.user.id });
});

// POST /upload-bills: Upload and parse multiple PDFs
// Temporarily remove auth for testing
app.post('/upload-bills', upload.array('bills'), async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('👤 User ID:', testUserId); // Using test ObjectId
    console.log('📁 Files count:', req.files?.length || 0);
    
    const files = req.files;
    let uploaded = 0, skipped = 0;
    
    for (const file of files) {
      console.log(`\n🔄 Processing file: ${file.originalname}`);
      console.log('📊 File size:', file.size, 'bytes');
      console.log('📋 File buffer type:', typeof file.buffer);
      console.log('🔢 File buffer length:', file.buffer?.length);
      
      try {
        const skus = await parseBill(file.buffer);
        console.log('✅ Parsed SKUs count:', skus.length);
        
        for (const sku of skus) {
          // Check for duplicates using customer name + order ID + SKU (more stable than invoice ID)
          const duplicateQuery = {
            userId: testUserId,
            orderId: sku.orderId,
            sku: sku.sku,
            name: sku.customerName
          };
          
          console.log('🔍 Checking for duplicate with query:', duplicateQuery);
          const exists = await Order.findOne(duplicateQuery);
          console.log('🔍 Duplicate check result:', exists ? 'FOUND' : 'NOT FOUND');
          if (exists) {
            console.log(`⏭️ Skipping duplicate: ${sku.sku} for order ${sku.orderId}`);
            skipped++;
            continue;
          }
          
          // Create new order record with proper field mapping
          await Order.create({ 
            userId: testUserId, // Using test ObjectId
            name: sku.customerName,
            address: sku.customerAddress,
            city: sku.customerCity,
            state: sku.customerState,
            pincode: sku.customerPincode,
            orderId: sku.orderId,
            invoiceId: sku.invoiceId,
            originalInvoiceId: sku.originalInvoiceId || sku.invoiceId.split('_')[0], // Store original invoice ID
            orderDate: sku.orderDate,
            sku: sku.sku,
            color: sku.color || sku.size, // Map color or size to color field
            quantity: sku.quantity || 1,
            totalAmount: sku.amount,
            isRepeatCustomer: false, // Will be calculated later
            createdAt: new Date()
          });
          uploaded++;
        }
      } catch (parseError) {
        console.error('❌ Parse error for file:', file.originalname, parseError.message);
        throw parseError;
      }
    }
    
    console.log('🎯 Upload complete - Uploaded:', uploaded, 'Skipped:', skipped);
    res.json({ uploaded, skipped });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /stats/repeat-customers
// Protected: Repeat customers (user-specific)
app.get('/stats/repeat-customers', authMiddleware, async (req, res) => {
  // Find repeat customers: 3+ orders/month by same name+pincode, user-specific
  const pipeline = [
    { $match: { userId: req.user.id } },
    {
      $group: {
        _id: { name: '$name', pincode: '$pincode', month: { $month: '$orderDate' }, year: { $year: '$orderDate' } },
        count: { $sum: 1 },
        city: { $first: '$city' }
      }
    },
    { $match: { count: { $gte: 3 } } },
    {
      $group: {
        _id: { name: '$_id.name', pincode: '$_id.pincode' },
        months: { $push: { month: '$_id.month', year: '$_id.year', count: '$count', city: '$city' } }
      }
    }
  ];
  const result = await Order.aggregate(pipeline);
  res.json(result);
});

// GET /stats/cities
// Protected: Cities stats (user-specific)
app.get('/stats/cities', authMiddleware, async (req, res) => {
  const pipeline = [
    { $match: { userId: req.user.id } },
    { $group: { _id: '$city', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    { $sort: { total: -1 } }
  ];
  const result = await Order.aggregate(pipeline);
  res.json(result);
});

// GET /orders - Get orders with filters (user-specific)
app.get('/orders', authMiddleware, async (req, res) => {
  try {
    const { search, city, from, to } = req.query;
    const match = { userId: req.user.id };
    
    if (search) {
      match.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (city) {
      match.city = city;
    }
    
    if (from && to) {
      match.orderDate = { $gte: new Date(from), $lte: new Date(to) };
    }
    
    const orders = await Order.find(match).sort({ orderDate: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /stats/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
// Protected: Summary stats (user-specific)
app.get('/stats/summary', authMiddleware, async (req, res) => {
  const { from, to } = req.query;
  const match = { userId: req.user.id };
  if (from && to) {
    match.orderDate = { $gte: new Date(from), $lte: new Date(to) };
  }
  const pipeline = [
    { $match: match },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalOrders: { $sum: 1 },
        uniqueCustomers: { $addToSet: '$orderId' }
      }
    }
  ];
  const result = await Order.aggregate(pipeline);
  res.json(result[0] || {});
});

app.listen(5002, () => {
  console.log('Backend server running on http://localhost:5002');
});
