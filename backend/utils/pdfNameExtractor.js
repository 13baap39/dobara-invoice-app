import PDFParser from 'pdf-parse';
import fs from 'fs';

/**
 * Extracts customer names from Meesho PDF labels
 * Looks for lines after "BILL TO / SHIP TO" and cleans names
 */
export async function extractCustomerNames(pdfPath) {
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfData = await PDFParser(pdfBuffer);
    const text = pdfData.text;
    
    const uniqueNames = new Set();
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.toUpperCase().includes('BILL TO') || line.toUpperCase().includes('SHIP TO')) {
        // Check next line for customer name
        if (i + 1 < lines.length) {
          const rawName = lines[i + 1].trim();
          const cleanedName = cleanCustomerName(rawName);
          if (cleanedName) {
            uniqueNames.add(cleanedName);
          }
        }
      }
    }
    
    return Array.from(uniqueNames).sort();
  } catch (error) {
    console.error('Error extracting customer names:', error);
    return [];
  }
}

/**
 * Cleans the extracted line to return only the name
 * Removes addresses, commas, hyphens, numbers etc.
 */
function cleanCustomerName(text) {
  if (!text || /^\d+$/.test(text)) {
    return '';
  }
  
  // Remove after comma or hyphen
  text = text.split(/[,-]/)[0];
  
  // Remove digits
  text = text.replace(/\d+/g, '');
  
  // Remove extra spaces
  const words = text.trim().split(/\s+/);
  
  // Return first 2 words only (like "Rafey Khan", "Mariam Fatima")
  if (words.length >= 2) {
    return words.slice(0, 2).join(' ');
  } else if (words.length === 1) {
    return words[0];
  }
  
  return '';
}

/**
 * Extracts customer name from a single page text
 */
export function extractNameFromPageText(pageText) {
  const lines = pageText.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toUpperCase().includes('CUSTOMER ADDRESS') || 
        line.toUpperCase().includes('BILL TO') || 
        line.toUpperCase().includes('SHIP TO')) {
      
      if (i + 1 < lines.length) {
        const rawName = lines[i + 1].trim();
        return cleanCustomerName(rawName);
      }
    }
  }
  
  return '';
}
