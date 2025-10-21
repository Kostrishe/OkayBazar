import { Router } from 'express';

import games from './games.routes.js';
import users from './users.routes.js';
import orders from './orders.routes.js';
import genres from './genres.routes.js';
import platforms from './platforms.routes.js';
import reviews from './reviews.routes.js';
import media from './media.routes.js';
import auth from './auth.routes.js';
import cart from './cart.routes.js';
import { authRequired, roleRequired } from '../middleware/auth.js';

const api = Router();

api.use('/auth', auth);
api.use('/games', games);
api.use('/genres', genres);
api.use('/platforms', platforms);
api.use('/reviews', reviews);
api.use('/media', media);

api.use('/cart', cart);

api.use('/orders', authRequired, orders);
api.use('/users', authRequired, roleRequired('admin'), users);

api.use('/users', users);

export default api;
