import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up the worker for Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

GlobalWorkerOptions.workerSrc = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');

export async function parsePdfBill(fileData) {
    try {
        console.log('📄 Starting PDF parsing for file buffer');
        
        // Convert Buffer to Uint8Array for PDF.js
        const uint8Array = new Uint8Array(fileData);
        
        // Load the PDF document from Uint8Array
        const loadingTask = getDocument({ data: uint8Array });
        const pdf = await loadingTask.promise;
        
        console.log(`📚 PDF loaded successfully. Total pages: ${pdf.numPages}`);
        
        let fullText = '';
        
        // Extract text from all pages
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n';
        }
        
        console.log('📝 Text extraction complete');
        console.log('🔍 Full text length:', fullText.length);
        
        // Split by "TAX INVOICE" to separate different invoices
        const invoiceBlocks = fullText.split(/TAX INVOICE/).filter(block => block.trim().length > 0);
        console.log(`🧾 Found ${invoiceBlocks.length} invoice blocks`);
        
        const results = [];
        
        for (let i = 0; i < invoiceBlocks.length; i++) {
            const block = invoiceBlocks[i];
            console.log(`\n🔄 Processing invoice block ${i + 1}/${invoiceBlocks.length}`);
            
            try {
                const invoiceData = parseInvoiceBlock(block);
                if (invoiceData) {
                    // Convert to SKU format expected by backend
                    for (const product of invoiceData.products) {
                        results.push({
                            orderId: invoiceData.orderId,
                            invoiceId: `${invoiceData.invoiceId}_${Date.now()}_${results.length + 1}`, // Make unique with timestamp
                            originalInvoiceId: invoiceData.invoiceId, // Original invoice ID for duplicate checking
                            orderDate: invoiceData.orderDate,
                            customerName: invoiceData.customerData.name,
                            customerAddress: invoiceData.customerData.address,
                            customerArea: invoiceData.customerData.area,
                            customerCity: invoiceData.customerData.city,
                            customerState: invoiceData.customerData.state,
                            customerPincode: invoiceData.customerData.pincode,
                            sku: product.name,
                            size: product.size,
                            amount: product.price,
                            quantity: product.quantity || 1,
                            color: product.color || '',
                            totalAmount: invoiceData.totalAmount
                        });
                    }
                    console.log(`✅ Successfully parsed invoice block ${i + 1}`);
                } else {
                    console.log(`⚠️ No data found in invoice block ${i + 1}`);
                }
            } catch (blockError) {
                console.error(`❌ Error parsing invoice block ${i + 1}:`, blockError.message);
            }
        }
        
        console.log(`🎯 Total results: ${results.length}`);
        return results;
        
    } catch (error) {
        console.error('❌ Error parsing PDF:', error);
        throw error;
    }
}

// Legacy export for backward compatibility
export const parseBill = parsePdfBill;

function parseInvoiceBlock(text) {
    console.log('🔍 Parsing invoice block...');
    
    // Extract BILL TO information with correct group mapping
    const billToMatch = text.match(/BILL TO \/ SHIP TO\s+([^-]+?)\s*-\s*([^,]+?),?\s*([^,]+?),?\s*([^,]+?),?\s*([^,]+?),?\s*(\d{6})/);
    
    if (!billToMatch) {
        console.log('⚠️ Could not find BILL TO section');
        return null;
    }
    
    console.log('📍 BILL TO match found:');
    console.log('Group 1 (name):', billToMatch[1]?.trim());
    console.log('Group 2 (street):', billToMatch[2]?.trim());
    console.log('Group 3 (area):', billToMatch[3]?.trim());
    console.log('Group 4 (city):', billToMatch[4]?.trim());
    console.log('Group 5 (state):', billToMatch[5]?.trim());
    console.log('Group 6 (pincode):', billToMatch[6]?.trim());
    
    const customerData = {
        name: billToMatch[1].trim(),
        address: billToMatch[2].trim(),
        area: billToMatch[3].trim(),
        city: billToMatch[4].trim(),    // Fixed: Group 4 is city
        state: billToMatch[5].trim(),   // Fixed: Group 5 is state
        pincode: billToMatch[6].trim()
    };
    
    // Extract Order ID and Invoice ID
    const orderIdMatch = text.match(/Order ID\s*[:]*\s*(\d+)/i) || text.match(/(\d{12,})/);
    const orderId = orderIdMatch ? orderIdMatch[1] : 'UNKNOWN';
    
    // Extract Invoice ID
    const invoiceIdMatch = text.match(/Invoice No\.\s*[:]*\s*([^\s\n]+)/i) || text.match(/Invoice ID\s*[:]*\s*([^\s\n]+)/i);
    const invoiceId = invoiceIdMatch ? invoiceIdMatch[1] : `INV_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract date from multiple possible formats
    let orderDate = null;
    const datePatterns = [
        /Invoice Date\s*[:]*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        /Date\s*[:]*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/
    ];
    
    for (const pattern of datePatterns) {
        const dateMatch = text.match(pattern);
        if (dateMatch) {
            orderDate = new Date(dateMatch[1]);
            break;
        }
    }
    
    if (!orderDate || isNaN(orderDate)) {
        orderDate = new Date(); // Fallback to current date
    }
    
    // Extract product information - Updated for Meesho format
    const products = [];
    
    // Look for Meesho product patterns in the text - More precise patterns
    const productPatterns = [
        // Pattern for products with specific format: ProductName Free Size Qty Color OrderNumber
        /(\w+(?:\s+\w+)*)\s+Free Size\s+(\d+)\s+([^₹\n\d]+?)\s+(\d{17,}_\d+)/g,
        // Alternative pattern for combo products  
        /((?:3?Combo|Ayan|Surat)\w*[^,\n]*)\s+Free Size\s+(\d+)\s+([^₹\n\d]+?)\s+(\d{17,}_\d+)/g
    ];
    
    let totalAmount = 0;
    let hasProducts = false;
    
    for (const pattern of productPatterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            const productName = match[1].trim();
            const quantity = parseInt(match[2]);
            const color = match[3].trim();
            const orderNumber = match[4].trim();
            
            console.log(`📦 Found product: ${productName}, Qty: ${quantity}, Color: ${color}, Order: ${orderNumber}`);
            
            // Skip if product name is too long (likely extracted wrong text)
            if (productName.length > 100) {
                console.log(`⚠️ Skipping product with long name: ${productName.substring(0, 50)}...`);
                continue;
            }
            
            if (productName && quantity > 0) {
                const defaultAmount = 299; // Default price for Meesho products
                
                products.push({
                    name: productName,
                    size: 'Free Size',
                    price: defaultAmount,
                    quantity: quantity,
                    color: color,
                    orderNumber: orderNumber
                });
                totalAmount += defaultAmount * quantity;
                hasProducts = true;
            }
        }
        if (hasProducts) break; // If we found products with one pattern, don't try others
    }
    
    // If no products found with the main pattern, try alternative patterns
    if (!hasProducts) {
        // Try to find any amount patterns first
        const amountPatterns = [
            /Total\s*Amount\s*[:]*\s*₹?\s*([\d,]+(?:\.\d{2})?)/i,
            /Grand\s*Total\s*[:]*\s*₹?\s*([\d,]+(?:\.\d{2})?)/i,
            /Amount\s*[:]*\s*₹?\s*([\d,]+(?:\.\d{2})?)/i,
            /₹\s*([\d,]+(?:\.\d{2})?)/
        ];
        
        for (const pattern of amountPatterns) {
            const amountMatch = text.match(pattern);
            if (amountMatch) {
                totalAmount = parseFloat(amountMatch[1].replace(/,/g, ''));
                console.log(`💰 Found amount: ₹${totalAmount}`);
                break;
            }
        }
        
        // If we found an amount but no products, create a generic product entry
        if (totalAmount > 0) {
            products.push({
                name: 'Product',
                size: 'Free Size',
                price: totalAmount,
                quantity: 1,
                color: '',
                orderNumber: ''
            });
            hasProducts = true;
        }
    }
    
    console.log(`💰 Extracted ${products.length} products, total amount: ₹${totalAmount}`);
    console.log(`👤 Customer: ${customerData.name} from ${customerData.city}, ${customerData.state}`);
    
    return {
        orderId,
        invoiceId,
        orderDate,
        customerData,
        products,
        totalAmount
    };
}
