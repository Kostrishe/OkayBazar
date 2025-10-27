import { pool } from '../db/pool.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export const ReviewsController = {
  /**
   * GET /api/reviews?game_id=&user_id=
   * Возвращает список отзывов с фильтрацией по игре или пользователю
   */
  async list(req, res, next) {
    try {
      const { game_id, user_id } = req.query;
      const clauses = [];
      const params = [];

      if (game_id) {
        params.push(game_id);
        clauses.push(`game_id = $${params.length}`);
      }
      if (user_id) {
        params.push(user_id);
        clauses.push(`user_id = $${params.length}`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const { rows } = await pool.query(
        `
        SELECT 
          r.id, r.user_id, r.game_id, r.rating, r.body, r.created_at,
          u.full_name AS user_name, 
          g.title AS game_title
        FROM reviews r
        JOIN users u ON u.id = r.user_id
        JOIN games g ON g.id = r.game_id
        ${where}
        ORDER BY r.created_at DESC
        `,
        params
      );

      res.json(rows);
    } catch (e) {
      next(e);
    }
  },

  /**
   * GET /api/reviews/:id
   * Возвращает один отзыв по id
   */
  async getOne(req, res, next) {
    try {
      const { id } = req.params;

      const { rows } = await pool.query(
        `
        SELECT r.id, r.user_id, r.game_id, r.rating, r.body, r.created_at
        FROM reviews r 
        WHERE r.id=$1
        `,
        [id]
      );

      if (!rows[0]) {
        throw httpError(404, 'Review not found');
      }

      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * POST /api/reviews
   * Создаёт новый отзыв. Один пользователь может оставить только один отзыв на игру
   */
  async create(req, res, next) {
    try {
      const { user_id, game_id, rating, body } = req.body;

      if (!user_id || !game_id || !rating) {
        throw httpError(400, 'user_id, game_id, rating required');
      }

      const { rows } = await pool.query(
        `
        INSERT INTO reviews (user_id, game_id, rating, body)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, game_id) DO NOTHING
        RETURNING *
        `,
        [user_id, game_id, rating, body ?? null]
      );

      res.status(201).json(rows[0] ?? { info: 'already reviewed' });
    } catch (e) {
      next(e);
    }
  },

  /**
   * PUT /api/reviews/:id
   * Обновляет отзыв. Можно изменить рейтинг и текст
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { rating, body } = req.body;

      const { rows } = await pool.query(
        `
        UPDATE reviews SET
          rating = COALESCE($2, rating),
          body = COALESCE($3, body)
        WHERE id=$1
        RETURNING *
        `,
        [id, rating ?? null, body ?? null]
      );

      if (!rows[0]) {
        throw httpError(404, 'Review not found');
      }

      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * DELETE /api/reviews/:id
   * Удаляет отзыв по id
   */
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM reviews WHERE id=$1', [id]);

      if (!rowCount) {
        throw httpError(404, 'Review not found');
      }

      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
};