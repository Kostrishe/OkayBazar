import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import api from './routes/index.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// trust proxy в продакшене
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// настройка CORS
const ALLOWLIST = new Set(['http://localhost:5173', 'http://127.0.0.1:5173']);

const corsOptions = {
  origin(origin, cb) {
    // разрешаю запросы без Origin (например, curl/Postman)
    if (!origin) {
      return cb(null, true);
    }

    if (ALLOWLIST.has(origin)) {
      return cb(null, true);
    }
    // разрешаю любой порт Vite на localhost/127.0.0.1
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return cb(null, true);
    }

    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true, // важно: чтобы куки ходили по CORS
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600
};
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
// статика (должна быть до роутов и 404)
app.use(
  '/images',
  express.static(path.join(process.cwd(), 'public', 'images'), {
    maxAge: '30d',
    setHeaders: (res) => {
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
    }
  })
);
app.use(
  '/uploads',
  express.static(path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'), {
    maxAge: '7d'
  })
);
// health check для мониторинга
app.get('/health', (_req, res) => res.json({ ok: true }));
// API роуты
app.use('/api', api);
// обработка 404 и ошибок (в самом конце)
app.use(notFound);
app.use(errorHandler);
export default app;
