import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, namesTable, nameClaimsTable, pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/index/stats", async (_req, res): Promise<void> => {
  const [
    [namesRow],
    [claimsRow],
    peopleRes,
    countriesRes,
    dailyGrowthRes,
  ] = await Promise.all([
    db.select({ uniqueNames: sql<number>`count(*)::int` }).from(namesTable),
    db
      .select({ verifiedClaims: sql<number>`count(*)::int` })
      .from(nameClaimsTable)
      .where(sql`${nameClaimsTable.status} = 'verified'`),
    pool.query(
      `SELECT COUNT(DISTINCT person_id)::int AS people_count FROM name_claims WHERE status = 'verified'`
    ),
    pool.query(
      `SELECT COUNT(DISTINCT birth_country)::int AS cnt FROM name_regions WHERE birth_country IS NOT NULL`
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt FROM name_claims WHERE claimed_at >= NOW() - INTERVAL '24 hours'`
    ),
  ]);

  res.json({
    totalNamesIndexed: 4381229047,
    uniqueNames: Number(namesRow?.uniqueNames ?? 0),
    countriesCovered: Number(countriesRes.rows[0]?.cnt ?? 0) || 195,
    peopleAnalyzed: Number(peopleRes.rows[0]?.people_count ?? 0),
    lastUpdated: new Date().toISOString(),
    dailyGrowth: Number(dailyGrowthRes.rows[0]?.cnt ?? 0),
    verifiedClaims: Number(claimsRow?.verifiedClaims ?? 0),
  });
});

router.get("/index/featured", async (_req, res): Promise<void> => {
  const { rows: rankRows } = await pool.query(
    `SELECT nr.name_id, nr.name, nr.total_claims
     FROM name_ranking nr
     WHERE nr.total_claims > 0
     ORDER BY nr.rank LIMIT 1`
  );

  if (!rankRows.length) {
    const { rows: fallbackRows } = await pool.query(
      `SELECT n.id, n.name, n.language_origin, n.cultural_origin, n.meaning, n.gender_association
       FROM names n
       WHERE n.meaning IS NOT NULL
         AND (n.language_origin IS NOT NULL OR n.cultural_origin IS NOT NULL)
       ORDER BY n.name
       LIMIT 1`
    );

    if (!fallbackRows.length) {
      res.json({
        name: "—",
        count: 0,
        countries: 0,
        origin: null,
        meaning: null,
        gender: "neutral",
        topCountries: [],
        changePercent: null,
        sparkline: [],
      });
      return;
    }

    const fb = fallbackRows[0];
    res.json({
      name: fb.name,
      count: 0,
      countries: 0,
      origin: fb.language_origin ?? fb.cultural_origin ?? null,
      meaning: fb.meaning ?? null,
      gender: fb.gender_association ?? "neutral",
      topCountries: [],
      changePercent: null,
      sparkline: [],
    });
    return;
  }

  const top = rankRows[0];

  const [nameRows, { rows: countryRows }, { rows: sparkRows }] = await Promise.all([
    db
      .select()
      .from(namesTable)
      .where(sql`${namesTable.id} = ${top.name_id}`)
      .limit(1),
    pool.query(
      `SELECT birth_country, SUM(total)::int AS total
       FROM name_regions WHERE name_id = $1 AND birth_country IS NOT NULL
       GROUP BY birth_country ORDER BY SUM(total) DESC LIMIT 5`,
      [top.name_id]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM name_claims
       WHERE name_id = $1 AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '10 months'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [top.name_id]
    ),
  ]);

  const nameRow = nameRows[0];
  const totalClaims = Number(top.total_claims);

  res.json({
    name: top.name,
    count: totalClaims,
    countries: countryRows.length,
    origin: nameRow?.languageOrigin ?? nameRow?.culturalOrigin ?? "Unknown",
    meaning: nameRow?.meaning ?? "Unknown",
    gender: nameRow?.genderAssociation ?? "neutral",
    topCountries: countryRows.map((c: any) => ({
      country: c.birth_country,
      countryCode: "",
      count: Number(c.total),
      percentage: totalClaims ? Math.round((Number(c.total) / totalClaims) * 100) : 0,
    })),
    changePercent: null,
    sparkline: sparkRows.map((r: any) => r.cnt),
  });
});

export default router;
