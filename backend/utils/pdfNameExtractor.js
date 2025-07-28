import pdf from 'pdf-parse/lib/pdf-parse.js';
import fs from 'fs';

/**
 * Cleans the extracted line to return only the name
 * Removes addresses, commas, hyphens, numbers etc.
 * Exact copy of your Python clean_customer_name function
 */
function cleanCustomerName(text) {
  if (!text || /^\d+$/.test(text)) {
    return "";
  }

  // Remove after comma or hyphen - exact Python logic
  text = text.split(/[,-]/)[0];

  // Remove digits - exact Python logic
  text = text.replace(/\d+/g, '');

  // Remove extra spaces
  const words = text.trim().split(/\s+/);

  // Return first 2 words only (like "Rafey Khan", "Mariam Fatima")
  if (words.length >= 2) {
    return words.slice(0, 2).join(' ');
  } else if (words.length === 1) {
    return words[0];
  }
  return "";
}

/**
 * Extracts customer names from Meesho PDF labels
 * Fixed to match exactly 30 bills = 30 unique names (case-insensitive deduplication)
 */
export async function extractCustomerNames(pdfPath) {
  const uniqueNames = new Map(); // Use Map to track case-insensitive duplicates

  try {
    // Read the PDF file
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdf(dataBuffer);
    
    // Get all text and split into lines - exactly like Python
    const text = data.text;
    const lines = text.split('\n');

    // Process each line - exact Python logic but with deduplication fix
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Look for "CUSTOMER ADDRESS" or "BILL TO / SHIP TO" - supporting both formats
      if (line.toUpperCase().includes('CUSTOMER ADDRESS') || 
          line.toUpperCase().includes('BILL TO / SHIP TO')) {
        
        // Check next line for customer name - exact Python approach
        if (i + 1 < lines.length) {
          const rawName = lines[i + 1].trim();
          const cleaned = cleanCustomerName(rawName);
          if (cleaned) {
            // Use lowercase as key for case-insensitive deduplication
            const lowerKey = cleaned.toLowerCase();
            if (!uniqueNames.has(lowerKey)) {
              // Store the first occurrence (with original case)
              uniqueNames.set(lowerKey, cleaned);
            }
          }
        }
      }
    }

    // Return sorted array of unique names
    return Array.from(uniqueNames.values()).sort();

  } catch (error) {
    console.error('Error extracting customer names:', error);
    return [];
  }
}
