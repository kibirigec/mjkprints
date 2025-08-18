import { verifyAdminSession } from '../admin/auth'
import { supabase, supabaseAdmin } from '../../../lib/supabase'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify admin access
  try {
    const isAuthenticated = verifyAdminSession(req, res)
    if (!isAuthenticated) {
      return // Response already sent by verifyAdminSession
    }
  } catch (error) {
    return res.status(401).json({ error: 'Authentication required' })
  }

  const debugInfo = {
    timestamp: new Date().toISOString(),
    clientTests: {},
    adminTests: {},
    permissionTests: {},
    productTests: {}
  }

  try {

    // Test 1: Client configuration
    debugInfo.clientTests = {
      regularClientExists: !!supabase,
      adminClientExists: !!supabaseAdmin,
      hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceRoleKeyFormat: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false
    }

    // Test 2: Regular client permissions
    try {
      const { data: regularProducts, error: regularError } = await supabase
        .from('products')
        .select('id, title')
        .limit(1)

      debugInfo.clientTests.regularClientCanRead = !regularError
      debugInfo.clientTests.regularClientError = regularError?.message || null
      debugInfo.clientTests.regularClientDataCount = regularProducts?.length || 0

    } catch (error) {
      debugInfo.clientTests.regularClientCanRead = false
      debugInfo.clientTests.regularClientError = error.message
    }

    // Test 3: Admin client permissions
    if (supabaseAdmin) {
      try {
        const { data: adminProducts, error: adminError } = await supabaseAdmin
          .from('products')
          .select('id, title')
          .limit(1)

        debugInfo.adminTests.canRead = !adminError
        debugInfo.adminTests.readError = adminError?.message || null
        debugInfo.adminTests.dataCount = adminProducts?.length || 0

        // Test admin write permissions (let database generate UUID)
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('products')
          .insert([{
            title: 'DB Permission Test Product',
            description: 'This is a test product for database permissions - will be deleted',
            price: 1.00,
            image: 'https://via.placeholder.com/400'
          }])
          .select()

        debugInfo.adminTests.canInsert = !insertError
        debugInfo.adminTests.insertError = insertError?.message || null

        if (!insertError && insertData?.length > 0) {
          // Test admin delete permissions using the generated UUID
          const generatedId = insertData[0].id
          const { data: deleteData, error: deleteError } = await supabaseAdmin
            .from('products')
            .delete()
            .eq('id', generatedId)
            .select()

          debugInfo.adminTests.canDelete = !deleteError
          debugInfo.adminTests.deleteError = deleteError?.message || null
          debugInfo.adminTests.deletedData = deleteData?.length || 0
        }

      } catch (error) {
        debugInfo.adminTests.error = error.message
        debugInfo.adminTests.canRead = false
      }
    } else {
      debugInfo.adminTests = {
        available: false,
        reason: 'No admin client - missing SUPABASE_SERVICE_ROLE_KEY'
      }
    }

    // Test 4: File upload permissions
    try {
      const { data: fileUploads, error: fileError } = await (supabaseAdmin || supabase)
        .from('file_uploads')
        .select('id, file_name, processing_status')
        .limit(3)

      debugInfo.permissionTests.canReadFileUploads = !fileError
      debugInfo.permissionTests.fileUploadError = fileError?.message || null
      debugInfo.permissionTests.fileUploadCount = fileUploads?.length || 0

    } catch (error) {
      debugInfo.permissionTests.canReadFileUploads = false
      debugInfo.permissionTests.fileUploadError = error.message
    }

    // Test 5: Real product deletion test (if requested)
    if (req.query.testDeletion === 'true') {
      try {
        // Find a real product to test deletion
        const { data: products } = await (supabaseAdmin || supabase)
          .from('products')
          .select('id, title')
          .limit(1)

        if (products?.length > 0) {
          const productToDelete = products[0]
          
          debugInfo.productTests.foundProductToTest = true
          debugInfo.productTests.testProductId = productToDelete.id
          debugInfo.productTests.testProductTitle = productToDelete.title

          // ACTUALLY TRY TO DELETE (only if specifically requested)
          if (req.query.confirmDelete === 'true') {
            const { data: deletedProduct, error: deleteError } = await (supabaseAdmin || supabase)
              .from('products')
              .delete()
              .eq('id', productToDelete.id)
              .select()

            debugInfo.productTests.deletionAttempted = true
            debugInfo.productTests.deletionSuccessful = !deleteError
            debugInfo.productTests.deletionError = deleteError?.message || null
            debugInfo.productTests.deletedData = deletedProduct || null
          } else {
            debugInfo.productTests.deletionAttempted = false
            debugInfo.productTests.note = 'Add ?confirmDelete=true to URL to actually attempt deletion'
          }
        } else {
          debugInfo.productTests.foundProductToTest = false
          debugInfo.productTests.reason = 'No products found to test deletion'
        }
      } catch (error) {
        debugInfo.productTests.error = error.message
      }
    } else {
      debugInfo.productTests = {
        enabled: false,
        note: 'Add ?testDeletion=true to URL to test product deletion permissions'
      }
    }

    // Summary
    debugInfo.summary = {
      adminClientWorking: debugInfo.adminTests.canRead && debugInfo.adminTests.canInsert && debugInfo.adminTests.canDelete,
      hasRequiredPermissions: debugInfo.adminTests.canDelete && debugInfo.permissionTests.canReadFileUploads,
      criticalIssues: [],
      overallStatus: 'UNKNOWN'
    }

    // Identify critical issues
    if (!debugInfo.clientTests.adminClientExists) {
      debugInfo.summary.criticalIssues.push('Admin client not available - missing SUPABASE_SERVICE_ROLE_KEY')
    }

    if (!debugInfo.adminTests.canRead) {
      debugInfo.summary.criticalIssues.push('Admin client cannot read products table')
    }

    if (!debugInfo.adminTests.canDelete) {
      debugInfo.summary.criticalIssues.push('Admin client cannot delete from products table')
    }

    if (!debugInfo.permissionTests.canReadFileUploads) {
      debugInfo.summary.criticalIssues.push('Cannot access file_uploads table')
    }

    debugInfo.summary.overallStatus = debugInfo.summary.criticalIssues.length === 0 ? 'READY' : 'ISSUES_FOUND'

      status: debugInfo.summary.overallStatus,
      criticalIssues: debugInfo.summary.criticalIssues.length,
      adminWorking: debugInfo.summary.adminClientWorking
    })

    return res.status(200).json(debugInfo)

  } catch (error) {
    console.error('[DB-DEBUG] Error testing database permissions:', error)
    return res.status(500).json({
      error: 'Failed to test database permissions',
      details: error.message,
      partialDebugInfo: debugInfo
    })
  }
}