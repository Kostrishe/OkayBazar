import { Router } from 'express';

import { upload, saveImageBuffer } from '../utils/uploader.js';
import { authRequired, roleRequired } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

const router = Router();

// Загрузка обложки игры
router.post(
  '/games/:id/cover',
  authRequired, roleRequired('admin'),
  upload.single('file'),
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'file is required' });
      const saved = await saveImageBuffer(req.file.buffer, `games/${req.params.id}/cover`, { width: 1920 });

      await pool.query(
        'UPDATE games SET cover_url = $2, updated_at = now() WHERE id = $1',
        [req.params.id, saved.url]
      );

      res.status(201).json(saved); // { url, thumb_url }
    } catch (e) { next(e); }
  }
);

// Загрузка скринов (множественная)
router.post(
  '/games/:id/screenshots',
  authRequired, roleRequired('admin'),
  upload.array('files', 8),
  async (req, res, next) => {
    try {
      if (!req.files?.length) return res.status(400).json({ error: 'files are required' });
      const results = [];
      for (const f of req.files) {
        results.push(await saveImageBuffer(f.buffer, `games/${req.params.id}/screens`, { width: 1920 }));
      }

      // добавляем к массиву screenshots
      await pool.query(
        `
        UPDATE games
        SET screenshots = COALESCE(screenshots, '[]'::jsonb) || $2::jsonb,
            updated_at = now()
        WHERE id = $1
        `,
        [req.params.id, JSON.stringify(results.map(x => x.url))]
      );

      res.status(201).json({ items: results });
    } catch (e) { next(e); }
  }
);

// Удаление скрина по индексу
router.delete(
  '/games/:id/screenshots/:index',
  authRequired, roleRequired('admin'),
  async (req, res, next) => {
    try {
      const { id, index } = req.params;
      const idx = Number(index);
      const { rows } = await pool.query('SELECT screenshots FROM games WHERE id=$1', [id]);
      const arr = rows[0]?.screenshots || [];
      if (Number.isNaN(idx) || idx < 0 || idx >= arr.length) {
        return res.status(400).json({ error: 'bad index' });
      }
      arr.splice(idx, 1);
      await pool.query('UPDATE games SET screenshots=$2::jsonb WHERE id=$1', [id, JSON.stringify(arr)]);
      res.status(204).send();
    } catch (e) { next(e); }
  }
);

export default router;
