import { pool } from '../db/pool.js';
const err = (s, m) => Object.assign(new Error(m), { status: s });

export const UsersController = {
  // GET /api/users
  async list(_req, res, next) {
    try {
      const { rows } = await pool.query(
        'SELECT id, email, full_name, role, created_at, updated_at FROM users ORDER BY id DESC LIMIT 100'
      );
      res.json(rows);
    } catch (e) { next(e); }
  },

  // GET /api/users/:id
  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        'SELECT id, email, full_name, role, created_at FROM users WHERE id=$1',
        [id]
      );
      if (!rows[0]) throw err(404, 'User not found');
      res.json(rows[0]);
    } catch (e) { next(e); }
  },

  // POST /api/users  (в учебных целях без хэша)
  async create(req, res, next) {
    try {
      const { email, password, full_name, role } = req.body;
      if (!email || !password) throw err(400, 'email and password are required');

      const { rows } = await pool.query(
        `
        INSERT INTO users (email, password_hash, full_name, role)
        VALUES ($1, $2, $3, COALESCE($4,'customer'))
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, full_name, role
        `,
        [email, password, full_name ?? null, role ?? null] // TODO: заменить на хэш
      );

      res.status(201).json(rows[0] ?? { info: 'exists' });
    } catch (e) { next(e); }
  },

  // PUT /api/users/:id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { email, password, full_name, role } = req.body;

      const { rows } = await pool.query(
        `
        UPDATE users SET
          email = COALESCE($2, email),
          password_hash = COALESCE($3, password_hash),
          full_name = COALESCE($4, full_name),
          role = COALESCE($5, role),
          updated_at = now()
        WHERE id=$1
        RETURNING id, email, full_name, role, updated_at
        `,
        [id, email ?? null, password ?? null, full_name ?? null, role ?? null]
      );

      if (!rows[0]) throw err(404, 'User not found');
      res.json(rows[0]);
    } catch (e) { next(e); }
  },

  // DELETE /api/users/:id
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [id]);
      if (!rowCount) throw err(404, 'User not found');
      res.status(204).send();
    } catch (e) { next(e); }
  }
};
