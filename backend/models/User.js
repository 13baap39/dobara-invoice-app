import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  fullName: { type: String, required: true },
  mobile: { type: String, required: true },
  shopName: { type: String, required: true },
  password: { type: String, required: true },
  profilePicUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
