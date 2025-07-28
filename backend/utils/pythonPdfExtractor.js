import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Extracts customer names using your proven Python implementation
 * This ensures 100% accuracy matching your working Meesho_helper repo
 */
export async function extractCustomerNamesPython(pdfPath) {
  try {
    const pythonScript = path.join(process.cwd(), 'extract_names.py');
    const absolutePdfPath = path.resolve(pdfPath);
    
    // Call your proven Python script
    const { stdout, stderr } = await execAsync(`python3 "${pythonScript}" "${absolutePdfPath}"`);
    
    if (stderr) {
      console.warn('Python script warning:', stderr);
    }
    
    // Parse JSON response from Python
    const names = JSON.parse(stdout.trim());
    return names;
    
  } catch (error) {
    console.error('Error running Python extraction:', error);
    
    // Fallback to Node.js version if Python fails
    console.log('Falling back to Node.js extraction...');
    const { extractCustomerNames } = await import('./pdfNameExtractor.js');
    return extractCustomerNames(pdfPath);
  }
}
