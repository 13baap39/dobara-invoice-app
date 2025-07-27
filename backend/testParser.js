import { parseBill } from './billParser.js';
import fs from 'fs';

async function testParsing() {
  try {
    // Test with a sample PDF
    const pdfPath = '../Daily bills/11 july.pdf';
    const buffer = fs.readFileSync(pdfPath);
    
    console.log('Testing PDF parsing...');
    console.log('='.repeat(50));
    
    const result = await parseBill(buffer);
    
    console.log('Parsed Result:');
    console.log(JSON.stringify(result, null, 2));
    console.log('='.repeat(50));
    console.log(`Total SKUs found: ${result.length}`);
    
    if (result.length === 0) {
      console.log('⚠️ No SKUs found! Parser needs to be updated.');
    }
    
  } catch (error) {
    console.error('Error testing parser:', error);
  }
}

testParsing();
