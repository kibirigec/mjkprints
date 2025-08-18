import dotenv from 'dotenv'
import { sendOrderConfirmationEmail } from './lib/email.js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Test MailerSend integration
const testEmail = async () => {
  
  // Debug: Check if environment variables are loaded
  
  // Mock order data
  const mockOrder = {
    id: 'test-order-123',
    email: 'modiqube@gmail.com', // Your MailerSend registration email
    total_amount: 19.99,
    created_at: new Date().toISOString(),
    order_items: [
      {
        id: 'item-1',
        quantity: 1,
        total_price: 19.99,
        products: {
          title: '2025 Digital Goal Planner'
        }
      }
    ]
  }

  // Mock download links
  const mockDownloadLinks = [
    {
      download_url: 'http://localhost:3001/api/download/item-1?email=modiqube@gmail.com',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    }
  ]

  // Mock attachment files (for testing attachment feature)
  const mockAttachmentFiles = [
    {
      content: 'VGVzdCBQREYgY29udGVudCBmb3IgZGVtb25zdHJhdGlvbg==', // Base64 encoded "Test PDF content for demonstration"
      filename: '2025_Digital_Goal_Planner.pdf',
      type: 'application/pdf',
      disposition: 'attachment',
      productTitle: '2025 Digital Goal Planner',
      fileSize: 1048576 // 1MB for demo
    }
  ]

  try {
    const result = await sendOrderConfirmationEmail(mockOrder, mockDownloadLinks, mockAttachmentFiles)
    
    if (result.success) {
    } else {
      
      if (result.error.includes('not configured')) {
      }
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testEmail()