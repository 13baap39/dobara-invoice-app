import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { extractCustomerNames } from '../utils/pdfNameExtractor.js';
import { generateLeafletPDF, generateHybridBill } from '../utils/leafletGenerator.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.pdf');
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

// Route to generate leaflets from uploaded PDF
router.post('/generate-leaflets', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    const customerNames = await extractCustomerNames(pdfPath);
    
    if (customerNames.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(pdfPath);
      return res.status(400).json({ 
        error: 'No customer names found in the PDF. Please ensure it is a valid Meesho order label.' 
      });
    }

    // Generate output filename
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFilename = `leaflet_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Generate the leaflet PDF
    await generateLeafletPDF(customerNames, outputPath);
    
    // Clean up uploaded file
    fs.unlinkSync(pdfPath);
    
    res.json({
      success: true,
      message: 'Leaflets generated successfully!',
      customerNames: customerNames,
      downloadUrl: `/api/leaflets/download/${outputFilename}`,
      filename: outputFilename
    });

  } catch (error) {
    console.error('Error generating leaflets:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Error generating leaflets: ' + error.message 
    });
  }
});

// Route to generate hybrid bills (bills + leaflets)
router.post('/generate-hybrid', upload.single('pdfFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file uploaded' });
    }

    const pdfPath = req.file.path;
    const customerNames = await extractCustomerNames(pdfPath);
    
    if (customerNames.length === 0) {
      // Clean up uploaded file
      fs.unlinkSync(pdfPath);
      return res.status(400).json({ 
        error: 'No customer names found in the PDF. Please ensure it is a valid Meesho bill.' 
      });
    }

    // Generate output filename
    const outputDir = path.join(process.cwd(), 'generated');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    const outputFilename = `hybrid_bill_${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Generate the hybrid bill PDF
    await generateHybridBill(pdfPath, outputPath, customerNames);
    
    // Clean up uploaded file
    fs.unlinkSync(pdfPath);
    
    res.json({
      success: true,
      message: 'Hybrid bills generated successfully!',
      customerNames: customerNames,
      downloadUrl: `/api/leaflets/download/${outputFilename}`,
      filename: outputFilename
    });

  } catch (error) {
    console.error('Error generating hybrid bills:', error);
    
    // Clean up uploaded file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    
    res.status(500).json({ 
      error: 'Error generating hybrid bills: ' + error.message 
    });
  }
});

// Route to download generated PDFs
router.get('/download/:filename', (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(process.cwd(), 'generated', filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.download(filePath, filename, (err) => {
      if (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
    
  } catch (error) {
    console.error('Error in download route:', error);
    res.status(500).json({ error: 'Error downloading file' });
  }
});

// Route to list generated files
router.get('/files', (req, res) => {
  try {
    const generatedDir = path.join(process.cwd(), 'generated');
    
    if (!fs.existsSync(generatedDir)) {
      return res.json({ files: [] });
    }
    
    const files = fs.readdirSync(generatedDir)
      .filter(file => file.endsWith('.pdf'))
      .map(file => {
        const filePath = path.join(generatedDir, file);
        const stats = fs.statSync(filePath);
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          downloadUrl: `/api/leaflets/download/${file}`
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));
    
    res.json({ files });
    
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Error listing files' });
  }
});

export default router;
