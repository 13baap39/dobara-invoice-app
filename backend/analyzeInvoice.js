import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const standardFontDataUrl = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/');

async function analyzeFirstInvoice() {
  try {
    const pdfPath = '../Daily bills/11 july.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(buffer);
    
    const pdf = await getDocument({
      data: uint8Array,
      standardFontDataUrl
    }).promise;
    
    let textContent = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      textContent += content.items.map(item => item.str).join(' ');
    }
    
    const normText = textContent.replace(/\s+/g, ' ').trim();
    const invoiceSections = normText.split('TAX INVOICE');
    
    // Analyze first invoice section
    console.log('FIRST INVOICE SECTION:');
    console.log('='.repeat(80));
    console.log(invoiceSections[1].substring(0, 1000));
    console.log('='.repeat(80));
    
    // Look for specific patterns in first invoice
    const section = invoiceSections[1];
    
    console.log('\nPATTERN ANALYSIS:');
    console.log('='.repeat(40));
    
    // Product Details table
    const productMatch = section.match(/Product Details[\s\S]*?(?=TAX INVOICE|$)/);
    if (productMatch) {
      console.log('Product Details section:');
      console.log(productMatch[0].substring(0, 200));
    }
    
    // Total amounts
    const totals = section.match(/Total\s+Rs\.[\d,]+(?:\.\d{2})?/g);
    console.log('All Total amounts found:', totals);
    
    // Quantity patterns
    const quantities = section.match(/\s(\d+)\s+(?:Purple|Red|Blue|Green|Yellow|Pink|Navy|Maroon|Black|White)/g);
    console.log('Quantity patterns:', quantities);
    
    // Final total (should be at the very end)
    const finalTotal = section.match(/Total\s+Rs\.([\d,]+(?:\.\d{2})?)\s*Tax is not payable/);
    console.log('Final total:', finalTotal);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

analyzeFirstInvoice();
