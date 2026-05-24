import { Router, type IRouter } from "express";
import { ilike, sql } from "drizzle-orm";
import { db, namesTable, nameMeaningsTable, pool } from "@workspace/db";
import {
  SearchNamesQueryParams,
  GetPopularNamesQueryParams,
  GetTrendingNamesQueryParams,
  GetDecliningNamesQueryParams,
  GetRareNamesQueryParams,
  BrowseNamesQueryParams,
  GetNameDetailParams,
  GetNameHistoryParams,
  GetNameCountriesParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /names/search
router.get("/names/search", async (req, res): Promise<void> => {
  const parsed = SearchNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit = 10 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT
       nr.name,
       nr.total_claims,
       nm.meaning,
       nm.language_origin,
       nm.cultural_origin,
       nm.gender_association,
       COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count
     FROM name_ranking nr
     LEFT JOIN name_meanings nm ON nm.name_text = nr.name
     LEFT JOIN names n ON LOWER(n.name_text) = LOWER(nr.name) AND n.status = 'verified'
     WHERE nr.name ILIKE $1
     GROUP BY nr.name, nr.total_claims, nm.meaning, nm.language_origin, nm.cultural_origin, nm.gender_association
     LIMIT $2`,
    [`%${q}%`, limit]
  );
  res.json(rows.map((r: any) => ({
    name: r.name,
    count: Number(r.total_claims),
    countries: Number(r.country_count),
    origin: r.language_origin ?? r.cultural_origin ?? null,
    meaning: r.meaning ?? null,
    gender: r.gender_association ?? null,
  })));
});

// GET /names/popular
router.get("/names/popular", async (req, res): Promise<void> => {
  const parsed = GetPopularNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 20 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT
       nr.name,
       nr.total_claims,
       nm.meaning,
       nm.language_origin,
       nm.cultural_origin,
       nm.gender_association,
       COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count
     FROM name_ranking nr
     LEFT JOIN name_meanings nm ON nm.name_text = nr.name
     LEFT JOIN names n ON LOWER(n.name_text) = LOWER(nr.name) AND n.status = 'verified'
     GROUP BY nr.name, nr.total_claims, nr.rank, nm.meaning, nm.language_origin, nm.cultural_origin, nm.gender_association
     ORDER BY nr.rank
     LIMIT $1`,
    [limit]
  );
  res.json(rows.map((r: any) => ({
    name: r.name,
    count: Number(r.total_claims),
    countries: Number(r.country_count),
    origin: r.language_origin ?? r.cultural_origin ?? null,
    meaning: r.meaning ?? null,
    gender: r.gender_association ?? null,
  })));
});

const PERIOD_TO_INTERVAL: Record<string, string> = {
  "1m": "30 days",
  "6m": "180 days",
  "1y": "365 days",
  "5y": "1825 days",
};

// GET /names/trending
router.get("/names/trending", async (req, res): Promise<void> => {
  const parsed = GetTrendingNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { period = "1y", limit = 10 } = parsed.data;
  const interval = PERIOD_TO_INTERVAL[period] ?? "365 days";

  const { rows } = await pool.query(
    `WITH current_period AS (
       SELECT name_text, COUNT(*)::bigint AS current_count
       FROM names
       WHERE status = 'verified' AND verified_at >= NOW() - INTERVAL '${interval}'
       GROUP BY name_text
     ), previous_period AS (
       SELECT name_text, COUNT(*)::bigint AS previous_count
       FROM names
       WHERE status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${interval}' * 2
         AND verified_at <  NOW() - INTERVAL '${interval}'
       GROUP BY name_text
     )
     SELECT
       cp.name_text AS name,
       COALESCE(cp.current_count, 0) AS current_count,
       COALESCE(pp.previous_count, 0) AS previous_count,
       COALESCE(cp.current_count, 0) - COALESCE(pp.previous_count, 0) AS absolute_growth,
       CASE WHEN COALESCE(pp.previous_count, 0) = 0 THEN 100
            ELSE ROUND(
              (COALESCE(cp.current_count, 0) - COALESCE(pp.previous_count, 0))::numeric
              / COALESCE(pp.previous_count, 1)::numeric * 100, 2
            )
       END AS growth_percent,
       COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count
     FROM current_period cp
     LEFT JOIN previous_period pp ON pp.name_text = cp.name_text
     LEFT JOIN names n ON LOWER(n.name_text) = LOWER(cp.name_text) AND n.status = 'verified'
     WHERE COALESCE(cp.current_count, 0) > COALESCE(pp.previous_count, 0)
     GROUP BY cp.name_text, cp.current_count, pp.previous_count
     ORDER BY absolute_growth DESC
     LIMIT $1`,
    [limit]
  );

  const result = await Promise.all(rows.map(async (r: any) => {
    const { rows: spark } = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM names
       WHERE LOWER(name_text) = LOWER($1) AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${interval}'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [r.name]
    );
    return {
      name: r.name,
      count: Number(r.current_count),
      countries: Number(r.country_count),
      changePercent: r.growth_percent !== null ? Number(r.growth_percent) : null,
      trend: "rising" as const,
      sparkline: spark.map((s: any) => s.cnt),
    };
  }));
  res.json(result);
});

// GET /names/declining
router.get("/names/declining", async (req, res): Promise<void> => {
  const parsed = GetDecliningNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 10 } = parsed.data;

  const { rows } = await pool.query(
    `SELECT
       nd.name,
       nd.current_count,
       nd.previous_count,
       nd.decline_percent,
       COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count
     FROM name_decline nd
     LEFT JOIN names n ON LOWER(n.name_text) = LOWER(nd.name) AND n.status = 'verified'
     GROUP BY nd.name, nd.current_count, nd.previous_count, nd.decline_percent
     ORDER BY nd.decline_percent ASC
     LIMIT $1`,
    [limit]
  );

  const result = await Promise.all(rows.map(async (r: any) => {
    const { rows: spark } = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM names
       WHERE LOWER(name_text) = LOWER($1) AND status = 'verified'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [r.name]
    );
    return {
      name: r.name,
      count: Number(r.current_count),
      countries: Number(r.country_count),
      changePercent: r.decline_percent !== null ? Number(r.decline_percent) : null,
      trend: "falling" as const,
      sparkline: spark.map((s: any) => s.cnt),
    };
  }));
  res.json(result);
});

// GET /names/browse
router.get("/names/browse", async (req, res): Promise<void> => {
  const parsed = BrowseNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { sort = "popular", page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  let orderExpr: string;
  switch (sort) {
    case "rare":      orderExpr = "nr.total_claims ASC"; break;
    case "longest":   orderExpr = "LENGTH(nr.name) DESC"; break;
    case "shortest":  orderExpr = "LENGTH(nr.name) ASC"; break;
    case "trending":  orderExpr = "nr.total_claims DESC"; break;
    case "declining": orderExpr = "nr.total_claims ASC"; break;
    default:          orderExpr = "nr.rank ASC";
  }

  const { rows: totalRows } = await pool.query(`SELECT COUNT(*)::int AS cnt FROM name_ranking`);
  const total = totalRows[0]?.cnt ?? 0;

  const { rows } = await pool.query(
    `SELECT
       nr.name,
       nr.total_claims,
       nr.rank,
       nm.meaning,
       nm.language_origin,
       nm.cultural_origin,
       nm.gender_association,
       COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count
     FROM name_ranking nr
     LEFT JOIN name_meanings nm ON nm.name_text = nr.name
     LEFT JOIN names n ON LOWER(n.name_text) = LOWER(nr.name) AND n.status = 'verified'
     GROUP BY nr.name, nr.total_claims, nr.rank, nm.meaning, nm.language_origin, nm.cultural_origin, nm.gender_association
     ORDER BY ${orderExpr}
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({
    items: rows.map((r: any) => ({
      name: r.name,
      count: Number(r.total_claims),
      countries: Number(r.country_count),
      origin: r.language_origin ?? r.cultural_origin ?? null,
      meaning: r.meaning ?? null,
      gender: r.gender_association ?? null,
    })),
    total,
    page,
    hasMore: offset + rows.length < total,
  });
});

// GET /names/rare
router.get("/names/rare", async (req, res): Promise<void> => {
  const parsed = GetRareNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 10 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT
       nr.name,
       nr.total_claims,
       nm.meaning,
       nm.language_origin,
       nm.cultural_origin,
       nm.gender_association,
       COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count
     FROM name_rarity nr
     LEFT JOIN name_meanings nm ON nm.name_text = nr.name
     LEFT JOIN names n ON LOWER(n.name_text) = LOWER(nr.name) AND n.status = 'verified'
     WHERE nr.total_claims > 0
     GROUP BY nr.name, nr.total_claims, nr.rarity_rank, nm.meaning, nm.language_origin, nm.cultural_origin, nm.gender_association
     ORDER BY nr.rarity_rank
     LIMIT $1`,
    [limit]
  );
  res.json(rows.map((r: any) => ({
    name: r.name,
    count: Number(r.total_claims),
    countries: Number(r.country_count),
    origin: r.language_origin ?? r.cultural_origin ?? null,
    meaning: r.meaning ?? null,
    gender: r.gender_association ?? null,
  })));
});

// GET /names/by-decade
router.get("/names/by-decade", async (_req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT name, birth_decade FROM name_by_generation ORDER BY birth_decade, total DESC`
  );

  if (!rows.length) {
    const { rows: topRows } = await pool.query(
      `SELECT name FROM name_ranking ORDER BY rank LIMIT 5`
    );
    const names = topRows.map((r: any) => r.name);
    const base = Math.floor(new Date().getFullYear() / 10) * 10;
    res.json([0,1,2,3,4,5].map(i => ({ decade: base - (5-i)*10, names })));
    return;
  }

  const decadeMap = new Map<number, string[]>();
  for (const r of rows) {
    const d = Number(r.birth_decade);
    if (!decadeMap.has(d)) decadeMap.set(d, []);
    decadeMap.get(d)!.push(r.name);
  }
  res.json(Array.from(decadeMap.entries()).map(([decade, names]) => ({ decade, names })));
});

// GET /names/by-country — top name per country for the home card
router.get("/names/by-country", async (_req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT DISTINCT ON (nr.birth_country)
       nr.birth_country AS country,
       nr.name,
       nr.total
     FROM name_regions nr
     WHERE nr.birth_country IS NOT NULL
     ORDER BY nr.birth_country, nr.total DESC
     LIMIT 5`
  );
  res.json(rows.map((r: any) => ({
    name: r.name,
    country: r.country,
  })));
});

router.get("/names/:name/history", async (req, res): Promise<void> => {
  const params = GetNameHistoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;
  const { rows } = await pool.query(
    `SELECT year::int, total::int AS count FROM name_popularity
     WHERE LOWER(name) = LOWER($1) ORDER BY year`,
    [nameParam]
  );
  res.json(rows.map((h: any) => ({ year: h.year, count: h.count, rank: null })));
});

// GET /names/:name/countries
router.get("/names/:name/countries", async (req, res): Promise<void> => {
  const params = GetNameCountriesParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;
  const { rows: totalRow } = await pool.query(
    `SELECT SUM(total)::int AS grand_total FROM name_regions WHERE LOWER(name) = LOWER($1)`,
    [nameParam]
  );
  const grandTotal = Number(totalRow[0]?.grand_total ?? 0);
  const { rows } = await pool.query(
    `SELECT birth_country, total FROM name_regions
     WHERE LOWER(name) = LOWER($1) AND birth_country IS NOT NULL
     ORDER BY total DESC LIMIT 10`,
    [nameParam]
  );
  res.json(rows.map((c: any) => ({
    country: c.birth_country ?? "Unknown",
    countryCode: "",
    count: Number(c.total),
    percentage: grandTotal > 0 ? Math.round((Number(c.total) / grandTotal) * 100) : 0,
  })));
});

// GET /names/:name
router.get("/names/:name", async (req, res): Promise<void> => {
  const params = GetNameDetailParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;

  const [{ rows: rankRows }, { rows: meaningRows }, { rows: regionRows }, { rows: sparkRows }] = await Promise.all([
    pool.query(
      `SELECT total_claims, rank FROM name_ranking WHERE LOWER(name) = LOWER($1)`,
      [nameParam]
    ),
    pool.query(
      `SELECT meaning, language_origin, cultural_origin, gender_association
       FROM name_meanings WHERE LOWER(name_text) = LOWER($1)`,
      [nameParam]
    ),
    pool.query(
      `SELECT birth_country, total FROM name_regions
       WHERE LOWER(name) = LOWER($1) AND birth_country IS NOT NULL
       ORDER BY total DESC LIMIT 5`,
      [nameParam]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM names
       WHERE LOWER(name_text) = LOWER($1) AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '10 months'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [nameParam]
    ),
  ]);

  if (!rankRows.length && !meaningRows.length) {
    res.status(404).json({ error: "Name not found" });
    return;
  }

  const totalClaims = Number(rankRows[0]?.total_claims ?? 0);
  const meaning = meaningRows[0];

  res.json({
    name: nameParam,
    count: totalClaims,
    countries: regionRows.length,
    origin: meaning?.language_origin ?? meaning?.cultural_origin ?? "Unknown",
    meaning: meaning?.meaning ?? "Unknown",
    gender: meaning?.gender_association ?? "neutral",
    topCountries: regionRows.map((c: any) => ({
      country: c.birth_country,
      countryCode: "",
      count: Number(c.total),
      percentage: totalClaims ? Math.round((Number(c.total) / totalClaims) * 100) : 0,
    })),
    changePercent: null,
    sparkline: sparkRows.map((s: any) => s.cnt),
  });
});

export default router;
