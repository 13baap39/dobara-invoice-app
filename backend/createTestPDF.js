import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

// Create a test PDF with sample Meesho order data
function createTestPDF() {
  const doc = new PDFDocument();
  const outputPath = path.join(process.cwd(), 'uploads', 'test_meesho_orders.pdf');
  
  doc.pipe(fs.createWriteStream(outputPath));
  
  // Sample data similar to your Meesho_helper repo
  const testOrders = [
    {
      customerName: 'Afrakhatun',
      address: 'Shyamnagar, Lowhat Hatoya Road',
      orderId: 'ORD001'
    },
    {
      customerName: 'Mohit Singh', 
      address: 'Sonu Medikal, SH 35, Kareeriya',
      orderId: 'ORD002'
    },
    {
      customerName: 'Maryam Fatima',
      address: 'Bhiwandi, Maharashtra',
      orderId: 'ORD003'
    }
  ];
  
  testOrders.forEach((order, index) => {
    if (index > 0) doc.addPage();
    
    doc.fontSize(16).text('MEESHO ORDER LABEL', 50, 50);
    doc.fontSize(12);
    doc.text('BILL TO / SHIP TO', 50, 100);
    doc.text(`${order.customerName} - ${order.address}`, 50, 120);
    doc.text(`Order ID: ${order.orderId}`, 50, 140);
    doc.text('Product: Stylish Stole', 50, 160);
    doc.text('Quantity: 1', 50, 180);
    doc.text('Amount: ₹299', 50, 200);
  });
  
  doc.end();
  console.log('✅ Test PDF created at:', outputPath);
}

createTestPDF();
