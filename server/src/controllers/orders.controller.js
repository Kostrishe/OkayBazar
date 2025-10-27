import { pool } from '../db/pool.js';

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

/**
 * Общая сумма заказа
 */
async function calcTotalAmount(items) {
  let total = 0;
  for (const it of items) {
    const qty = Number(it.qty ?? 1);
    if (!it.game_id || !it.platform_id || !qty) {
      throw httpError(400, 'invalid order item');
    }

    // цена: берём из games.price_final для связки игра-платформа
    const { rows } = await pool.query(
      `
      SELECT COALESCE(g.price_final) AS price
      FROM game_platforms gp
      JOIN games g ON g.id = gp.game_id
      WHERE gp.game_id = $1 AND gp.platform_id = $2
      LIMIT 1
      `,
      [it.game_id, it.platform_id]
    );

    if (!rows[0]) throw httpError(400, 'game/platform mismatch');
    total += rows[0].price * qty;
  }
  return Math.round(total * 100) / 100;
}

export const OrdersController = {
  /**
   * GET /api/orders?user_id=
   * Возвращает список всех заказов
   */
  async list(req, res, next) {
    try {
      const { user_id } = req.query;

      const params = [];
      const where = user_id ? (params.push(user_id), 'WHERE o.user_id = $1') : '';

      const { rows } = await pool.query(
        `
        SELECT
          o.id,
          o.user_id,
          u.email        AS user_email,
          o.status,
          o.payment_status,
          o.total_amount,
          o.notes,
          o.created_at,
          o.updated_at
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ${where}
        ORDER BY o.id DESC
        `,
        params
      );

      res.json(rows);
    } catch (e) {
      next(e);
    }
  },

  /**
   * GET /api/orders/:id
   * Возвращает детали конкретного заказа
   */
  async getOne(req, res, next) {
    try {
      const { id } = req.params;

      const { rows } = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (!rows[0]) throw httpError(404, 'Order not found');

      const order = rows[0];

      // позиции заказа
      const { rows: items } = await pool.query(
        `
        SELECT
          oi.id,
          oi.game_id,
          g.title AS game_title,
          oi.platform_id,
          p.name AS platform,
          oi.qty,
          oi.unit_price,
          oi.subtotal,
          oi.fulfillment_status,
          oi.delivered_to_email,
          oi.delivered_at,
          oi.delivery_note
        FROM order_items oi
        JOIN games g     ON g.id = oi.game_id
        JOIN platforms p ON p.id = oi.platform_id
        WHERE oi.order_id = $1
        ORDER BY oi.id ASC
        `,
        [id]
      );
      order.items = items;

      // платёж
      const { rows: pay } = await pool.query(
        `
        SELECT
          id,
          provider,
          amount,
          status,
          created_at
        FROM payments
        WHERE order_id = $1
        `,
        [id]
      );
      order.payment = pay[0] ?? null;

      res.json(order);
    } catch (e) {
      next(e);
    }
  },

  /**
   * POST /api/orders
   * Создаёт новый заказ с указанными позициями
   */
  async create(req, res, next) {
    const client = await pool.connect();
    try {
      const { items = [], notes } = req.body;
      const user_id = req.user?.id ?? req.body.user_id;
      if (!user_id) throw httpError(400, 'user_id is required');

      const total = await calcTotalAmount(items);

      await client.query('BEGIN');

      const { rows: o } = await client.query(
        `
        INSERT INTO orders (user_id, status, payment_status, total_amount, notes)
        VALUES ($1, 'pending', 'pending', $2, $3)
        RETURNING *
        `,
        [user_id, total, notes ?? null]
      );
      const order = o[0];

      // добавляем позиции заказа
      for (const it of items) {
        const { rows: priceRow } = await client.query(
          `
          SELECT COALESCE(g.price_final) AS price
          FROM game_platforms gp
          JOIN games g ON g.id = gp.game_id
          WHERE gp.game_id = $1 AND gp.platform_id = $2
          `,
          [it.game_id, it.platform_id]
        );
        if (!priceRow[0]) throw httpError(400, 'game/platform mismatch');

        const unitPrice = priceRow[0].price;
        const qty = Number(it.qty ?? 1);

        await client.query(
          `
          INSERT INTO order_items
            (order_id, game_id, platform_id, qty, unit_price)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [order.id, it.game_id, it.platform_id, qty, unitPrice]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        id: order.id,
        total_amount: total,
        status: order.status
      });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      next(e);
    } finally {
      client.release();
    }
  },

  /**
   * PUT /api/orders/:id
   * Обновляет статусы заказа
   */
  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { status, payment_status, notes } = req.body;

      const { rows } = await pool.query(
        `
        UPDATE orders SET
          status          = COALESCE($2, status),
          payment_status  = COALESCE($3, payment_status),
          notes           = COALESCE($4, notes),
          updated_at      = now()
        WHERE id = $1
        RETURNING *
        `,
        [id, status ?? null, payment_status ?? null, notes ?? null]
      );

      if (!rows[0]) throw httpError(404, 'Order not found');
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * DELETE /api/orders/:id
   * Отмена заказа
   */
  async remove(req, res, next) {
    try {
      const { id } = req.params;

      // мягкая отмена: просто ставим cancelled
      const { rows } = await pool.query(
        `
        UPDATE orders
        SET status = 'cancelled',
            updated_at = now()
        WHERE id = $1
        RETURNING id, status
        `,
        [id]
      );

      if (!rows[0]) throw httpError(404, 'Order not found');
      res.json(rows[0]);
    } catch (e) {
      next(e);
    }
  },

  /**
   * GET /api/orders/my
   * Возвращает заказы текущего пользователя
   */
  async getMyOrders(req, res, next) {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ message: 'Не авторизован' });

      const result = await pool.query(
        `
        SELECT *
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
      );

      res.json(result.rows);
    } catch (e) {
      next(e);
    }
  },

  /**
   * POST /api/orders/confirm
   * Подтверждение заказа
   */
  async confirmPending(req, res, next) {
    const client = await pool.connect();
    try {
      const uid = req.user?.id;
      if (!uid) throw httpError(401, 'Unauthorized');

      const { contactEmail, paymentMethod = 'card' } = req.body || {};
      if (!contactEmail) throw httpError(400, 'contactEmail is required');

      await client.query('BEGIN');

      // 1) Берём ТОЛЬКО черновик: pending БЕЗ платежей
      const { rows: ords } = await client.query(
        `
        SELECT o.id, o.total_amount
        FROM orders o
        WHERE o.user_id = $1
          AND o.status  = 'pending'
          AND NOT EXISTS (
            SELECT 1
            FROM payments p
            WHERE p.order_id = o.id
          )
        ORDER BY o.created_at DESC
        LIMIT 1
        `,
        [uid]
      );
      if (!ords[0]) throw httpError(400, 'Cart is empty');

      const cartOrderId = ords[0].id;
      const cartTotal = Number(ords[0].total_amount || 0);

      // Проверим, что в черновике есть позиции
      const { rows: cntRows } = await client.query(
        `
        SELECT COUNT(*)::int AS cnt
        FROM order_items
        WHERE order_id = $1
        `,
        [cartOrderId]
      );
      if (!cntRows[0] || cntRows[0].cnt <= 0) throw httpError(400, 'Cart is empty');

      // 2) Создаём НОВЫЙ заказ-снимок (notes: "Оплата онлайн")
      const { rows: newOrderRows } = await client.query(
        `
        INSERT INTO orders (user_id, status, payment_status, total_amount, notes)
        VALUES ($1, 'fulfilled', 'captured', $2, 'Оплата онлайн')
        RETURNING id, total_amount
        `,
        [uid, cartTotal]
      );
      const newOrderId = newOrderRows[0].id;

      // 3) Копируем позиции из черновика в НОВЫЙ заказ
      await client.query(
        `
        INSERT INTO order_items
          (order_id, game_id, platform_id, qty, unit_price, delivered_to_email)
        SELECT $1, game_id, platform_id, qty, unit_price, $2
        FROM order_items
        WHERE order_id = $3
        `,
        [newOrderId, contactEmail, cartOrderId]
      );

      // 3.1) Убедимся, что реально что-то скопировалось
      const { rows: newCnt } = await client.query(
        `
        SELECT COUNT(*)::int AS cnt
        FROM order_items
        WHERE order_id = $1
        `,
        [newOrderId]
      );
      if (!newCnt[0] || newCnt[0].cnt <= 0) {
        throw httpError(500, 'Failed to move items');
      }

      // 4) Автовыдача: помечаем как выдано
      await client.query(
        `
        UPDATE order_items
        SET fulfillment_status = 'issued',
            delivered_at       = now(),
            delivery_note      = 'Автовыдача'
        WHERE order_id = $1
        `,
        [newOrderId]
      );

      // 5) Создаём платёж к НОВОМУ заказу
      await client.query(
        `
        INSERT INTO payments (order_id, provider, amount, status)
        VALUES ($1, $2, $3, 'captured')
        `,
        [newOrderId, paymentMethod, cartTotal]
      );

      // 6) Удаляем ТОЛЬКО черновик (и только если у него реально нет платежей)
      await client.query(
        `
        DELETE FROM orders o
        WHERE o.id = $1
          AND o.status  = 'pending'
          AND NOT EXISTS (
            SELECT 1
            FROM payments p
            WHERE p.order_id = o.id
          )
        `,
        [cartOrderId]
      );

      await client.query('COMMIT');

      res.status(200).json({
        id: newOrderId,
        total_amount: cartTotal
      });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      next(e);
    } finally {
      client.release();
    }
  }
};
