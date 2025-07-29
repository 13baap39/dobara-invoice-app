/**
 * File Storage Service for Invoice PDFs
 * Handles uploading, retrieving, and managing invoice files
 * Supports Cloudinary as the storage provider
 */

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get directory name in ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Determine if we're using local or cloud storage
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local';

// Configure Cloudinary if using cloud storage
if (STORAGE_TYPE === 'cloud') {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Storage factory - creates appropriate storage based on configuration
 * @returns Storage configuration for multer
 */
function getStorage() {
  if (STORAGE_TYPE === 'cloud') {
    // Use Cloudinary storage
    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'dobara-invoices',
        allowed_formats: ['pdf'],
        resource_type: 'raw',
        // Generate a unique filename
        public_id: (req, file) => `invoice-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`,
      },
    });
  } else {
    // Use local disk storage
    const uploadsDir = path.resolve(__dirname, '../..', 'uploads');
    
    // Create uploads directory if it doesn't exist
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    return multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, uploadsDir);
      },
      filename: (req, file, cb) => {
        // Generate a unique filename
        const uniqueFilename = `invoice-${Date.now()}-${file.originalname.replace(/\s+/g, '-')}`;
        cb(null, uniqueFilename);
      },
    });
  }
}

/**
 * Configure multer for file uploads
 */
export const uploadMiddleware = multer({
  storage: getStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
});

/**
 * Generate a thumbnail image from a PDF
 * @param {string} pdfPath - Path to the PDF file
 * @returns {Promise<string>} URL of the generated thumbnail
 */
export async function generatePdfThumbnail(pdfPath) {
  try {
    if (STORAGE_TYPE === 'cloud') {
      // Upload as a thumbnail with transformation
      const result = await cloudinary.uploader.upload(pdfPath, {
        format: 'png',
        transformation: [
          { width: 200, height: 200, crop: 'fill', page: 1 }
        ],
        folder: 'dobara-invoice-thumbnails',
      });
      return result.secure_url;
    } else {
      // For local storage, we'll just return the PDF URL
      // In a production app, you might want to use a PDF rendering library
      return pdfPath.replace('uploads/', '/uploads/');
    }
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Get the public URL for an uploaded file
 * @param {string} filename - The filename of the uploaded file
 * @returns {string} The public URL
 */
export function getFileUrl(filename) {
  if (STORAGE_TYPE === 'cloud') {
    // For Cloudinary, the URL is returned directly from the upload
    return filename;
  } else {
    // For local storage, construct the URL
    return `/uploads/${filename}`;
  }
}

/**
 * Delete a file from storage
 * @param {string} fileUrl - URL or path of the file to delete
 * @returns {Promise<boolean>} Success indicator
 */
export async function deleteFile(fileUrl) {
  try {
    if (STORAGE_TYPE === 'cloud') {
      // Extract public ID from URL for Cloudinary
      const publicId = fileUrl.split('/').slice(-1)[0].split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    } else {
      // For local storage, delete the file
      const filePath = path.join(__dirname, '../..', fileUrl.replace('/uploads/', '/uploads/'));
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

export default {
  uploadMiddleware,
  generatePdfThumbnail,
  getFileUrl,
  deleteFile,
};
