BEGIN;

-- =========================
-- ENUM-types (создаём, если нет)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status') THEN
    CREATE TYPE order_status   AS ENUM ('pending','paid','fulfilled','cancelled','refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM ('pending','authorized','captured','failed','refunded');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role      AS ENUM ('customer','admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'fulfillment_status') THEN
    CREATE TYPE fulfillment_status AS ENUM ('not_issued','issued');
  END IF;
END$$;

-- =========================
-- TABLES (упрощённая структура)
-- =========================
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,             -- сейчас простой пароль; позже сервер заменит на хэш
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'customer',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS platforms (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS genres (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS games (
  id               BIGSERIAL PRIMARY KEY,
  title            TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,   -- можно оставить пустым -> сгенерится триггером
  description      TEXT,
  developer        TEXT,
  publisher        TEXT,
  release_date     DATE,
  age_rating       TEXT,
  base_price       NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  discount_percent SMALLINT NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  price_final      NUMERIC(10,2) GENERATED ALWAYS AS
                   (round(base_price * (1 - (discount_percent::numeric/100)), 2)) STORED,
  cover_url        TEXT,                   -- путь/URL обложки
  screenshots      JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{url, alt, order}, ...]
  CONSTRAINT games_screenshots_is_array CHECK (jsonb_typeof(screenshots) = 'array'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_genres (
  game_id  BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  genre_id BIGINT NOT NULL REFERENCES genres(id) ON DELETE RESTRICT,
  PRIMARY KEY (game_id, genre_id)
);

CREATE TABLE IF NOT EXISTS game_platforms (
  game_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  platform_id    BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  sku            TEXT,
  stock          INT  NOT NULL DEFAULT 0 CHECK (stock >= 0),
  price_override NUMERIC(10,2), -- если NULL, брать games.price_final
  PRIMARY KEY (game_id, platform_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT REFERENCES users(id) ON DELETE SET NULL,
  status         order_status   NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  total_amount   NUMERIC(10,2)  NOT NULL DEFAULT 0.00,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  game_id     BIGINT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  platform_id BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  qty         INT NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(10,2) NOT NULL,
  subtotal    NUMERIC(10,2) GENERATED ALWAYS AS (round(qty * unit_price, 2)) STORED,
  -- поля для РУЧНОЙ выдачи (без хранения реального ключа)
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'not_issued',
  delivered_to_email TEXT,          -- куда отправили ключ (email)
  delivered_at       TIMESTAMPTZ,   -- когда отправили
  delivery_note      TEXT           -- комментарий («выдал вручную» и т.п.)
);

CREATE TABLE IF NOT EXISTS payments (
  id           BIGSERIAL PRIMARY KEY,
  order_id     BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  provider     TEXT,
  provider_tid TEXT,
  amount       NUMERIC(10,2) NOT NULL,
  status       payment_status NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);

-- =========================
-- Автогенерация slug
-- =========================
CREATE OR REPLACE FUNCTION generate_slug(input TEXT) RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  result := lower(input);
  result := regexp_replace(result, '[\s_]+', '-', 'g');
  result := regexp_replace(result, '[^a-z0-9\-]+', '', 'g');
  result := regexp_replace(result, '\-+', '-', 'g');
  result := regexp_replace(result, '(^\-+|\-+$)', '', 'g');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE OR REPLACE FUNCTION set_game_slug() RETURNS trigger AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_slug(NEW.title);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_slug ON games;
CREATE TRIGGER trg_set_slug
BEFORE INSERT OR UPDATE OF title, slug ON games
FOR EACH ROW
EXECUTE FUNCTION set_game_slug();

-- =========================
-- SEED DATA
-- =========================

-- Платформы
INSERT INTO platforms (name) VALUES
  ('PC'), ('PlayStation 5'), ('Xbox Series X|S'), ('Nintendo Switch')
ON CONFLICT DO NOTHING;

-- Жанры (RU)
INSERT INTO genres (name) VALUES
  ('Экшен'), ('РПГ'), ('Приключения'), ('Гонки'), ('Шутер'), ('Стратегия'), ('Симулятор')
ON CONFLICT DO NOTHING;

-- Пользователи (простые пароли; позже сервер заменит на хэш)
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@example.com',     'Admin123!',    'Admin',       'admin'),
  ('kosttishea@gmail.com',  'Kostti123!',   'Kosttishea',  'customer'),
  ('test.user@example.com', 'Test123!',     'Test User',   'customer')
ON CONFLICT (email) DO NOTHING;

-- Игры (RU описания, цены в ₽, обложки и скрины JSONB)
INSERT INTO games
  (title, slug, description, developer, publisher, release_date, age_rating, base_price, discount_percent, cover_url, screenshots)
VALUES
  (
    'Ведьмак 3: Дикая Охота', 'vedmak-3-dikaya-ohota',
    'Огромный открытый мир, насыщённый сюжетом, выборами и охотой на чудовищ.',
    'CD Projekt RED', 'CD PROJEKT', '2015-05-19', '18+', 1999.00, 50, '/images/covers/witcher3.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/witcher3_01.jpg','alt','Ведьмак 3: Новиград','order',1),
      jsonb_build_object('url','/images/screens/witcher3_02.jpg','alt','Бой с грифоном','order',2),
      jsonb_build_object('url','/images/screens/witcher3_03.jpg','alt','Карта мира','order',3)
    )
  ),
  (
    'Cyberpunk 2077', 'cyberpunk-2077',
    'Неонуар в Найт-Сити: наёмник пытается выжить и стать легендой мегаполиса.',
    'CD Projekt RED', 'CD PROJEKT', '2020-12-10', '18+', 3499.00, 35, '/images/covers/cyberpunk2077.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/cp2077_01.jpg','alt','Найт-Сити: центр','order',1),
      jsonb_build_object('url','/images/screens/cp2077_02.jpg','alt','Диалог и выбор','order',2),
      jsonb_build_object('url','/images/screens/cp2077_03.jpg','alt','Перестрелка в доках','order',3)
    )
  ),
  (
    'God of War Ragnarök', 'god-of-war-ragnarok',
    'Кратос и Атрей путешествуют по Девяти мирам накануне Рагнарёка.',
    'Santa Monica Studio', 'Sony Interactive Entertainment', '2022-11-09', '18+', 5999.00, 20, '/images/covers/gowr.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/gowr_01.jpg','alt','Левиафан в действии','order',1),
      jsonb_build_object('url','/images/screens/gowr_02.jpg','alt','Путешествие по мирам','order',2)
    )
  ),
  (
    'Horizon Forbidden West', 'horizon-forbidden-west',
    'Элой отправляется на Запретный Запад, где её ждут новые машины и тайны.',
    'Guerrilla', 'Sony Interactive Entertainment', '2022-02-18', '16+', 5499.00, 25, '/images/covers/hfw.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/hfw_01.jpg','alt','Элой и пустоши','order',1),
      jsonb_build_object('url','/images/screens/hfw_02.jpg','alt','Схватка с машиной','order',2)
    )
  ),
  (
    'Forza Horizon 5', 'forza-horizon-5',
    'Гоночный фестиваль в открытом мире Мексики с сотнями машин.',
    'Playground Games', 'Xbox Game Studios', '2021-11-09', '3+', 4999.00, 15, '/images/covers/fh5.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/fh5_01.jpg','alt','Побережье и шторм','order',1),
      jsonb_build_object('url','/images/screens/fh5_02.jpg','alt','Каньоны и пыль','order',2)
    )
  ),
  (
    'The Legend of Zelda: Tears of the Kingdom', 'zelda-tears-of-the-kingdom',
    'Эпическое приключение Линка в небесах и на земле Хайрула.',
    'Nintendo EPD', 'Nintendo', '2023-05-12', '12+', 6999.00, 0, '/images/covers/zelda_totk.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/totk_01.jpg','alt','Парящие острова','order',1),
      jsonb_build_object('url','/images/screens/totk_02.jpg','alt','Крафт и механизмы','order',2)
    )
  ),
  (
    'Baldur''s Gate 3', 'baldurs-gate-3',
    'Кооперативная CRPG по D&D с нелинейным сюжетом и тактическими боями.',
    'Larian Studios', 'Larian Studios', '2023-08-03', '18+', 4999.00, 10, '/images/covers/bg3.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/bg3_01.jpg','alt','Тактический бой','order',1),
      jsonb_build_object('url','/images/screens/bg3_02.jpg','alt','Диалоговые выборы','order',2),
      jsonb_build_object('url','/images/screens/bg3_03.jpg','alt','Отряд и карта','order',3)
    )
  ),
  (
    'Elden Ring', 'elden-ring',
    'Мрачное фэнтези от FromSoftware с открытым миром и сложными сражениями.',
    'FromSoftware', 'Bandai Namco Entertainment', '2022-02-25', '16+', 4999.00, 25, '/images/covers/eldenring.jpg',
    jsonb_build_array(
      jsonb_build_object('url','/images/screens/er_01.jpg','alt','Пейзажи Междуземья','order',1),
      jsonb_build_object('url','/images/screens/er_02.jpg','alt','Сражение с полубогом','order',2)
    )
  )
ON CONFLICT (slug) DO NOTHING;

-- Игра ↔ Жанр (RU)
WITH g AS (SELECT id, slug FROM games),
     ge AS (SELECT id, name FROM genres)
INSERT INTO game_genres (game_id, genre_id)
SELECT (SELECT id FROM g WHERE slug='vedmak-3-dikaya-ohota'), (SELECT id FROM ge WHERE name='РПГ')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM ge WHERE name='РПГ')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM ge WHERE name='Экшен')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='god-of-war-ragnarok'), (SELECT id FROM ge WHERE name='Экшен')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='horizon-forbidden-west'), (SELECT id FROM ge WHERE name='Приключения')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='forza-horizon-5'), (SELECT id FROM ge WHERE name='Гонки')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='zelda-tears-of-the-kingdom'), (SELECT id FROM ge WHERE name='Приключения')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='baldurs-gate-3'), (SELECT id FROM ge WHERE name='РПГ')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='elden-ring'), (SELECT id FROM ge WHERE name='РПГ')
ON CONFLICT DO NOTHING;

-- Игра ↔ Платформа (склад и локальные цены)
WITH g AS (SELECT id, slug FROM games),
     p AS (SELECT id, name FROM platforms)
INSERT INTO game_platforms (game_id, platform_id, sku, stock, price_override)
-- Ведьмак 3
SELECT (SELECT id FROM g WHERE slug='vedmak-3-dikaya-ohota'), (SELECT id FROM p WHERE name='PC'),             'TW3-PC-001', 120, 1799.00
UNION ALL
SELECT (SELECT id FROM g WHERE slug='vedmak-3-dikaya-ohota'), (SELECT id FROM p WHERE name='Nintendo Switch'),'TW3-NSW-001', 35, 3299.00
-- Cyberpunk 2077
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM p WHERE name='PC'),              'CP2077-PC-001', 200, 2199.00
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM p WHERE name='PlayStation 5'),  'CP2077-PS5-001', 110, 2799.00
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM p WHERE name='Xbox Series X|S'), 'CP2077-XBX-001', 95, 2799.00
-- God of War Ragnarök
UNION ALL
SELECT (SELECT id FROM g WHERE slug='god-of-war-ragnarok'), (SELECT id FROM p WHERE name='PlayStation 5'), 'GOWR-PS5-001', 80, NULL
-- Horizon FW
UNION ALL
SELECT (SELECT id FROM g WHERE slug='horizon-forbidden-west'), (SELECT id FROM p WHERE name='PlayStation 5'), 'HFW-PS5-001', 90, NULL
-- Forza Horizon 5
UNION ALL
SELECT (SELECT id FROM g WHERE slug='forza-horizon-5'), (SELECT id FROM p WHERE name='Xbox Series X|S'), 'FH5-XBX-001', 150, NULL
UNION ALL
SELECT (SELECT id FROM g WHERE slug='forza-horizon-5'), (SELECT id FROM p WHERE name='PC'),              'FH5-PC-001', 140, 4299.00
-- Zelda TOTK
UNION ALL
SELECT (SELECT id FROM g WHERE slug='zelda-tears-of-the-kingdom'), (SELECT id FROM p WHERE name='Nintendo Switch'), 'ZELDA-TOTK-NSW-001', 55, NULL
-- BG3
UNION ALL
SELECT (SELECT id FROM g WHERE slug='baldurs-gate-3'), (SELECT id FROM p WHERE name='PC'),             'BG3-PC-001', 170, NULL
UNION ALL
SELECT (SELECT id FROM g WHERE slug='baldurs-gate-3'), (SELECT id FROM p WHERE name='PlayStation 5'),  'BG3-PS5-001', 95, 4599.00
-- Elden Ring
UNION ALL
SELECT (SELECT id FROM g WHERE slug='elden-ring'), (SELECT id FROM p WHERE name='PC'),              'ER-PC-001', 150, NULL
UNION ALL
SELECT (SELECT id FROM g WHERE slug='elden-ring'), (SELECT id FROM p WHERE name='PlayStation 5'),   'ER-PS5-001', 100, NULL
UNION ALL
SELECT (SELECT id FROM g WHERE slug='elden-ring'), (SELECT id FROM p WHERE name='Xbox Series X|S'), 'ER-XBX-001', 90, NULL
ON CONFLICT DO NOTHING;

-- =========================
-- ГОТОВЫЕ ЗАКАЗЫ (без корзин)
-- =========================

-- 1) kosttishea: Baldur's Gate 3 (PC) — успешно
WITH buyer AS (SELECT id FROM users WHERE email='kosttishea@gmail.com'),
     o AS (
       INSERT INTO orders (user_id, status, payment_status, total_amount, notes)
       VALUES ((SELECT id FROM buyer), 'paid', 'captured', 4499.00, 'Оплата онлайн')
       RETURNING id
     )
INSERT INTO order_items (order_id, game_id, platform_id, qty, unit_price)
SELECT o.id,
       (SELECT id FROM games WHERE slug='baldurs-gate-3'),
       (SELECT id FROM platforms WHERE name='PC'),
       1, 4499.00
FROM o;

INSERT INTO payments (order_id, provider, provider_tid, amount, status)
SELECT id, 'YooKassa', 'yk_bg3_0001', 4499.00, 'captured'
FROM orders WHERE user_id=(SELECT id FROM users WHERE email='kosttishea@gmail.com')
ORDER BY created_at DESC LIMIT 1;

-- 2) test.user: Elden Ring (PS5) — оплата не прошла
WITH buyer AS (SELECT id FROM users WHERE email='test.user@example.com'),
     o AS (
       INSERT INTO orders (user_id, status, payment_status, total_amount, notes)
       VALUES ((SELECT id FROM buyer), 'pending', 'failed', 3749.00, 'Банк отклонил')
       RETURNING id
     )
INSERT INTO order_items (order_id, game_id, platform_id, qty, unit_price)
SELECT o.id,
       (SELECT id FROM games WHERE slug='elden-ring'),
       (SELECT id FROM platforms WHERE name='PlayStation 5'),
       1, 3749.00
FROM o;

INSERT INTO payments (order_id, provider, provider_tid, amount, status)
SELECT id, 'YooKassa', 'yk_er_fail_0002', 3749.00, 'failed'
FROM orders WHERE user_id=(SELECT id FROM users WHERE email='test.user@example.com')
ORDER BY created_at DESC LIMIT 1;

-- 3) admin: The Legend of Zelda: TOTK (Switch) — успешно
WITH buyer AS (SELECT id FROM users WHERE email='admin@example.com'),
     o AS (
       INSERT INTO orders (user_id, status, payment_status, total_amount, notes)
       VALUES ((SELECT id FROM buyer), 'paid', 'captured', 6999.00, 'Подарок')
       RETURNING id
     )
INSERT INTO order_items (order_id, game_id, platform_id, qty, unit_price)
SELECT o.id,
       (SELECT id FROM games WHERE slug='zelda-tears-of-the-kingdom'),
       (SELECT id FROM platforms WHERE name='Nintendo Switch'),
       1, 6999.00
FROM o;

INSERT INTO payments (order_id, provider, provider_tid, amount, status)
SELECT id, 'Stripe', 'pi_totk_0003', 6999.00, 'captured'
FROM orders WHERE user_id=(SELECT id FROM users WHERE email='admin@example.com')
ORDER BY created_at DESC LIMIT 1;

-- =========================
-- ОТМЕТКА О РУЧНОЙ ВЫДАЧЕ (пример)
-- =========================
-- считаем, что позиция заказа у kosttishea уже выдана вручную по e-mail
UPDATE order_items oi
SET fulfillment_status = 'issued',
    delivered_to_email = 'kosttishea@gmail.com',
    delivered_at = now(),
    delivery_note = 'Ручная выдача (тестовый сид)'
FROM orders o
JOIN users u ON u.id = o.user_id
WHERE oi.order_id = o.id
  AND u.email = 'kosttishea@gmail.com'
  AND oi.game_id = (SELECT id FROM games WHERE slug='baldurs-gate-3');

-- если во всех позициях заказа статус 'issued', можно пометить заказ как fulfilled (опционально)
UPDATE orders o
SET status = 'fulfilled', updated_at = now()
WHERE o.status <> 'fulfilled'
  AND NOT EXISTS (
    SELECT 1 FROM order_items oi WHERE oi.order_id = o.id AND oi.fulfillment_status = 'not_issued'
  );

-- =========================
-- ОТЗЫВ (пример)
-- =========================
INSERT INTO reviews (user_id, game_id, rating, body)
SELECT u.id, g.id, 5, 'Лучшая CRPG последних лет, масса вариативности.'
FROM users u, games g
WHERE u.email='kosttishea@gmail.com' AND g.slug='baldurs-gate-3'
ON CONFLICT DO NOTHING;

COMMIT;

-- =========================
-- ТЕСТЫ (пример)
-- =========================
SELECT
  (SELECT COUNT(*) FROM users)          AS users_cnt,
  (SELECT COUNT(*) FROM platforms)      AS platforms_cnt,
  (SELECT COUNT(*) FROM genres)         AS genres_cnt,
  (SELECT COUNT(*) FROM games)          AS games_cnt,
  (SELECT COUNT(*) FROM game_genres)    AS game_genres_cnt,
  (SELECT COUNT(*) FROM game_platforms) AS game_platforms_cnt,
  (SELECT COUNT(*) FROM orders)         AS orders_cnt,
  (SELECT COUNT(*) FROM order_items)    AS order_items_cnt,
  (SELECT COUNT(*) FROM payments)       AS payments_cnt;


