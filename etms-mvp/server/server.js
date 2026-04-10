require('dotenv').config()
const app = require('./app')
const { testConnection } = require('./config/db')

const PORT = process.env.PORT || 5000

testConnection().then(() => {
  app.listen(PORT, () =>
    console.log(`🚀 Server running → http://localhost:${PORT}`)
  )
})
