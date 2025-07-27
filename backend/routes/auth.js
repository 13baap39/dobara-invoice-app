import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import multer from 'multer';
import Order from '../models/Order.js';
const upload = multer({ dest: '../uploads/' });

const router = express.Router();

// Function to check JWT_SECRET and sign tokens
function signJWT(payload) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set. Please set JWT_SECRET in your environment variables.');
  }
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

// Delete current user and their orders
router.delete('/me', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ message: 'Password required' });
  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: 'Incorrect password' });
  await Order.deleteMany({ userId: req.user.id });
  await User.findByIdAndDelete(req.user.id);
  res.json({ message: 'Account deleted' });
});

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user);
});

// Update current user profile
router.put('/me', authMiddleware, async (req, res) => {
  const { fullName, mobile, shopName, profilePicUrl } = req.body;
  const user = await User.findByIdAndUpdate(
    req.user.id,
    { fullName, mobile, shopName, ...(profilePicUrl && { profilePicUrl }) },
    { new: true }
  ).select('-password');
  res.json(user);
});

// Upload profile picture
router.post('/profile-pic', authMiddleware, upload.single('profilePic'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  // For demo: just return local file path. In prod, use cloud storage.
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});

// Signup
router.post('/signup', async (req, res) => {
  const { email, password, fullName, mobile, shopName } = req.body;
  if (!email || !password || !fullName || !mobile || !shopName) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already exists' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash, fullName, mobile, shopName });
    const token = signJWT({ id: user._id });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Signup failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });
    const token = signJWT({ id: user._id });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

export default router;
