import dotenv from 'dotenv'
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const testSimpleEmail = async () => {
  console.log('🧪 Testing MailerSend with simple email (no attachments)...')
  
  // Debug environment variables
  console.log('📋 Environment check:')
  console.log('- MAILERSEND_API_KEY:', process.env.MAILERSEND_API_KEY ? `✅ Set (${process.env.MAILERSEND_API_KEY.substring(0, 10)}...)` : '❌ Missing')
  console.log('- MAILERSEND_FROM_EMAIL:', process.env.MAILERSEND_FROM_EMAIL || '❌ Missing')
  
  if (!process.env.MAILERSEND_API_KEY) {
    console.log('❌ API key not found')
    return
  }

  try {
    // Initialize MailerSend
    const mailerSend = new MailerSend({
      apiKey: process.env.MAILERSEND_API_KEY,
    })

    const sentFrom = new Sender(process.env.MAILERSEND_FROM_EMAIL, process.env.MAILERSEND_FROM_NAME)
    // Use the same email that you registered with MailerSend
    const recipients = [new Recipient('modiqube@gmail.com', 'Calvin')]

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('MailerSend Test - Simple Email')
      .setHtml(`
        <h1>Test Email from MJK Prints</h1>
        <p>This is a simple test email to verify MailerSend integration.</p>
        <p>If you receive this, the email system is working!</p>
      `)
      .setText('Test email from MJK Prints. If you receive this, the email system is working!')

    console.log('📧 Sending simple test email...')
    const result = await mailerSend.email.send(emailParams)
    console.log('✅ Email sent successfully!')
    console.log('📧 Check calvin@kibirige.net for the test email')
    console.log('Response:', result)

  } catch (error) {
    console.error('❌ Email sending failed:')
    console.error('Full error object:', error)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    
    if (error.response) {
      console.error('Response status:', error.response.status)
      console.error('Response data:', error.response.data)
      console.error('Response headers:', error.response.headers)
    }
    
    // Try to log any other error properties
    console.error('Error keys:', Object.keys(error))
  }
}

testSimpleEmail()