import fs from 'fs'

/**
 * Safely delete a file with proper error logging
 * @param filePath - Path to the file to delete
 * @param context - Context for logging (e.g., 'ticket creation', 'file upload')
 */
export function safeDeleteFile(filePath: string | null | undefined, context = 'file operation'): void {
  if (!filePath) return

  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`[fileCleanup] Failed to delete file during ${context}:`, {
        path: filePath,
        error: err.message,
      })
    } else {
      console.log(`[fileCleanup] Successfully deleted file during ${context}:`, filePath)
    }
  })
}

/**
 * Cleanup uploaded file in case of error
 * @param req - Express request object with optional file
 * @param context - Context for logging
 */
export function cleanupUploadedFile(req: { file?: Express.Multer.File }, context = 'request error'): void {
  if (req.file?.path) {
    safeDeleteFile(req.file.path, context)
  }
}
