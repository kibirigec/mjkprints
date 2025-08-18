#!/usr/bin/env node

// Apply migration using direct PostgreSQL connection
import { readFile } from 'fs/promises'
import { resolve } from 'path'
import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })

async function executeDirectSQL() {
  try {
    
    // Read the migration file
    const migrationPath = resolve('./supabase/migrations/20250808152156_fix_rls_policies_for_checkout.sql')
    const migrationSQL = await readFile(migrationPath, 'utf-8')
    
    
    
    // Show first few lines of migration for verification
    const lines = migrationSQL.split('\n').slice(0, 10)
    lines.forEach((line, i) => {
    })
    
  } catch (err) {
    console.error('❌ Error loading migration:', err.message)
    process.exit(1)
  }
}

executeDirectSQL()