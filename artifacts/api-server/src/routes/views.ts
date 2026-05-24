import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

// name_ranking — global ranking by verified claims
router.get("/views/name-ranking", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name_id, name, total_claims::int, rank::int FROM name_ranking ORDER BY rank LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_rarity — rarest names
router.get("/views/name-rarity", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name_id, name, total_claims::int, rarity_rank::int FROM name_rarity ORDER BY rarity_rank LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_growth — names growing most (current vs previous 30d)
router.get("/views/name-growth", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const { rows } = await pool.query(
    `SELECT name_id, name, current_count::int, previous_count::int,
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
    `SELECT name_id, name, current_count::int, previous_count::int,
            absolute_change::int, decline_percent::float
     FROM name_decline ORDER BY absolute_change ASC LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// name_by_generation — most popular name per birth decade
router.get("/views/name-by-generation", async (_req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT name_id, name, birth_decade, total::int FROM name_by_generation ORDER BY birth_decade`
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

// verification_queue — pending claims for moderation
router.get("/views/verification-queue", async (req, res): Promise<void> => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  const { rows } = await pool.query(
    `SELECT claim_id, person_id, person_name, person_email,
            name_id, name, status, claimed_at, updated_at, document_count::int
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
            total_people::int, total_verified_claims::int
     FROM people_by_region WHERE birth_country IS NOT NULL LIMIT $1`,
    [limit]
  );
  res.json(rows);
});

// filiation_graph — kinship links
router.get("/views/filiation-graph", async (_req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT id, person_id, person_name, parent_id, parent_name,
            relation_type, confidence_score, created_at
     FROM filiation_graph ORDER BY created_at DESC`
  );
  res.json(rows);
});

// name_popularity — claim counts by year and decade
router.get("/views/name-popularity/:name", async (req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT name_id, name, total::int, year::int, decade::int
     FROM name_popularity WHERE LOWER(name) = LOWER($1) ORDER BY year`,
    [req.params.name]
  );
  res.json(rows);
});

// name_regions — geographic distribution per name
router.get("/views/name-regions/:name", async (req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT name_id, name, birth_country, birth_state, birth_city, total::int
     FROM name_regions WHERE LOWER(name) = LOWER($1) ORDER BY total DESC`,
    [req.params.name]
  );
  res.json(rows);
});

export default router;
