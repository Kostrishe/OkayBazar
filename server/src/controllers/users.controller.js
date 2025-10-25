import bcrypt from 'bcryptjs';

import { pool } from '../db/pool.js';

const err = (s, m) => Object.assign(new Error(m), { status: s });

// Разрешаем только admin / customer
function normalizeRole(role) {
  return role === 'admin' ? 'admin' : 'customer';
}

export const UsersController = {
  // GET /api/users
  async list(_req, res, next) {
    try {
      const { rows } = await pool.query(
        'SELECT id, email, full_name, role, created_at, updated_at FROM users ORDER BY id DESC'
      );
      res.json(rows);
    } catch (e) {
      next(e);
    }
  },

  // GET /api/users/:id
  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const { rows } = await pool.query(
        'SELECT id, email, full_name, role, created_at, updated_at FROM users WHERE id=$1',
        [id]
      );
      if (!rows[0]) throw err(404, 'User not found');
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  // POST /api/users  — создаём пользователя (пароль хэшируем)
  async create(req, res, next) {
    try {
      const { email, password, full_name, role } = req.body;
      const safeRole = normalizeRole(role);

      if (!email || !password) throw err(400, 'email and password are required');

      // хэш пароля (если хочешь без хэша — используй const passwordHash = password;)
      const passwordHash = await bcrypt.hash(password, 10);

      const { rows } = await pool.query(
        `INSERT INTO users (email, full_name, password_hash, role)
         VALUES ($1, $2, $3, $4::user_role)
         RETURNING id, email, full_name, role, created_at, updated_at`,
        [email, full_name || null, passwordHash, safeRole]
      );

      res.status(201).json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  // PUT /api/users/:id — по ТЗ меняем только роль
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { role } = req.body; // не деструктурируем лишнего, чтобы не ловить no-unused-vars
      const safeRole = normalizeRole(role);

      const { rows } = await pool.query(
        `UPDATE users
         SET role = $2::user_role, updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, full_name, role, created_at, updated_at`,
        [id, safeRole]
      );

      if (!rows[0]) throw err(404, 'User not found');
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  // DELETE /api/users/:id
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM users WHERE id=$1', [id]);
      if (!rowCount) throw err(404, 'User not found');
      res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
};
