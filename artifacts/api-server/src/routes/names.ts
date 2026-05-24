import { Router, type IRouter } from "express";
import { ilike, asc, sql } from "drizzle-orm";
import { db, namesTable, pool } from "@workspace/db";
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

const COUNTRY_COUNT_SUBQUERY = `
  (SELECT name_id, COUNT(DISTINCT birth_country)::int AS country_count
   FROM name_regions
   WHERE birth_country IS NOT NULL
   GROUP BY name_id) rc
`;

// GET /names/search
router.get("/names/search", async (req, res): Promise<void> => {
  const parsed = SearchNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { q, limit = 10 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT n.name, n.language_origin, n.cultural_origin, n.meaning, n.gender_association,
            COALESCE(nr.total_claims, 0)::int AS total_claims,
            COALESCE(rc.country_count, 0) AS country_count
     FROM names n
     LEFT JOIN name_ranking nr ON nr.name_id = n.id
     LEFT JOIN ${COUNTRY_COUNT_SUBQUERY} ON rc.name_id = n.id
     WHERE n.name ILIKE $1
     ORDER BY n.name
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

// GET /names/popular — from name_ranking view
router.get("/names/popular", async (req, res): Promise<void> => {
  const parsed = GetPopularNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 20 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT nr.name_id, nr.name, nr.total_claims,
            n.language_origin, n.cultural_origin, n.meaning, n.gender_association,
            COALESCE(rc.country_count, 0) AS country_count
     FROM name_ranking nr
     JOIN names n ON n.id = nr.name_id
     LEFT JOIN ${COUNTRY_COUNT_SUBQUERY} ON rc.name_id = nr.name_id
     ORDER BY nr.rank LIMIT $1`,
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

// GET /names/trending — dynamic period comparison
router.get("/names/trending", async (req, res): Promise<void> => {
  const parsed = GetTrendingNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { period = "1y", limit = 10 } = parsed.data;
  const interval = PERIOD_TO_INTERVAL[period] ?? "365 days";

  const { rows } = await pool.query(
    `WITH current_period AS (
       SELECT name_id, COUNT(*)::bigint AS current_count
       FROM name_claims
       WHERE status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${interval}'
       GROUP BY name_id
     ), previous_period AS (
       SELECT name_id, COUNT(*)::bigint AS previous_count
       FROM name_claims
       WHERE status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${interval}' * 2
         AND verified_at <  NOW() - INTERVAL '${interval}'
       GROUP BY name_id
     )
     SELECT n.id AS name_id, n.name,
            COALESCE(cp.current_count, 0) AS current_count,
            COALESCE(pp.previous_count, 0) AS previous_count,
            COALESCE(cp.current_count, 0) - COALESCE(pp.previous_count, 0) AS absolute_growth,
            CASE WHEN COALESCE(pp.previous_count, 0) = 0 THEN 100
                 ELSE ROUND(
                   (COALESCE(cp.current_count, 0) - COALESCE(pp.previous_count, 0))::numeric
                   / COALESCE(pp.previous_count, 1)::numeric * 100, 2
                 )
            END AS growth_percent,
            COALESCE(rc.country_count, 0) AS country_count
     FROM names n
     JOIN current_period cp ON cp.name_id = n.id
     LEFT JOIN previous_period pp ON pp.name_id = n.id
     LEFT JOIN ${COUNTRY_COUNT_SUBQUERY} ON rc.name_id = n.id
     WHERE COALESCE(cp.current_count, 0) > COALESCE(pp.previous_count, 0)
     ORDER BY absolute_growth DESC
     LIMIT $1`,
    [limit]
  );

  const sparkInterval = interval;
  const result = await Promise.all(rows.map(async (r: any) => {
    const { rows: spark } = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM name_claims
       WHERE name_id = $1 AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${sparkInterval}'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [r.name_id]
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

// GET /names/declining — dynamic period comparison
router.get("/names/declining", async (req, res): Promise<void> => {
  const parsed = GetDecliningNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { period = "5y", limit = 10 } = parsed.data;
  const interval = PERIOD_TO_INTERVAL[period] ?? "1825 days";

  const { rows } = await pool.query(
    `WITH current_period AS (
       SELECT name_id, COUNT(*)::bigint AS current_count
       FROM name_claims
       WHERE status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${interval}'
       GROUP BY name_id
     ), previous_period AS (
       SELECT name_id, COUNT(*)::bigint AS previous_count
       FROM name_claims
       WHERE status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${interval}' * 2
         AND verified_at <  NOW() - INTERVAL '${interval}'
       GROUP BY name_id
     )
     SELECT n.id AS name_id, n.name,
            COALESCE(cp.current_count, 0) AS current_count,
            COALESCE(pp.previous_count, 0) AS previous_count,
            COALESCE(cp.current_count, 0) - COALESCE(pp.previous_count, 0) AS absolute_change,
            CASE WHEN COALESCE(pp.previous_count, 0) = 0 THEN NULL
                 ELSE ROUND(
                   (COALESCE(cp.current_count, 0) - COALESCE(pp.previous_count, 0))::numeric
                   / COALESCE(pp.previous_count, 1)::numeric * 100, 2
                 )
            END AS decline_percent,
            COALESCE(rc.country_count, 0) AS country_count
     FROM names n
     JOIN previous_period pp ON pp.name_id = n.id
     LEFT JOIN current_period cp ON cp.name_id = n.id
     LEFT JOIN ${COUNTRY_COUNT_SUBQUERY} ON rc.name_id = n.id
     WHERE COALESCE(cp.current_count, 0) < COALESCE(pp.previous_count, 0)
     ORDER BY absolute_change ASC
     LIMIT $1`,
    [limit]
  );

  const sparkInterval = interval;
  const result = await Promise.all(rows.map(async (r: any) => {
    const { rows: spark } = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM name_claims
       WHERE name_id = $1 AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '${sparkInterval}'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [r.name_id]
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
    `SELECT nr.name_id, nr.name, nr.total_claims, nr.rank,
            n.language_origin, n.cultural_origin, n.meaning, n.gender_association,
            COALESCE(rc.country_count, 0) AS country_count
     FROM name_ranking nr
     JOIN names n ON n.id = nr.name_id
     LEFT JOIN ${COUNTRY_COUNT_SUBQUERY} ON rc.name_id = nr.name_id
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

// GET /names/rare — from name_rarity view
router.get("/names/rare", async (req, res): Promise<void> => {
  const parsed = GetRareNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 10 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT nr.name_id, nr.name, nr.total_claims,
            n.language_origin, n.cultural_origin, n.meaning, n.gender_association,
            COALESCE(rc.country_count, 0) AS country_count
     FROM name_rarity nr
     JOIN names n ON n.id = nr.name_id
     LEFT JOIN ${COUNTRY_COUNT_SUBQUERY} ON rc.name_id = nr.name_id
     WHERE nr.total_claims > 0
     ORDER BY nr.rarity_rank LIMIT $1`,
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

// GET /names/by-decade — from name_by_generation view
router.get("/names/by-decade", async (_req, res): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT birth_decade, name FROM name_by_generation ORDER BY birth_decade`
  );

  if (!rows.length) {
    const { rows: fallbackRows } = await pool.query(
      `SELECT birth_decade::int,
              array_agg(name ORDER BY total DESC) AS names
       FROM (
         SELECT EXTRACT(decade FROM CURRENT_DATE)::int * 10 - (s.n * 10) AS birth_decade,
                n.name,
                nr.total_claims AS total
         FROM generate_series(0,5) AS s(n)
         CROSS JOIN LATERAL (
           SELECT n.name, nr.total_claims
           FROM name_ranking nr
           JOIN names n ON n.id = nr.name_id
           ORDER BY nr.rank
           LIMIT 5
         ) sub(name, total)
         JOIN names n2 ON n.name = n2.name
         JOIN name_ranking nr ON nr.name_id = n2.id
       ) sq
       GROUP BY birth_decade
       ORDER BY birth_decade`
    );

    if (!fallbackRows.length) {
      const { rows: topNames } = await pool.query(
        `SELECT n.name FROM name_ranking nr JOIN names n ON n.id = nr.name_id ORDER BY nr.rank LIMIT 5`
      );
      const names = topNames.map((r: any) => r.name);
      const baseDecade = Math.floor(new Date().getFullYear() / 10) * 10;
      res.json([0,1,2,3,4,5].map(i => ({ decade: baseDecade - (5-i)*10, names })));
      return;
    }

    res.json(fallbackRows.map((r: any) => ({ decade: Number(r.birth_decade), names: r.names })));
    return;
  }

  const decadeMap = new Map<number, string[]>();
  for (const r of rows) {
    const d = Number(r.birth_decade);
    if (!decadeMap.has(d)) decadeMap.set(d, []);
    decadeMap.get(d)!.push(r.name);
  }

  res.json(
    Array.from(decadeMap.entries()).map(([decade, names]) => ({ decade, names }))
  );
});

// GET /names/:name/history — from name_popularity view
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

// GET /names/:name/countries — from name_regions view
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
    `SELECT birth_country, SUM(total)::int AS total FROM name_regions
     WHERE LOWER(name) = LOWER($1) AND birth_country IS NOT NULL
     GROUP BY birth_country ORDER BY SUM(total) DESC LIMIT 10`,
    [nameParam]
  );
  res.json(rows.map((c: any) => ({
    country: c.birth_country ?? "Unknown",
    countryCode: "",
    count: Number(c.total),
    percentage: grandTotal > 0 ? Math.round((Number(c.total) / grandTotal) * 100) : 0,
  })));
});

// GET /names/:name — name detail with ranking + regions
router.get("/names/:name", async (req, res): Promise<void> => {
  const params = GetNameDetailParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;

  const [nameRow] = await db
    .select()
    .from(namesTable)
    .where(ilike(namesTable.name, nameParam))
    .limit(1);

  if (!nameRow) { res.status(404).json({ error: "Name not found" }); return; }

  const [{ rows: rankRows }, { rows: regionRows }, { rows: sparkRows }] = await Promise.all([
    pool.query(
      `SELECT total_claims, rank FROM name_ranking WHERE name_id = $1`,
      [nameRow.id]
    ),
    pool.query(
      `SELECT birth_country, SUM(total)::int AS total
       FROM name_regions WHERE name_id = $1 AND birth_country IS NOT NULL
       GROUP BY birth_country ORDER BY SUM(total) DESC LIMIT 5`,
      [nameRow.id]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM name_claims
       WHERE name_id = $1 AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '10 months'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [nameRow.id]
    ),
  ]);

  const totalClaims = Number(rankRows[0]?.total_claims ?? 0);

  res.json({
    name: nameRow.name,
    count: totalClaims,
    countries: regionRows.length,
    origin: nameRow.languageOrigin ?? nameRow.culturalOrigin ?? "Unknown",
    meaning: nameRow.meaning ?? "Unknown",
    gender: nameRow.genderAssociation ?? "neutral",
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
