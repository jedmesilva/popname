import { Router, type IRouter } from "express";
import { ilike, asc, sql } from "drizzle-orm";
import { db, namesTable, nameClaimsTable, peopleTable, pool } from "@workspace/db";
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
  const results = await db
    .select()
    .from(namesTable)
    .where(ilike(namesTable.name, `%${q}%`))
    .orderBy(asc(namesTable.name))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: 0,
    countries: 0,
    origin: n.languageOrigin ?? n.culturalOrigin ?? null,
    meaning: n.meaning ?? null,
    gender: n.genderAssociation ?? null,
  })));
});

// GET /names/popular — from name_ranking view
router.get("/names/popular", async (req, res): Promise<void> => {
  const parsed = GetPopularNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 20 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT nr.name_id, nr.name, nr.total_claims,
            n.language_origin, n.cultural_origin, n.meaning, n.gender_association
     FROM name_ranking nr
     JOIN names n ON n.id = nr.name_id
     ORDER BY nr.rank LIMIT $1`,
    [limit]
  );
  res.json(rows.map((r: any) => ({
    name: r.name,
    count: Number(r.total_claims),
    countries: 0,
    origin: r.language_origin ?? r.cultural_origin ?? null,
    meaning: r.meaning ?? null,
    gender: r.gender_association ?? null,
  })));
});

// GET /names/trending — from name_growth view
router.get("/names/trending", async (req, res): Promise<void> => {
  const parsed = GetTrendingNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 10 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT ng.name_id, ng.name, ng.current_count, ng.absolute_growth
     FROM name_growth ng
     ORDER BY ng.absolute_growth DESC LIMIT $1`,
    [limit]
  );
  // Sparkline: monthly counts for each trending name (last 10 months)
  const result = await Promise.all(rows.map(async (r: any) => {
    const { rows: spark } = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM name_claims
       WHERE name_id = $1 AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '10 months'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [r.name_id]
    );
    return {
      name: r.name,
      count: Number(r.current_count),
      countries: 0,
      changePercent: Number(r.absolute_growth),
      trend: "rising" as const,
      sparkline: spark.map((s: any) => s.cnt),
    };
  }));
  res.json(result);
});

// GET /names/declining — from name_decline view
router.get("/names/declining", async (req, res): Promise<void> => {
  const parsed = GetDecliningNamesQueryParams.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  const { limit = 10 } = parsed.data;
  const { rows } = await pool.query(
    `SELECT nd.name_id, nd.name, nd.current_count, nd.absolute_change
     FROM name_decline nd
     ORDER BY nd.absolute_change ASC LIMIT $1`,
    [limit]
  );
  const result = await Promise.all(rows.map(async (r: any) => {
    const { rows: spark } = await pool.query(
      `SELECT COUNT(*)::int AS cnt
       FROM name_claims
       WHERE name_id = $1 AND status = 'verified'
         AND verified_at >= NOW() - INTERVAL '10 months'
       GROUP BY DATE_TRUNC('month', verified_at)
       ORDER BY DATE_TRUNC('month', verified_at)`,
      [r.name_id]
    );
    return {
      name: r.name,
      count: Number(r.current_count),
      countries: 0,
      changePercent: Number(r.absolute_change),
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
    case "rare":      orderExpr = "total_claims ASC"; break;
    case "longest":   orderExpr = "LENGTH(nr.name) DESC"; break;
    case "shortest":  orderExpr = "LENGTH(nr.name) ASC"; break;
    case "trending":  orderExpr = "total_claims DESC"; break;
    case "declining": orderExpr = "total_claims ASC"; break;
    default:          orderExpr = "rank ASC";
  }

  const { rows: totalRows } = await pool.query(`SELECT COUNT(*)::int AS cnt FROM name_ranking`);
  const total = totalRows[0]?.cnt ?? 0;

  const { rows } = await pool.query(
    `SELECT nr.name_id, nr.name, nr.total_claims, nr.rank,
            n.language_origin, n.cultural_origin, n.meaning, n.gender_association
     FROM name_ranking nr
     JOIN names n ON n.id = nr.name_id
     ORDER BY ${orderExpr}
     LIMIT $1 OFFSET $2`,
    [limit, offset]
  );

  res.json({
    items: rows.map((r: any) => ({
      name: r.name,
      count: Number(r.total_claims),
      countries: 0,
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
            n.language_origin, n.cultural_origin, n.meaning, n.gender_association
     FROM name_rarity nr
     JOIN names n ON n.id = nr.name_id
     ORDER BY nr.rarity_rank LIMIT $1`,
    [limit]
  );
  res.json(rows.map((r: any) => ({
    name: r.name,
    count: Number(r.total_claims),
    countries: 0,
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

  // Group by decade: { decade: number, names: string[] }
  const decadeMap = new Map<number, string[]>();
  for (const r of rows) {
    const d = Number(r.birth_decade);
    if (!decadeMap.has(d)) decadeMap.set(d, []);
    decadeMap.get(d)!.push(r.name);
  }

  // If no real data yet, return fallback
  if (!decadeMap.size) {
    res.json([
      { decade: 1960, names: ["Maria", "José", "João", "Ana", "Pedro"] },
      { decade: 1970, names: ["Carlos", "Fernanda", "Ricardo", "Patricia", "João"] },
      { decade: 1980, names: ["Ana", "Lucas", "Maria", "Gabriel", "Camila"] },
      { decade: 1990, names: ["Isabela", "Mateus", "Sofia", "Rafael", "Julia"] },
      { decade: 2000, names: ["Gabriel", "Sofia", "Lucas", "Ana", "Arthur"] },
      { decade: 2010, names: ["Arthur", "Enzo", "Davi", "Valentina", "Lara"] },
    ]);
    return;
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
  const { rows } = await pool.query(
    `SELECT birth_country, birth_state, birth_city, total FROM name_regions
     WHERE LOWER(name) = LOWER($1) ORDER BY total DESC LIMIT 10`,
    [nameParam]
  );
  res.json(rows.map((c: any) => ({
    country: c.birth_country ?? "Unknown",
    countryCode: "",
    count: Number(c.total),
    percentage: 0,
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

  const { rows: rankRows } = await pool.query(
    `SELECT total_claims, rank FROM name_ranking WHERE name_id = $1`,
    [nameRow.id]
  );
  const { rows: regionRows } = await pool.query(
    `SELECT birth_country, SUM(total)::int AS total
     FROM name_regions WHERE name_id = $1 AND birth_country IS NOT NULL
     GROUP BY birth_country ORDER BY SUM(total) DESC LIMIT 5`,
    [nameRow.id]
  );
  const { rows: sparkRows } = await pool.query(
    `SELECT COUNT(*)::int AS cnt
     FROM name_claims
     WHERE name_id = $1 AND status = 'verified'
       AND verified_at >= NOW() - INTERVAL '10 months'
     GROUP BY DATE_TRUNC('month', verified_at)
     ORDER BY DATE_TRUNC('month', verified_at)`,
    [nameRow.id]
  );

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
