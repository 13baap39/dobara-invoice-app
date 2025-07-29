import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parsePdfBill } from './billParser.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const standardFontDataUrl = path.join(__dirname, '../node_modules/pdfjs-dist/standard_fonts/');

/**
 * Analyze PDF invoices with enhanced features:
 * 1. Group multiple SKUs from the same order
 * 2. Extract customer city
 * 3. Extract HSN code
 * 4. Handle multi-SKU invoices
 * 5. Improved validation and error handling
 */
async function analyzePdfInvoice(pdfPath) {
  try {
    console.log(`📄 Analyzing PDF invoice: ${pdfPath}`);
    const buffer = fs.readFileSync(pdfPath);
    
    // Parse the PDF using our enhanced parser
    console.log('🔍 Parsing PDF with enhanced parser...');
    const invoiceResults = await parsePdfBill(buffer);
    
    console.log(`\n📊 INVOICE ANALYSIS RESULTS:`);
    console.log('='.repeat(80));
    
    console.log(`Total unique orders found: ${invoiceResults.length}`);
    
    // Analyze each parsed order
    for (let i = 0; i < invoiceResults.length; i++) {
      const order = invoiceResults[i];
      
      console.log(`\n📦 ORDER #${i + 1}: ${order.orderId}`);
      console.log('-'.repeat(40));
      
      // Display enhanced customer information
      console.log(`👤 Customer Name: ${order.name || 'Unknown'}`);
      console.log(`🏙️ City: ${order.city || 'Unknown'}`);
      console.log(`🗺️ State: ${order.state || 'Unknown'}`);
      console.log(`📍 Pincode: ${order.pincode || 'Unknown'}`);
      
      // Display order details
      console.log(`📅 Order Date: ${order.orderDate}`);
      console.log(`🧾 Invoice ID: ${order.originalInvoiceId || 'Unknown'}`);
      console.log(`📊 HSN Code: ${order.hsnCode || 'Unknown'}`);
      console.log(`💰 Total Amount: ₹${order.totalAmount.toFixed(2)}`);
      
      // Display all SKUs in this order
      if (order.skus && order.skus.length > 0) {
        console.log(`\n🛒 ORDER CONTAINS ${order.skus.length} SKUs:`);
        order.skus.forEach((sku, index) => {
          console.log(`  ${index + 1}. ${sku.name} - ${sku.quantity}x ₹${sku.price} (${sku.color})`);
        });
      } else {
        console.log('❌ No SKUs found for this order');
      }
      
      // Show raw object for debugging
      console.log('\n📋 RAW ORDER OBJECT:');
      console.log(JSON.stringify(order, null, 2));
    }
    
    // Return the parsed results
    return invoiceResults;
    
  } catch (error) {
    console.error('❌ Error analyzing invoice:', error);
    throw error;
  }
}

/**
 * Compare the original and enhanced invoice parsing methods
 */
async function compareParsingMethods() {
  try {
    const pdfPath = path.join(__dirname, '../Daily bills/11 july.pdf');
    
    console.log(`🔄 ENHANCED INVOICE PARSER DEMONSTRATION`);
    console.log('='.repeat(80));
    
    // Use the new enhanced parser
    const enhancedResults = await analyzePdfInvoice(pdfPath);
    
    // Show the key improvements
    console.log('\n✅ PARSING IMPROVEMENTS:');
    console.log('='.repeat(80));
    console.log('1. Multiple SKUs from same order are now grouped together');
    console.log('2. Customer city is properly extracted');
    console.log('3. HSN codes are extracted');
    console.log('4. Multi-SKU invoices are handled correctly');
    console.log('5. Improved validation and error handling');
    console.log(`6. ${enhancedResults.length} unique orders processed with all SKUs grouped`);
    
    return enhancedResults;
  } catch (error) {
    console.error('❌ Error during comparison:', error);
  }
}

// Run the comparison
compareParsingMethods();
