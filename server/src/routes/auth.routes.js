import { Router } from 'express';

import { AuthController } from '../controllers/auth.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.post('/register', AuthController.register);
router.post('/login', AuthController.login);
router.get('/me', authRequired, AuthController.me);
router.post('/logout', authRequired, AuthController.logout);
router.post('/change-password', authRequired, AuthController.changePassword);

export default router;
