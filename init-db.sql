BEGIN;

-- ENUM-types
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

-- TABLES
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
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
  price_final NUMERIC(10,2) GENERATED ALWAYS AS
    (round(base_price * (1 - (discount_percent::numeric/100)), 2)) STORED,
  cover_url        TEXT,                   -- путь/URL обложки
  screenshots      JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{url, alt, order}, ...]
  CONSTRAINT games_screenshots_is_array CHECK (jsonb_typeof(screenshots) = 'array'),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_games_title ON games(title);

CREATE TABLE IF NOT EXISTS game_genres (
  game_id  BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  genre_id BIGINT NOT NULL REFERENCES genres(id) ON DELETE RESTRICT,
  PRIMARY KEY (game_id, genre_id)
);

CREATE TABLE IF NOT EXISTS game_platforms (
  game_id        BIGINT NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  platform_id    BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT
  PRIMARY KEY (game_id, platform_id)
);

CREATE INDEX IF NOT EXISTS idx_game_platforms_game ON game_platforms(game_id);
CREATE INDEX IF NOT EXISTS idx_game_platforms_platform ON game_platforms(platform_id);

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

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status   ON orders(status);

CREATE TABLE IF NOT EXISTS order_items (
  id          BIGSERIAL PRIMARY KEY,
  order_id    BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  game_id     BIGINT NOT NULL REFERENCES games(id) ON DELETE RESTRICT,
  platform_id BIGINT NOT NULL REFERENCES platforms(id) ON DELETE RESTRICT,
  qty         INT NOT NULL CHECK (qty > 0),
  unit_price  NUMERIC(10,2) NOT NULL,
  subtotal    NUMERIC(10,2) GENERATED ALWAYS AS (round(qty * unit_price, 2)) STORED,
  fulfillment_status fulfillment_status NOT NULL DEFAULT 'not_issued',
  delivered_to_email TEXT,
  delivered_at       TIMESTAMPTZ,
  delivery_note      TEXT
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id           BIGSERIAL PRIMARY KEY,
  order_id     BIGINT NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  provider     TEXT,
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

CREATE INDEX IF NOT EXISTS idx_reviews_game_id ON reviews(game_id);

-- Автогенерация slug
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
  ('PC'),
  ('PlayStation 5'),
  ('Xbox Series X|S'),
  ('Nintendo Switch')
ON CONFLICT DO NOTHING;

-- Жанры (RU)
INSERT INTO genres (name) VALUES
  ('Экшен'),
  ('РПГ'),
  ('Приключения'),
  ('Гонки'),
  ('Шутер'),
  ('Стратегия'),
  ('Симулятор')
ON CONFLICT DO NOTHING;

-- Пользователи
INSERT INTO users (email, password_hash, full_name, role) VALUES
  ('admin@example.com',     'Admin123!',    'Admin',       'admin'),
  ('kosttishea@gmail.com',  'Kostti123!',   'Kosttishea',  'customer'),
  ('test.user@example.com', 'Test123!',     'Test User',   'customer')
ON CONFLICT (email) DO NOTHING;

-- Игры (RU описания, цены в ₽, обложки и скрины JSONB)
INSERT INTO games
  (title, slug, description, developer, publisher, release_date, age_rating,
   base_price, discount_percent, cover_url, screenshots)
VALUES
  (
    'Ведьмак 3: Дикая Охота', 'vedmak-3-dikaya-ohota',
    'Огромный открытый мир, насыщённый сюжетом, выборами и охотой на чудовищ.',
    'CD Projekt RED', 'CD PROJEKT', '2015-05-19', '18+',
    1999.00, 50,
    '/images/covers/witcher3.jpg',
    ARRAY[
      '/images/screens/witcher3_01.jpg',
      '/images/screens/witcher3_02.jpg',
      '/images/screens/witcher3_03.jpg'
    ]::text[]
  ),
  (
    'Cyberpunk 2077', 'cyberpunk-2077',
    'Неонуар в Найт-Сити: наёмник пытается выжить и стать легендой мегаполиса.',
    'CD Projekt RED', 'CD PROJEKT', '2020-12-10', '18+',
    3499.00, 35,
    '/images/covers/cyberpunk2077.jpg',
    ARRAY[
      '/images/screens/cp2077_01.jpg',
      '/images/screens/cp2077_02.jpg',
      '/images/screens/cp2077_03.jpg'
    ]::text[]
  ),
  (
    'God of War Ragnarök', 'god-of-war-ragnarok',
    'Кратос и Атрей путешествуют по Девяти мирам накануне Рагнарёка.',
    'Santa Monica Studio', 'Sony Interactive Entertainment', '2022-11-09', '18+',
    5999.00, 20,
    '/images/covers/gowr.jpg',
    ARRAY[
      '/images/screens/gowr_01.jpg',
      '/images/screens/gowr_02.jpg'
    ]::text[]
  ),
  (
    'Horizon Forbidden West', 'horizon-forbidden-west',
    'Элой отправляется на Запретный Запад, где её ждут новые машины и тайны.',
    'Guerrilla', 'Sony Interactive Entertainment', '2022-02-18', '16+',
    5499.00, 25,
    '/images/covers/hfw.jpg',
    ARRAY[
      '/images/screens/hfw_01.jpg',
      '/images/screens/hfw_02.jpg'
    ]::text[]
  ),
  (
    'Forza Horizon 5', 'forza-horizon-5',
    'Гоночный фестиваль в открытом мире Мексики с сотнями машин.',
    'Playground Games', 'Xbox Game Studios', '2021-11-09', '3+',
    4999.00, 15,
    '/images/covers/fh5.jpg',
    ARRAY[
      '/images/screens/fh5_01.jpg',
      '/images/screens/fh5_02.jpg'
    ]::text[]
  ),
  (
    'The Legend of Zelda: Tears of the Kingdom', 'zelda-tears-of-the-kingdom',
    'Эпическое приключение Линка в небесах и на земле Хайрула.',
    'Nintendo EPD', 'Nintendo', '2023-05-12', '12+',
    6999.00, 0,
    '/images/covers/zelda_totk.jpg',
    ARRAY[
      '/images/screens/totk_01.jpg',
      '/images/screens/totk_02.jpg'
    ]::text[]
  ),
  (
    'Baldur''s Gate 3', 'baldurs-gate-3',
    'Кооперативная CRPG по D&D с нелинейным сюжетом и тактическими боями.',
    'Larian Studios', 'Larian Studios', '2023-08-03', '18+',
    4999.00, 10,
    '/images/covers/bg3.jpg',
    ARRAY[
      '/images/screens/bg3_01.jpg',
      '/images/screens/bg3_02.jpg',
      '/images/screens/bg3_03.jpg'
    ]::text[]
  ),
  (
    'Elden Ring', 'elden-ring',
    'Мрачное фэнтези от FromSoftware с открытым миром и сложными сражениями.',
    'FromSoftware', 'Bandai Namco Entertainment', '2022-02-25', '16+',
    4999.00, 25,
    '/images/covers/eldenring.jpg',
    ARRAY[
      '/images/screens/er_01.jpg',
      '/images/screens/er_02.jpg'
    ]::text[]
  )
ON CONFLICT (slug) DO NOTHING;


-- Игра - Жанр
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
INSERT INTO game_platforms (game_id, platform_id)
-- Ведьмак 3
SELECT (SELECT id FROM g WHERE slug='vedmak-3-dikaya-ohota'), (SELECT id FROM p WHERE name='PC')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='vedmak-3-dikaya-ohota'), (SELECT id FROM p WHERE name='Nintendo Switch')
-- Cyberpunk 2077
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM p WHERE name='PC')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM p WHERE name='PlayStation 5')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='cyberpunk-2077'), (SELECT id FROM p WHERE name='Xbox Series X|S')
-- God of War Ragnarök
UNION ALL
SELECT (SELECT id FROM g WHERE slug='god-of-war-ragnarok'), (SELECT id FROM p WHERE name='PlayStation 5')
-- Horizon FW
UNION ALL
SELECT (SELECT id FROM g WHERE slug='horizon-forbidden-west'), (SELECT id FROM p WHERE name='PlayStation 5')
-- Forza Horizon 5
UNION ALL
SELECT (SELECT id FROM g WHERE slug='forza-horizon-5'), (SELECT id FROM p WHERE name='Xbox Series X|S')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='forza-horizon-5'), (SELECT id FROM p WHERE name='PC')
-- Zelda TOTK
UNION ALL
SELECT (SELECT id FROM g WHERE slug='zelda-tears-of-the-kingdom'), (SELECT id FROM p WHERE name='Nintendo Switch')
-- BG3
UNION ALL
SELECT (SELECT id FROM g WHERE slug='baldurs-gate-3'), (SELECT id FROM p WHERE name='PC')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='baldurs-gate-3'), (SELECT id FROM p WHERE name='PlayStation 5')
-- Elden Ring
UNION ALL
SELECT (SELECT id FROM g WHERE slug='elden-ring'), (SELECT id FROM p WHERE name='PC')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='elden-ring'), (SELECT id FROM p WHERE name='PlayStation 5')
UNION ALL
SELECT (SELECT id FROM g WHERE slug='elden-ring'), (SELECT id FROM p WHERE name='Xbox Series X|S')
ON CONFLICT DO NOTHING;


-- =========================
-- ОТЗЫВ (пример)
-- =========================
INSERT INTO reviews (user_id, game_id, rating, body)
SELECT u.id, g.id, 5, 'Лучшая CRPG последних лет, масса вариативности.'
FROM users u, games g
WHERE u.email='kosttishea@gmail.com' AND g.slug='baldurs-gate-3'
ON CONFLICT DO NOTHING;

COMMIT;