// Simple placeholder image API endpoint
// This creates a simple SVG placeholder image for fallback purposes

export default function handler(req, res) {
  const { params } = req.query
  
  // Default dimensions
  let width = 400
  let height = 400
  
  // Parse dimensions from URL parameters
  if (params && params.length > 0) {
    const dimensions = params[0].split('/')
    if (dimensions.length >= 2) {
      width = parseInt(dimensions[0]) || 400
      height = parseInt(dimensions[1]) || 400
    } else if (dimensions.length === 1) {
      const size = parseInt(dimensions[0]) || 400
      width = height = size
    }
  }
  
  // Ensure reasonable size limits
  width = Math.min(Math.max(width, 50), 2000)
  height = Math.min(Math.max(height, 50), 2000)
  
  // Create SVG placeholder
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#f3f4f6"/>
      <rect x="20%" y="20%" width="60%" height="60%" fill="#e5e7eb" rx="8"/>
      <circle cx="40%" cy="35%" r="8%" fill="#d1d5db"/>
      <polygon points="${width * 0.25},${height * 0.55} ${width * 0.35},${height * 0.65} ${width * 0.45},${height * 0.55} ${width * 0.55},${height * 0.70} ${width * 0.75},${height * 0.45}" fill="#d1d5db"/>
      <text x="50%" y="85%" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" fill="#6b7280">
        ${width} × ${height}
      </text>
    </svg>
  `
  
  // Set appropriate headers
  res.setHeader('Content-Type', 'image/svg+xml')
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  
  // Return the SVG
  res.status(200).send(svg.trim())
}