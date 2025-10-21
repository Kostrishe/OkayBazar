import { pool } from '../db/pool.js';

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export const GamesController = {
  // GET /api/games?sort=&genreIds=&platformIds=&priceMin=&priceMax=&page=&limit=
  async list(req, res, next) {
    try {
      const toIntArr = (v) =>
        String(v ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
          .map(Number)
          .filter((n) => Number.isFinite(n));

      const toStrArr = (v) =>
        String(v ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

      // пагинация
      const limit = Math.min(Number(req.query.limit ?? 25), 100);
      const page = Math.max(Number(req.query.page ?? 1), 1);
      const offset = (page - 1) * limit;

      // сортировка
      const sortRaw = String(req.query.sort ?? req.query.order ?? 'name');
      let orderBy = `g.title ASC, g.id ASC`;
      if (sortRaw === 'price_asc') orderBy = `g.price_final ASC NULLS LAST, g.id ASC`;
      else if (sortRaw === 'price_desc') orderBy = `g.price_final DESC NULLS LAST, g.id ASC`;
      else if (sortRaw === 'name') orderBy = `g.title ASC, g.id ASC`;

      // фильтры
      const genreIds = toIntArr(req.query.genreIds ?? req.query.genre_ids);
      const platformIds = toIntArr(req.query.platformIds ?? req.query.platform_ids);
      const genreNames = toStrArr(req.query.genres);
      const platformNames = toStrArr(req.query.platforms);
      const priceMin = Number(req.query.priceMin ?? req.query.min_price);
      const priceMax = Number(req.query.priceMax ?? req.query.max_price);

      const where = [];
      const params = [];
      let i = 1;

      if (genreIds.length) {
        where.push(`EXISTS (
          SELECT 1 FROM game_genres gj
          WHERE gj.game_id = g.id AND gj.genre_id = ANY($${i}::bigint[])
        )`);
        params.push(genreIds);
        i++;
      }

      if (genreNames.length) {
        where.push(`EXISTS (
          SELECT 1
          FROM game_genres gj
          JOIN genres ge ON ge.id = gj.genre_id
          WHERE gj.game_id = g.id AND ge.name = ANY($${i}::text[])
        )`);
        params.push(genreNames);
        i++;
      }

      if (platformIds.length) {
        where.push(`EXISTS (
          SELECT 1 FROM game_platforms gp
          WHERE gp.game_id = g.id AND gp.platform_id = ANY($${i}::bigint[])
        )`);
        params.push(platformIds);
        i++;
      }

      if (platformNames.length) {
        where.push(`EXISTS (
          SELECT 1
          FROM game_platforms gp
          JOIN platforms p ON p.id = gp.platform_id
          WHERE gp.game_id = g.id AND p.name = ANY($${i}::text[])
        )`);
        params.push(platformNames);
        i++;
      }

      if (!Number.isNaN(priceMin)) {
        where.push(`g.price_final >= $${i}`);
        params.push(priceMin);
        i++;
      }
      if (!Number.isNaN(priceMax)) {
        where.push(`g.price_final <= $${i}`);
        params.push(priceMax);
        i++;
      }

      const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

      // данные
      const itemsSQL = `
        SELECT
          g.id, g.title, g.slug, g.description, g.developer, g.publisher,
          g.release_date, g.age_rating, g.base_price, g.discount_percent,
          g.price_final AS price, g.cover_url, g.screenshots
        FROM games g
        ${whereSQL}
        ORDER BY ${orderBy}
        LIMIT $${i} OFFSET $${i + 1}
      `;
      const itemsParams = [...params, limit, offset];

      // total с учётом фильтров
      const countSQL = `SELECT COUNT(*)::int AS total FROM games g ${whereSQL}`;
      const [{ rows }, { rows: cnt }] = await Promise.all([
        pool.query(itemsSQL, itemsParams),
        pool.query(countSQL, params)
      ]);

      res.json({ items: rows, total: cnt[0].total, page, limit });
    } catch (err) {
      next(err);
    }
  },

  // GET /api/games/:idOrSlug
  async getOne(req, res, next) {
    try {
      const { idOrSlug } = req.params;
      const isId = /^\d+$/.test(idOrSlug);

      const { rows } = await pool.query(
        `
        SELECT
          g.id, g.title, g.slug, g.description, g.developer, g.publisher,
          g.release_date, g.age_rating, g.base_price, g.discount_percent,
          g.price_final, g.cover_url, g.screenshots,
          COALESCE((
            SELECT json_agg(j.name ORDER BY j.name)
            FROM game_genres gj
            JOIN genres j ON j.id = gj.genre_id
            WHERE gj.game_id = g.id
          ), '[]'::json) AS genres,
          COALESCE((
            SELECT json_agg(json_build_object(
              'platform', p.name,
              'platform_id', p.id,
              'sku', gp.sku,
              'stock', gp.stock,
              'price', COALESCE(gp.price_override, g.price_final)
            ) ORDER BY p.name)
            FROM game_platforms gp
            JOIN platforms p ON p.id = gp.platform_id
            WHERE gp.game_id = g.id
          ), '[]'::json) AS platforms
        FROM games g
        WHERE ${isId ? 'g.id = $1::bigint' : 'g.slug = $1'}
        LIMIT 1
        `,
        [idOrSlug]
      );

      if (!rows[0]) throw httpError(404, 'Game not found');
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  },

  // POST /api/games
  async create(req, res, next) {
    try {
      const {
        title,
        slug, // можно не передавать — триггер сгенерит
        description,
        developer,
        publisher,
        release_date,
        age_rating,
        base_price = 0,
        discount_percent = 0,
        cover_url,
        screenshots = []
      } = req.body;

      if (!title) throw httpError(400, 'title is required');

      const { rows } = await pool.query(
        `
        INSERT INTO games
          (title, slug, description, developer, publisher, release_date, age_rating,
           base_price, discount_percent, cover_url, screenshots)
        VALUES
          ($1,    $2,   $3,          $4,        $5,        $6,           $7,
           $8,         $9,               $10,       $11::jsonb)
        RETURNING id, title, slug, price_final
        `,
        [
          title,
          slug ?? null,
          description ?? null,
          developer ?? null,
          publisher ?? null,
          release_date ?? null,
          age_rating ?? null,
          base_price,
          discount_percent,
          cover_url ?? null,
          JSON.stringify(screenshots)
        ]
      );

      res.status(201).json(rows[0]);
    } catch (err) {
      next(err);
    }
  },

  // PUT /api/games/:id
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const {
        title,
        slug,
        description,
        developer,
        publisher,
        release_date,
        age_rating,
        base_price,
        discount_percent,
        cover_url,
        screenshots
      } = req.body;

      const { rows } = await pool.query(
        `
        UPDATE games SET
          title = COALESCE($2, title),
          slug = COALESCE($3, slug),
          description = COALESCE($4, description),
          developer = COALESCE($5, developer),
          publisher = COALESCE($6, publisher),
          release_date = COALESCE($7, release_date),
          age_rating = COALESCE($8, age_rating),
          base_price = COALESCE($9, base_price),
          discount_percent = COALESCE($10, discount_percent),
          cover_url = COALESCE($11, cover_url),
          screenshots = COALESCE($12::jsonb, screenshots),
          updated_at = now()
        WHERE id = $1
        RETURNING *
        `,
        [
          id,
          title ?? null,
          slug ?? null,
          description ?? null,
          developer ?? null,
          publisher ?? null,
          release_date ?? null,
          age_rating ?? null,
          base_price ?? null,
          discount_percent ?? null,
          cover_url ?? null,
          screenshots ? JSON.stringify(screenshots) : null
        ]
      );

      if (!rows[0]) throw httpError(404, 'Game not found');
      res.json(rows[0]);
    } catch (err) {
      next(err);
    }
  },

  // DELETE /api/games/:id
  async remove(req, res, next) {
    try {
      const { id } = req.params;
      const { rowCount } = await pool.query('DELETE FROM games WHERE id = $1', [id]);
      if (!rowCount) throw httpError(404, 'Game not found');
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  }
};
