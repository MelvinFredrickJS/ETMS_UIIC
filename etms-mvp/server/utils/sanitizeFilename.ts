import path from 'path'

function buildSafeFilename(ticketId: number | string, originalName: string): string {
  const ext      = path.extname(originalName).toLowerCase().slice(0, 6)
  const base     = path.basename(originalName, ext)
  const safeBase = base
    .toLowerCase()
    .replace(/[^a-z0-9\-]/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)

  return `${ticketId}-${Date.now()}-${safeBase || 'file'}${ext}`
}

export { buildSafeFilename }
