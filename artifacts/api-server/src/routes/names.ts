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

function buildSparkline(prev: number, curr: number, points = 6): number[] {
  return Array.from({ length: points }, (_, i) => {
    const t = i / (points - 1);
    return prev + (curr - prev) * t;
  });
}

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
       WHERE status = 'verified'
         AND registration_date IS NOT NULL
         AND registration_date >= (NOW() - INTERVAL '${interval}')::date
       GROUP BY name_text
     ), previous_period AS (
       SELECT name_text, COUNT(*)::bigint AS previous_count
       FROM names
       WHERE status = 'verified'
         AND registration_date IS NOT NULL
         AND registration_date >= (NOW() - INTERVAL '${interval}' * 2)::date
         AND registration_date <  (NOW() - INTERVAL '${interval}')::date
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

  res.json(rows.map((r: any) => {
    const prev = Number(r.previous_count);
    const curr = Number(r.current_count);
    return {
      name: r.name,
      count: curr,
      countries: Number(r.country_count),
      changePercent: r.growth_percent !== null ? Number(r.growth_percent) : null,
      trend: "rising" as const,
      sparkline: buildSparkline(prev, curr),
    };
  }));
});

// GET /names/declining
router.get("/names/declining", async (req, res): Promise<void> => {
  const parsed = GetDecliningNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { period = "1y", limit = 10 } = parsed.data;
  const interval = PERIOD_TO_INTERVAL[period] ?? "365 days";

  const { rows } = await pool.query(
    `WITH current_period AS (
       SELECT name_text, COUNT(*)::bigint AS current_count
       FROM names
       WHERE status = 'verified'
         AND registration_date IS NOT NULL
         AND registration_date >= (NOW() - INTERVAL '${interval}')::date
       GROUP BY name_text
     ), previous_period AS (
       SELECT name_text, COUNT(*)::bigint AS previous_count
       FROM names
       WHERE status = 'verified'
         AND registration_date IS NOT NULL
         AND registration_date >= (NOW() - INTERVAL '${interval}' * 2)::date
         AND registration_date <  (NOW() - INTERVAL '${interval}')::date
       GROUP BY name_text
     )
     SELECT
       pp.name_text AS name,
       COALESCE(cp.current_count, 0) AS current_count,
       COALESCE(pp.previous_count, 0) AS previous_count,
       CASE WHEN COALESCE(cp.current_count, 0) = 0 THEN -100
            ELSE ROUND(
              (COALESCE(cp.current_count, 0) - COALESCE(pp.previous_count, 0))::numeric
              / COALESCE(pp.previous_count, 1)::numeric * 100, 2
            )
       END AS decline_percent,
       COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count
     FROM previous_period pp
     LEFT JOIN current_period cp ON cp.name_text = pp.name_text
     LEFT JOIN names n ON LOWER(n.name_text) = LOWER(pp.name_text) AND n.status = 'verified'
     WHERE COALESCE(cp.current_count, 0) < COALESCE(pp.previous_count, 0)
     GROUP BY pp.name_text, cp.current_count, pp.previous_count
     ORDER BY decline_percent ASC
     LIMIT $1`,
    [limit]
  );

  res.json(rows.map((r: any) => {
    const prev = Number(r.previous_count);
    const curr = Number(r.current_count);
    return {
      name: r.name,
      count: curr,
      countries: Number(r.country_count),
      changePercent: r.decline_percent !== null ? Number(r.decline_percent) : null,
      trend: "falling" as const,
      sparkline: buildSparkline(prev, curr),
    };
  }));
});

// GET /names/browse
router.get("/names/browse", async (req, res): Promise<void> => {
  const parsed = BrowseNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { sort = "popular", page = 1, limit = 20, country, yearFrom, yearTo } = parsed.data;
  const offset = (page - 1) * limit;
  const hasFilters = !!(country || yearFrom || yearTo);

  let rows: any[];
  let total: number;

  if (hasFilters) {
    // Dynamic filtered query directly from names table
    const conds: string[] = [];
    const vals: any[] = [];
    let i = 1;
    if (country)  { conds.push(`LOWER(n.birth_country) = LOWER($${i++})`);                      vals.push(country); }
    if (yearFrom) { conds.push(`EXTRACT(YEAR FROM n.registration_date) >= $${i++}`);             vals.push(yearFrom); }
    if (yearTo)   { conds.push(`EXTRACT(YEAR FROM n.registration_date) <= $${i++}`);             vals.push(yearTo); }
    if (yearFrom || yearTo) conds.push(`n.registration_date IS NOT NULL`);

    const where = conds.length ? `WHERE ${conds.join(" AND ")}` : "";

    let filteredOrder: string;
    switch (sort) {
      case "rare":      filteredOrder = "total_claims ASC";       break;
      case "longest":   filteredOrder = "LENGTH(name) DESC";      break;
      case "shortest":  filteredOrder = "LENGTH(name) ASC";       break;
      case "declining": filteredOrder = "total_claims ASC";       break;
      default:          filteredOrder = "total_claims DESC";
    }

    const [{ rows: countRows }, { rows: nameRows }] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT n.name_text)::int AS cnt FROM names n ${where}`,
        vals
      ),
      pool.query(
        `SELECT
           n.name_text AS name,
           COUNT(*)::int AS total_claims,
           COUNT(DISTINCT n.birth_country) FILTER (WHERE n.birth_country IS NOT NULL)::int AS country_count,
           nm.meaning, nm.language_origin, nm.cultural_origin, nm.gender_association
         FROM names n
         LEFT JOIN name_meanings nm ON nm.name_text = n.name_text
         ${where}
         GROUP BY n.name_text, nm.meaning, nm.language_origin, nm.cultural_origin, nm.gender_association
         ORDER BY ${filteredOrder}
         LIMIT $${i++} OFFSET $${i++}`,
        [...vals, limit, offset]
      ),
    ]);

    total = countRows[0]?.cnt ?? 0;
    rows  = nameRows;
  } else {
    // Unfiltered: use pre-ranked name_ranking table
    let orderExpr: string;
    switch (sort) {
      case "rare":      orderExpr = "nr.total_claims ASC";  break;
      case "longest":   orderExpr = "LENGTH(nr.name) DESC"; break;
      case "shortest":  orderExpr = "LENGTH(nr.name) ASC";  break;
      case "trending":  orderExpr = "nr.total_claims DESC"; break;
      case "declining": orderExpr = "nr.total_claims ASC";  break;
      default:          orderExpr = "nr.rank ASC";
    }

    const [{ rows: totalRows }, { rows: nameRows }] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int AS cnt FROM name_ranking`),
      pool.query(
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
      ),
    ]);

    total = totalRows[0]?.cnt ?? 0;
    rows  = nameRows;
  }

  const nameList = rows.map((r: any) => r.name as string);

  // Determine the sparkline range from the active period filter
  const currentYear    = new Date().getFullYear();
  const sparkYearFrom  = yearFrom ?? currentYear - 9;
  const sparkYearTo    = yearTo   ?? currentYear;
  const rangeYears     = Math.max(sparkYearTo - sparkYearFrom + 1, 1);

  // Bucket into ~10 points regardless of how wide the range is
  const bucketSize = Math.max(1, Math.ceil(rangeYears / 10));
  const numBuckets = Math.ceil(rangeYears / bucketSize);

  const { rows: sparkRows } = await pool.query(
    `SELECT
       LOWER(name_text) AS name_lower,
       FLOOR((EXTRACT(YEAR FROM registration_date) - $2) / $3)::int AS bucket,
       COUNT(*)::int AS cnt
     FROM names
     WHERE LOWER(name_text) = ANY($1::text[])
       AND registration_date IS NOT NULL
       AND EXTRACT(YEAR FROM registration_date) BETWEEN $2 AND $4
     GROUP BY name_lower, bucket
     ORDER BY name_lower, bucket`,
    [nameList.map((n: string) => n.toLowerCase()), sparkYearFrom, bucketSize, sparkYearTo]
  );

  // Build fixed-length sparklines (numBuckets points, zeros for empty buckets)
  const sparkMap = new Map<string, number[]>();
  for (const name of nameList) {
    sparkMap.set(name.toLowerCase(), Array(numBuckets).fill(0));
  }
  for (const r of sparkRows) {
    const key    = r.name_lower as string;
    const bucket = Number(r.bucket);
    if (bucket >= 0 && bucket < numBuckets) {
      const arr = sparkMap.get(key);
      if (arr) arr[bucket] = Number(r.cnt);
    }
  }

  // Derive changePercent from the sparkline (first half vs second half)
  // so the % and the chart always agree
  const trendMap = new Map<string, number | null>();
  const mid = Math.floor(numBuckets / 2);
  for (const [key, spark] of sparkMap) {
    const first = spark.slice(0, mid).reduce((a, b) => a + b, 0);
    const last  = spark.slice(mid).reduce((a, b) => a + b, 0);
    if (first === 0 && last === 0) { trendMap.set(key, null); continue; }
    if (first === 0) { trendMap.set(key, 100); continue; }
    trendMap.set(key, Math.round(((last - first) / first) * 100));
  }

  res.json({
    items: rows.map((r: any) => {
      const key = (r.name as string).toLowerCase();
      return {
        name: r.name,
        count: Number(r.total_claims),
        countries: Number(r.country_count),
        origin: r.language_origin ?? r.cultural_origin ?? null,
        meaning: r.meaning ?? null,
        gender: r.gender_association ?? null,
        changePercent: trendMap.get(key) ?? null,
        sparkline: sparkMap.get(key) ?? [],
      };
    }),
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
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const offset = Math.max(Number(req.query.offset) || 0, 0);
  const [{ rows: totalRow }, { rows: countRow }, { rows }] = await Promise.all([
    pool.query(
      `SELECT SUM(total)::int AS grand_total FROM name_regions WHERE LOWER(name) = LOWER($1)`,
      [nameParam]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total_countries FROM name_regions WHERE LOWER(name) = LOWER($1) AND birth_country IS NOT NULL`,
      [nameParam]
    ),
    pool.query(
      `SELECT birth_country, total FROM name_regions
       WHERE LOWER(name) = LOWER($1) AND birth_country IS NOT NULL
       ORDER BY total DESC LIMIT $2 OFFSET $3`,
      [nameParam, limit, offset]
    ),
  ]);
  const grandTotal = Number(totalRow[0]?.grand_total ?? 0);
  const totalCountries = Number(countRow[0]?.total_countries ?? 0);
  res.json({
    total: totalCountries,
    limit,
    offset,
    items: rows.map((c: any) => ({
      country: c.birth_country ?? "Unknown",
      countryCode: c.birth_country ?? "",
      count: Number(c.total),
      percentage: grandTotal > 0 ? Math.round((Number(c.total) / grandTotal) * 100) : 0,
    })),
  });
});

// GET /names/:name
router.get("/names/:name", async (req, res): Promise<void> => {
  const params = GetNameDetailParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;

  const [{ rows: rankRows }, { rows: meaningRows }, { rows: regionRows }, { rows: sparkRows }, { rows: trendRows }] = await Promise.all([
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
      `SELECT
         EXTRACT(YEAR FROM registration_date)::int AS yr,
         COUNT(*)::int AS cnt
       FROM names
       WHERE LOWER(name_text) = LOWER($1)
         AND registration_date IS NOT NULL
         AND EXTRACT(YEAR FROM registration_date) >= EXTRACT(YEAR FROM NOW()) - 9
       GROUP BY yr
       ORDER BY yr`,
      [nameParam]
    ),
    pool.query(
      `SELECT
         COUNT(*) FILTER (
           WHERE registration_date IS NOT NULL
             AND EXTRACT(YEAR FROM registration_date) >= EXTRACT(YEAR FROM NOW()) - 9
         ) AS recent,
         COUNT(*) FILTER (
           WHERE registration_date IS NOT NULL
             AND EXTRACT(YEAR FROM registration_date) >= EXTRACT(YEAR FROM NOW()) - 19
             AND EXTRACT(YEAR FROM registration_date) < EXTRACT(YEAR FROM NOW()) - 9
         ) AS older
       FROM names
       WHERE LOWER(name_text) = LOWER($1)`,
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
      countryCode: c.birth_country ?? "",
      count: Number(c.total),
      percentage: totalClaims ? Math.round((Number(c.total) / totalClaims) * 100) : 0,
    })),
    changePercent: (() => {
      const recent = Number(trendRows[0]?.recent ?? 0);
      const older = Number(trendRows[0]?.older ?? 0);
      if (older === 0 && recent === 0) return null;
      if (older === 0) return 100;
      return Math.round(((recent - older) / older) * 100);
    })(),
    sparkline: sparkRows.map((s: any) => s.cnt),
  });
});

export default router;
