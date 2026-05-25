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

// Fetches participacao_pct per year per name directly from name_history.
// Global % = SUM(total_nome for name+year) / SUM(all registrations for year).
// Supports optional country / yearFrom / yearTo filters.
async function fetchHistorySparklines(
  nameList: string[],
  opts: { country?: string | null; yearFrom?: number | null; yearTo?: number | null } = {}
): Promise<Map<string, number[]>> {
  if (nameList.length === 0) return new Map();

  const { country, yearFrom, yearTo } = opts;
  const params: any[] = [nameList.map(n => n.toLowerCase())];
  let idx = 2;

  const pCountry  = country    != null ? idx++ : 0; if (pCountry)  params.push(country);
  const pFrom     = yearFrom   != null ? idx++ : 0; if (pFrom)     params.push(yearFrom);
  const pTo       = yearTo     != null ? idx++ : 0; if (pTo)       params.push(yearTo);

  // Same condition applied to both CTEs (param indices are query-scoped)
  const sharedCond = [
    pCountry ? `AND LOWER(birth_country) = LOWER($${pCountry})` : "",
    pFrom    ? `AND EXTRACT(YEAR FROM periodo) >= $${pFrom}`    : "",
    pTo      ? `AND EXTRACT(YEAR FROM periodo) <= $${pTo}`      : "",
  ].join(" ");

  const { rows } = await pool.query(
    `WITH yearly_totals AS (
       SELECT
         EXTRACT(YEAR FROM periodo)::int AS yr,
         SUM(total_nome)::bigint         AS total_all
       FROM name_history
       WHERE 1=1 ${sharedCond}
       GROUP BY yr
     ),
     name_yearly AS (
       SELECT
         LOWER(name_text)                AS name_lower,
         EXTRACT(YEAR FROM periodo)::int AS yr,
         SUM(total_nome)::bigint         AS total_name
       FROM name_history
       WHERE LOWER(name_text) = ANY($1::text[])
         ${sharedCond}
       GROUP BY name_lower, yr
     )
     SELECT
       ny.name_lower,
       ny.yr,
       ROUND(ny.total_name::numeric / NULLIF(yt.total_all, 0) * 100, 6)::float AS pct
     FROM name_yearly ny
     JOIN yearly_totals yt ON yt.yr = ny.yr
     ORDER BY ny.name_lower, ny.yr`,
    params
  );

  const sparkMap = new Map<string, number[]>();
  for (const name of nameList) sparkMap.set(name.toLowerCase(), []);
  for (const r of rows) sparkMap.get(r.name_lower as string)?.push(Number(r.pct));
  return sparkMap;
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

  const nameList = rows.map((r: any) => r.name as string);
  const sparkMap = await fetchHistorySparklines(nameList);

  const items = rows.flatMap((r: any) => {
    const spark = sparkMap.get((r.name as string).toLowerCase()) ?? [];
    const first = spark[0] ?? 0;
    const last  = spark[spark.length - 1] ?? 0;
    const changePercent = spark.length < 2
      ? (spark.length === 1 && spark[0] > 0 ? 100 : null)
      : first === 0
        ? (last > 0 ? 100 : null)
        : parseFloat(((last - first) / first * 100).toFixed(2));
    if (changePercent === null || changePercent <= 0) return [];
    return [{
      name: r.name,
      count: Number(r.current_count),
      countries: Number(r.country_count),
      changePercent,
      trend: "rising" as const,
      sparkline: spark,
    }];
  });
  res.json(items);
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

  const nameList = rows.map((r: any) => r.name as string);
  const sparkMap = await fetchHistorySparklines(nameList);

  const items = rows.flatMap((r: any) => {
    const spark = sparkMap.get((r.name as string).toLowerCase()) ?? [];
    const first = spark[0] ?? 0;
    const last  = spark[spark.length - 1] ?? 0;
    const changePercent = spark.length < 2
      ? (spark.length === 1 && spark[0] > 0 ? -100 : null)
      : first === 0
        ? (last > 0 ? 100 : null)
        : parseFloat(((last - first) / first * 100).toFixed(2));
    if (changePercent === null || changePercent >= 0) return [];
    return [{
      name: r.name,
      count: Number(r.current_count),
      countries: Number(r.country_count),
      changePercent,
      trend: "falling" as const,
      sparkline: spark,
    }];
  });
  res.json(items);
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

  // Use participacao_pct from name_history directly — no rebucketing needed
  const sparkMap = await fetchHistorySparklines(nameList, { country, yearFrom, yearTo });

  // changePercent = variation of participacao_pct from first to last year
  const trendMap = new Map<string, number | null>();
  for (const [key, spark] of sparkMap) {
    if (spark.length === 0) { trendMap.set(key, null); continue; }
    const first = spark[0];
    const last  = spark[spark.length - 1];
    if (first === 0) { trendMap.set(key, last > 0 ? 100 : null); continue; }
    trendMap.set(key, parseFloat(((last - first) / first * 100).toFixed(2)));
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
  const base = Math.floor(new Date().getFullYear() / 10) * 10;
  const lastSixDecades: number[] = [0,1,2,3,4,5].map(i => base - (5-i)*10);

  const [{ rows }, { rows: topRows }] = await Promise.all([
    pool.query(`SELECT name, birth_decade FROM name_by_generation ORDER BY birth_decade, total DESC`),
    pool.query(`SELECT name FROM name_ranking ORDER BY rank LIMIT 5`),
  ]);

  const fallbackNames = topRows.map((r: any) => r.name as string);

  const decadeMap = new Map<number, string[]>();
  for (const r of rows) {
    const d = Number(r.birth_decade);
    if (!decadeMap.has(d)) decadeMap.set(d, []);
    decadeMap.get(d)!.push(r.name as string);
  }

  res.json(lastSixDecades.map(decade => ({
    decade,
    names: decadeMap.get(decade) ?? fallbackNames,
  })));
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

// GET /names/:name/registrations?granularity=daily|weekly|monthly|annual|decade|century
router.get("/names/:name/registrations", async (req, res): Promise<void> => {
  const nameParam = (req.params as any).name as string;
  if (!nameParam) { res.status(400).json({ error: "Name required" }); return; }

  const granularity = (req.query.granularity as string) || "monthly";
  const valid = ["daily", "weekly", "monthly", "annual", "decade", "century"];
  if (!valid.includes(granularity)) { res.status(400).json({ error: "Invalid granularity" }); return; }

  // date_col = COALESCE(registration_date, claimed_at::date) to capture all records
  const dateCol = `COALESCE(registration_date, claimed_at::date)`;

  // bucket expr (applied to CTE col `d`), label expr (applied to already-bucketed col `grp`)
  let bucketExpr: string;
  let labelFromGrp: string;

  switch (granularity) {
    case "daily":
      bucketExpr   = `DATE_TRUNC('day',   d)::date`;
      labelFromGrp = `TO_CHAR(grp, 'DD/MM/YYYY')`;
      break;
    case "weekly":
      bucketExpr   = `DATE_TRUNC('week',  d)::date`;
      labelFromGrp = `TO_CHAR(grp, 'DD/MM/YYYY')`;
      break;
    case "monthly":
      bucketExpr   = `DATE_TRUNC('month', d)::date`;
      labelFromGrp = `TO_CHAR(grp, 'Mon/YYYY')`;
      break;
    case "annual":
      bucketExpr   = `DATE_TRUNC('year',  d)::date`;
      labelFromGrp = `TO_CHAR(grp, 'YYYY')`;
      break;
    case "decade":
      bucketExpr   = `(EXTRACT(YEAR FROM d)::int / 10 * 10)`;
      labelFromGrp = `CONCAT(grp::text, 's')`;
      break;
    default: // century
      bucketExpr   = `(EXTRACT(YEAR FROM d)::int / 100 * 100)`;
      labelFromGrp = `CONCAT('Séc. ', LPAD(((grp::int / 100) + 1)::text, 2, '0'))`;
      break;
  }

  const { rows } = await pool.query(
    `WITH src AS (
       SELECT ${dateCol} AS d
       FROM names
       WHERE LOWER(name_text) = LOWER($1)
         AND ${dateCol} IS NOT NULL
     ),
     bucketed AS (
       SELECT ${bucketExpr} AS grp FROM src
     )
     SELECT
       grp            AS period,
       ${labelFromGrp} AS label,
       COUNT(*)::int  AS count
     FROM bucketed
     GROUP BY grp
     ORDER BY grp`,
    [nameParam]
  );

  res.json(rows.map((r: any) => ({
    period: String(r.period),
    label:  String(r.label),
    count:  Number(r.count),
  })));
});

router.get("/names/:name/history", async (req, res): Promise<void> => {
  const params = GetNameHistoryParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;
  const { rows } = await pool.query(
    `WITH yearly_totals AS (
       SELECT EXTRACT(YEAR FROM periodo)::int AS yr,
              SUM(total_nome)::bigint         AS total_all
       FROM name_history
       GROUP BY yr
     ),
     name_yearly AS (
       SELECT EXTRACT(YEAR FROM periodo)::int AS yr,
              SUM(total_nome)::bigint         AS total_name
       FROM name_history
       WHERE LOWER(name_text) = LOWER($1)
       GROUP BY yr
     )
     SELECT ny.yr AS year,
       ROUND(ny.total_name::numeric / NULLIF(yt.total_all, 0) * 100, 4)::float AS pct
     FROM name_yearly ny
     JOIN yearly_totals yt ON yt.yr = ny.yr
     ORDER BY ny.yr`,
    [nameParam]
  );
  res.json(rows.map((h: any) => ({ year: Number(h.year), pct: Number(h.pct) })));
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

  const [{ rows: rankRows }, { rows: meaningRows }, { rows: regionRows }, { rows: historyRows }] = await Promise.all([
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
      `WITH yearly_totals AS (
         SELECT EXTRACT(YEAR FROM periodo)::int AS yr,
                SUM(total_nome)::bigint         AS total_all
         FROM name_history
         GROUP BY yr
       ),
       name_yearly AS (
         SELECT EXTRACT(YEAR FROM periodo)::int AS yr,
                SUM(total_nome)::bigint         AS total_name
         FROM name_history
         WHERE LOWER(name_text) = LOWER($1)
         GROUP BY yr
       )
       SELECT ny.yr,
         ROUND(ny.total_name::numeric / NULLIF(yt.total_all, 0) * 100, 6)::float AS pct
       FROM name_yearly ny
       JOIN yearly_totals yt ON yt.yr = ny.yr
       ORDER BY ny.yr`,
      [nameParam]
    ),
  ]);

  if (!rankRows.length && !meaningRows.length) {
    res.status(404).json({ error: "Name not found" });
    return;
  }

  const totalClaims = Number(rankRows[0]?.total_claims ?? 0);
  const meaning = meaningRows[0];

  const spark = historyRows.map((r: any) => Number(r.pct));
  const first = spark[0] ?? 0;
  const last  = spark[spark.length - 1] ?? 0;
  const changePercent = spark.length < 2
    ? null
    : first === 0
      ? (last > 0 ? 100 : null)
      : parseFloat(((last - first) / first * 100).toFixed(2));

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
    changePercent,
    sparkline: spark,
  });
});

export default router;
