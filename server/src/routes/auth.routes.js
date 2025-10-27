import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// публичные маршруты
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// требуют авторизации
router.get('/me', authRequired, AuthController.me);
router.post('/logout', authRequired, AuthController.logout);
router.post('/change-password', authRequired, AuthController.changePassword);
router.get('/profile', authRequired, AuthController.getProfile);
router.put('/profile', authRequired, AuthController.updateProfile);

export default router;