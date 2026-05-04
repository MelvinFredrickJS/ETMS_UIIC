import express, { type Request, type Response, type NextFunction } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import path from 'path'
import fs from 'fs'
import yaml from 'yaml'
import swaggerUi from 'swagger-ui-express'
import authRoutes from './routes/authRoutes'
import categoryRoutes from './routes/categoryRoutes'
import assetRoutes from './routes/assetRoutes'
import ticketRoutes from './routes/ticketRoutes'
import dataPortalRoutes from './routes/dataPortalRoutes'
import approvalRoutes from './routes/approvalRoutes'
import userRoutes from './routes/userRoutes'
import reportRoutes from './routes/reportRoutes'
import lookupRoutes from './routes/lookupRoutes'
import importRoutes from './routes/importRoutes'

const app = express()

function loadOpenApiSpec(): object {
  const candidates = [
    path.resolve(__dirname, '../../docs/openapi.yaml'),
    path.resolve(__dirname, '../../../docs/openapi.yaml'),
  ]

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const raw = fs.readFileSync(candidate, 'utf8')
        return yaml.parse(raw) as object
      }
    } catch (err) {
      console.warn(`⚠️  Failed to load OpenAPI spec from ${candidate}:`, (err as Error).message)
    }
  }

  console.warn('⚠️  OpenAPI spec not found. Swagger UI will load with an empty spec.')
  return {}
}

app.use(helmet())
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(morgan('dev'))

// Swagger UI
const openApiSpec = loadOpenApiSpec()
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec))

// Routes
app.use('/api/auth',        authRoutes)
app.use('/api/categories',  categoryRoutes)
app.use('/api/assets',      assetRoutes)
app.use('/api/tickets',     ticketRoutes)
app.use('/api/data-portal', dataPortalRoutes)
app.use('/api/approvals',   approvalRoutes)
app.use('/api/users',       userRoutes)
app.use('/api/reports',     reportRoutes)
app.use('/api/lookup',      lookupRoutes)
app.use('/api/import',      importRoutes)

// Serve uploads folder in dev
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ 
    success: true, 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
})

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
