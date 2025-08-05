import { getDownloadsByEmail } from '../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET'])
    return res.status(405).end('Method Not Allowed')
  }

  try {
    const { email } = req.query

    if (!email || !email.includes('@')) {
      return res.status(400).json({ 
        error: 'Valid email address is required' 
      })
    }

    // Get downloads for the email
    const downloads = await getDownloadsByEmail(email)

    res.status(200).json(downloads)

  } catch (error) {
    console.error('Error fetching downloads:', error)
    res.status(500).json({ 
      error: 'Failed to fetch downloads',
      details: error.message 
    })
  }
}