import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';

import config from './config/index.js';
import api from './routes/index.js';
import { notFound } from './middleware/not-found.js';
import { errorHandler } from './middleware/error-handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

/* --------- CORS + COOKIES --------- */
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Разрешаем localhost/127.0.0.1 на любом порту Vite + явный allowlist
const ALLOWLIST = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173'
  // при необходимости добавь сюда другие origin (например, preview-хосты)
]);

const corsOptions = {
  origin(origin, cb) {
    // Разрешаем запросы без Origin (например, curl/Postman/health)
    if (!origin) return cb(null, true);

    if (ALLOWLIST.has(origin)) return cb(null, true);

    // Разрешить любой порт Vite на localhost/127.0.0.1
    if (/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return cb(null, true);
    }

    return cb(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true, // ВАЖНО: чтобы куки ходили по CORS
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 600
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

/* --------- СТАТИКА (ДОЛЖНА БЫТЬ ДО РОУТОВ/404) --------- */
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

app.get('/health', (_req, res) => res.json({ ok: true }));

/* --------- API --------- */
app.use('/api', api);

/* --------- 404 + ERRORS --------- */
app.use(notFound);
app.use(errorHandler);

export default app;
