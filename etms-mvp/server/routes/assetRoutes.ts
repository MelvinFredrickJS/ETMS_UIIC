import { Router } from 'express'
import { getAllAssets, getAssetHistory, getMyAssets, getAssetById, createAsset, updateAssetStatus, transferAsset } from '../controllers/assetController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'

const router = Router()

router.get('/',              protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), getAllAssets)
router.get('/my',            protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER), getMyAssets)
router.get('/:id/history',   protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), getAssetHistory)
router.get('/:id',           protect, getAssetById)
router.post('/',             protect, requireRole(ROLES.ADMIN), createAsset)
router.patch('/:id/status',  protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), updateAssetStatus)
router.post('/:id/transfer', protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), transferAsset)

export = router
