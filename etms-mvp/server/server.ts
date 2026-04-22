import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import app from './app'
import pool from './config/db'
import { initMailer } from './config/mailer'
import { startSlaEscalationJob } from './jobs/slaEscalationJob'
import { validateEnvironment } from './utils/validateEnv'

const PORT = process.env.PORT || 5000

// Validate environment variables first
validateEnvironment()

// Initialize upload directories
function initializeUploadDirectories(): void {
  const uploadDir = process.env.UPLOAD_DIR || './uploads'
  const responseUploadDir = process.env.RESPONSE_UPLOAD_DIR || path.join(uploadDir, 'responses')

  try {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
      console.log(`✅ Created upload directory: ${uploadDir}`)
    }
    if (!fs.existsSync(responseUploadDir)) {
      fs.mkdirSync(responseUploadDir, { recursive: true })
      console.log(`✅ Created response upload directory: ${responseUploadDir}`)
    }
  } catch (err) {
    console.error('❌ Failed to create upload directories:', (err as Error).message)
    process.exit(1)
  }
}

pool.testConnection().then(async () => {
  initializeUploadDirectories()
  await initMailer()
  startSlaEscalationJob()
  app.listen(PORT, () =>
    console.log(`🚀 Server running → http://localhost:${PORT}`)
  )
})
