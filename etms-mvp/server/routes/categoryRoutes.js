const express      = require('express')
const { getCategories, getEmployeesByCategory } = require('../controllers/categoryController')
const { protect }  = require('../middleware/authMiddleware')
const { requireRole } = require('../middleware/roleMiddleware')
const ROLES        = require('../constants/ROLES')

const router = express.Router()

router.get('/', protect, getCategories)
router.get('/:categoryId/employees', protect, requireRole(ROLES.ADMIN, ROLES.MANAGER), getEmployeesByCategory)

module.exports = router
