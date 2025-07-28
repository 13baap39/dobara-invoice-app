import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';

/**
 * Extracts customer names from Meesho PDF labels
 * Looks for lines after "BILL TO / SHIP TO" and cleans names
 */
export async function extractCustomerNames(pdfPath) {
  try {
    const pdfBuffer = fs.readFileSync(pdfPath);
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      data: pdfBuffer,
      useSystemFonts: true,
    });
    
    const pdfDoc = await loadingTask.promise;
    const uniqueNames = new Set();
    
    // Process each page
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Combine all text items into lines
      const textItems = textContent.items.map(item => item.str);
      const fullText = textItems.join('\n');
      const lines = fullText.split('\n');
      
      // Look for customer names after "BILL TO" or "SHIP TO"
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.toUpperCase().includes('BILL TO') || 
            line.toUpperCase().includes('SHIP TO') ||
            line.toUpperCase().includes('CUSTOMER ADDRESS')) {
          
          // Check next few lines for customer name
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const potentialName = lines[j].trim();
            if (potentialName && !potentialName.toUpperCase().includes('ADDRESS')) {
              const cleanedName = cleanCustomerName(potentialName);
              if (cleanedName) {
                uniqueNames.add(cleanedName);
                break; // Found name for this section, move to next
              }
            }
          }
        }
      }
    }
    
    pdfDoc.destroy();
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
      
      // Check next few lines for name
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const potentialName = lines[j].trim();
        if (potentialName && !potentialName.toUpperCase().includes('ADDRESS')) {
          const cleanedName = cleanCustomerName(potentialName);
          if (cleanedName) {
            return cleanedName;
          }
        }
      }
    }
  }
  
  return '';
}
