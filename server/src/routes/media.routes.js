// server/src/routes/media.routes.js
import { Router } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';

import { authRequired, roleRequired } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

const router = Router();

// Корневая папка с картинками
const IMAGES_ROOT = path.join(process.cwd(), 'public', 'images');

// Функция для гарантированного создания папки
function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

// Функция для разрешения подкаталога (covers или screens)
function resolveSubfolder(folder) {
  const map = { covers: 'covers', screens: 'screens' };
  return map[folder] || 'screens'; // Вернем "screens" по умолчанию
}

// Функция для генерации безопасного имени файла
function sanitizeFilename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  const name = path.basename(originalName, ext);

  // Убираем все спецсимволы, оставляем только буквы, цифры, дефис и подчеркивание
  const safeName = name
    .replace(/[^\w\s-]/g, '') // удаляем спецсимволы
    .replace(/\s+/g, '-') // пробелы заменяем на дефис
    .replace(/-+/g, '-') // множественные дефисы на один
    .toLowerCase()
    .substring(0, 100); // ограничение длины

  return `${safeName}${ext}`;
}

// Конфигурация multer для загрузки файлов
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const subfolder = resolveSubfolder(req.query.folder || req.body.folder);
    const dest = path.join(IMAGES_ROOT, subfolder);

    console.log('📁 Creating directory:', dest);
    ensureDir(dest);

    cb(null, dest);
  },
  filename(req, file, cb) {
    const safeName = sanitizeFilename(file.originalname);

    // Проверяем, существует ли уже файл с таким именем
    const subfolder = resolveSubfolder(req.query.folder || req.body.folder);
    const dest = path.join(IMAGES_ROOT, subfolder);
    let finalName = safeName;
    let counter = 1;

    // Если файл существует, добавляем счётчик
    while (fs.existsSync(path.join(dest, finalName))) {
      const ext = path.extname(safeName);
      const nameWithoutExt = path.basename(safeName, ext);
      finalName = `${nameWithoutExt}-${counter}${ext}`;
      counter++;
    }

    console.log('💾 Saving file as:', finalName);
    cb(null, finalName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB макс
  },
  fileFilter(req, file, cb) {
    // Проверяем, что это изображение
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
 * Роут для загрузки изображений (covers или screens)
 * POST /api/media/upload?folder=covers|screens
 * Принимает: form-data: file
 * Отдаёт: { url, rel }
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

    const subfolder = resolveSubfolder(req.query.folder || req.body.folder); // covers или screens
    const rel = `/images/${subfolder}/${req.file.filename}`; // путь относительно public
    const fullUrl = fileUrl(req, rel);

    console.log('✅ File uploaded:', {
      original: req.file.originalname,
      saved: req.file.filename,
      path: req.file.path,
      url: fullUrl
    });

    return res.status(201).json({ url: fullUrl, rel });
  }
);


/**
 * Роут для загрузки обложки для игры
 * POST /api/media/games/:id/cover   form-data: file
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

      // Обновляем URL обложки игры в базе данных
      await pool.query(`UPDATE games SET cover_url=$2, updated_at=now() WHERE id=$1`, [
        req.params.id,
        url
      ]);

      console.log('✅ Cover updated for game:', req.params.id, url);

      res.status(201).json({ url, rel });
    } catch (e) {
      console.error('❌ Cover upload error:', e);
      next(e);
    }
  }
);

/**
 * Роут для загрузки скриншотов для игры
 * POST /api/media/games/:id/screenshots   form-data: files[]
 */
router.post(
  '/games/:id/screenshots',
  authRequired,
  roleRequired('admin'),
  upload.array('files', 10),
  async (req, res, next) => {
    try {
      const id = req.params.id;
      const { rows } = await pool.query('SELECT screenshots FROM games WHERE id=$1', [id]);
      const current = Array.isArray(rows[0]?.screenshots) ? rows[0].screenshots : [];
      const start = current.length;

      const added = (req.files || []).map((f, i) => {
        const rel = `/images/screens/${f.filename}`;
        return { alt: '', url: fileUrl(req, rel), order: start + i };
      });

      const nextArr = current.concat(added);
      await pool.query('UPDATE games SET screenshots=$2::jsonb, updated_at=now() WHERE id=$1', [
        id,
        JSON.stringify(nextArr)
      ]);

      console.log('✅ Screenshots added for game:', id, added.length);

      res.status(201).json({ items: added });
    } catch (e) {
      console.error('❌ Screenshots upload error:', e);
      next(e);
    }
  }
);

export default router;
