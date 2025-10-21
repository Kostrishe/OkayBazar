import { Router } from 'express';

import { OrdersController } from '../controllers/orders.controller.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();

// только свои заказы (текущий пользователь)
router.get('/my', authRequired, OrdersController.getMyOrders); // 👈 добавили сюда

// user / customer
router.get('/', authRequired, OrdersController.list);
router.get('/:id', authRequired, OrdersController.getOne);
router.post('/', authRequired, OrdersController.create);
router.post('/confirm', authRequired, OrdersController.confirmPending);

// admin-only (управление статусами/отмена)
router.put('/:id', authRequired, roleRequired('admin'), OrdersController.update);
router.delete('/:id', authRequired, roleRequired('admin'), OrdersController.remove);

export default router;
