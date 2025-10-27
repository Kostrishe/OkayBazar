import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

import { authRequired, roleRequired } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

const router = Router();

// корневая папка с картинками
const IMAGES_ROOT = path.join(process.cwd(), 'public', 'images');

// Функция для создания папки, если её нет
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// Функция для определения подпапки (covers или screens)
function resolveSubfolder(folder) {
  const map = { covers: 'covers', screens: 'screens' };
  return map[folder] || 'screens';
}

// Функция для безопасного имени файла
function sanitizeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const name = path.basename(originalName, ext);

  const safeName = name
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase()
    .substring(0, 100);

  return `${safeName}${ext}`;
}

// конфигурация multer для загрузки файлов на диск
const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const subfolder = resolveSubfolder(req.query.folder || req.body.folder);
    const dest = path.join(IMAGES_ROOT, subfolder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename(req, file, cb) {
    const safeName = sanitizeFilename(file.originalname);
    const subfolder = resolveSubfolder(req.query.folder || req.body.folder);
    const dest = path.join(IMAGES_ROOT, subfolder);

    let finalName = safeName;
    let counter = 1;

    // если файл существует, добавляю счётчик
    while (fs.existsSync(path.join(dest, finalName))) {
      const ext = path.extname(safeName);
      const nameWithoutExt = path.basename(safeName, ext);
      finalName = `${nameWithoutExt}-${counter}${ext}`;
      counter++;
    }

    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB максимум
  },
  fileFilter(_req, file, cb) {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только изображения (JPEG, PNG, GIF, WebP)'));
    }
  }
});

// Функция для получения полного URL файла
function fileUrl(req, relPath) {
  return `${req.protocol}://${req.get('host')}${relPath}`.replace(/\\/g, '/');
}

/**
 * POST /api/media/upload?folder=covers|screens
 * Кратко: загружает изображение в указанную папку
 */
router.post(
  '/upload',
  authRequired,
  roleRequired('admin'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }

    const subfolder = resolveSubfolder(req.query.folder || req.body.folder);
    const rel = `/images/${subfolder}/${req.file.filename}`;
    const fullUrl = fileUrl(req, rel);

    return res.status(201).json({ url: fullUrl, rel });
  }
);

/**
 * POST /api/media/games/:id/cover
 * Кратко: загружает обложку для игры и обновляет cover_url в базе
 */
router.post(
  '/games/:id/cover',
  authRequired,
  roleRequired('admin'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'file is required' });
      }

      const rel = `/images/covers/${req.file.filename}`;
      const url = fileUrl(req, rel);

      // обновляю URL обложки игры в базе данных
      await pool.query('UPDATE games SET cover_url=$2, updated_at=now() WHERE id=$1', [
        req.params.id,
        url
      ]);

      res.status(201).json({ url, rel });
    } catch (e) {
      next(e);
    }
  }
);

/**
 * POST /api/media/games/:id/screenshots
 * Кратко: загружает скриншоты для игры и добавляет их в массив screenshots
 */
router.post(
  '/games/:id/screenshots',
  authRequired,
  roleRequired('admin'),
  upload.array('files', 10),
  async (req, res, next) => {
    try {
      const id = req.params.id;

      // получаю текущий массив скриншотов
      const { rows } = await pool.query('SELECT screenshots FROM games WHERE id=$1', [id]);
      const current = Array.isArray(rows[0]?.screenshots) ? rows[0].screenshots : [];
      const start = current.length;

      // добавляю новые скриншоты
      const added = (req.files || []).map((f, i) => {
        const rel = `/images/screens/${f.filename}`;
        return { alt: '', url: fileUrl(req, rel), order: start + i };
      });

      const nextArr = current.concat(added);

      // обновляю поле screenshots в базе
      await pool.query('UPDATE games SET screenshots=$2::jsonb, updated_at=now() WHERE id=$1', [
        id,
        JSON.stringify(nextArr)
      ]);

      res.status(201).json({ items: added });
    } catch (e) {
      next(e);
    }
  }
);

export default router;