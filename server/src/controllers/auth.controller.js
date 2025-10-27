import bcrypt from 'bcryptjs';

import { pool } from '../db/pool.js';
import { signToken } from '../middleware/auth.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

export const AuthController = {
  /**
   * POST /api/auth/register
   * Регистрация нового пользователя. Пароль хэшируется, токен в httpOnly cookie
   */
  async register(req, res, next) {
    try {
      const { email, password, full_name } = req.body;

      if (!email || !password) {
        throw httpError(400, 'email and password are required');
      }

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
      if (!user) {
        throw httpError(409, 'Email already registered');
      }

      const token = signToken({ id: user.id, email: user.email, role: user.role });

      // устанавливаем токен в httpOnly cookie
      res.cookie('access_token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: false, // dev
        path: '/'
      });

      return res.status(201).json({
        user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
        token
      });
    } catch (e) {
      next(e);
    }
  },

  /**
   * POST /api/auth/login
   * Вход пользователя. Проверяем пароль, выдаём токен в httpOnly cookie
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        throw httpError(400, 'email and password are required');
      }

      const { rows } = await pool.query(
        'SELECT id, email, full_name, role, password_hash FROM users WHERE email=$1 LIMIT 1',
        [email]
      );

      const user = rows[0];
      if (!user) {
        throw httpError(401, 'Invalid credentials');
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        throw httpError(401, 'Invalid credentials');
      }

      const token = signToken({ id: user.id, email: user.email, role: user.role });

      return res
        .cookie('access_token', token, {
          httpOnly: true,
          sameSite: 'lax',
          secure: false,
          path: '/'
        })
        .json({
          user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role },
          token
        });
    } catch (e) {
      next(e);
    }
  },

  /**
   * GET /api/auth/me
   * Возвращает данные текущего пользователя (требует authRequired middleware)
   */
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

  /**
   * POST /api/auth/logout
   * Выход пользователя. Удаляем httpOnly cookie
   */
  logout(_req, res) {
    const cookieOpts = {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      path: '/'
    };

    // удаляем cookie
    res.clearCookie('access_token', cookieOpts);
    res.cookie('access_token', '', { ...cookieOpts, maxAge: 0 });

    return res.status(204).send();
  },

  /**
   * POST /api/auth/change-password
   * Смена пароля
   */
  async changePassword(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Не авторизован' });
      }

      const { currentPassword, newPassword } = req.body || {};

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'currentPassword и newPassword обязательны' });
      }

      if (String(newPassword).length < 6) {
        return res.status(400).json({ message: 'Новый пароль должен быть не короче 6 символов' });
      }

      // достаём пароль из БД
      const { rows } = await pool.query(
        'SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1',
        [userId]
      );

      const user = rows[0];
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      const stored = user.password_hash ?? '';

      // поддерживаем сидовые пароли и bcrypt
      let ok = false;
      const looksHashed = typeof stored === 'string' && stored.startsWith('$2');

      if (looksHashed) {
        ok = await bcrypt.compare(currentPassword, stored);
      } else {
        ok = stored === currentPassword;
      }

      if (!ok) {
        return res.status(400).json({ message: 'Текущий пароль неверный' });
      }

      const newHash = await bcrypt.hash(newPassword, 12);
      await pool.query('UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1', [
        userId,
        newHash
      ]);

      return res.status(204).send();
    } catch (e) {
      next(e);
    }
  },

  /**
   * GET /api/auth/profile
   */
  async getProfile(req, res, next) {
    try {
      const { rows } = await pool.query(
        `SELECT id, email, full_name, role, created_at, updated_at
         FROM users
         WHERE id = $1`,
        [req.user.id]
      );

      if (!rows[0]) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * PUT /api/auth/profile
   * Обновление своего профиля: full_name и email
   */
  async updateProfile(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: 'Не авторизован' });
      }

      const { full_name, email } = req.body || {};

      const { rows } = await pool.query(
        `UPDATE users
         SET
           full_name = COALESCE($2, full_name),
           email     = COALESCE($3, email),
           updated_at = NOW()
         WHERE id = $1
         RETURNING id, email, full_name, role, created_at, updated_at`,
        [userId, full_name ?? null, email ?? null]
      );

      if (!rows[0]) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      res.json(rows[0]);
    } catch (e) {
      // ловим конфликт уникального email
      if (e.code === '23505') {
        return res.status(409).json({ message: 'Email уже занят' });
      }
      next(e);
    }
  },
};
