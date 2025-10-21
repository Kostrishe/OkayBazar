import { Router } from 'express';

import { ReviewsController } from '../controllers/reviews.controller.js';
const router = Router();

router.get('/', ReviewsController.list);
router.get('/:id', ReviewsController.getOne);
router.post('/', ReviewsController.create);
router.put('/:id', ReviewsController.update);
router.delete('/:id', ReviewsController.remove);

export default router;
