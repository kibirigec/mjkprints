import dotenv from 'dotenv'
import { sendOrderConfirmationEmail } from './lib/email.js'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

// Test MailerSend integration
const testEmail = async () => {
  console.log('🧪 Testing MailerSend integration...')
  
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
    console.log('🧪 Testing MailerSend with email attachments...')
    const result = await sendOrderConfirmationEmail(mockOrder, mockDownloadLinks, mockAttachmentFiles)
    
    if (result.success) {
      console.log('✅ Email sent successfully!')
      console.log('📧 Check the recipient email for the digital planner confirmation')
      console.log('📎 This email should include 1 attached file: 2025_Digital_Goal_Planner.pdf')
    } else {
      console.log('❌ Email sending failed:', result.error)
      
      if (result.error.includes('not configured')) {
        console.log('\n📋 Setup Instructions:')
        console.log('1. Sign up for MailerSend at https://www.mailersend.com/')
        console.log('2. Get your API key from the dashboard')
        console.log('3. Add domain and verify it')
        console.log('4. Update .env.local with:')
        console.log('   MAILERSEND_API_KEY=your_api_key_here')
        console.log('   MAILERSEND_FROM_EMAIL=noreply@yourdomain.com')
        console.log('5. Restart the development server')
      }
    }
  } catch (error) {
    console.error('💥 Test failed:', error.message)
  }
}

testEmail()