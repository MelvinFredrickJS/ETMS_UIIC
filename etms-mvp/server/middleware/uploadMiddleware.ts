import multer from 'multer'
import path from 'path'
import { buildSafeFilename } from '../utils/sanitizeFilename'
import type { Request } from 'express'

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads')
  },
  filename: (_req, file, cb) => {
    const safeName = buildSafeFilename('tmp', file.originalname)
    cb(null, safeName)
  },
})

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Allowed: pdf, doc, docx, png, jpg'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

export { upload }
