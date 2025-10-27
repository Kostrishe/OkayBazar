import { pool } from '../db/pool.js';

function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}

/**
 * Функция для поиска или создания открытого заказа (корзины)
 * Ищу pending заказ без платежей. Если нет — создаю новый
 */
async function findOrCreateOpenOrder(userId) {
  const { rows } = await pool.query(
    `SELECT o.id
     FROM orders o
     WHERE o.user_id = $1
       AND o.status  = 'pending'
       AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.order_id = o.id)
     ORDER BY o.created_at DESC
     LIMIT 1`,
    [userId]
  );

  if (rows[0]) {
    return rows[0].id;
  }

  // если нет открытого заказа — создаю новый
  const ins = await pool.query(
    `INSERT INTO orders (user_id, status, payment_status, total_amount)
     VALUES ($1, 'pending', 'pending', 0)
     RETURNING id`,
    [userId]
  );

  return ins.rows[0].id;
}

/**
 * Функция для выбора платформы и цены игры
 * Если платформа указана — проверяю её. Если нет — беру самую дешёвую
 */
async function choosePlatformAndPrice(gameId, platformIdNullable) {
  // проверяю, существует ли игра
  const { rows: gameExists } = await pool.query(`SELECT id, title FROM games WHERE id = $1`, [
    gameId
  ]);

  if (!gameExists[0]) {
    throw httpError(404, `Game with ID ${gameId} not found`);
  }

  // проверяю, есть ли у игры платформы
  const { rows: platformLinks } = await pool.query(
    `SELECT COUNT(*) as count FROM game_platforms WHERE game_id = $1`,
    [gameId]
  );

  if (parseInt(platformLinks[0]?.count || 0) === 0) {
    throw httpError(
      400,
      `Game "${gameExists[0].title}" has no platforms configured. Please contact administrator.`
    );
  }

  // если платформа передана — проверяю её
  if (platformIdNullable) {
    const { rows } = await pool.query(
      `
        SELECT p.id AS platform_id, COALESCE(g.price_final) AS price
        FROM game_platforms gp
        JOIN platforms p ON p.id = gp.platform_id
        JOIN games g ON g.id = gp.game_id
        WHERE gp.game_id=$1 AND gp.platform_id=$2
        LIMIT 1
      `,
      [gameId, platformIdNullable]
    );

    if (!rows[0]) {
      throw httpError(400, 'incorrect game/platform pair');
    }

    return rows[0];
  }

  // если platform_id не передан — беру самую дешёвую платформу
  const { rows } = await pool.query(
    `
      SELECT p.id AS platform_id, COALESCE(g.price_final) AS price
      FROM game_platforms gp
      JOIN platforms p ON p.id = gp.platform_id
      JOIN games g ON g.id = gp.game_id
      WHERE gp.game_id=$1
      ORDER BY COALESCE(g.price_final) ASC, p.name ASC
      LIMIT 1
    `,
    [gameId]
  );

  if (!rows[0]) {
    throw httpError(400, 'no platforms configured for this game');
  }

  return rows[0];
}

/**
 * Функция для пересчёта общей суммы заказа.
 * Складываю все subtotal из order_items и обновляю total_amount в orders
 */
async function recalcOrderTotal(orderId) {
  const { rows } = await pool.query(
    `SELECT COALESCE(SUM(subtotal),0)::numeric(10,2) AS total FROM order_items WHERE order_id=$1`,
    [orderId]
  );

  const total = rows[0]?.total ?? 0;

  await pool.query(`UPDATE orders SET total_amount=$2, updated_at=now() WHERE id=$1`, [
    orderId,
    total
  ]);

  return total;
}

/**
 * Функция для получения данных корзины.
 * Возвращаю items, count и total
 */
async function getCartPayload(userId) {
  const { rows: ords } = await pool.query(
    `SELECT id FROM orders WHERE user_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );

  if (!ords[0]) {
    return { items: [], count: 0, total: 0 };
  }

  const orderId = ords[0].id;

  const { rows: items } = await pool.query(
    `
      SELECT
        oi.id,
        oi.qty,
        oi.unit_price,
        (oi.subtotal)::numeric(10,2) AS subtotal,
        g.id AS game_id,
        g.title,
        g.cover_url,
        p.name AS platform
      FROM order_items oi
      JOIN games g     ON g.id = oi.game_id
      JOIN platforms p ON p.id = oi.platform_id
      WHERE oi.order_id=$1
      ORDER BY oi.id DESC
    `,
    [orderId]
  );

  const { rows: totals } = await pool.query(
    `SELECT COALESCE(SUM(qty),0) AS count, COALESCE(SUM(subtotal),0)::numeric(10,2) AS total FROM order_items WHERE order_id=$1`,
    [orderId]
  );

  return {
    items,
    count: Number(totals[0].count || 0),
    total: Number(totals[0].total || 0)
  };
}

export const CartController = {
  /**
   * GET /api/cart
   * Возвращает текущую корзину пользователя (items, count, total)
   */
  async get(req, res, next) {
    try {
      const uid = req.user?.id;
      if (!uid) {
        throw httpError(401, 'unauthorized');
      }

      const payload = await getCartPayload(uid);
      res.json(payload);
    } catch (e) {
      next(e);
    }
  },

  /**
   * POST /api/cart
   * Добавляет товар в корзину. Принимает gameId, quantity, platformId.
   * Если позиция уже есть — возвращаю notice: 'already_in_cart'
   */
  async add(req, res, next) {
    try {
      const uid = req.user?.id;
      if (!uid) {
        throw httpError(401, 'unauthorized');
      }

      const gameId = Number(req.body.gameId || req.body.game_id);
      const platformIdRaw = req.body.platformId ?? req.body.platform_id ?? null;

      if (!Number.isFinite(gameId)) {
        throw httpError(400, 'gameId is required');
      }

      const { platform_id, price } = await choosePlatformAndPrice(
        gameId,
        platformIdRaw ? Number(platformIdRaw) : null
      );

      const orderId = await findOrCreateOpenOrder(uid);

      // проверяю, есть ли уже такая позиция в корзине
      const { rows: existing } = await pool.query(
        `SELECT id FROM order_items
        WHERE order_id=$1 AND game_id=$2 AND platform_id=$3
        LIMIT 1`,
        [orderId, gameId, platform_id]
      );

      if (existing[0]) {
        // если позиция уже есть в корзине — ничего не добавляю
        const payload = await getCartPayload(uid);
        return res.status(200).json({ ...payload, notice: 'already_in_cart' });
      }

      // добавляю новый товар в корзину
      await pool.query(
        `INSERT INTO order_items (order_id, game_id, platform_id, qty, unit_price)
        VALUES ($1, $2, $3, 1, $4)`,
        [orderId, gameId, platform_id, price]
      );

      await recalcOrderTotal(orderId);

      const payload = await getCartPayload(uid);
      res.status(201).json(payload);
    } catch (e) {
      next(e);
    }
  },

  /**
   * DELETE /api/cart/:itemId
   * Удаляет одну позицию из корзины по id элемента
   */
  async remove(req, res, next) {
    try {
      const uid = req.user?.id;
      if (!uid) {
        throw httpError(401, 'unauthorized');
      }

      const itemId = Number(req.params.itemId);
      if (!Number.isFinite(itemId)) {
        throw httpError(400, 'bad itemId');
      }

      // удаляю только из своего «открытого» заказа
      const { rows: own } = await pool.query(
        `
          DELETE FROM order_items oi
          USING orders o
          WHERE oi.id=$1 AND o.id = oi.order_id AND o.user_id=$2 AND o.status='pending'
          RETURNING o.id AS order_id
        `,
        [itemId, uid]
      );

      if (own[0]) {
        await recalcOrderTotal(own[0].order_id);
      }

      const payload = await getCartPayload(uid);
      res.json(payload);
    } catch (e) {
      next(e);
    }
  },

  /**
   * DELETE /api/cart
   * Очищает всю корзину (удаляет все позиции из pending заказа)
   */
  async clear(req, res, next) {
    try {
      const uid = req.user?.id;
      if (!uid) {
        throw httpError(401, 'unauthorized');
      }

      const { rows: ords } = await pool.query(
        `SELECT id FROM orders WHERE user_id=$1 AND status='pending' ORDER BY created_at DESC LIMIT 1`,
        [uid]
      );

      if (ords[0]) {
        await pool.query(`DELETE FROM order_items WHERE order_id=$1`, [ords[0].id]);
        await recalcOrderTotal(ords[0].id);
      }

      const payload = await getCartPayload(uid);
      res.json(payload);
    } catch (e) {
      next(e);
    }
  }
};