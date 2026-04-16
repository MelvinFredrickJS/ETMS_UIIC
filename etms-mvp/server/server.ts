import 'dotenv/config'
import app from './app'
import pool from './config/db'
import { startSlaEscalationJob } from './jobs/slaEscalationJob'

const PORT = process.env.PORT || 5000

pool.testConnection().then(() => {
  startSlaEscalationJob()
  app.listen(PORT, () =>
    console.log(`🚀 Server running → http://localhost:${PORT}`)
  )
})
