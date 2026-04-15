import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'

const app = express()

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Routes
app.use('/api/auth',       require('./routes/authRoutes'))
app.use('/api/categories', require('./routes/categoryRoutes'))
app.use('/api/assets',     require('./routes/assetRoutes'))
app.use('/api/tickets',    require('./routes/ticketRoutes'))
app.use('/api/approvals',  require('./routes/approvalRoutes'))
app.use('/api/users',      require('./routes/userRoutes'))
app.use('/api/reports',    require('./routes/reportRoutes'))
app.use('/api/lookup',     require('./routes/lookupRoutes'))

// Serve uploads folder in dev
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// 404
app.use((_req: Request, res: Response) =>
  res.status(404).json({ success: false, message: 'Route not found' })
)

// Global error handler
app.use((err: Error & { code?: string; status?: number; message: string }, _req: Request, res: Response, _next: NextFunction) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ success: false, message: 'File too large (max 5MB).' })
  }
  if (err.message && err.message.includes('Invalid file type')) {
    return res.status(415).json({ success: false, message: err.message })
  }
  console.error(err.stack)
  res.status(err.status || 500).json({
    success: false,
    message: err.status && err.status < 500
      ? (err.message || 'Request failed')
      : 'Internal server error',
  })
})

export = app
