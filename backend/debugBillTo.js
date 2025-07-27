import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const standardFontDataUrl = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/');

async function debugBillTo() {
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
    
    // Look at first few invoices
    for (let i = 1; i <= Math.min(3, invoiceSections.length - 1); i++) {
      const section = invoiceSections[i];
      
      console.log(`\nINVOICE ${i}:`);
      console.log('='.repeat(50));
      
      // Find BILL TO section
      const billToStart = section.indexOf('BILL TO / SHIP TO');
      if (billToStart !== -1) {
        const billToSection = section.substring(billToStart, billToStart + 200);
        console.log('BILL TO section:');
        console.log(billToSection);
        
        // Test different regex patterns
        const patterns = [
          /BILL TO \/ SHIP TO\s+([^-]+?)\s*-\s*([^,]+?),?\s*([^,]+?),?\s*([^,]+?),?\s*([^,]+?),?\s*(\d{6})/,
          /BILL TO \/ SHIP TO\s+([^-]+?)\s*-\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*([^,]+?)\s*,\s*(\d{6})/,
          /BILL TO \/ SHIP TO\s+([^-]+?)\s*-\s*(.+?),\s*([^,]+?),\s*(\d{6})/
        ];
        
        patterns.forEach((pattern, idx) => {
          const match = section.match(pattern);
          if (match) {
            console.log(`\nPattern ${idx + 1} matched:`);
            match.forEach((group, i) => {
              if (i > 0) console.log(`  Group ${i}: "${group}"`);
            });
          }
        });
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugBillTo();
