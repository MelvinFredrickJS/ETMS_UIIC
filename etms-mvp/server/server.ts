import 'dotenv/config'
import app from './app'
import pool from './config/db'

const PORT = process.env.PORT || 5000

pool.testConnection().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running → http://localhost:${PORT}`)
  )
})
