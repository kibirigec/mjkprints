import { 
  supabaseAdmin, 
  supabase,
  getFileUploadById,
  deleteFileUpload
} from '../../../lib/supabase'
import { verifyAdminSession } from '../admin/auth'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify admin access
  try {
    const isAuthenticated = verifyAdminSession(req, res)
    if (!isAuthenticated) {
      return
    }
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const { fileId, testType = 'full' } = req.body

  const debugInfo = {
    timestamp: new Date().toISOString(),
    testType,
    fileId,
    results: {}
  }

  try {
    // Test 1: Environment Configuration
    debugInfo.results.environment = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseAdminExists: !!supabaseAdmin,
      nodeEnv: process.env.NODE_ENV
    }

    if (!supabaseAdmin) {
      debugInfo.results.environment.error = 'supabaseAdmin is null - service role key missing or invalid'
      return res.status(200).json(debugInfo)
    }

    // Test 2: Basic connectivity 
    try {
      const { data: testQuery, error: connectError } = await supabaseAdmin
        .from('file_uploads')
        .select('count')
        .limit(1)

      debugInfo.results.connectivity = {
        canConnect: !connectError,
        error: connectError?.message,
        adminClientWorks: true
      }
    } catch (error) {
      debugInfo.results.connectivity = {
        canConnect: false,
        error: error.message,
        adminClientWorks: false
      }
    }

    // Test 3: File existence (if fileId provided)
    if (fileId) {
      try {
        const existingFile = await getFileUploadById(fileId)
        debugInfo.results.fileCheck = {
          exists: !!existingFile,
          fileData: existingFile ? {
            id: existingFile.id,
            fileName: existingFile.file_name,
            storagePath: existingFile.storage_path,
            createdAt: existingFile.created_at
          } : null
        }
      } catch (error) {
        debugInfo.results.fileCheck = {
          exists: false,
          error: error.message
        }
      }
    }

    // Test 4: RLS Policy Test
    try {
      // Try to read with admin client
      const { data: adminRead, error: adminReadError } = await supabaseAdmin
        .from('file_uploads')
        .select('id, file_name')
        .limit(1)

      // Try to read with regular client
      const { data: regularRead, error: regularReadError } = await supabase
        .from('file_uploads')
        .select('id, file_name')
        .limit(1)

      debugInfo.results.rlsTest = {
        adminCanRead: !adminReadError,
        adminReadError: adminReadError?.message,
        adminReadCount: adminRead?.length || 0,
        regularCanRead: !regularReadError,
        regularReadError: regularReadError?.message,
        regularReadCount: regularRead?.length || 0
      }
    } catch (error) {
      debugInfo.results.rlsTest = {
        error: error.message
      }
    }

    // Test 5: Actual deletion test (if fileId provided and testType is 'full')
    if (fileId && testType === 'full') {
      try {
        // First, let's try a direct delete with admin client
        const { data: deleteData, error: deleteError } = await supabaseAdmin
          .from('file_uploads')
          .delete()
          .eq('id', fileId)
          .select()

        debugInfo.results.deletionTest = {
          directDeleteSuccess: !deleteError,
          directDeleteError: deleteError?.message,
          deletedData: deleteData,
          deletedCount: deleteData?.length || 0
        }

        if (deleteError) {
          // If direct delete failed, let's see what the exact error is
          debugInfo.results.deletionTest.errorCode = deleteError.code
          debugInfo.results.deletionTest.errorDetails = deleteError.details
          debugInfo.results.deletionTest.errorHint = deleteError.hint
        }

      } catch (error) {
        debugInfo.results.deletionTest = {
          directDeleteSuccess: false,
          error: error.message,
          stack: error.stack?.split('\n').slice(0, 3)
        }
      }
    } else if (fileId) {
      debugInfo.results.deletionTest = {
        skipped: true,
        reason: 'testType is not "full" - use testType:"full" to test actual deletion'
      }
    }

    // Test 6: Foreign key constraints check
    if (fileId) {
      try {
        const { data: productRefs, error: productError } = await supabaseAdmin
          .from('products')
          .select('id, title')
          .or(`pdf_file_id.eq.${fileId},image_file_id.eq.${fileId}`)

        debugInfo.results.foreignKeyCheck = {
          hasProductReferences: (productRefs?.length || 0) > 0,
          productReferences: productRefs || [],
          productError: productError?.message
        }
      } catch (error) {
        debugInfo.results.foreignKeyCheck = {
          error: error.message
        }
      }
    }

    return res.status(200).json(debugInfo)

  } catch (error) {
    console.error('[DEBUG-DELETE] Debug test failed:', error)
    debugInfo.results.unexpectedError = {
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 5)
    }
    return res.status(500).json(debugInfo)
  }
}