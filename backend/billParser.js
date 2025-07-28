import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up the worker for Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

GlobalWorkerOptions.workerSrc = path.join(__dirname, 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.min.mjs');

export async function parsePdfBill(fileData) {
    try {
        // Input validation
        if (!fileData) {
            throw new Error('No file data provided');
        }
        
        if (!(fileData instanceof Buffer) && !(fileData instanceof Uint8Array) && !Array.isArray(fileData)) {
            throw new Error('Invalid file data format. Expected Buffer, Uint8Array, or Array');
        }
        
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
            
            // Clean up page reference to prevent memory leaks
            page.cleanup?.();
        }
        
        console.log('📝 Text extraction complete');
        console.log('🔍 Full text length:', fullText.length);
        
        // Safety check for extremely large text (potential memory issue)
        if (fullText.length > 10000000) { // 10MB limit
            console.warn(`⚠️ Text is very large (${fullText.length} characters). Processing may be slow.`);
        }
        
        if (fullText.length === 0) {
            throw new Error('No text could be extracted from PDF');
        }
        
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
                            name: invoiceData.customerData.name,
                            address: invoiceData.customerData.address,
                            area: invoiceData.customerData.area,
                            city: invoiceData.customerData.city,
                            state: invoiceData.customerData.state,
                            pincode: invoiceData.customerData.pincode,
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
        
        // Clean up PDF resources
        try {
            await pdf.destroy();
        } catch (cleanupError) {
            console.warn('⚠️ Error cleaning up PDF resources:', cleanupError.message);
        }
        
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
    
    // Initialize result with defaults
    const result = {
        orderId: 'UNKNOWN',
        invoiceId: `INV_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        orderDate: new Date(),
        customerData: {
            name: 'Unknown Customer',
            address: 'Unknown Address',
            area: 'Unknown Area',
            city: 'Unknown City',
            state: 'Unknown State',
            pincode: '000000'
        },
        products: [],
        totalAmount: 0
    };
    
    // 1. More robust BILL TO parsing - find section first, then extract fields
    const customerData = parseBillToSection(text);
    if (customerData) {
        result.customerData = customerData;
    }
    
    // 2. Robust parsing of individual fields with try-catch
    result.orderId = parseOrderId(text) || result.orderId;
    result.invoiceId = parseInvoiceId(text) || result.invoiceId;
    result.orderDate = parseOrderDate(text) || result.orderDate;
    
    // 3. Parse products
    result.products = parseProducts(text);
    
    // 4. More robust total amount parsing
    result.totalAmount = parseTotalAmount(text, result.products);
    
    // If no products found but we have an amount, create a generic product
    if (result.products.length === 0 && result.totalAmount > 0) {
        result.products.push({
            name: 'Product',
            size: 'Free Size',
            price: result.totalAmount,
            quantity: 1,
            color: '',
            orderNumber: ''
        });
    }
    
    console.log(`💰 Extracted ${result.products.length} products, total amount: ₹${result.totalAmount}`);
    console.log(`👤 Customer: ${result.customerData.name} from ${result.customerData.city}, ${result.customerData.state}`);
    
    return result.products.length > 0 ? result : null;
}

// More robust BILL TO section parsing
function parseBillToSection(text) {
    try {
        console.log('📍 Parsing BILL TO section...');
        
        // First, find the "BILL TO" or "SHIP TO" section
        const billToIndex = text.search(/BILL\s+TO[\s\/]*SHIP\s+TO|BILL\s+TO|SHIP\s+TO/i);
        if (billToIndex === -1) {
            console.log('⚠️ Could not find BILL TO section');
            return null;
        }
        
        // Extract text after BILL TO section (next ~300 characters should contain customer info)
        const billToSection = text.substring(billToIndex, billToIndex + 400);
        console.log('📄 BILL TO section:', billToSection.substring(0, 200));
        
        // Split into lines and process line by line
        const lines = billToSection.split(/\n|\r\n/).map(line => line.trim()).filter(line => line.length > 0);
        
        let customerName = '';
        let address = '';
        let area = '';
        let city = '';
        let state = '';
        let pincode = '';
        
        // Skip the BILL TO header line and process subsequent lines
        let startIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            if (/BILL\s+TO|SHIP\s+TO/i.test(lines[i])) {
                startIndex = i + 1;
                break;
            }
        }
        
        // Extract customer name (usually first non-header line)
        if (startIndex < lines.length && lines[startIndex]) {
            customerName = lines[startIndex].replace(/[-,]/g, '').trim();
        }
        
        // Try to extract address components from subsequent lines or combined format
        const addressText = lines.slice(startIndex + 1).join(' ');
        
        // Try pattern matching for pincode first (most reliable)
        const pincodeMatch = addressText.match(/(\d{6})/);
        if (pincodeMatch) {
            pincode = pincodeMatch[1];
        }
        
        // Try to extract state (common Indian states)
        const stateMatch = addressText.match(/(Gujarat|Maharashtra|Rajasthan|Tamil Nadu|Karnataka|Kerala|Andhra Pradesh|Telangana|West Bengal|Uttar Pradesh|Madhya Pradesh|Bihar|Odisha|Punjab|Haryana|Jharkhand|Assam|Himachal Pradesh|Uttarakhand|Chhattisgarh|Goa|Manipur|Meghalaya|Tripura|Nagaland|Mizoram|Arunachal Pradesh|Sikkim)/i);
        if (stateMatch) {
            state = stateMatch[1];
        }
        
        // Extract city (word before state or before pincode)
        if (state) {
            const cityMatch = addressText.match(new RegExp(`([A-Za-z\\s]+?)\\s*,?\\s*${state}`, 'i'));
            if (cityMatch) {
                city = cityMatch[1].trim().replace(/,$/, '');
            }
        } else if (pincode) {
            const cityMatch = addressText.match(/([A-Za-z\s]+?)\s*,?\s*\d{6}/);
            if (cityMatch) {
                city = cityMatch[1].trim().replace(/,$/, '');
            }
        }
        
        // Extract address (everything before city/state/pincode)
        const addressParts = addressText.split(/,|\n/).map(part => part.trim()).filter(part => part.length > 0);
        address = addressParts[0] || '';
        area = addressParts[1] || '';
        
        console.log('📍 Extracted customer data:', { customerName, address, area, city, state, pincode });
        
        return {
            name: customerName || 'Unknown Customer',
            address: address || 'Unknown Address',
            area: area || 'Unknown Area',
            city: city || 'Unknown City',
            state: state || 'Unknown State',
            pincode: pincode || '000000'
        };
        
    } catch (error) {
        console.warn('⚠️ Error parsing BILL TO section:', error.message);
        return null;
    }
}

// Robust Order ID parsing
function parseOrderId(text) {
    try {
        console.log('🔢 Parsing Order ID...');
        
        const patterns = [
            /Order\s+ID\s*[:]*\s*(\d+)/i,
            /Order\s+No\.?\s*[:]*\s*(\d+)/i,
            /Order\s*[:]*\s*(\d+)/i,
            /(\d{12,})/  // Long number fallback
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                console.log(`✅ Found Order ID: ${match[1]}`);
                return match[1];
            }
        }
        
        console.warn('⚠️ Could not find Order ID');
        return null;
    } catch (error) {
        console.warn('⚠️ Error parsing Order ID:', error.message);
        return null;
    }
}

// Robust Invoice ID parsing
function parseInvoiceId(text) {
    try {
        console.log('📄 Parsing Invoice ID...');
        
        const patterns = [
            /Invoice\s+No\.?\s*[:]*\s*([^\s\n]+)/i,
            /Invoice\s+ID\s*[:]*\s*([^\s\n]+)/i,
            /Invoice\s*[:]*\s*([^\s\n]+)/i,
            /INV[-_]?(\w+)/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                console.log(`✅ Found Invoice ID: ${match[1]}`);
                return match[1];
            }
        }
        
        console.warn('⚠️ Could not find Invoice ID');
        return null;
    } catch (error) {
        console.warn('⚠️ Error parsing Invoice ID:', error.message);
        return null;
    }
}

// Robust date parsing
function parseOrderDate(text) {
    try {
        console.log('📅 Parsing Order Date...');
        
        const patterns = [
            /Invoice\s+Date\s*[:]*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
            /Order\s+Date\s*[:]*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
            /Date\s*[:]*\s*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i,
            /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const date = new Date(match[1]);
                if (!isNaN(date)) {
                    console.log(`✅ Found Order Date: ${date.toDateString()}`);
                    return date;
                }
            }
        }
        
        console.warn('⚠️ Could not find valid Order Date, using current date');
        return null;
    } catch (error) {
        console.warn('⚠️ Error parsing Order Date:', error.message);
        return null;
    }
}

// Function to find line item price near product details
function findLineItemPrice(text, productName, orderNumber, quantity) {
    try {
        console.log(`💰 Searching for line item price for: ${productName}`);
        
        // Create a search context around the product mention
        const searchTerms = [
            productName,
            orderNumber,
            `Free Size.*?${quantity}`, // Pattern with size and quantity
        ].filter(term => term && term.length > 3); // Only use meaningful terms
        
        let bestPrice = null;
        let searchRadius = 200; // Characters to search before/after product mention
        
        for (const searchTerm of searchTerms) {
            try {
                const regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
                let match;
                
                while ((match = regex.exec(text)) !== null) {
                    const startPos = Math.max(0, match.index - searchRadius);
                    const endPos = Math.min(text.length, match.index + match[0].length + searchRadius);
                    const contextText = text.substring(startPos, endPos);
                    
                    console.log(`🔍 Searching context around "${searchTerm}": ${contextText.substring(0, 100)}...`);
                    
                    // Look for price patterns in the context
                    const pricePatterns = [
                        // Most specific patterns first
                        /₹\s*([\d,]+(?:\.\d{2})?)/g,
                        /Rs\.?\s*([\d,]+(?:\.\d{2})?)/g,
                        /INR\s*([\d,]+(?:\.\d{2})?)/g,
                        // Look for isolated numbers that might be prices (between 50-5000 range for Meesho)
                        /\b((?:[1-4]?\d{2,3}|5000))\b/g
                    ];
                    
                    for (const pricePattern of pricePatterns) {
                        let priceMatch;
                        while ((priceMatch = pricePattern.exec(contextText)) !== null) {
                            const priceStr = priceMatch[1].replace(/,/g, '');
                            const price = parseFloat(priceStr);
                            
                            // Validate price range (reasonable for Meesho products)
                            if (price >= 50 && price <= 5000) {
                                console.log(`💰 Found potential price: ₹${price} for ${productName}`);
                                
                                // Prefer prices that are closer to the product mention
                                const distance = Math.abs(priceMatch.index - (match.index - startPos));
                                if (!bestPrice || distance < bestPrice.distance) {
                                    bestPrice = { price, distance };
                                }
                            }
                        }
                        pricePattern.lastIndex = 0; // Reset regex
                    }
                }
                regex.lastIndex = 0; // Reset regex
            } catch (regexError) {
                console.warn(`⚠️ Regex error for search term "${searchTerm}":`, regexError.message);
            }
        }
        
        if (bestPrice) {
            console.log(`✅ Found line item price: ₹${bestPrice.price} for ${productName}`);
            return bestPrice.price;
        }
        
        // Fallback: try to find any reasonable price in a broader context
        const fallbackPrice = findFallbackPrice(text, quantity);
        if (fallbackPrice) {
            console.log(`💡 Using fallback price: ₹${fallbackPrice} for ${productName}`);
            return fallbackPrice;
        }
        
        // Final fallback to default
        const defaultPrice = 299;
        console.warn(`⚠️ Could not find line item price for ${productName}, using default: ₹${defaultPrice}`);
        return defaultPrice;
        
    } catch (error) {
        console.warn(`⚠️ Error finding line item price for ${productName}:`, error.message);
        return 299; // Default fallback
    }
}

// Function to find a fallback price based on common patterns
function findFallbackPrice(text, quantity) {
    try {
        // Look for total amounts and try to derive unit price
        const totalPatterns = [
            /Total.*?₹\s*([\d,]+(?:\.\d{2})?)/gi,
            /Amount.*?₹\s*([\d,]+(?:\.\d{2})?)/gi,
            /₹\s*([\d,]+(?:\.\d{2})?)/g
        ];
        
        const foundAmounts = [];
        
        for (const pattern of totalPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount >= 50 && amount <= 10000) {
                    foundAmounts.push(amount);
                }
            }
            pattern.lastIndex = 0;
        }
        
        if (foundAmounts.length > 0) {
            // Try to find a reasonable unit price
            for (const amount of foundAmounts) {
                // Prevent division by zero
                if (quantity > 0) {
                    const unitPrice = Math.round(amount / quantity);
                    if (unitPrice >= 50 && unitPrice <= 2000) {
                        console.log(`💡 Calculated unit price from total: ₹${unitPrice} (₹${amount} ÷ ${quantity})`);
                        return unitPrice;
                    }
                }
            }
            
            // If calculation doesn't work, use the smallest reasonable amount
            const smallestAmount = Math.min(...foundAmounts.filter(a => a >= 100 && a <= 1000));
            if (smallestAmount && smallestAmount !== Infinity) {
                console.log(`💡 Using smallest reasonable amount: ₹${smallestAmount}`);
                return smallestAmount;
            }
        }
        
        return null;
    } catch (error) {
        console.warn('⚠️ Error in fallback price calculation:', error.message);
        return null;
    }
}

// Parse products with better error handling
function parseProducts(text) {
    try {
        console.log('📦 Parsing products...');
        
        const products = [];
        
        // Look for Meesho product patterns
        const productPatterns = [
            // Pattern for products with specific format: ProductName Free Size Qty Color OrderNumber
            /(\w+(?:\s+\w+)*)\s+Free Size\s+(\d+)\s+([^₹\n\d]+?)\s+(\d{17,}_\d+)/g,
            // Alternative pattern for combo products  
            /((?:3?Combo|Ayan|Surat)\w*[^,\n]*)\s+Free Size\s+(\d+)\s+([^₹\n\d]+?)\s+(\d{17,}_\d+)/g
        ];
        
        for (const pattern of productPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                try {
                    const productName = match[1].trim();
                    const quantity = parseInt(match[2]);
                    const color = match[3].trim();
                    const orderNumber = match[4].trim();
                    
                    // Skip if product name is too long (likely extracted wrong text)
                    if (productName.length > 100) {
                        console.log(`⚠️ Skipping product with long name: ${productName.substring(0, 50)}...`);
                        continue;
                    }
                    
                    if (productName && quantity > 0) {
                        // Try to find line item total near this product
                        const lineItemPrice = findLineItemPrice(text, productName, orderNumber, quantity);
                        
                        products.push({
                            name: productName,
                            size: 'Free Size',
                            price: lineItemPrice,
                            quantity: quantity,
                            color: color,
                            orderNumber: orderNumber
                        });
                        
                        console.log(`✅ Found product: ${productName}, Qty: ${quantity}, Color: ${color}, Price: ₹${lineItemPrice}`);
                    }
                } catch (productError) {
                    console.warn('⚠️ Error parsing individual product:', productError.message);
                }
            }
            
            if (products.length > 0) break; // If we found products with one pattern, don't try others
        }
        
        console.log(`📦 Total products found: ${products.length}`);
        return products;
        
    } catch (error) {
        console.warn('⚠️ Error parsing products:', error.message);
        return [];
    }
}

// More robust total amount parsing - look for "Total" and "Rs." together
function parseTotalAmount(text, products) {
    try {
        console.log('💰 Parsing total amount...');
        
        // Calculate from products if available
        if (products.length > 0) {
            const calculatedTotal = products.reduce((sum, product) => {
                return sum + (product.price * product.quantity);
            }, 0);
            
            if (calculatedTotal > 0) {
                console.log(`✅ Calculated total from products: ₹${calculatedTotal}`);
                return calculatedTotal;
            }
        }
        
        // Look for lines containing both "Total" and "Rs." or "₹"
        const lines = text.split(/\n|\r\n/);
        for (const line of lines) {
            if (/total/i.test(line) && (/Rs\.?\s*\d|₹\s*\d/i.test(line))) {
                const amountMatch = line.match(/Rs\.?\s*([\d,]+(?:\.\d{2})?)|₹\s*([\d,]+(?:\.\d{2})?)/i);
                if (amountMatch) {
                    const amount = parseFloat((amountMatch[1] || amountMatch[2]).replace(/,/g, ''));
                    if (amount > 0) {
                        console.log(`✅ Found total amount in line: ₹${amount}`);
                        return amount;
                    }
                }
            }
        }
        
        // Fallback patterns
        const patterns = [
            /Total\s*Amount\s*[:]*\s*₹?\s*([\d,]+(?:\.\d{2})?)/i,
            /Grand\s*Total\s*[:]*\s*₹?\s*([\d,]+(?:\.\d{2})?)/i,
            /Final\s*Amount\s*[:]*\s*₹?\s*([\d,]+(?:\.\d{2})?)/i,
            /Amount\s*[:]*\s*₹?\s*([\d,]+(?:\.\d{2})?)/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const amount = parseFloat(match[1].replace(/,/g, ''));
                if (amount > 0) {
                    console.log(`✅ Found total amount with pattern: ₹${amount}`);
                    return amount;
                }
            }
        }
        
        console.warn('⚠️ Could not find total amount');
        return 0;
        
    } catch (error) {
        console.warn('⚠️ Error parsing total amount:', error.message);
        return 0;
    }
}
