import { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import PasscodeProtection from '../components/PasscodeProtection'

export default function DebugDeletion() {
  const { isAuthenticated } = useAdminAuth()
  const [debugResult, setDebugResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [files, setFiles] = useState([])
  const [selectedFileId, setSelectedFileId] = useState('')

  useEffect(() => {
    if (isAuthenticated) {
      fetchFiles()
    }
  }, [isAuthenticated])

  const fetchFiles = async () => {
    try {
      const response = await fetch('/api/products')
      const products = await response.json()
      const allFiles = products
        .filter(product => product.file_uploads)
        .map(product => ({
          id: product.file_uploads.id,
          fileName: product.file_uploads.file_name,
          productTitle: product.title
        }))
      setFiles(allFiles)
      if (allFiles.length > 0) {
        setSelectedFileId(allFiles[0].id)
      }
    } catch (error) {
      console.error('Error fetching files:', error)
    }
  }

  const runDebugTest = async (testType = 'safe') => {
    setLoading(true)
    try {
      const response = await fetch('/api/debug/test-file-deletion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fileId: selectedFileId || null,
          testType 
        })
      })
      
      const result = await response.json()
      setDebugResult(result)
    } catch (error) {
      setDebugResult({ error: error.message })
    }
    setLoading(false)
  }

  const testActualDeletion = async () => {
    if (!selectedFileId) {
      alert('Please select a file first')
      return
    }
    
    if (!confirm('This will actually DELETE the selected file. Are you sure?')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/files/${selectedFileId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (response.ok) {
        setDebugResult({ 
          success: true, 
          message: 'File deleted successfully!',
          result 
        })
        await fetchFiles() // Refresh file list
        setSelectedFileId('')
      } else {
        setDebugResult({ 
          success: false, 
          error: result.error,
          details: result.details,
          fullResponse: result
        })
      }
    } catch (error) {
      setDebugResult({ 
        success: false, 
        error: 'Network error',
        details: error.message 
      })
    }
    setLoading(false)
  }

  if (!isAuthenticated) {
    return (
      <PasscodeProtection>
        <div>Loading...</div>
      </PasscodeProtection>
    )
  }

  return (
    <PasscodeProtection>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">
            🔍 File Deletion Debug Tool
          </h1>
          
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Available Files</h2>
            <select 
              value={selectedFileId} 
              onChange={(e) => setSelectedFileId(e.target.value)}
              className="w-full p-2 border rounded mb-4"
            >
              <option value="">Select a file to test...</option>
              {files.map(file => (
                <option key={file.id} value={file.id}>
                  {file.fileName} (from: {file.productTitle})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Debug Tests</h2>
            
            <div className="space-y-4">
              <button
                onClick={() => runDebugTest('safe')}
                disabled={loading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 mr-4"
              >
                {loading ? 'Testing...' : '🧪 Run Safe Tests (No Deletion)'}
              </button>
              
              <button
                onClick={() => runDebugTest('full')}
                disabled={loading || !selectedFileId}
                className="bg-orange-600 text-white px-4 py-2 rounded hover:bg-orange-700 disabled:opacity-50 mr-4"
              >
                {loading ? 'Testing...' : '⚠️ Test With Deletion'}
              </button>

              <button
                onClick={testActualDeletion}
                disabled={loading || !selectedFileId}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
              >
                {loading ? 'Deleting...' : '🗑️ Actually Delete File'}
              </button>
            </div>
          </div>

          {debugResult && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Debug Results</h2>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(debugResult, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
            <h3 className="font-semibold text-yellow-800 mb-2">Instructions:</h3>
            <ol className="list-decimal list-inside text-yellow-800 space-y-1 text-sm">
              <li><strong>Run Safe Tests first</strong> - This checks environment, connectivity, and RLS policies</li>
              <li><strong>Check the results</strong> - Look for any errors in environment or connectivity</li>
              <li><strong>Test With Deletion</strong> - This attempts deletion but shows detailed error info</li>
              <li><strong>Actually Delete File</strong> - This runs the real deletion API endpoint</li>
            </ol>
          </div>
        </div>
      </div>
    </PasscodeProtection>
  )
}