import { Router } from 'express';

import { ReviewsController } from '../controllers/reviews.controller.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();

// публичные маршруты (список и просмотр)
router.get('/', ReviewsController.list);
router.get('/:id', ReviewsController.getOne);

// авторизованные действия (создание, редактирование, удаление)
router.post('/', authRequired, ReviewsController.create);
router.put('/:id', authRequired, ReviewsController.update);
router.delete('/:id', authRequired, ReviewsController.remove);

export default router;