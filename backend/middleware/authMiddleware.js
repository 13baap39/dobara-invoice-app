import jwt from 'jsonwebtoken';

export default function authMiddleware(req, res, next) {
  // Check JWT_SECRET at runtime (not at import time)
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required but not set. Please set JWT_SECRET in your environment variables.');
  }
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}
