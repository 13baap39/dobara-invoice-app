import mongoose from 'mongoose';

const skuSchema = new mongoose.Schema({
  sku: { type: String, required: true },
  color: String,
  size: { type: String, default: 'Free Size' },
  quantity: { type: Number, default: 1 },
  price: Number
});

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  customerName: { type: String, required: true },
  address: String,
  customerCity: String,
  state: String,
  pincode: String,
  orderNumber: { type: String, required: true, index: true },
  invoiceId: String,
  originalInvoiceId: String,
  orderDate: { type: Date, required: true },
  hsnCode: String,
  skus: [skuSchema],
  totalAmount: { type: Number, required: true },
  isRepeatCustomer: Boolean,
  invoiceImageUrl: String, // URL to the stored invoice PDF
  invoiceThumbnailUrl: String, // URL to the invoice thumbnail
  createdAt: { type: Date, default: Date.now }
});

// Create a unique compound index on orderNumber and userId to ensure no duplicate orders
orderSchema.index({ orderNumber: 1, userId: 1 }, { unique: true });

// Add indexes for search performance
orderSchema.index({ userId: 1, customerName: 1 });
orderSchema.index({ userId: 1, customerCity: 1 });
orderSchema.index({ userId: 1, orderDate: -1 });
orderSchema.index({ userId: 1, totalAmount: 1 });
orderSchema.index({ userId: 1, hsnCode: 1 });
orderSchema.index({ userId: 1, 'skus.sku': 1 });

// Compound indexes for common search combinations
orderSchema.index({ userId: 1, orderDate: -1, totalAmount: -1 });
orderSchema.index({ userId: 1, customerName: 1, orderDate: -1 });

export default mongoose.model('Order', orderSchema, 'orders');
