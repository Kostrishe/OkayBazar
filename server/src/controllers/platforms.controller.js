import { pool } from '../db/pool.js';
const err = (s, m) => Object.assign(new Error(m), { status: s });

export const PlatformsController = {
  async list(_req, res, next) {
    try {
      const { rows } = await pool.query('SELECT id, name FROM platforms ORDER BY name');
      res.json(rows);
    } catch (e) { next(e); }
  },
  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const { rows } = await pool.query('SELECT id, name FROM platforms WHERE id=$1', [id]);
      if (!rows[0]) throw err(404, 'Platform not found');
      res.json(rows[0]);
    } catch (e) { next(e); }
  },
  async create(req, res, next) {
    try {
      const { name } = req.body;
      if (!name) throw err(400, 'name is required');
      const { rows } = await pool.query(
        'INSERT INTO platforms(name) VALUES($1) ON CONFLICT(name) DO NOTHING RETURNING *',
        [name]
      );
      res.status(201).json(rows[0] ?? { info: 'exists' });
    } catch (e) { next(e); }
  },
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const { rows } = await pool.query(
        'UPDATE platforms SET name = COALESCE($2, name) WHERE id=$1 RETURNING *',
        [id, name ?? null]
      );
      if (!rows[0]) throw err(404, 'Platform not found');
      res.json(rows[0]);
    } catch (e) { next(e); }
  },
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM platforms WHERE id=$1', [id]);
      if (!rowCount) throw err(404, 'Platform not found');
      res.status(204).send();
    } catch (e) { next(e); }
  }
};
