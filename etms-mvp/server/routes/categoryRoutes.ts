import { Router } from 'express'
import { getCategories, getEmployeesByCategory, getTeams, createTeam, deleteTeam } from '../controllers/categoryController'
import { protect } from '../middleware/authMiddleware'
import { requireRole } from '../middleware/roleMiddleware'
import ROLES from '../constants/ROLES'

const router = Router()

router.get('/', protect, getCategories)
router.get('/teams', protect, requireRole(ROLES.ADMIN), getTeams)
router.post('/teams', protect, requireRole(ROLES.ADMIN), createTeam)
router.delete('/teams/:teamId', protect, requireRole(ROLES.ADMIN), deleteTeam)
router.get('/:categoryId/employees', protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), getEmployeesByCategory)

export = router
