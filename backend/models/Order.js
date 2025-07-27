import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  orderId: { type: String },
  invoiceId: String,
  originalInvoiceId: String, // Original invoice ID for duplicate checking
  orderDate: Date,
  sku: String,
  color: String,
  quantity: Number,
  totalAmount: Number,
  isRepeatCustomer: Boolean,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Order', orderSchema, 'orders');
