import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const standardFontDataUrl = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/');

async function debugPDF() {
  try {
    // Test with a sample PDF
    const pdfPath = '../Daily bills/11 july.pdf';
    const buffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(buffer);
    
    const pdf = await getDocument({
      data: uint8Array,
      standardFontDataUrl
    }).promise;
    
    console.log(`PDF has ${pdf.numPages} pages`);
    console.log('='.repeat(80));
    
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map(item => item.str).join(' ');
      fullText += pageText + ' ';
      
      console.log(`PAGE ${i}:`);
      console.log('-'.repeat(40));
      console.log(pageText);
      console.log('-'.repeat(40));
    }
    
    console.log('\nFULL NORMALIZED TEXT:');
    console.log('='.repeat(80));
    const normalized = fullText.replace(/\s+/g, ' ').trim();
    console.log(normalized);
    
    // Look for common patterns
    console.log('\nLOOKING FOR PATTERNS:');
    console.log('='.repeat(80));
    
    // Order ID patterns
    const orderIdMatches = normalized.match(/(?:order|invoice|bill)[\s\w]*?[:\s]+([A-Z0-9-]+)/gi);
    console.log('Order ID patterns:', orderIdMatches);
    
    // Customer name patterns
    const nameMatches = normalized.match(/(?:ship\s*to|billing|customer)[\s:]*([A-Za-z\s]+?)(?:\s+\d|mobile|phone|address)/gi);
    console.log('Name patterns:', nameMatches);
    
    // Amount patterns
    const amountMatches = normalized.match(/(?:rs\.?|₹)\s*[\d,]+(?:\.\d{2})?/gi);
    console.log('Amount patterns:', amountMatches);
    
    // Table headers
    const tableHeaders = normalized.match(/(?:description|item|product|sku|hsn|qty|quantity|amount|price)/gi);
    console.log('Table headers found:', tableHeaders);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugPDF();
