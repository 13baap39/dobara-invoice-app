import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from parent directory FIRST
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.join(__dirname, '..', '.env');

const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env:', result.error);
  process.exit(1);
}

// Ensure JWT_SECRET is set before starting the server
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET environment variable is required but not set.');
  console.error('Please create a .env file in the project root with: JWT_SECRET=your_secret_key');
  console.error('You can generate a secure key with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"');
  process.exit(1);
}

import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import cors from 'cors';
import Order from './models/Order.js';
import authMiddleware from './middleware/authMiddleware.js';
import authRoutes from './routes/auth.js';
import { parseBill } from './billParser.js';

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploads directory (outside project root)
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
// Protected: Requires authentication
app.post('/upload-bills', authMiddleware, upload.array('bills'), async (req, res) => {
  try {
    console.log('📤 Upload request received');
    console.log('👤 User ID:', req.user.id); // Using authenticated user ID
    console.log('📁 Files count:', req.files?.length || 0);
    
    const files = req.files;
    let uploaded = 0, skipped = 0;
    
    for (const file of files) {
      console.log(`\n🔄 Processing file: ${file.originalname}`);
      console.log('📊 File size:', file.size, 'bytes');
      console.log('📋 File buffer type:', typeof file.buffer);
      console.log('🔢 File buffer length:', file.buffer?.length);
      
      try {
        const orders = await parseBill(file.buffer);
        console.log('✅ Parsed orders count:', orders.length);
        
        for (const order of orders) {
          // Check for duplicates using orderNumber (more stable than invoice ID)
          const duplicateQuery = {
            userId: req.user.id,
            orderNumber: order.orderId
          };
          
          console.log('🔍 Checking for duplicate with query:', duplicateQuery);
          const exists = await Order.findOne(duplicateQuery);
          console.log('🔍 Duplicate check result:', exists ? 'FOUND' : 'NOT FOUND');
          if (exists) {
            console.log(`⏭️ Skipping duplicate: Order ${order.orderId}`);
            skipped++;
            continue;
          }
          
          // Create new order record with proper field mapping
          await Order.create({ 
            userId: req.user.id, // Using authenticated user ID
            customerName: order.name,
            address: order.address,
            customerCity: order.city,
            state: order.state,
            pincode: order.pincode,
            orderNumber: order.orderId,
            invoiceId: order.invoiceId,
            originalInvoiceId: order.originalInvoiceId || order.invoiceId.split('_')[0], // Store original invoice ID
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
        _id: { 
          name: '$customerName', 
          pincode: '$pincode', 
          month: { $month: '$orderDate' }, 
          year: { $year: '$orderDate' } 
        },
        count: { $sum: 1 },
        city: { $first: '$customerCity' }
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
    { $group: { _id: '$customerCity', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
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
        { customerName: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'skus.sku': { $regex: search, $options: 'i' } }
      ];
    }
    
    if (city) {
      match.customerCity = city;
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
        totalSkus: { $sum: { $size: '$skus' } },
        uniqueCustomers: { $addToSet: '$customerName' }
      }
    },
    {
      $project: {
        _id: 0,
        totalRevenue: 1,
        totalOrders: 1,
        totalSkus: 1,
        uniqueCustomers: { $size: '$uniqueCustomers' }
      }
    }
  ];
  const result = await Order.aggregate(pipeline);
  res.json(result[0] || {
    totalRevenue: 0,
    totalOrders: 0,
    totalSkus: 0,
    uniqueCustomers: 0
  });
});

app.listen(5002, () => {
  console.log('Backend server running on http://localhost:5002');
});
