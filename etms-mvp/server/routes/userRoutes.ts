import { Router } from 'express'
import { listUsers, createUser, deleteUser, transferOwnership, changePassword, toggleUserActive, updateUserName } from '../controllers/userController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'

const router = Router()

router.get('/',                    protect, requireRole(ROLES.ADMIN), listUsers)
router.post('/',                   protect, requireRole(ROLES.ADMIN), createUser)
router.post('/transfer-ownership', protect, requireRole(ROLES.ADMIN), transferOwnership)  // must be before /:id
router.patch('/change-password',   protect, changePassword)                               // must be before /:id
router.patch('/:id/toggle-active', protect, requireRole(ROLES.ADMIN), toggleUserActive)
router.patch('/:id/name',          protect, requireRole(ROLES.ADMIN), updateUserName)
router.delete('/:id',              protect, requireRole(ROLES.ADMIN), deleteUser)

export = router
