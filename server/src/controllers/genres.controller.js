import { pool } from '../db/pool.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export const GenresController = {
  /**
   * GET /api/genres
   * Возвращает список всех жанров, отсортированных по имени
   */
  async list(_req, res, next) {
    try {
      const { rows } = await pool.query('SELECT id, name FROM genres ORDER BY name');
      res.json(rows);
    } catch (e) {
      next(e);
    }
  },

  /**
   * GET /api/genres/:id
   * Возвращает один жанр по id
   */
  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT id, name FROM genres WHERE id=$1', [id]);
      if (!rows[0]) {
        throw httpError(404, 'Genre not found');
      }
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * POST /api/genres
   * Создаёт новый жанр. Если жанр с таким именем уже есть, возвращаем info: 'exists'
   */
  async create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) {
        throw httpError(400, 'name is required');
      }

      const { rows } = await pool.query(
        'INSERT INTO genres(name) VALUES($1) ON CONFLICT(name) DO NOTHING RETURNING *',
        [name]
      );

      res.status(201).json(rows[0] ?? { info: 'exists' });
    } catch (e) {
      next(e);
    }
  },

  /**
   * PUT /api/genres/:id
   * Обновляет имя жанра. Если поле не передано, оставляем старое значение
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const { rows } = await pool.query(
        'UPDATE genres SET name = COALESCE($2, name) WHERE id=$1 RETURNING *',
        [id, name ?? null]
      );

      if (!rows[0]) {
        throw httpError(404, 'Genre not found');
      }

      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * DELETE /api/genres/:id
   * Удаляет жанр по id
   */
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM genres WHERE id=$1', [id]);

      if (!rowCount) {
        throw httpError(404, 'Genre not found');
      }

      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
};