import { Router } from 'express'
import multer from 'multer'
import { importAssetsFromExcel } from '../controllers/importController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.match(/\.(xlsx|xls)$/i)) cb(null, true)
    else cb(new Error('Only .xlsx and .xls files are allowed.'))
  },
})

const router = Router()

// Admin OR Infra Manager can import
router.post(
  '/assets/excel',
  protect,
  requireRole(ROLES.ADMIN, ROLES.MANAGER),
  upload.single('file'),
  importAssetsFromExcel
)

export = router
