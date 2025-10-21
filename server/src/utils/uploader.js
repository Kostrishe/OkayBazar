import fs from 'fs';
import path from 'path';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';

const uploadDir = process.env.UPLOAD_DIR || 'uploads';
const maxMb = Number(process.env.MAX_FILE_SIZE_MB || 8);

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.memoryStorage(); // в память, потом через sharp на диск

export const upload = multer({
  storage,
  limits: { fileSize: maxMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype);
    cb(ok ? null : new Error('Only jpg/png/webp allowed'), ok);
  }
});

function randomName(ext) {
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
}

export async function saveImageBuffer(buf, subfolder = '', opts = { width: 1920, quality: 80 }) {
  const folder = path.join(uploadDir, subfolder);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });

  // определим расширение под webp
  const filename = randomName('webp');
  const filepath = path.join(folder, filename);

  await sharp(buf)
    .rotate()                    // авто-EXIF
    .resize({ width: opts.width, withoutEnlargement: true })
    .webp({ quality: opts.quality })
    .toFile(filepath);

  // сделаем превью (миниатюру)
  const thumbName = filename.replace('.webp', '.thumb.webp');
  const thumbPath = path.join(folder, thumbName);
  await sharp(buf)
    .rotate()
    .resize({ width: 420, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(thumbPath);

  const base = process.env.BASE_URL || '';
  const publicBase = `${base.replace(/\/$/, '')}/uploads/${subfolder ? subfolder + '/' : ''}`;
  return {
    url: `${publicBase}${filename}`,
    thumb_url: `${publicBase}${thumbName}`
  };
}
