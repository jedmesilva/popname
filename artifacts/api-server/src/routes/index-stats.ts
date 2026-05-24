import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, namesTable, pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/index/stats", async (_req, res): Promise<void> => {
  const [
    totalRow,
    uniqueRow,
    peopleRes,
    countriesRes,
    dailyGrowthRes,
    verifiedRes,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS cnt FROM names WHERE status = 'verified'`),
    pool.query(`SELECT COUNT(DISTINCT name_text)::int AS cnt FROM names WHERE status = 'verified'`),
    pool.query(`SELECT COUNT(DISTINCT person_id)::int AS cnt FROM names WHERE status = 'verified'`),
    pool.query(`SELECT COUNT(DISTINCT birth_country)::int AS cnt FROM names WHERE status = 'verified' AND birth_country IS NOT NULL`),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM names WHERE claimed_at >= NOW() - INTERVAL '24 hours'`),
    pool.query(`SELECT COUNT(*)::int AS cnt FROM names WHERE status = 'verified'`),
  ]);

  res.json({
    totalNamesIndexed: Number(totalRow.rows[0]?.cnt ?? 0),
    uniqueNames: Number(uniqueRow.rows[0]?.cnt ?? 0),
    countriesCovered: Number(countriesRes.rows[0]?.cnt ?? 0),
    peopleAnalyzed: Number(peopleRes.rows[0]?.cnt ?? 0),
    lastUpdated: new Date().toISOString(),
    dailyGrowth: Number(dailyGrowthRes.rows[0]?.cnt ?? 0),
    verifiedClaims: Number(verifiedRes.rows[0]?.cnt ?? 0),
  });
});

router.get("/index/featured", async (_req, res): Promise<void> => {
  const { rows: rankRows } = await pool.query(
    `SELECT name, total_claims FROM name_ranking ORDER BY rank LIMIT 1`
  );

  if (!rankRows.length) {
    res.json({ name: "—", count: 0, countries: 0, origin: null, meaning: null, gender: "neutral", topCountries: [], changePercent: null, sparkline: [] });
    return;
  }

  const top = rankRows[0];

  const [{ rows: meaningRows }, { rows: regionRows }, { rows: historyRows }] = await Promise.all([
    pool.query(
      `SELECT meaning, language_origin, cultural_origin, gender_association
       FROM name_meanings WHERE LOWER(name_text) = LOWER($1)`,
      [top.name]
    ),
    pool.query(
      `SELECT birth_country, total FROM name_regions
       WHERE LOWER(name) = LOWER($1) AND birth_country IS NOT NULL
       ORDER BY total DESC LIMIT 5`,
      [top.name]
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
      [top.name]
    ),
  ]);

  const totalClaims = Number(top.total_claims);
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
    name: top.name,
    count: totalClaims,
    countries: regionRows.length,
    origin: meaning?.language_origin ?? meaning?.cultural_origin ?? "Unknown",
    meaning: meaning?.meaning ?? "Unknown",
    gender: meaning?.gender_association ?? "neutral",
    topCountries: regionRows.map((c: any) => ({
      country: c.birth_country,
      countryCode: c.birth_country,
      count: Number(c.total),
      percentage: totalClaims ? Math.round((Number(c.total) / totalClaims) * 100) : 0,
    })),
    changePercent,
    sparkline: spark,
  });
});

export default router;
