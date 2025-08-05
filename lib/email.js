import sgMail from '@sendgrid/mail'

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@mjkprints.com'
const SITE_NAME = 'MJK Prints'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

// Email templates
const createOrderConfirmationTemplate = (order, downloadLinks) => {
  const itemsList = order.order_items?.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.products?.title || 'Digital Artwork'}</strong><br>
        <small style="color: #666;">Quantity: ${item.quantity}</small>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        $${item.total_price}
      </td>
    </tr>
  `).join('') || ''

  const downloadLinksList = downloadLinks?.map(link => `
    <div style="margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #e0bfb8;">
      <h4 style="margin: 0 0 8px 0; color: #2c3e50;">Digital Download Ready</h4>
      <p style="margin: 0 0 12px 0; color: #666;">Your artwork is ready for download</p>
      <a href="${link.download_url}" 
         style="display: inline-block; background: #e0bfb8; color: #2c3e50; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; font-weight: bold;">
        Download Now
      </a>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #999;">
        Link expires: ${new Date(link.expires_at).toLocaleDateString()}
      </p>
    </div>
  `).join('') || ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation - ${SITE_NAME}</title>
    </head>
    <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <!-- Header -->
      <div style="background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%); color: #f5f0e6; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
        <h1 style="margin: 0; font-size: 28px;">Thank You for Your Purchase!</h1>
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your digital artwork is ready to download</p>
      </div>

      <!-- Order Details -->
      <div style="background: white; border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Order Details</h2>
        
        <table style="width: 100%; margin-bottom: 20px;">
          <tr>
            <td><strong>Order ID:</strong></td>
            <td style="font-family: monospace; font-size: 14px;">${order.id}</td>
          </tr>
          <tr>
            <td><strong>Email:</strong></td>
            <td>${order.email}</td>
          </tr>
          <tr>
            <td><strong>Order Date:</strong></td>
            <td>${new Date(order.created_at).toLocaleDateString()}</td>
          </tr>
          <tr>
            <td><strong>Total Amount:</strong></td>
            <td><strong>$${order.total_amount}</strong></td>
          </tr>
        </table>

        <h3 style="color: #2c3e50;">Items Purchased</h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${itemsList}
          <tr style="background: #f8f9fa;">
            <td style="padding: 12px; font-weight: bold;">Total</td>
            <td style="padding: 12px; text-align: right; font-weight: bold;">$${order.total_amount}</td>
          </tr>
        </table>
      </div>

      <!-- Download Links -->
      <div style="background: white; border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Your Downloads</h2>
        <p style="color: #666; margin-bottom: 20px;">Click the links below to download your digital artwork. Each link will remain active for 7 days.</p>
        
        ${downloadLinksList}
      </div>

      <!-- Important Information -->
      <div style="background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #1976d2; margin-top: 0;">Important Information</h3>
        <ul style="margin: 0; padding-left: 20px; color: #333;">
          <li>Download links are valid for 7 days from purchase</li>
          <li>You can download each file up to 5 times</li>
          <li>Files are provided in high-resolution format</li>
          <li>Save your downloads to a secure location</li>
        </ul>
      </div>

      <!-- Support -->
      <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
        <p>Need help? Contact us at <a href="mailto:support@mjkprints.com" style="color: #e0bfb8;">support@mjkprints.com</a></p>
        <p>Thank you for supporting independent artists!</p>
        <p style="margin-top: 20px;">
          <a href="${SITE_URL}" style="color: #2c3e50; text-decoration: none;">${SITE_NAME}</a> | 
          Digital Art Marketplace
        </p>
      </div>

    </body>
    </html>
  `
}

// Send order confirmation email
export const sendOrderConfirmationEmail = async (order, downloadLinks) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const msg = {
      to: order.email,
      from: {
        email: FROM_EMAIL,
        name: SITE_NAME
      },
      subject: `Your Digital Art Download - Order #${order.id.slice(-8)}`,
      html: createOrderConfirmationTemplate(order, downloadLinks),
      // Plain text fallback
      text: `
        Thank you for your purchase from ${SITE_NAME}!
        
        Order ID: ${order.id}
        Total: $${order.total_amount}
        
        Your download links:
        ${downloadLinks?.map(link => `- ${link.download_url}`).join('\n') || 'Download links will be available shortly.'}
        
        Links expire in 7 days. If you need assistance, contact support@mjkprints.com
        
        Thank you for supporting independent artists!
      `,
      trackingSettings: {
        clickTracking: {
          enable: true
        },
        openTracking: {
          enable: true
        }
      },
      categories: ['order_confirmation', 'digital_downloads']
    }

    await sgMail.send(msg)
    console.log(`Order confirmation email sent to ${order.email}`)
    
    return { success: true }

  } catch (error) {
    console.error('Email sending error:', error)
    return { 
      success: false, 
      error: error.message || 'Failed to send email'
    }
  }
}

// Send download reminder email (can be used for follow-ups)
export const sendDownloadReminderEmail = async (customerEmail, downloadLinks) => {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SendGrid API key not configured. Reminder email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const msg = {
      to: customerEmail,
      from: {
        email: FROM_EMAIL,
        name: SITE_NAME
      },
      subject: 'Reminder: Your Digital Art Downloads',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Don't Forget Your Downloads!</h2>
          <p>You have digital artwork waiting for download. Your links will expire soon.</p>
          
          ${downloadLinks?.map(link => `
            <div style="margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px;">
              <a href="${link.download_url}" style="color: #2c3e50; text-decoration: none;">
                Download Your Artwork
              </a>
              <p style="font-size: 12px; color: #666;">Expires: ${new Date(link.expires_at).toLocaleDateString()}</p>
            </div>
          `).join('') || ''}
          
          <p>Questions? Contact us at support@mjkprints.com</p>
        </div>
      `,
      categories: ['download_reminder']
    }

    await sgMail.send(msg)
    return { success: true }

  } catch (error) {
    console.error('Reminder email error:', error)
    return { success: false, error: error.message }
  }
}