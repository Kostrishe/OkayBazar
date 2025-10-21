import { Router } from 'express';

import { GamesController } from '../controllers/games.controller.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();

// public
router.get('/', GamesController.list);
router.get('/:idOrSlug', GamesController.getOne);

// admin-only
router.post('/', authRequired, roleRequired('admin'), GamesController.create);
router.put('/:id', authRequired, roleRequired('admin'), GamesController.update);
router.delete('/:id', authRequired, roleRequired('admin'), GamesController.remove);

export default router;
