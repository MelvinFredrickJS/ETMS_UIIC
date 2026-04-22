/**
 * Validate required environment variables at server startup
 * Exits the process if critical variables are missing
 */
export function validateEnvironment(): void {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_NAME',
    'DB_USER',
    'DB_PASSWORD',
    'JWT_SECRET',
  ]

  const missing: string[] = []

  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key)
    }
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    console.error('\n💡 Copy .env.example to .env and fill in the values.')
    process.exit(1)
  }

  // Validate JWT_SECRET length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    console.warn('⚠️  JWT_SECRET should be at least 32 characters for security.')
  }

  // Validate DB_PORT is a number
  const dbPort = parseInt(process.env.DB_PORT || '5432', 10)
  if (isNaN(dbPort) || dbPort < 1 || dbPort > 65535) {
    console.error('❌ DB_PORT must be a valid port number (1-65535)')
    process.exit(1)
  }

  console.log('✅ Environment variables validated')
}
