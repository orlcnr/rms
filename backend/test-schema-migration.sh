#!/bin/bash

# Schema Migration Test Script
# This script tests the schema migration in a safe way

set -e

echo "🔍 Schema Migration Test"
echo "========================"
echo ""

# Check if we're in the backend directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must be run from backend directory"
    exit 1
fi

echo "📦 Step 1: Creating backup..."
docker exec docker-postgres-1 pg_dump -U postgres rms_db > backup_before_schema_$(date +%Y%m%d_%H%M%S).sql
echo "✅ Backup created"
echo ""

echo "📋 Step 2: Checking current tables..."
docker exec docker-postgres-1 psql -U postgres -d rms_db -c "\dt public.*" | head -20
echo ""

echo "🚀 Step 3: Running migrations..."
echo "⚠️  This will modify the database structure"
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

# Run migrations
npm run typeorm migration:run -- -d src/database/data-source.ts

echo ""
echo "✅ Migrations completed"
echo ""

echo "📋 Step 4: Verifying schema structure..."
docker exec docker-postgres-1 psql -U postgres -d rms_db -c "\dn+"
echo ""

echo "📋 Step 5: Checking tables in each schema..."
echo "Business schema:"
docker exec docker-postgres-1 psql -U postgres -d rms_db -c "\dt business.*"
echo ""
echo "Operations schema:"
docker exec docker-postgres-1 psql -U postgres -d rms_db -c "\dt operations.*"
echo ""
echo "Public API schema:"
docker exec docker-postgres-1 psql -U postgres -d rms_db -c "\dt public_api.*"
echo ""
echo "Infrastructure schema:"
docker exec docker-postgres-1 psql -U postgres -d rms_db -c "\dt infrastructure.*"
echo ""

echo "🎉 Migration test completed!"
echo "Next steps:"
echo "1. Restart backend: make dev-restart"
echo "2. Test application endpoints"
echo "3. Check logs for errors"
