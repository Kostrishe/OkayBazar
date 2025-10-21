import bcrypt from 'bcryptjs';

import { pool } from '../db/pool.js';
import { signToken } from '../middleware/auth.js';

const err = (s, m) => Object.assign(new Error(m), { status: s });

export const AuthController = {
  // POST /api/auth/register
  async register(req, res, next) {
    try {
      const { email, password, full_name } = req.body;
      if (!email || !password) throw err(400, 'email and password are required');

      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const { rows } = await pool.query(
        `
        INSERT INTO users (email, password_hash, full_name, role)
        VALUES ($1, $2, $3, 'customer')
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, full_name, role
        `,
        [email, hash, full_name ?? null]
      );

      const user = rows[0];
      if (!user) throw err(409, 'Email already registered');

      const token = signToken({ id: user.id, email: user.email, role: user.role });

      res.cookie('access_token', token, {
        httpOnly: true,
        sameSite: 'lax', // dev
        secure: false, // dev (HTTP)
        path: '/' // совпадает при clearCookie
      });

      return res.status(201).json({
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
        token
      });
    } catch (e) {
      next(e);
    }
  },

  // POST /api/auth/login
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      if (!email || !password) throw err(400, 'email and password are required');

      const { rows } = await pool.query(
        'SELECT id, email, full_name, role, password_hash FROM users WHERE email=$1 LIMIT 1',
        [email]
      );
      const user = rows[0];
      if (!user) throw err(401, 'Invalid credentials');

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) throw err(401, 'Invalid credentials');

      const token = signToken({ id: user.id, email: user.email, role: user.role });

      return res
        .cookie('access_token', token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: false, // dev
          path: '/' // ОБЯЗАТЕЛЬНО
        })
        .json({
          user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
          token
        });
    } catch (e) {
      next(e);
    }
  },

  // GET /api/auth/me
  async me(req, res, next) {
    try {
      const { rows } = await pool.query(
        'SELECT id, email, full_name, role, created_at FROM users WHERE id=$1',
        [req.user.id]
      );
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  // POST /api/auth/logout
  logout(req, res) {
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    };

    try {
      res.clearCookie('access_token', cookieOpts);
      res.cookie('access_token', '', { ...cookieOpts, maxAge: 0 });
    } catch {
      /* ignore */
    };

    res.clearCookie('access_token', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production' ? true : false,
      path: '/'
    });

    return res.status(204).send();
  },

  async changePassword(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Не авторизован' });

      const { currentPassword, newPassword } = req.body || {};
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'currentPassword и newPassword обязательны' });
      }
      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'Новый пароль должен быть не короче 6 символов' });
      }

      // 1) получаем текущий хэш/пароль
      const { rows } = await pool.query(
        'SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );
      const user = rows[0];
      if (!user) return res.status(404).json({ message: 'Пользователь не найден' });

      const stored = user.password_hash ?? '';

      // 2) поддерживаем оба варианта: обычный текст (из сидов) и bcrypt-хэш
      let ok = false;
      const looksHashed = typeof stored === 'string' && stored.startsWith('$2'); // bcrypt
      if (looksHashed) {
        ok = await bcrypt.compare(currentPassword, stored);
      } else {
        ok = stored === currentPassword; // сидовые «голые» пароли
      }
      if (!ok) return res.status(400).json({ message: 'Текущий пароль неверный' });

      // 3) хэшируем новый и сохраняем
      const newHash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
        userId,
        newHash
      ]);

      // (опционально) можно инвалидировать старые токены — если ты их где-то хранишь
      return res.status(204).send();
    } catch (e) {
      next(e);
    }
  }
};
