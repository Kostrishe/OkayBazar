import { Router } from 'express';

import { GamesController } from '../controllers/games.controller.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();

/* Публичные */
router.get('/', GamesController.list);
router.get('/:idOrSlug', GamesController.getOne);

/* Админка: CRUD + синхронизация связей */
router.post('/', authRequired, roleRequired('admin'), GamesController.create);
router.put('/:id', authRequired, roleRequired('admin'), GamesController.update);
router.delete('/:id', authRequired, roleRequired('admin'), GamesController.remove);

router.put('/:id/genres', authRequired, roleRequired('admin'), GamesController.updateGenres);
router.put('/:id/platforms', authRequired, roleRequired('admin'), GamesController.updatePlatforms);

export default router;
