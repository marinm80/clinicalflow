import { Router } from 'express';
import { login, logout, me } from '../controllers/auth.controller';
import { authenticateToken } from '../middlewares/auth.middleware';

const router = Router();

// Public login endpoint
router.post('/login', login);

// Authenticated session endpoints
router.post('/logout', authenticateToken, logout);
router.get('/me', authenticateToken, me);

export default router;
