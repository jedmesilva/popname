-- ============================================================
-- POPNAME — Full Schema Migration
-- Drop old structure, create new, seed data
-- ============================================================

-- 1. Drop old views
DROP VIEW IF EXISTS verification_queue CASCADE;
DROP VIEW IF EXISTS search_trends CASCADE;
DROP VIEW IF EXISTS people_by_region CASCADE;
DROP VIEW IF EXISTS filiation_graph CASCADE;
DROP VIEW IF EXISTS name_regions CASCADE;
DROP VIEW IF EXISTS name_popularity CASCADE;
DROP VIEW IF EXISTS name_by_generation CASCADE;
DROP VIEW IF EXISTS name_decline CASCADE;
DROP VIEW IF EXISTS name_growth CASCADE;
DROP VIEW IF EXISTS name_rarity CASCADE;
DROP VIEW IF EXISTS name_ranking CASCADE;

-- 2. Drop old tables (FK order)
DROP TABLE IF EXISTS name_verifications CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS filiations CASCADE;
DROP TABLE IF EXISTS name_searches CASCADE;
DROP TABLE IF EXISTS name_claims CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS names CASCADE;
DROP TABLE IF EXISTS people CASCADE;

-- ============================================================
-- 3. Create new tables
-- ============================================================

CREATE TABLE people (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  birth_date DATE,
  birth_country TEXT,
  birth_state TEXT,
  birth_city TEXT,
  gender TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  password_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- name_meanings: semantic metadata per name word (shared across all instances)
CREATE TABLE name_meanings (
  name_text TEXT PRIMARY KEY,
  meaning TEXT,
  language_origin TEXT,
  cultural_origin TEXT,
  gender_association TEXT,
  variations JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- names: individual instances — each row = one person's name, with verification status
CREATE TABLE names (
  id SERIAL PRIMARY KEY,
  name_text TEXT NOT NULL,
  person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  birth_country TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_names_name_text ON names(name_text);
CREATE INDEX idx_names_status ON names(status);
CREATE INDEX idx_names_verified_at ON names(verified_at);

-- name_verifications: verification attempts with documents
CREATE TABLE name_verifications (
  id SERIAL PRIMARY KEY,
  name_id INTEGER NOT NULL REFERENCES names(id) ON DELETE CASCADE,
  document_type TEXT,
  document_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  failure_reason TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
  device_type TEXT,
  os TEXT,
  browser TEXT,
  ip_address TEXT,
  user_agent TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE name_searches (
  id SERIAL PRIMARY KEY,
  person_id INTEGER REFERENCES people(id),
  name_searched TEXT NOT NULL,
  session_id INTEGER REFERENCES sessions(id),
  searched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 4. Create views
-- ============================================================

-- name_ranking: names ordered by verified count
CREATE VIEW name_ranking AS
SELECT
  name_text AS name,
  COUNT(*)::int AS total_claims,
  RANK() OVER (ORDER BY COUNT(*) DESC)::int AS rank
FROM names
WHERE status = 'verified'
GROUP BY name_text;

-- name_rarity: rarest names by verified count
CREATE VIEW name_rarity AS
SELECT
  name_text AS name,
  COUNT(*)::int AS total_claims,
  RANK() OVER (ORDER BY COUNT(*) ASC)::int AS rarity_rank
FROM names
WHERE status = 'verified'
GROUP BY name_text;

-- name_regions: geographic distribution per name
CREATE VIEW name_regions AS
SELECT
  name_text AS name,
  birth_country,
  COUNT(*)::int AS total
FROM names
WHERE status = 'verified' AND birth_country IS NOT NULL
GROUP BY name_text, birth_country;

-- name_popularity: verified names by birth year of the person
CREATE VIEW name_popularity AS
SELECT
  n.name_text AS name,
  EXTRACT(YEAR FROM p.birth_date)::int AS year,
  (FLOOR(EXTRACT(YEAR FROM p.birth_date) / 10) * 10)::int AS decade,
  COUNT(*)::int AS total
FROM names n
JOIN people p ON p.id = n.person_id
WHERE n.status = 'verified' AND p.birth_date IS NOT NULL
GROUP BY n.name_text, EXTRACT(YEAR FROM p.birth_date);

-- name_by_generation: top names per birth decade
CREATE VIEW name_by_generation AS
SELECT
  n.name_text AS name,
  (FLOOR(EXTRACT(YEAR FROM p.birth_date) / 10) * 10)::int AS birth_decade,
  COUNT(*)::int AS total
FROM names n
JOIN people p ON p.id = n.person_id
WHERE n.status = 'verified' AND p.birth_date IS NOT NULL
GROUP BY n.name_text, (FLOOR(EXTRACT(YEAR FROM p.birth_date) / 10) * 10)::int;

-- name_growth: names gaining most verified instances (30d comparison)
CREATE VIEW name_growth AS
WITH cur AS (
  SELECT name_text, COUNT(*)::bigint AS cnt
  FROM names WHERE status = 'verified' AND verified_at >= NOW() - INTERVAL '30 days'
  GROUP BY name_text
), prev AS (
  SELECT name_text, COUNT(*)::bigint AS cnt
  FROM names WHERE status = 'verified'
    AND verified_at >= NOW() - INTERVAL '60 days'
    AND verified_at <  NOW() - INTERVAL '30 days'
  GROUP BY name_text
)
SELECT
  n.name_text AS name,
  COALESCE(cur.cnt, 0) AS current_count,
  COALESCE(prev.cnt, 0) AS previous_count,
  COALESCE(cur.cnt, 0) - COALESCE(prev.cnt, 0) AS absolute_growth,
  CASE WHEN COALESCE(prev.cnt, 0) = 0 THEN 100
       ELSE ROUND((COALESCE(cur.cnt,0)-COALESCE(prev.cnt,0))::numeric / COALESCE(prev.cnt,1)::numeric * 100, 2)
  END AS growth_percent
FROM (SELECT DISTINCT name_text FROM names WHERE status='verified') n
LEFT JOIN cur ON cur.name_text = n.name_text
LEFT JOIN prev ON prev.name_text = n.name_text
WHERE COALESCE(cur.cnt, 0) > COALESCE(prev.cnt, 0);

-- name_decline: names losing verified instances (30d comparison)
CREATE VIEW name_decline AS
WITH cur AS (
  SELECT name_text, COUNT(*)::bigint AS cnt
  FROM names WHERE status = 'verified' AND verified_at >= NOW() - INTERVAL '30 days'
  GROUP BY name_text
), prev AS (
  SELECT name_text, COUNT(*)::bigint AS cnt
  FROM names WHERE status = 'verified'
    AND verified_at >= NOW() - INTERVAL '60 days'
    AND verified_at <  NOW() - INTERVAL '30 days'
  GROUP BY name_text
)
SELECT
  n.name_text AS name,
  COALESCE(cur.cnt, 0) AS current_count,
  COALESCE(prev.cnt, 0) AS previous_count,
  COALESCE(cur.cnt, 0) - COALESCE(prev.cnt, 0) AS absolute_change,
  CASE WHEN COALESCE(prev.cnt, 0) = 0 THEN NULL
       ELSE ROUND((COALESCE(cur.cnt,0)-COALESCE(prev.cnt,0))::numeric / COALESCE(prev.cnt,1)::numeric * 100, 2)
  END AS decline_percent
FROM (SELECT DISTINCT name_text FROM names WHERE status='verified') n
LEFT JOIN cur ON cur.name_text = n.name_text
LEFT JOIN prev ON prev.name_text = n.name_text
WHERE COALESCE(cur.cnt, 0) < COALESCE(prev.cnt, 0);

-- search_trends: most searched names
CREATE VIEW search_trends AS
SELECT
  name_searched,
  COUNT(*)::int AS total_searches,
  COUNT(*) FILTER (WHERE searched_at >= NOW() - INTERVAL '7 days')::int AS searches_last_7d,
  COUNT(*) FILTER (WHERE searched_at >= NOW() - INTERVAL '30 days')::int AS searches_last_30d,
  MAX(searched_at) AS last_searched_at
FROM name_searches
GROUP BY name_searched
ORDER BY total_searches DESC;

-- verification_queue: pending names for moderation
CREATE VIEW verification_queue AS
SELECT
  n.id AS name_id,
  p.id AS person_id,
  p.full_name AS person_name,
  p.email AS person_email,
  n.name_text AS name,
  n.status,
  n.claimed_at,
  n.updated_at,
  COUNT(nv.id)::int AS document_count
FROM names n
JOIN people p ON p.id = n.person_id
LEFT JOIN name_verifications nv ON nv.name_id = n.id
WHERE n.status = 'pending'
GROUP BY n.id, p.id;

-- people_by_region: demographic distribution
CREATE VIEW people_by_region AS
SELECT
  p.birth_country,
  p.birth_state,
  p.birth_city,
  COUNT(DISTINCT p.id)::int AS total_people,
  COUNT(n.id) FILTER (WHERE n.status = 'verified')::int AS total_verified_names
FROM people p
LEFT JOIN names n ON n.person_id = p.id
GROUP BY p.birth_country, p.birth_state, p.birth_city;

-- ============================================================
-- 5. Seed data
-- ============================================================

-- People
INSERT INTO people (full_name, birth_date, birth_country, gender, email) VALUES
  ('Lucas da Silva',       '1990-03-15', 'BR', 'male',   'lucas.silva@example.com'),
  ('Maria Santos',         '1985-07-22', 'BR', 'female', 'maria.santos@example.com'),
  ('Arthur Lima',          '1995-11-08', 'PT', 'male',   'arthur.lima@example.com'),
  ('Gabriel Costa',        '1988-04-30', 'AR', 'male',   'gabriel.costa@example.com'),
  ('Valentina Oliveira',   '2000-01-12', 'MX', 'female', 'valentina.oliveira@example.com'),
  ('Pedro Rocha',          '1982-09-05', 'BR', 'male',   'pedro.rocha@example.com'),
  ('Beatriz Ferreira',     '1993-06-18', 'BR', 'female', 'beatriz.ferreira@example.com'),
  ('Camila Souza',         '1997-02-28', 'CO', 'female', 'camila.souza@example.com'),
  ('Rafael Mendes',        '1980-12-03', 'US', 'male',   'rafael.mendes@example.com'),
  ('Enzo Carvalho',        '1999-08-14', 'IT', 'male',   'enzo.carvalho@example.com'),
  ('Henrique Nunes',       '1987-05-25', 'BR', 'male',   'henrique.nunes@example.com'),
  ('Isabela Gomes',        '2002-10-07', 'BR', 'female', 'isabela.gomes@example.com'),
  ('Julia Martins',        '1991-03-19', 'FR', 'female', 'julia.martins@example.com'),
  ('Lara Alves',           '1996-07-31', 'ES', 'female', 'lara.alves@example.com'),
  ('Laura Pereira',        '1984-01-08', 'BR', 'female', 'laura.pereira@example.com'),
  ('Mateus Ribeiro',       '1979-11-21', 'BR', 'male',   'mateus.ribeiro@example.com'),
  ('Sofia Batista',        '2001-04-14', 'PT', 'female', 'sofia.batista@example.com'),
  ('Miguel Castro',        '1994-09-02', 'ES', 'male',   'miguel.castro@example.com'),
  ('Ana Lima',             '1989-12-16', 'BR', 'female', 'ana.lima@example.com'),
  ('João Cardoso',         '1975-06-28', 'BR', 'male',   'joao.cardoso@example.com'),
  ('Lucas Teixeira',       '1978-02-17', 'FR', 'male',   'lucas.teixeira@example.com'),
  ('Maria Rodrigues',      '1992-08-09', 'ES', 'female', 'maria.rodrigues@example.com'),
  ('Arthur Barbosa',       '1986-03-31', 'BR', 'male',   'arthur.barbosa@example.com'),
  ('Gabriel Pinto',        '2003-07-05', 'BR', 'male',   'gabriel.pinto@example.com'),
  ('Lucas Correia',        '1970-10-24', 'US', 'male',   'lucas.correia@example.com'),
  ('Maria Fernandes',      '1998-01-15', 'IT', 'female', 'maria.fernandes@example.com'),
  ('Pedro Dias',           '1983-04-12', 'PT', 'male',   'pedro.dias@example.com'),
  ('Enzo Marques',         '2001-11-28', 'BR', 'male',   'enzo.marques@example.com'),
  ('Enzo Romano',          '1995-06-04', 'AR', 'male',   'enzo.romano@example.com'),
  ('Lucas Silva',          '1988-09-20', 'MX', 'male',   'lucas.silva2@example.com'),
  ('Sofia Andrade',        '1999-03-07', 'BR', 'female', 'sofia.andrade@example.com'),
  ('Miguel Ferreira',      '1990-10-15', 'PT', 'male',   'miguel.ferreira@example.com'),
  ('Rafael Oliveira',      '1977-08-22', 'BR', 'male',   'rafael.oliveira@example.com'),
  ('Beatriz Carvalho',     '2004-05-11', 'BR', 'female', 'beatriz.carvalho@example.com'),
  ('Isabela Martins',      '1994-12-30', 'CO', 'female', 'isabela.martins@example.com');

-- Name meanings
INSERT INTO name_meanings (name_text, meaning, language_origin, cultural_origin, gender_association) VALUES
  ('Lucas',     'Portador de luz',                    'Latim',    'Romano',    'masculine'),
  ('Maria',     'Mar de amargura / Amada de Deus',    'Hebraico', 'Bíblico',   'feminine'),
  ('Arthur',    'Urso / Rei',                         'Celta',    'Britânico', 'masculine'),
  ('Gabriel',   'Deus é minha força',                 'Hebraico', 'Bíblico',   'masculine'),
  ('Valentina', 'Forte e saudável',                   'Latim',    'Romano',    'feminine'),
  ('Pedro',     'Pedra / Rocha',                      'Grego',    'Bíblico',   'masculine'),
  ('Beatriz',   'Aquela que traz felicidade',         'Latim',    'Romano',    'feminine'),
  ('Camila',    'Jovem servidora dos deuses',         'Latim',    'Romano',    'feminine'),
  ('Rafael',    'Deus curou',                         'Hebraico', 'Bíblico',   'masculine'),
  ('Enzo',      'Senhor da casa / Conquistador',      'Germânico','Italiano',  'masculine'),
  ('Henrique',  'Rei do lar',                         'Germânico','Medieval',  'masculine'),
  ('Isabela',   'Consagrada a Deus',                  'Hebraico', 'Ibérico',   'feminine'),
  ('Julia',     'Jovem / Pertencente à família Júlia','Latim',    'Romano',    'feminine'),
  ('Lara',      'Proteção / Alegria',                 'Latim',    'Romano',    'feminine'),
  ('Laura',     'Coroada de louros / Vitoriosa',      'Latim',    'Romano',    'feminine'),
  ('Mateus',    'Presente de Deus',                   'Hebraico', 'Bíblico',   'masculine'),
  ('Sofia',     'Sabedoria',                          'Grego',    'Helênico',  'feminine'),
  ('Miguel',    'Quem é como Deus?',                  'Hebraico', 'Bíblico',   'masculine'),
  ('Ana',       'Cheia de graça / Misericordiosa',    'Hebraico', 'Bíblico',   'feminine'),
  ('João',      'Deus é gracioso',                    'Hebraico', 'Bíblico',   'masculine');

-- Names (individual instances)
-- Using specific verified_at dates to enable trending/declining analysis
-- Recent (last 180 days) = more weight in "current" period for 1y filter
-- Older (180-730 days ago) = more weight in "previous" period

INSERT INTO names (name_text, person_id, birth_country, status, claimed_at, verified_at) VALUES
  -- LUCAS: 10 instances — highly popular, mix of recent and older (trending over 1y)
  ('Lucas', 1,  'BR', 'verified', NOW()-'400 days'::interval, NOW()-'390 days'::interval),
  ('Lucas', 21, 'FR', 'verified', NOW()-'350 days'::interval, NOW()-'340 days'::interval),
  ('Lucas', 25, 'US', 'verified', NOW()-'200 days'::interval, NOW()-'195 days'::interval),
  ('Lucas', 30, 'MX', 'verified', NOW()-'120 days'::interval, NOW()-'115 days'::interval),
  ('Lucas', 1,  'BR', 'pending',  NOW()-'5 days'::interval,   NULL),

  -- MARIA: 8 instances — very popular
  ('Maria', 2,  'BR', 'verified', NOW()-'500 days'::interval, NOW()-'495 days'::interval),
  ('Maria', 22, 'ES', 'verified', NOW()-'420 days'::interval, NOW()-'415 days'::interval),
  ('Maria', 26, 'IT', 'verified', NOW()-'300 days'::interval, NOW()-'295 days'::interval),
  ('Maria', 2,  'BR', 'pending',  NOW()-'3 days'::interval,   NULL),

  -- ARTHUR: 6 instances
  ('Arthur', 3,  'PT', 'verified', NOW()-'450 days'::interval, NOW()-'445 days'::interval),
  ('Arthur', 23, 'BR', 'verified', NOW()-'250 days'::interval, NOW()-'245 days'::interval),
  ('Arthur', 3,  'PT', 'verified', NOW()-'60 days'::interval,  NOW()-'55 days'::interval),

  -- GABRIEL: 6 instances
  ('Gabriel', 4,  'AR', 'verified', NOW()-'480 days'::interval, NOW()-'475 days'::interval),
  ('Gabriel', 24, 'BR', 'verified', NOW()-'180 days'::interval, NOW()-'175 days'::interval),
  ('Gabriel', 4,  'AR', 'verified', NOW()-'45 days'::interval,  NOW()-'40 days'::interval),

  -- ENZO: 5 instances — all recent (strongly trending)
  ('Enzo', 10, 'IT', 'verified', NOW()-'90 days'::interval,  NOW()-'85 days'::interval),
  ('Enzo', 28, 'BR', 'verified', NOW()-'60 days'::interval,  NOW()-'55 days'::interval),
  ('Enzo', 29, 'AR', 'verified', NOW()-'30 days'::interval,  NOW()-'25 days'::interval),

  -- PEDRO: 4 instances
  ('Pedro', 6,  'BR', 'verified', NOW()-'380 days'::interval, NOW()-'375 days'::interval),
  ('Pedro', 27, 'PT', 'verified', NOW()-'150 days'::interval, NOW()-'145 days'::interval),

  -- VALENTINA: 3 instances
  ('Valentina', 5,  'MX', 'verified', NOW()-'320 days'::interval, NOW()-'315 days'::interval),
  ('Valentina', 5,  'MX', 'verified', NOW()-'100 days'::interval, NOW()-'95 days'::interval),

  -- BEATRIZ: 3 instances
  ('Beatriz', 7,  'BR', 'verified', NOW()-'410 days'::interval, NOW()-'405 days'::interval),
  ('Beatriz', 34, 'BR', 'verified', NOW()-'80 days'::interval,  NOW()-'75 days'::interval),

  -- SOFIA: 3 instances — recent (trending)
  ('Sofia', 17, 'PT', 'verified', NOW()-'70 days'::interval, NOW()-'65 days'::interval),
  ('Sofia', 31, 'BR', 'verified', NOW()-'40 days'::interval, NOW()-'35 days'::interval),

  -- MIGUEL: 3 instances
  ('Miguel', 18, 'ES', 'verified', NOW()-'360 days'::interval, NOW()-'355 days'::interval),
  ('Miguel', 32, 'PT', 'verified', NOW()-'110 days'::interval, NOW()-'105 days'::interval),

  -- RAFAEL: 3 instances
  ('Rafael', 9,  'US', 'verified', NOW()-'440 days'::interval, NOW()-'435 days'::interval),
  ('Rafael', 33, 'BR', 'verified', NOW()-'220 days'::interval, NOW()-'215 days'::interval),

  -- HENRIQUE: 2 instances
  ('Henrique', 11, 'BR', 'verified', NOW()-'390 days'::interval, NOW()-'385 days'::interval),
  ('Henrique', 11, 'BR', 'verified', NOW()-'130 days'::interval, NOW()-'125 days'::interval),

  -- ISABELA: 2 instances
  ('Isabela', 12, 'BR', 'verified', NOW()-'370 days'::interval, NOW()-'365 days'::interval),
  ('Isabela', 35, 'CO', 'verified', NOW()-'160 days'::interval, NOW()-'155 days'::interval),

  -- JULIA: 2 instances
  ('Julia', 13, 'FR', 'verified', NOW()-'430 days'::interval, NOW()-'425 days'::interval),
  ('Julia', 13, 'FR', 'verified', NOW()-'190 days'::interval, NOW()-'185 days'::interval),

  -- LAURA: 2 instances
  ('Laura', 15, 'BR', 'verified', NOW()-'460 days'::interval, NOW()-'455 days'::interval),
  ('Laura', 15, 'BR', 'verified', NOW()-'50 days'::interval,  NOW()-'45 days'::interval),

  -- LARA: 2 instances
  ('Lara', 14, 'ES', 'verified', NOW()-'340 days'::interval, NOW()-'335 days'::interval),
  ('Lara', 14, 'ES', 'verified', NOW()-'170 days'::interval, NOW()-'165 days'::interval),

  -- MATEUS: 2 instances — older (declining relative to others)
  ('Mateus', 16, 'BR', 'verified', NOW()-'520 days'::interval, NOW()-'515 days'::interval),
  ('Mateus', 16, 'BR', 'verified', NOW()-'490 days'::interval, NOW()-'485 days'::interval),

  -- CAMILA: 1 verified + 1 pending
  ('Camila', 8,  'CO', 'verified', NOW()-'280 days'::interval, NOW()-'275 days'::interval),
  ('Camila', 8,  'CO', 'pending',  NOW()-'2 days'::interval,   NULL),

  -- ANA: 2 instances
  ('Ana', 19, 'BR', 'verified', NOW()-'310 days'::interval, NOW()-'305 days'::interval),
  ('Ana', 19, 'BR', 'verified', NOW()-'140 days'::interval, NOW()-'135 days'::interval),

  -- JOÃO: 2 instances — old only (declining)
  ('João', 20, 'BR', 'verified', NOW()-'700 days'::interval, NOW()-'695 days'::interval),
  ('João', 20, 'BR', 'verified', NOW()-'600 days'::interval, NOW()-'595 days'::interval);
