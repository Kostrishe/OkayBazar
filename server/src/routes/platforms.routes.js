import { Router } from 'express';

import { PlatformsController } from '../controllers/platforms.controller.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();

// public
router.get('/', PlatformsController.list);
router.get('/:id', PlatformsController.getOne);

// admin-only
router.post('/', authRequired, roleRequired('admin'), PlatformsController.create);
router.put('/:id', authRequired, roleRequired('admin'), PlatformsController.update);
router.delete('/:id', authRequired, roleRequired('admin'), PlatformsController.remove);

export default router;
