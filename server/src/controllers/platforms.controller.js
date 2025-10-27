import { pool } from '../db/pool.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export const PlatformsController = {
  /**
   * GET /api/platforms
   * Возвращает список всех платформ, отсортированных по имени
   */
  async list(_req, res, next) {
    try {
      const { rows } = await pool.query('SELECT id, name FROM platforms ORDER BY name');
      res.json(rows);
    } catch (e) {
      next(e);
    }
  },

  /**
   * GET /api/platforms/:id
   * Возвращает одну платформу по id
   */
  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT id, name FROM platforms WHERE id=$1', [id]);
      if (!rows[0]) {
        throw httpError(404, 'Platform not found');
      }
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * POST /api/platforms
   * Создаёт новую платформу. Если такая уже есть, возвращаем info: 'exists'
   */
  async create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) {
        throw httpError(400, 'name is required');
      }

      const { rows } = await pool.query(
        'INSERT INTO platforms(name) VALUES($1) ON CONFLICT(name) DO NOTHING RETURNING *',
        [name]
      );

      res.status(201).json(rows[0] ?? { info: 'exists' });
    } catch (e) {
      next(e);
    }
  },

  /**
   * PUT /api/platforms/:id
   * Обновляет имя платформы. Если поле не передано, оставляем старое значение
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;

      const { rows } = await pool.query(
        'UPDATE platforms SET name = COALESCE($2, name) WHERE id=$1 RETURNING *',
        [id, name ?? null]
      );

      if (!rows[0]) {
        throw httpError(404, 'Platform not found');
      }

      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * DELETE /api/platforms/:id
   * Удаляет платформу по id
   */
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM platforms WHERE id=$1', [id]);

      if (!rowCount) {
        throw httpError(404, 'Platform not found');
      }

      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
};
