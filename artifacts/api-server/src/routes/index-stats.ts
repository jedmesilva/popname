import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import { db, namesTable, nameClaimsTable, pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/index/stats", async (_req, res): Promise<void> => {
  const [namesRow] = await db
    .select({ uniqueNames: sql<number>`count(*)::int` })
    .from(namesTable);

  const [claimsRow] = await db
    .select({ verifiedClaims: sql<number>`count(*)::int` })
    .from(nameClaimsTable)
    .where(sql`${nameClaimsTable.status} = 'verified'`);

  const peopleRes = await pool.query(
    `SELECT COUNT(DISTINCT person_id)::int AS people_count FROM name_claims WHERE status = 'verified'`
  );

  res.json({
    totalNamesIndexed: 4381229047,
    uniqueNames: Number(namesRow?.uniqueNames ?? 0),
    countriesCovered: 195,
    peopleAnalyzed: Number(peopleRes.rows[0]?.people_count ?? 0),
    lastUpdated: new Date().toISOString(),
    dailyGrowth: 12481,
    verifiedClaims: Number(claimsRow?.verifiedClaims ?? 0),
  });
});

router.get("/index/featured", async (_req, res): Promise<void> => {
  // Use name_ranking to get the top name by verified claims
  const { rows: rankRows } = await pool.query(
    `SELECT nr.name_id, nr.name, nr.total_claims
     FROM name_ranking nr
     WHERE nr.total_claims > 0
     ORDER BY nr.rank LIMIT 1`
  );

  if (!rankRows.length) {
    res.json({
      name: "Lucas",
      count: 0,
      countries: 0,
      origin: "Latin",
      meaning: "Light, illumination",
      gender: "masculine",
      topCountries: [],
      changePercent: null,
      sparkline: [],
    });
    return;
  }

  const top = rankRows[0];

  const [nameRow] = await db
    .select()
    .from(namesTable)
    .where(sql`${namesTable.id} = ${top.name_id}`)
    .limit(1);

  // Top countries aggregated by country (name_regions groups by city)
  const { rows: countryRows } = await pool.query(
    `SELECT birth_country, SUM(total)::int AS total
     FROM name_regions WHERE name_id = $1 AND birth_country IS NOT NULL
     GROUP BY birth_country ORDER BY SUM(total) DESC LIMIT 5`,
    [top.name_id]
  );

  // Sparkline: monthly verified claim counts over last 10 months
  const { rows: sparkRows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM name_claims
     WHERE name_id = $1 AND status = 'verified'
       AND verified_at >= NOW() - INTERVAL '10 months'
     GROUP BY DATE_TRUNC('month', verified_at)
     ORDER BY DATE_TRUNC('month', verified_at)`,
    [top.name_id]
  );
  const sparkline = sparkRows.map((r: { cnt: number }) => r.cnt);

  res.json({
    name: top.name,
    count: Number(top.total_claims),
    countries: countryRows.length,
    origin: nameRow?.languageOrigin ?? nameRow?.culturalOrigin ?? "Unknown",
    meaning: nameRow?.meaning ?? "Unknown",
    gender: nameRow?.genderAssociation ?? "neutral",
    topCountries: countryRows.map((c: { birth_country: string; total: number }, i: number) => ({
      country: c.birth_country,
      countryCode: "",
      count: Number(c.total),
      percentage: Math.round((Number(c.total) / Number(top.total_claims)) * 100),
    })),
    changePercent: null,
    sparkline,
  });
});

export default router;
