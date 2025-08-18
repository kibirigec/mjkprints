import dotenv from 'dotenv'
import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend'

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' })

const testSimpleEmail = async () => {
  
  // Debug environment variables
  
  if (!process.env.MAILERSEND_API_KEY) {
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

    const result = await mailerSend.email.send(emailParams)

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