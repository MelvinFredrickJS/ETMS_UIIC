Melvin@2004
# Setup PostgreSQL database for ETMS
$env:Path = "C:\Program Files\PostgreSQL\18\bin;" + $env:Path
$psqlPass = "Melvin@2004"

Write-Host "🔧 Setting up ETMS PostgreSQL database..." -ForegroundColor Cyan

# Create database if it doesn't exist
Write-Host "📦 Creating database 'etms_dev'..." -ForegroundColor Yellow
$createDbCmd = @"
SELECT 1 FROM pg_database WHERE datname = 'etms_dev';
"@
echo $createDbCmd | psql -U postgres -h localhost -d postgres 2>&1 | Out-Null

$psqlPassPath = $env:USERPROFILE + "\.pgpass"
"localhost:5432:postgres:postgres:$psqlPass" | Out-File -FilePath $psqlPassPath -Encoding ASCII -Force
(Get-Item $psqlPassPath).Attributes = "Hidden"

psql -U postgres -h localhost -d postgres -c "DROP DATABASE IF EXISTS etms_dev;" 2>&1 | Out-Null
psql -U postgres -h localhost -d postgres -c "CREATE DATABASE etms_dev;" 2>&1
Write-Host "✅ Database created" -ForegroundColor Green

# Run schema
Write-Host "📋 Running schema.sql..." -ForegroundColor Yellow
$schemaPath = "database\schema.sql"
psql -U postgres -h localhost -d etms_dev -f $schemaPath 2>&1 | Out-Null
Write-Host "✅ Schema created" -ForegroundColor Green

# Run seed
Write-Host "🌱 Running seed.sql..." -ForegroundColor Yellow
$seedPath = "database\seed.sql"
psql -U postgres -h localhost -d etms_dev -f $seedPath 2>&1 | Out-Null
Write-Host "✅ Database seeded" -ForegroundColor Green

# Verify
Write-Host "🔍 Verifying tables..." -ForegroundColor Yellow
psql -U postgres -h localhost -d etms_dev -c "\dt" 2>&1

Write-Host "`n✨ Database setup complete!" -ForegroundColor Green
