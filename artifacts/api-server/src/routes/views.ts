import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// name_ranking — global ranking by verified claims
router.get("/views/name-ranking", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name, total_claims::int, rank::int FROM name_ranking ORDER BY rank LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_rarity — rarest names
router.get("/views/name-rarity", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name, total_claims::int, rarity_rank::int FROM name_rarity ORDER BY rarity_rank LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_growth — names growing most (current vs previous 30d)
router.get("/views/name-growth", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name, current_count::int, previous_count::int,
            absolute_growth::int, growth_percent::float
     FROM name_growth ORDER BY absolute_growth DESC LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_decline — names declining most
router.get("/views/name-decline", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name, current_count::int, previous_count::int,
            absolute_change::int, decline_percent::float
     FROM name_decline ORDER BY absolute_change ASC LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_by_generation — most popular names per birth decade
router.get("/views/name-by-generation", async (_req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT name, birth_decade, total::int FROM name_by_generation ORDER BY birth_decade`
  );
  res.json(rows);
});

// search_trends — most searched names
router.get("/views/search-trends", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name_searched, total_searches::int, searches_last_7d::int,
            searches_last_30d::int, last_searched_at
     FROM search_trends LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// verification_queue — pending names for moderation
router.get("/views/verification-queue", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `SELECT name_id, person_id, person_name, person_email,
            name, status, claimed_at, updated_at, document_count::int
     FROM verification_queue LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// people_by_region — demographic distribution
router.get("/views/people-by-region", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 500);
  const { rows } = await pool.query(
    `SELECT birth_country, birth_state, birth_city,
            total_people::int, total_verified_names::int
     FROM people_by_region WHERE birth_country IS NOT NULL LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_popularity — claim counts by year
router.get("/views/name-popularity/:name", async (req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT name, total::int, year::int, decade::int
     FROM name_popularity WHERE LOWER(name) = LOWER($1) ORDER BY year`,
    [req.params.name]
  );
  res.json(rows);
});

// name_regions — geographic distribution per name
router.get("/views/name-regions/:name", async (req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT name, birth_country, total::int
     FROM name_regions WHERE LOWER(name) = LOWER($1) ORDER BY total DESC`,
    [req.params.name]
  );
  res.json(rows);
});

// name_history — civil registration history (yearly, verified names)
router.get("/views/name-history", async (req, res): Promise<void> => {
  const name = String(req.query.name || "");
  const country = req.query.country ? String(req.query.country) : null;
  const yearFrom = req.query.yearFrom ? String(req.query.yearFrom) : null;
  const yearTo = req.query.yearTo ? String(req.query.yearTo) : null;

  if (!name) { res.status(400).json({ error: "name is required" }); return; }

  const conds: string[] = ["LOWER(name_text) = LOWER($1)"];
  const vals: any[] = [name];
  let i = 2;

  if (country) { conds.push(`birth_country = $${i++}`); vals.push(country); }
  if (yearFrom) { conds.push(`periodo >= $${i++}::timestamptz`); vals.push(`${yearFrom}-01-01`); }
  if (yearTo)   { conds.push(`periodo <= $${i++}::timestamptz`); vals.push(`${yearTo}-12-31`); }

  const { rows } = await pool.query(
    `SELECT
       EXTRACT(YEAR FROM periodo)::int AS year,
       total_nome::int,
       total_periodo::int,
       participacao_pct::float
     FROM name_history
     WHERE ${conds.join(" AND ")}
     ORDER BY periodo`,
    vals
  );
  res.json(rows);
});

// name_trends — real-time platform trend (daily, verified + pending)
router.get("/views/name-trends", async (req, res): Promise<void> => {
  const name = req.query.name ? String(req.query.name) : null;
  const country = req.query.country ? String(req.query.country) : null;
  const days = Math.min(Math.max(Number(req.query.days) || 30, 1), 365);

  const conds: string[] = [`periodo >= NOW() - INTERVAL '${days} days'`];
  const vals: any[] = [];
  let i = 1;

  if (name)    { conds.push(`LOWER(name_text) = LOWER($${i++})`); vals.push(name); }
  if (country) { conds.push(`birth_country = $${i++}`);           vals.push(country); }

  const { rows } = await pool.query(
    `SELECT
       periodo::date AS day,
       name_text,
       birth_country,
       total_nome::int,
       total_periodo::int,
       participacao_pct::float
     FROM name_trends
     WHERE ${conds.join(" AND ")}
     ORDER BY periodo, participacao_pct DESC`,
    vals
  );
  res.json(rows);
});

export default router;
