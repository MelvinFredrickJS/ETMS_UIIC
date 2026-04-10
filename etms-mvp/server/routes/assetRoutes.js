const express      = require('express')
const { getMyAssets, getAssetById, createAsset, updateAssetStatus, transferAsset } = require('../controllers/assetController')
const { protect }  = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')
const ROLES        = require('../constants/ROLES')

const router = express.Router()

router.get('/my',            protect, requireRole(ROLES.EMPLOYEE, ROLES.MANAGER), getMyAssets)
router.get('/:id',           protect, getAssetById)
router.post('/',             protect, requireRole(ROLES.ADMIN), createAsset)
router.patch('/:id/status',  protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), updateAssetStatus)
router.post('/:id/transfer', protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), transferAsset)

module.exports = router
