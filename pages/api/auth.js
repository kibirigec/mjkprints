let users = [
  {
    id: 1,
    email: 'demo@seller.com',
    name: 'Demo Seller',
    role: 'seller',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    email: 'customer@example.com',
    name: 'Demo Customer',
    role: 'customer',
    createdAt: '2024-01-01T00:00:00Z'
  }
]

let sessions = []
let nextSessionId = 1

export default function handler(req, res) {
  const { method } = req

  switch (method) {
    case 'POST':
      const { action, email, password, name } = req.body

      if (action === 'login') {
        try {
          if (!email || !password) {
            return res.status(400).json({ 
              error: 'Email and password are required' 
            })
          }

          const user = users.find(u => u.email === email)
          
          if (!user) {
            return res.status(401).json({ 
              error: 'Invalid email or password' 
            })
          }

          const session = {
            id: nextSessionId++,
            userId: user.id,
            token: `session_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString()
          }

          sessions.push(session)

          res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role
            },
            session: {
              token: session.token,
              expiresAt: session.expiresAt
            }
          })
        } catch (error) {
          res.status(500).json({ error: 'Login failed' })
        }
      } 
      
      else if (action === 'register') {
        try {
          if (!email || !password || !name) {
            return res.status(400).json({ 
              error: 'Email, password, and name are required' 
            })
          }

          const existingUser = users.find(u => u.email === email)
          
          if (existingUser) {
            return res.status(409).json({ 
              error: 'User with this email already exists' 
            })
          }

          const newUser = {
            id: users.length + 1,
            email: email.toLowerCase().trim(),
            name: name.trim(),
            role: 'seller',
            createdAt: new Date().toISOString()
          }

          users.push(newUser)

          const session = {
            id: nextSessionId++,
            userId: newUser.id,
            token: `session_${Date.now()}_${Math.random().toString(36).substring(2)}`,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString()
          }

          sessions.push(session)

          res.status(201).json({
            success: true,
            message: 'Registration successful',
            user: {
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              role: newUser.role
            },
            session: {
              token: session.token,
              expiresAt: session.expiresAt
            }
          })
        } catch (error) {
          res.status(500).json({ error: 'Registration failed' })
        }
      } 
      
      else if (action === 'logout') {
        try {
          const { token } = req.body

          if (!token) {
            return res.status(400).json({ error: 'Session token is required' })
          }

          const sessionIndex = sessions.findIndex(s => s.token === token)
          
          if (sessionIndex !== -1) {
            sessions.splice(sessionIndex, 1)
          }

          res.status(200).json({
            success: true,
            message: 'Logout successful'
          })
        } catch (error) {
          res.status(500).json({ error: 'Logout failed' })
        }
      } 
      
      else {
        res.status(400).json({ 
          error: 'Invalid action. Supported actions: login, register, logout' 
        })
      }
      break

    case 'GET':
      try {
        const authHeader = req.headers.authorization
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'No valid authorization header' })
        }

        const token = authHeader.substring(7)
        const session = sessions.find(s => s.token === token)

        if (!session) {
          return res.status(401).json({ error: 'Invalid or expired session' })
        }

        if (new Date(session.expiresAt) < new Date()) {
          const sessionIndex = sessions.findIndex(s => s.id === session.id)
          sessions.splice(sessionIndex, 1)
          return res.status(401).json({ error: 'Session expired' })
        }

        const user = users.find(u => u.id === session.userId)
        
        if (!user) {
          return res.status(404).json({ error: 'User not found' })
        }

        res.status(200).json({
          success: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role
          }
        })
      } catch (error) {
        res.status(500).json({ error: 'Authentication check failed' })
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}