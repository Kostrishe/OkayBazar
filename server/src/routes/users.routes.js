import { Router } from 'express';

import { UsersController } from '../controllers/users.controller.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();

// admin-only
router.get('/', authRequired, roleRequired('admin'), UsersController.list);
router.get('/:id', authRequired, roleRequired('admin'), UsersController.getOne);
router.post('/', authRequired, roleRequired('admin'), UsersController.create);
router.put('/:id', authRequired, roleRequired('admin'), UsersController.update);
router.delete('/:id', authRequired, roleRequired('admin'), UsersController.remove);

export default router;
