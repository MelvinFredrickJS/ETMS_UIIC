import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { buildSafeFilename } from '../utils/sanitizeFilename'
import type { Request } from 'express'

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/png',
  'image/jpeg',
]

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads'
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }
      cb(null, uploadDir)
    } catch (err) {
      cb(err as Error, uploadDir)
    }
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
    cb(new Error('Invalid file type. Allowed: pdf, doc, docx, txt, png, jpg'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
})

export { upload }
