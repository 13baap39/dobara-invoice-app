import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const standardFontDataUrl = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/');

async function testTotalExtraction() {
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
    
    const section = invoiceSections[1];
    
    console.log('Testing total extraction patterns:');
    
    // Test different total patterns
    const patterns = [
      /Total\s+Rs\.([\d,]+(?:\.\d{2})?)\s+Tax is not payable/,
      /Total\s+Rs\.([\d,]+(?:\.\d{2})?)\s*Tax/,
      /Total\s+Rs\.([\d,]+(?:\.\d{2})?)/,
      /Rs\.([\d,]+(?:\.\d{2})?)\s+Tax is not payable/
    ];
    
    patterns.forEach((pattern, i) => {
      const match = section.match(pattern);
      console.log(`Pattern ${i + 1}: ${pattern}`);
      console.log(`Result: ${match ? match[1] : 'No match'}`);
      console.log('---');
    });
    
    // Look at end of section
    console.log('\nLast 200 characters of section:');
    console.log(section.slice(-200));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testTotalExtraction();
