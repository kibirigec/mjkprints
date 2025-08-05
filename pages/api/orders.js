import { 
  createOrder, 
  createOrderItems, 
  createDownloadLinks, 
  getOrdersByEmail,
  getOrderById
} from '../../lib/supabase'

export default async function handler(req, res) {
  const { method } = req

  switch (method) {
    case 'GET':
      try {
        const { email, orderId } = req.query

        if (orderId) {
          // Get specific order
          const order = await getOrderById(orderId)
          if (!order) {
            return res.status(404).json({ error: 'Order not found' })
          }
          return res.status(200).json(order)
        } else if (email) {
          // Get orders by email
          const orders = await getOrdersByEmail(email)
          return res.status(200).json(orders)
        } else {
          return res.status(400).json({ error: 'Email or orderId parameter required' })
        }
      } catch (error) {
        console.error('Error fetching orders:', error)
        res.status(500).json({ error: 'Failed to fetch orders' })
      }
      break

    case 'POST':
      try {
        const { items, total, email, billingDetails } = req.body

        // Validation
        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ 
            error: 'Invalid order: items array is required and cannot be empty' 
          })
        }

        if (!total || typeof total !== 'number' || total <= 0) {
          return res.status(400).json({ 
            error: 'Invalid order: total must be a positive number' 
          })
        }

        if (!email || !email.includes('@')) {
          return res.status(400).json({ 
            error: 'Valid email address is required' 
          })
        }

        // Create order in database
        const order = await createOrder({
          email,
          total_amount: total,
          status: 'completed', // For now, mark as completed (will change with Stripe integration)
          billing_details: billingDetails,
          metadata: {
            source: 'web',
            userAgent: req.headers['user-agent']
          }
        })

        // Create order items
        const orderItemsData = items.map(item => ({
          product_id: item.id,
          quantity: item.quantity,
          unit_price: item.price
        }))

        const orderItems = await createOrderItems(order.id, orderItemsData)

        // Create download links
        const downloadLinks = await createDownloadLinks(orderItems, email)

        res.status(201).json({
          success: true,
          message: 'Order created successfully! Download links have been sent to your email.',
          order: {
            id: order.id,
            email: order.email,
            total: order.total_amount,
            status: order.status,
            createdAt: order.created_at,
            items: orderItems
          },
          downloadLinks: downloadLinks.map(dl => ({
            productId: dl.product_id,
            downloadUrl: dl.download_url,
            expiresAt: dl.expires_at
          }))
        })
      } catch (error) {
        console.error('Order creation error:', error)
        res.status(500).json({ 
          error: 'Failed to process order',
          details: error.message 
        })
      }
      break

    default:
      res.setHeader('Allow', ['GET', 'POST'])
      res.status(405).end(`Method ${method} Not Allowed`)
  }
}