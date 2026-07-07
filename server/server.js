require('dotenv').config()
const express = require('express')
const cors = require('cors')
const mongoose = require('mongoose')

const configRoutes = require('./routes/config')
const webhookRoutes = require('./routes/webhook')
const issueRoutes = require('./routes/issues')
const projectRoutes = require('./routes/project')

const app = express()

app.use(cors())

// Attach sessionId from header to every request
app.use((req, res, next) => {
  req.sessionId = req.headers['x-session-id'] || null
  next()
})

// Use the verify callback on express.json() to capture the raw body bytes
// needed for webhook HMAC-SHA256 signature verification (Requirement 2.2).
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8')
  }
}))

// Routes
app.use('/api/config', configRoutes)
app.use('/api/webhook', webhookRoutes)
app.use('/api/issues', issueRoutes)
app.use('/api/project', projectRoutes)

// Generic 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Generic error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

const PORT = process.env.PORT || 5000

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message)
    process.exit(1)
  }
}

// Only start the server when run directly (not during tests)
if (require.main === module) {
  startServer()
}

module.exports = app
