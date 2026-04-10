const multer               = require('multer')
const path                 = require('path')
const { buildSafeFilename } = require('../utils/sanitizeFilename')

const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png',
  'image/jpeg',
]

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, process.env.UPLOAD_DIR || './uploads')
  },
  filename: (req, file, cb) => {
    // ticketId is not yet known at upload time (ticket created first, then file saved).
    // Use 'tmp' as a safe placeholder — controller renames after ticket creation.
    // Controller creates ticket → gets ticketId → renames tmp file → saves attachment record.
    // If anything fails after tmp write, controller must fs.unlink the tmp file.
    const safeName = buildSafeFilename('tmp', file.originalname)
    cb(null, safeName)
  },
})

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIMES.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('Invalid file type. Allowed: pdf, doc, docx, png, jpg'))
  }
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB hard cap
})

module.exports = { upload }
