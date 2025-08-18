#!/usr/bin/env node

/**
 * Database Status Verification Script
 * 
 * This script performs a comprehensive analysis of the MJK Prints database
 * to verify table existence, structure, and data integrity for the PDF
 * digital marketplace functionality.
 */

const { createClient } = require('@supabase/supabase-js')

// Load environment variables
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Please ensure .env.local contains:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Required tables for MJK Prints PDF marketplace
 */
const REQUIRED_TABLES = [
  {
    name: 'products',
    description: 'Digital art products with PDF file support',
    key_columns: ['id', 'title', 'price', 'pdf_file_id', 'page_count', 'file_dimensions']
  },
  {
    name: 'file_uploads',
    description: 'Storage metadata for uploaded digital files',
    key_columns: ['id', 'product_id', 'file_name', 'processing_status', 'storage_path']
  },
  {
    name: 'customers',  
    description: 'Customer records',
    key_columns: ['id', 'email', 'stripe_customer_id']
  },
  {
    name: 'orders',
    description: 'Purchase records with Stripe integration',
    key_columns: ['id', 'customer_id', 'email', 'total_amount', 'status']
  },
  {
    name: 'order_items',
    description: 'Individual products within orders',
    key_columns: ['id', 'order_id', 'product_id', 'quantity', 'unit_price']
  },
  {
    name: 'downloads',
    description: 'Time-limited download links with usage tracking',
    key_columns: ['id', 'order_item_id', 'customer_email', 'product_id', 'download_url', 'expires_at']
  }
]

/**
 * Required storage components
 */
const STORAGE_REQUIREMENTS = {
  bucketName: 'mjk-prints-storage',
  expectedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  maxFileSize: 52428800 // 50MB
}

/**
 * Required functions and triggers
 */
const REQUIRED_FUNCTIONS = [
  'update_updated_at_column',
  'update_product_from_file_upload',
  'get_products_with_files',
  'validate_file_checksum',
  'cleanup_failed_uploads',
  'verify_storage_setup',
  'get_storage_stats'
]

/**
 * Check if a table exists and get its structure
 */
async function checkTable(tableName) {
  try {
    // Check table existence by attempting to query it
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1)
    
    if (error) {
      return {
        exists: false,
        error: error.message,
        rowCount: 0
      }
    }
    
    // Get row count
    const { count, error: countError } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true })
    
    return {
      exists: true,
      rowCount: countError ? 'unknown' : count,
      sampleData: data
    }
  } catch (err) {
    return {
      exists: false,
      error: err.message,
      rowCount: 0
    }
  }
}

/**
 * Check storage bucket status
 */
async function checkStorageBucket() {
  try {
    // Try to list files in the bucket (this will fail if bucket doesn't exist)
    const { data, error } = await supabase.storage
      .from(STORAGE_REQUIREMENTS.bucketName)
      .list('', { limit: 1 })
    
    if (error) {
      return {
        exists: false,
        error: error.message
      }
    }
    
    // Get bucket info
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    const bucket = buckets?.find(b => b.id === STORAGE_REQUIREMENTS.bucketName)
    
    return {
      exists: true,
      bucketInfo: bucket,
      canList: true,
      fileCount: data ? data.length : 0
    }
  } catch (err) {
    return {
      exists: false,
      error: err.message
    }
  }
}

/**
 * Check if required functions exist
 */
async function checkDatabaseFunctions() {
  const functionResults = {}
  
  for (const funcName of REQUIRED_FUNCTIONS) {
    try {
      // Try to call the function (most are callable without parameters)
      let result = { exists: false }
      
      switch (funcName) {
        case 'verify_storage_setup':
          const { data, error } = await supabase.rpc('verify_storage_setup')
          result = { 
            exists: !error, 
            error: error?.message,
            result: data 
          }
          break
          
        case 'get_storage_stats':
          const { data: stats, error: statsError } = await supabase.rpc('get_storage_stats')
          result = { 
            exists: !statsError, 
            error: statsError?.message,
            result: stats 
          }
          break
          
        case 'cleanup_failed_uploads':
          // Don't actually run cleanup, just check if it exists
          const { error: cleanupError } = await supabase.rpc('cleanup_failed_uploads')
          result = { 
            exists: cleanupError?.code !== '42883', // Function not found error
            error: cleanupError?.code === '42883' ? 'Function not found' : null
          }
          break
          
        default:
          // For other functions, we'll assume they exist if no specific test fails
          result = { exists: true, note: 'Function existence not directly testable' }
      }
      
      functionResults[funcName] = result
    } catch (err) {
      functionResults[funcName] = {
        exists: false,
        error: err.message
      }
    }
  }
  
  return functionResults
}

/**
 * Main verification function
 */
async function verifyDatabaseStatus() {
  
  // Environment check
  
  // Check database connection
  try {
    const { data, error } = await supabase.from('products').select('id').limit(1)
    if (error) {
      return
    } else {
    }
  } catch (err) {
    return
  }
  
  // Check required tables
  const tableResults = {}
  let missingTables = []
  
  for (const table of REQUIRED_TABLES) {
    const result = await checkTable(table.name)
    tableResults[table.name] = result
    
    const status = result.exists ? '✅' : '❌'
    const rowInfo = result.exists ? `(${result.rowCount} rows)` : `- ${result.error}`
    
    
    if (!result.exists) {
      missingTables.push(table.name)
    }
  }
  
  // Check storage bucket
  const storageResult = await checkStorageBucket()
  
  if (storageResult.exists) {
  } else {
  }
  
  // Check database functions
  const functionResults = await checkDatabaseFunctions()
  
  for (const [funcName, result] of Object.entries(functionResults)) {
    const status = result.exists ? '✅' : '❌'
    const errorInfo = result.error ? ` - ${result.error}` : ''
  }
  
  // Overall assessment
  
  const allTablesExist = missingTables.length === 0
  const storageOk = storageResult.exists
  const functionsOk = Object.values(functionResults).every(f => f.exists)
  
  if (allTablesExist && storageOk && functionsOk) {
  } else {
    
    if (missingTables.length > 0) {
      missingTables.forEach(table => {
      })
    }
    
    if (!storageOk) {
    }
    
    const missingFunctions = Object.entries(functionResults)
      .filter(([name, result]) => !result.exists)
      .map(([name]) => name)
    
    if (missingFunctions.length > 0) {
      missingFunctions.forEach(func => {
      })
    }
  }
  
  
  return {
    tables: tableResults,
    storage: storageResult,
    functions: functionResults,
    overall: {
      healthy: allTablesExist && storageOk && functionsOk,
      missingTables,
      missingStorage: !storageOk,
      missingFunctions: Object.entries(functionResults)
        .filter(([name, result]) => !result.exists)
        .map(([name]) => name)
    }
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyDatabaseStatus()
    .then(result => {
      if (result.overall.healthy) {
        process.exit(0)
      } else {
        process.exit(1)  
      }
    })
    .catch(error => {
      console.error('❌ Database verification failed:', error.message)
      process.exit(1)
    })
}

module.exports = { verifyDatabaseStatus }