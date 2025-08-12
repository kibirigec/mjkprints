import { MailerSend, EmailParams, Sender, Recipient, Attachment } from 'mailersend'

// Initialize MailerSend
const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || '',
})

const FROM_EMAIL = process.env.MAILERSEND_FROM_EMAIL || 'noreply@mjkprints.com'
const FROM_NAME = process.env.MAILERSEND_FROM_NAME || 'MJK Prints'
const SITE_NAME = 'MJK Prints'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001'

// Email templates
const createOrderConfirmationTemplate = (order, downloadLinks, attachmentFiles = []) => {
  const itemsList = order.order_items?.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #eee;">
        <strong>${item.products?.title || 'Digital Planner'}</strong><br>
        <small style="color: #666;">Quantity: ${item.quantity}</small>
      </td>
      <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
        $${item.total_price}
      </td>
    </tr>
  `).join('') || ''

  // Create attachment notification if files are attached
  const attachmentNotification = attachmentFiles?.length > 0 ? `
    <div style="margin: 16px 0; padding: 16px; background: #e8f5e8; border-radius: 8px; border-left: 4px solid #4caf50;">
      <h4 style="margin: 0 0 8px 0; color: #2c3e50;">📎 Files Attached to This Email</h4>
      <p style="margin: 0 0 12px 0; color: #666;">Your digital planners are attached to this email:</p>
      ${attachmentFiles.map(file => `
        <div style="margin: 8px 0; padding: 8px 12px; background: white; border-radius: 4px;">
          <strong style="color: #2c3e50;">📄 ${file.filename}</strong>
          <span style="font-size: 12px; color: #666; margin-left: 8px;">(${(file.fileSize / 1024 / 1024).toFixed(1)} MB)</span>
        </div>
      `).join('')}
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #666;">
        Simply scroll down in this email to find and download your attached files.
      </p>
    </div>
  ` : ''

  const downloadLinksList = downloadLinks?.map(link => `
    <div style="margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #e0bfb8;">
      <h4 style="margin: 0 0 8px 0; color: #2c3e50;">🔗 Backup Download Link</h4>
      <p style="margin: 0 0 12px 0; color: #666;">Alternative download link (if needed)</p>
      <a href="${link.download_url}" 
         style="display: inline-block; background: #e0bfb8; color: #2c3e50; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; font-weight: bold;">
        Download Your Planner
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
        <p style="margin: 10px 0 0 0; opacity: 0.9;">Your digital planner is ready to download</p>
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

      <!-- Attached Files Notification -->
      ${attachmentNotification}

      <!-- Download Links (Backup) -->
      ${downloadLinksList ? `
      <div style="background: white; border: 1px solid #eee; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h2 style="color: #2c3e50; margin-top: 0;">Backup Download Links</h2>
        <p style="color: #666; margin-bottom: 20px;">If you need to re-download your files, these links will remain active for 7 days.</p>
        
        ${downloadLinksList}
      </div>
      ` : ''}

      <!-- Important Information -->
      <div style="background: #e3f2fd; border: 1px solid #bbdefb; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
        <h3 style="color: #1976d2; margin-top: 0;">Important Information</h3>
        <ul style="margin: 0; padding-left: 20px; color: #333;">
          ${attachmentFiles?.length > 0 ? 
            '<li>Your digital planners are attached to this email for immediate access</li>' : 
            '<li>Download links are provided for your digital planners</li>'
          }
          <li>Files are provided in high-resolution format</li>
          <li>Save your files to a secure location on your device</li>
          <li>Backup download links (if provided) are valid for 7 days</li>
          <li>Contact support if you need assistance accessing your files</li>
        </ul>
      </div>

      <!-- Support -->
      <div style="text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; padding-top: 20px;">
        <p>Need help? Contact us at <a href="mailto:support@mjkprints.com" style="color: #e0bfb8;">support@mjkprints.com</a></p>
        <p>Thank you for choosing MJK Digital Planners!</p>
        <p style="margin-top: 20px;">
          <a href="${SITE_URL}" style="color: #2c3e50; text-decoration: none;">${SITE_NAME}</a> | 
          Digital Planner Marketplace
        </p>
      </div>

    </body>
    </html>
  `
}

// Send order confirmation email with optional file attachments
export const sendOrderConfirmationEmail = async (order, downloadLinks, attachmentFiles = []) => {
  if (!process.env.MAILERSEND_API_KEY) {
    console.warn('MailerSend API key not configured. Email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    console.log('[EMAIL] Preparing order confirmation email', { 
      orderId: order.id,
      email: order.email,
      attachmentCount: attachmentFiles.length,
      downloadLinkCount: downloadLinks?.length || 0
    })
    
    const sentFrom = new Sender(FROM_EMAIL, FROM_NAME)
    const recipients = [new Recipient(order.email)]
    
    // Prepare attachments for MailerSend
    const attachments = attachmentFiles.map(file => new Attachment(
      file.content,
      file.filename,
      file.disposition || 'attachment'
    ))
    
    // Create email parameters
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject(`Your Digital Planner ${attachmentFiles.length > 0 ? 'Files' : 'Download'} - Order #${order.id.slice(-8)}`)
      .setHtml(createOrderConfirmationTemplate(order, downloadLinks, attachmentFiles))
      .setText(`
        Thank you for your purchase from ${SITE_NAME}!
        
        Order ID: ${order.id}
        Total: $${order.total_amount}
        
        ${attachmentFiles.length > 0 ? 
          `Your digital planners are attached to this email:\n${attachmentFiles.map(file => `- ${file.filename} (${(file.fileSize / 1024 / 1024).toFixed(1)} MB)`).join('\n')}` :
          `Your download links:\n${downloadLinks?.map(link => `- ${link.download_url}`).join('\n') || 'Download links will be available shortly.'}`
        }
        
        ${downloadLinks?.length > 0 ? 'Backup download links expire in 7 days.' : ''}
        
        If you need assistance, contact support@mjkprints.com
        
        Thank you for choosing MJK Digital Planners!
      `)
      .setTags(['order_confirmation', 'digital_planners'])
    
    // Add attachments if available
    if (attachments.length > 0) {
      emailParams.setAttachments(attachments)
      console.log('[EMAIL] Added attachments to email', {
        attachmentCount: attachments.length,
        filenames: attachmentFiles.map(f => f.filename)
      })
    }

    await mailerSend.email.send(emailParams)
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
  if (!process.env.MAILERSEND_API_KEY) {
    console.warn('MailerSend API key not configured. Reminder email not sent.')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const sentFrom = new Sender(FROM_EMAIL, FROM_NAME)
    const recipients = [new Recipient(customerEmail)]
    
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Reminder: Your Digital Planner Downloads')
      .setHtml(`
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Don't Forget Your Digital Planners!</h2>
          <p>You have digital planners waiting for download. Your links will expire soon.</p>
          
          ${downloadLinks?.map(link => `
            <div style="margin: 16px 0; padding: 16px; background: #f8f9fa; border-radius: 8px;">
              <a href="${link.download_url}" style="color: #2c3e50; text-decoration: none;">
                Download Your Planner
              </a>
              <p style="font-size: 12px; color: #666;">Expires: ${new Date(link.expires_at).toLocaleDateString()}</p>
            </div>
          `).join('') || ''}
          
          <p>Questions? Contact us at support@mjkprints.com</p>
        </div>
      `)
      .setTags(['download_reminder', 'digital_planners'])

    await mailerSend.email.send(emailParams)
    return { success: true }

  } catch (error) {
    console.error('Reminder email error:', error)
    return { success: false, error: error.message }
  }
}