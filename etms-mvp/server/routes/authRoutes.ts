import { Router } from 'express'
import { login, me } from '../controllers/authController'
import { protect } from '../middleware/authMiddleware'

const router = Router()

router.post('/login', login)
router.get('/me', protect, me)

export = router
