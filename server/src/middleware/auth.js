import jwt from 'jsonwebtoken';

import config from '../config/index.js';

// Функция для извлечения токена из запроса
function getTokenFromReq(req) {
  const h = req.headers.authorization;
  if (h && h.startsWith('Bearer ')) {
    return h.slice(7);
  }
  return req.cookies?.access_token;
}

// Функция для создания JWT токена
export function signToken(payload) {
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
}

// Middleware для проверки авторизации
export function authRequired(req, res, next) {
  try {
    const token = getTokenFromReq(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded; // { id, role, email }
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

// Middleware для проверки ролей пользователя
export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}