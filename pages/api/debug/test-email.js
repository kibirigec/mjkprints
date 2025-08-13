import { verifyAdminSession } from '../admin/auth'
import { sendOrderConfirmationEmail } from '../../../lib/email'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify admin access
  try {
    const isAuthenticated = verifyAdminSession(req, res)
    if (!isAuthenticated) {
      return // Response already sent by verifyAdminSession
    }
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { testType, recipient } = req.body

  if (!recipient) {
    return res.status(400).json({ error: 'Recipient email is required' })
  }

  try {
    console.log('[TEST-EMAIL] Starting email test...', { testType, recipient })

    if (testType === 'order-confirmation') {
      // Test order confirmation email
      const mockOrder = {
        id: 'test-order-' + Date.now(),
        email: recipient,
        total_amount: 19.99,
        created_at: new Date().toISOString(),
        order_items: [
          {
            id: 'test-item-1',
            quantity: 1,
            total_price: 19.99,
            products: {
              title: '2025 Digital Goal Planner - Test Product'
            }
          }
        ]
      }

      const mockDownloadLinks = [
        {
          download_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/download/test-item-1?email=${encodeURIComponent(recipient)}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      // Mock attachment (optional - can be empty for testing without attachments)
      const mockAttachmentFiles = []

      const result = await sendOrderConfirmationEmail(mockOrder, mockDownloadLinks, mockAttachmentFiles)
      
      if (result.success) {
        console.log('[TEST-EMAIL] Order confirmation test successful')
        return res.status(200).json({
          success: true,
          message: 'Order confirmation test email sent successfully!',
          details: {
            type: 'order-confirmation',
            recipient,
            orderId: mockOrder.id
          }
        })
      } else {
        console.error('[TEST-EMAIL] Order confirmation test failed:', result.error)
        return res.status(500).json({
          success: false,
          error: 'Failed to send test email',
          details: result.error
        })
      }
    } else {
      return res.status(400).json({ error: 'Invalid test type. Use "order-confirmation"' })
    }

  } catch (error) {
    console.error('[TEST-EMAIL] Error sending test email:', error)
    return res.status(500).json({
      success: false,
      error: 'Failed to send test email',
      details: error.message
    })
  }
}