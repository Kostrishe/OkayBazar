import { Router } from 'express';

import { GenresController } from '../controllers/genres.controller.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const router = Router();

// public
router.get('/', GenresController.list);
router.get('/:id', GenresController.getOne);

// admin-only
router.post('/', authRequired, roleRequired('admin'), GenresController.create);
router.put('/:id', authRequired, roleRequired('admin'), GenresController.update);
router.delete('/:id', authRequired, roleRequired('admin'), GenresController.remove);

export default router;
