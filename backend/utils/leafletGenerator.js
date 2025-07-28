import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Layout configuration for leaflets
const PAGE_WIDTH = 595.276; // A4 width in points
const PAGE_HEIGHT = 841.89; // A4 height in points
const MARGIN_LEFT = 42.52; // 1.5cm in points
const MARGIN_RIGHT = 42.52;
const MARGIN_TOP = 42.52;
const MARGIN_BOTTOM = 42.52;
const GUTTER = 14.17; // 0.5cm in points

// Grid configuration - 2x4 layout for longer message
const NUM_COLUMNS = 2;
const NUM_ROWS = 4;
const LEAFLETS_PER_PAGE = NUM_COLUMNS * NUM_ROWS;

// Calculate dimensions for each leaflet block
const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const USABLE_HEIGHT = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
const BLOCK_WIDTH = (USABLE_WIDTH - GUTTER) / NUM_COLUMNS;
const BLOCK_HEIGHT = USABLE_HEIGHT / NUM_ROWS;

/**
 * Generates a PDF with personalized leaflets based on the 2x4 grid layout
 * This function replicates the exact message from your Meesho_helper repo
 */
export async function generateLeafletPDF(customerNames, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4' });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      for (let i = 0; i < customerNames.length; i++) {
        const name = customerNames[i];
        
        // Create a new page if the current one is full
        if (i > 0 && i % LEAFLETS_PER_PAGE === 0) {
          doc.addPage();
        }

        // Calculate position in the grid (2 columns, 4 rows)
        const pageIndex = i % LEAFLETS_PER_PAGE;
        const col = pageIndex % NUM_COLUMNS;
        const row = Math.floor(pageIndex / NUM_COLUMNS);

        // Calculate the x, y coordinates for the bottom-left corner of the block
        const x = MARGIN_LEFT + col * (BLOCK_WIDTH + GUTTER);
        const y = MARGIN_TOP + row * BLOCK_HEIGHT;

        // Draw a dashed border for cutting guide
        doc.dash(2, { space: 2 });
        doc.rect(x, y, BLOCK_WIDTH, BLOCK_HEIGHT);
        doc.stroke();
        doc.undash();

        // Add the leaflet content with the exact message from your repo
        const fontSize = 8;
        const lineHeight = fontSize * 1.25;
        let currentY = y + 20; // Start with some margin from top

        doc.fontSize(fontSize);
        
        // The exact message from your Meesho_helper leaflet_maker.py
        const messages = [
          `Thank you ${name} ji!`,
          "Thank you for your order — it truly means a lot to us!",
          "We hope you love your stole.",
          "",
          "If you're happy with your purchase,",
          "we'd be thrilled if you could leave us a",
          "5-star review ⭐⭐⭐⭐⭐",
          "",
          "In case there's anything you're not satisfied with,",
          "please reach out to us directly on",
          "WhatsApp: +91 7860861434",
          "we'll do our best to make it right.",
          "",
          "Your feedback helps us improve, and your support means",
          "the world to our small business.",
          "",
          "Thank you once again!",
          "",
          "Warm regards,",
          "Team Mary Creations."
        ];

        // Add text with proper spacing
        for (const message of messages) {
          if (currentY + lineHeight > y + BLOCK_HEIGHT - 10) {
            // Text would overflow, skip remaining lines for this leaflet
            break;
          }
          
          doc.text(message, x + 14, currentY, {
            width: BLOCK_WIDTH - 28,
            align: 'left'
          });
          currentY += lineHeight;
        }
      }

      doc.end();
      
      stream.on('finish', () => {
        console.log(`✅ Leaflet generated successfully at: ${outputPath}`);
        resolve(outputPath);
      });
      
      stream.on('error', (error) => {
        console.error('Error generating leaflet PDF:', error);
        reject(error);
      });
      
    } catch (error) {
      console.error('Error in generateLeafletPDF:', error);
      reject(error);
    }
  });
}

/**
 * Creates a hybrid bill with cropped shipping labels and leaflets
 * This is a simplified version - you can enhance it based on your needs
 */
export async function generateHybridBill(inputPdfPath, outputPath, customerNames) {
  // For now, this will just generate leaflets
  // You can extend this to include cropped bill images using pdf2pic or similar
  return generateLeafletPDF(customerNames, outputPath);
}
