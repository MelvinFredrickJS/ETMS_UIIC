// Produces a safe, predictable filename for uploaded files.
// Prevents path traversal, spaces, unicode, and collision issues.

const path = require('path')

/**
 * Build a secure storage filename.
 * @param {number|string} ticketId    — ticket DB id (use 'tmp' before ticket is created)
 * @param {string}        originalName — file.originalname from Multer
 * @returns {string}  e.g. "42-1712345678901-invoice.pdf"
 *
 * Steps:
 *  1. Extract extension from original name (lowercase, max 6 chars including leading dot)
 *  2. Strip the extension from the base name
 *  3. Replace any character that is NOT a-z, 0-9, hyphen, or dot with '-'
 *  4. Trim leading/trailing hyphens, collapse multiple hyphens
 *  5. Truncate base to 40 chars to keep paths short
 *  6. Reassemble: {ticketId}-{Date.now()}-{safeName}.{ext}
 */
function buildSafeFilename(ticketId, originalName) {
  const ext      = path.extname(originalName).toLowerCase().slice(0, 6) // e.g. ".pdf"
  const base     = path.basename(originalName, ext)                      // strip ext
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')   // replace unsafe chars
    .replace(/-{2,}/g, '-')          // collapse consecutive hyphens
    .replace(/^-+|-+$/g, '')         // trim leading/trailing hyphens
    .slice(0, 40)                    // max 40 chars

  return `${ticketId}-${Date.now()}-${safeBase || 'file'}${ext}`
  // Examples:
  //   42-1712345678901-invoice.pdf
  //   42-1712345678902-screenshot.png
  //   42-1712345678903-file.docx   (when base was empty or all unsafe chars)
}

module.exports = { buildSafeFilename }
