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
        
        // Map to store grouped orders by orderNumber
        const orderMap = new Map();
        
        for (let i = 0; i < invoiceBlocks.length; i++) {
            const block = invoiceBlocks[i];
            console.log(`\n🔄 Processing invoice block ${i + 1}/${invoiceBlocks.length}`);
            
            try {
                const invoiceData = parseInvoiceBlock(block);
                if (invoiceData) {
                    // Extract the base orderNumber (remove _1 suffix if present)
                    const baseOrderNumber = invoiceData.orderId.replace(/_\d+$/, '');
                    
                    // Initialize order data if this is the first SKU for this order
                    if (!orderMap.has(baseOrderNumber)) {
                        orderMap.set(baseOrderNumber, {
                            customerName: invoiceData.customerData.name,
                            customerCity: invoiceData.customerData.city,
                            orderDate: formatDate(invoiceData.orderDate),
                            totalAmount: invoiceData.totalAmount,
                            orderNumber: baseOrderNumber,
                            hsnCode: extractHsnCode(block),
                            skus: [],
                            // Keep additional data for the final result
                            invoiceId: invoiceData.invoiceId,
                            originalInvoiceId: invoiceData.invoiceId,
                            customerData: invoiceData.customerData
                        });
                    } else {
                        // Update total amount for multi-SKU orders
                        const existingOrder = orderMap.get(baseOrderNumber);
                        existingOrder.totalAmount += invoiceData.totalAmount;
                    }
                    
                    // Add all products from this invoice block to the order's SKUs
                    const orderData = orderMap.get(baseOrderNumber);
                    for (const product of invoiceData.products) {
                        orderData.skus.push({
                            name: product.name,
                            size: product.size,
                            price: product.price,
                            quantity: product.quantity || 1,
                            color: product.color || ''
                        });
                    }
                    
                    console.log(`✅ Successfully parsed invoice block ${i + 1} for order ${baseOrderNumber}`);
                } else {
                    console.log(`⚠️ No data found in invoice block ${i + 1}`);
                }
            } catch (blockError) {
                console.error(`❌ Error parsing invoice block ${i + 1}:`, blockError.message);
            }
        }
        
        // Convert the grouped orders to the expected result format
        const results = [];
        for (const [orderNumber, orderData] of orderMap.entries()) {
            // Create a single record for each order (with all SKUs)
            results.push({
                orderId: orderNumber,
                invoiceId: `${orderData.invoiceId}_${Date.now()}`, // Make unique with timestamp
                originalInvoiceId: orderData.originalInvoiceId,
                orderDate: orderData.orderDate,
                name: orderData.customerData.name,
                address: orderData.customerData.address,
                area: orderData.customerData.area,
                city: orderData.customerData.city,
                state: orderData.customerData.state,
                pincode: orderData.customerData.pincode,
                skus: orderData.skus,
                hsnCode: orderData.hsnCode,
                totalAmount: orderData.totalAmount
            });
        }
        
        console.log(`🎯 Total unique orders: ${results.length}`);
        
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

// Helper function to format date in DD.MM.YYYY format
function formatDate(date) {
    if (!date || isNaN(new Date(date).getTime())) {
        // If date is invalid, return today's date in the required format
        const today = new Date();
        return `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    }
    
    const d = new Date(date);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
}

// Extract HSN code from text (typically 6214 for Meesho fashion items)
function extractHsnCode(text) {
    try {
        // Common patterns for HSN codes in Meesho invoices
        const patterns = [
            /HSN.*?(\d{4})/i,
            /HSN\s*Code\s*:?\s*(\d{4})/i,
            /Harmonized.*?Code\s*:?\s*(\d{4})/i,
            /Item\s*Code\s*:?\s*(\d{4})/i
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                console.log(`✅ Found HSN Code: ${match[1]}`);
                return match[1];
            }
        }
        
        // Default HSN code for textile articles (common for Meesho fashion)
        console.log('⚠️ Could not find HSN Code, using default 6214');
        return '6214';
    } catch (error) {
        console.warn('⚠️ Error extracting HSN Code:', error.message);
        return '6214';
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
        
        // Extract text after BILL TO section (next ~500 characters should contain customer info)
        const billToSection = text.substring(billToIndex, billToIndex + 500);
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
        const addressLines = lines.slice(startIndex + 1, startIndex + 5); // Take up to 4 lines after name
        const addressText = addressLines.join(' ');
        
        // Try pattern matching for pincode first (most reliable)
        const pincodeMatch = addressText.match(/(\d{6})/);
        if (pincodeMatch) {
            pincode = pincodeMatch[1];
        }
        
        // Enhanced state extraction with abbreviations
        const statePatterns = [
            // Full names
            /(Gujarat|Maharashtra|Rajasthan|Tamil Nadu|Karnataka|Kerala|Andhra Pradesh|Telangana|West Bengal|Uttar Pradesh|Madhya Pradesh|Bihar|Odisha|Punjab|Haryana|Jharkhand|Assam|Himachal Pradesh|Uttarakhand|Chhattisgarh|Goa|Manipur|Meghalaya|Tripura|Nagaland|Mizoram|Arunachal Pradesh|Sikkim|Delhi|Jammu|Kashmir)/i,
            // Common abbreviations
            /\b(AP|TN|KA|KL|MH|GJ|RJ|UP|MP|WB|BR|OR|PB|HR|JH|AS|HP|UK|CG|GA|MN|ML|TR|NL|MZ|AR|SK|DL)\b/i
        ];
        
        // Try each pattern for state extraction
        for (const pattern of statePatterns) {
            const match = addressText.match(pattern);
            if (match && match[1]) {
                state = match[1];
                break;
            }
        }
        
        // Map state abbreviations to full names if needed
        const stateAbbreviations = {
            'AP': 'Andhra Pradesh',
            'TN': 'Tamil Nadu',
            'KA': 'Karnataka',
            'KL': 'Kerala',
            'MH': 'Maharashtra',
            'GJ': 'Gujarat',
            'RJ': 'Rajasthan',
            'UP': 'Uttar Pradesh',
            'MP': 'Madhya Pradesh',
            'WB': 'West Bengal',
            'BR': 'Bihar',
            'OR': 'Odisha',
            'PB': 'Punjab',
            'HR': 'Haryana',
            'JH': 'Jharkhand',
            'AS': 'Assam',
            'HP': 'Himachal Pradesh',
            'UK': 'Uttarakhand',
            'CG': 'Chhattisgarh',
            'GA': 'Goa',
            'DL': 'Delhi'
        };
        
        if (state && stateAbbreviations[state.toUpperCase()]) {
            state = stateAbbreviations[state.toUpperCase()];
        }
        
        // Enhanced city extraction - multiple strategies
        // 1. Look for patterns like "City - Pincode" or "City, State"
        const cityPatterns = [
            // City followed by pincode with dash
            /([A-Za-z\s]+?)\s*-\s*\d{6}/i,
            // City followed by state with comma
            new RegExp(`([A-Za-z\\s]+?)\\s*,\\s*${state}`, 'i'),
            // City between commas in address
            /,\s*([A-Za-z\s]+?)\s*,/i,
            // Last word before pincode if nothing else worked
            /([A-Za-z]+)\s+\d{6}/i
        ];
        
        for (const pattern of cityPatterns) {
            if (!city) {
                const match = addressText.match(pattern);
                if (match && match[1]) {
                    city = match[1].trim().replace(/,$/, '');
                    break;
                }
            }
        }
        
        // If city still not found, try to extract it from address lines
        if (!city && addressLines.length >= 2) {
            // The city is often in the second-to-last line before pincode
            const potentialCityLine = addressLines[addressLines.length - 2];
            const cityFromLine = potentialCityLine.split(/,|\s-\s/).pop().trim();
            if (cityFromLine && cityFromLine.length > 2 && !/\d{6}/.test(cityFromLine)) {
                city = cityFromLine;
            }
        }
        
        // Extract address and area
        const addressParts = addressText.split(/,|\n/).map(part => part.trim()).filter(part => part.length > 0);
        
        // First part is typically the address
        if (addressParts.length > 0) {
            address = addressParts[0];
            
            // Second part is often the area
            if (addressParts.length > 1) {
                area = addressParts[1];
            }
        }
        
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
            /Invoice\s+Date\s*[:]*\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
            /Order\s+Date\s*[:]*\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
            /Date\s*[:]*\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/i,
            /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})/, // General date pattern
            /(\d{2})[-\.\/](\d{2})[-\.\/](\d{4})/, // DD-MM-YYYY
            /(\d{4})[-\.\/](\d{2})[-\.\/](\d{2})/ // YYYY-MM-DD
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                let date;
                
                // Handle YYYY-MM-DD format
                if (match.length === 4 && match[1].length === 4) {
                    date = new Date(`${match[1]}-${match[2]}-${match[3]}`);
                } 
                // Handle DD-MM-YYYY format
                else if (match.length === 4 && match[3].length === 4) {
                    date = new Date(`${match[3]}-${match[2]}-${match[1]}`);
                }
                // Default parsing
                else {
                    // Replace various separators with standard format
                    const standardizedDate = match[1].replace(/[-\.]/g, '/');
                    
                    // Try to parse the date
                    const parts = standardizedDate.split('/');
                    
                    // Check if it's likely DD/MM/YYYY or MM/DD/YYYY
                    if (parts.length === 3) {
                        const day = parseInt(parts[0]);
                        const month = parseInt(parts[1]) - 1; // JS months are 0-based
                        const year = parseInt(parts[2]);
                        
                        // If day > 12, it's likely DD/MM/YYYY format
                        if (day > 12) {
                            date = new Date(year, month, day);
                        } else {
                            // Try both interpretations and check which one seems valid
                            const dateAsDDMMYYYY = new Date(year, month, day);
                            const dateAsMMDDYYYY = new Date(year, day - 1, month + 1);
                            
                            // Choose the more reasonable date (prefer the one closer to current date)
                            const today = new Date();
                            const diffDD = Math.abs(today - dateAsDDMMYYYY);
                            const diffMM = Math.abs(today - dateAsMMDDYYYY);
                            
                            date = diffDD < diffMM ? dateAsDDMMYYYY : dateAsMMDDYYYY;
                        }
                    } else {
                        // Fallback to standard parsing
                        date = new Date(standardizedDate);
                    }
                }
                
                if (!isNaN(date.getTime())) {
                    console.log(`✅ Found Order Date: ${date.toDateString()}`);
                    return date;
                }
            }
        }
        
        // Try more relaxed patterns - look for dates like "25 July 2025"
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const monthPattern = new RegExp(`(\\d{1,2})\\s+(${monthNames.join('|')})\\s+(\\d{4})`, 'i');
        
        const monthMatch = text.match(monthPattern);
        if (monthMatch) {
            const day = parseInt(monthMatch[1]);
            const monthName = monthMatch[2].toLowerCase();
            const year = parseInt(monthMatch[3]);
            
            const month = monthNames.indexOf(monthName);
            if (month !== -1) {
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                    console.log(`✅ Found Order Date (text format): ${date.toDateString()}`);
                    return date;
                }
            }
        }
        
        console.warn('⚠️ Could not find valid Order Date, using current date');
        return new Date(); // Return current date if no valid date found
    } catch (error) {
        console.warn('⚠️ Error parsing Order Date:', error.message);
        return new Date(); // Return current date on error
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
            /((?:3?Combo|Ayan|Surat|Kurta|Set|Pack|New|Trendy|Stylish|Elegant|Fashion|Designer)\w*[^,\n]*)\s+Free Size\s+(\d+)\s+([^₹\n\d]+?)\s+(\d{17,}_\d+)/g,
            // Backup pattern with less strict requirements
            /([A-Za-z]\w+(?:\s+\w+){1,5})\s+(?:Free Size|Freesize)\s+(\d+)\s+([A-Za-z]+)/g
        ];
        
        for (const pattern of productPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                try {
                    const productName = match[1].trim();
                    const quantity = parseInt(match[2]);
                    const color = match[3].trim();
                    // orderNumber might be missing in the backup pattern
                    const orderNumber = match[4] ? match[4].trim() : extractOrderId(text);
                    
                    // Skip if product name is too long (likely extracted wrong text)
                    if (productName.length > 100) {
                        console.log(`⚠️ Skipping product with long name: ${productName.substring(0, 50)}...`);
                        continue;
                    }
                    
                    // Skip entries that are likely not actual products
                    if (productName.toLowerCase().includes('invoice') || 
                        productName.toLowerCase().includes('bill') || 
                        productName.toLowerCase().includes('total')) {
                        console.log(`⚠️ Skipping non-product entry: ${productName}`);
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
            
            // Continue to next pattern only if we haven't found any products yet
            if (products.length > 0) break;
        }
        
        // Alternative approach: Look for Product/SKU in description or product details section
        if (products.length === 0) {
            console.log('🔍 Trying alternative product extraction method...');
            
            // Find Product Details or Description section
            const productSectionMatch = text.match(/(Product Details|Description|DESCRIPTION).*?\n([\s\S]{10,500}?)(?:\n\n|\n[A-Z\s]{5,}|Total)/i);
            if (productSectionMatch && productSectionMatch[2]) {
                const productText = productSectionMatch[2];
                console.log('📦 Found product section:', productText.substring(0, 100) + '...');
                
                // Look for SKU patterns in this section
                const skuPatterns = [
                    /SKU\s*:?\s*([A-Z0-9]+)/gi,
                    /Product\s+Code\s*:?\s*([A-Z0-9]+)/gi,
                    /Item\s+Code\s*:?\s*([A-Z0-9]+)/gi
                ];
                
                for (const pattern of skuPatterns) {
                    let skuMatch;
                    while ((skuMatch = pattern.exec(productText)) !== null) {
                        const sku = skuMatch[1].trim();
                        const price = findLineItemPrice(text, sku, null, 1);
                        
                        // Extract product name near this SKU
                        const nameSearch = new RegExp(`([A-Za-z][A-Za-z\\s\\w]{3,50}?)(?:\\s+${sku}|\\n)`, 'i');
                        const nameMatch = productText.match(nameSearch);
                        const productName = nameMatch ? nameMatch[1].trim() : `Product ${sku}`;
                        
                        products.push({
                            name: productName,
                            size: 'Free Size',
                            price: price,
                            quantity: 1,
                            color: 'Not specified',
                            orderNumber: extractOrderId(text)
                        });
                        
                        console.log(`✅ Found SKU: ${sku}, Name: ${productName}, Price: ₹${price}`);
                    }
                    
                    if (products.length > 0) break;
                }
            }
        }
        
        // If still no products found, try to extract any item description or SKU code
        if (products.length === 0) {
            const fallbackItemMatch = text.match(/(?:Item|Product)\s*:?\s*([A-Za-z][A-Za-z\s\w]{3,50})/i);
            if (fallbackItemMatch) {
                const productName = fallbackItemMatch[1].trim();
                const price = parseTotalAmount(text, []);
                
                products.push({
                    name: productName,
                    size: 'Free Size',
                    price: price > 0 ? price : 299,
                    quantity: 1,
                    color: 'Not specified',
                    orderNumber: extractOrderId(text)
                });
                
                console.log(`⚠️ Using fallback product extraction: ${productName}, Price: ₹${price}`);
            }
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
