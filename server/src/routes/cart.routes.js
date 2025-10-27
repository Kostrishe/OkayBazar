import { Router } from 'express';

import { CartController } from '../controllers/cart.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// все маршруты требуют авторизации
router.get('/', authRequired, CartController.get);
router.post('/', authRequired, CartController.add);
router.delete('/:itemId', authRequired, CartController.remove);
router.delete('/', authRequired, CartController.clear);

export default router;