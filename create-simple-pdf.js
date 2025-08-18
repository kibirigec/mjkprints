#!/usr/bin/env node

import PDFDocument from 'pdfkit';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

function createSimplePDF() {
  
  // Ensure directory exists
  mkdirSync('tests/temp', { recursive: true });
  
  const doc = new PDFDocument({
    size: 'LETTER',
    info: {
      Title: 'Simple Test PDF',
      Author: 'Test Suite',
      Subject: 'Testing PDF processing',
      Creator: 'PDFKit Simple Test'
    }
  });

  // Add simple content
  doc.fontSize(20).text('Simple Test PDF', 100, 100);
  doc.fontSize(14).text('This is a very basic PDF for testing.', 100, 150);
  doc.text('Page 1 content here.', 100, 200);
  
  // Generate the PDF
  return new Promise((resolve, reject) => {
    const chunks = [];
    
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      try {
        const pdfBuffer = Buffer.concat(chunks);
        const filePath = join('tests/temp', 'simple-test.pdf');
        writeFileSync(filePath, pdfBuffer);
        resolve(filePath);
      } catch (error) {
        reject(error);
      }
    });
    
    doc.on('error', reject);
    
    doc.end();
  });
}

createSimplePDF().then(path => {
}).catch(error => {
  console.error('❌ Failed to create PDF:', error);
});