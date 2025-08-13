import dotenv from 'dotenv'
import { sendOrderConfirmationEmail } from './lib/email.js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Test order confirmation email without attachments
const testOrderEmail = async () => {
  console.log('🧪 Testing order confirmation email (no attachments)...')
  
  // Debug: Check if environment variables are loaded
  console.log('📋 Environment check:')
  console.log('- MAILERSEND_API_KEY:', process.env.MAILERSEND_API_KEY ? '✅ Set' : '❌ Missing')
  console.log('- MAILERSEND_FROM_EMAIL:', process.env.MAILERSEND_FROM_EMAIL || '❌ Missing')
  console.log('- MAILERSEND_FROM_NAME:', process.env.MAILERSEND_FROM_NAME || '❌ Missing')
  
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

  // NO attachments - empty array
  const mockAttachmentFiles = []

  try {
    console.log('📧 Testing order confirmation email without attachments...')
    const result = await sendOrderConfirmationEmail(mockOrder, mockDownloadLinks, mockAttachmentFiles)
    
    if (result.success) {
      console.log('✅ Order confirmation email sent successfully!')
      console.log('📧 Check modiqube@gmail.com for the order confirmation email')
      console.log('🔗 This email should include download links but no attachments')
    } else {
      console.log('❌ Email sending failed:', result.error)
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testOrderEmail()