import { parsePdfBill } from './billParser.js';
import fs from 'fs';

async function debugTextExtraction() {
    try {
        const fileBuffer = fs.readFileSync('../Daily bills/11 july.pdf');
        console.log('Reading PDF file...');
        
        // Let's modify the parser to also log the extracted text
        const results = await parsePdfBill(fileBuffer);
        console.log('Results:', JSON.stringify(results, null, 2));
        
    } catch (error) {
        console.error('Error:', error);
    }
}

debugTextExtraction();
