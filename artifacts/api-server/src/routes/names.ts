import { Router, type IRouter } from "express";
import { ilike, desc, asc, sql } from "drizzle-orm";
import { db, namesTable, nameClaimsTable } from "@workspace/db";
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

function formatName(n: typeof namesTable.$inferSelect, claimCount = 0) {
  return {
    name: n.name,
    count: claimCount,
    countries: 0,
    origin: n.languageOrigin ?? n.culturalOrigin ?? null,
    meaning: n.meaning ?? null,
    gender: n.genderAssociation ?? null,
  };
}

router.get("/names/search", async (req, res): Promise<void> => {
  const parsed = SearchNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { q, limit = 10 } = parsed.data;
  const results = await db
    .select()
    .from(namesTable)
    .where(ilike(namesTable.name, `%${q}%`))
    .orderBy(asc(namesTable.name))
    .limit(limit);
  res.json(results.map((n) => formatName(n)));
});

router.get("/names/popular", async (req, res): Promise<void> => {
  const parsed = GetPopularNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 20 } = parsed.data;
  const results = await db
    .select({
      id: namesTable.id,
      name: namesTable.name,
      languageOrigin: namesTable.languageOrigin,
      culturalOrigin: namesTable.culturalOrigin,
      meaning: namesTable.meaning,
      variations: namesTable.variations,
      genderAssociation: namesTable.genderAssociation,
      createdAt: namesTable.createdAt,
      updatedAt: namesTable.updatedAt,
      claimCount: sql<number>`count(${nameClaimsTable.id})::int`,
    })
    .from(namesTable)
    .leftJoin(nameClaimsTable, sql`${nameClaimsTable.nameId} = ${namesTable.id} AND ${nameClaimsTable.status} = 'verified'`)
    .groupBy(namesTable.id)
    .orderBy(desc(sql`count(${nameClaimsTable.id})`))
    .limit(limit);
  res.json(results.map((n) => formatName(n, n.claimCount)));
});

router.get("/names/trending", async (req, res): Promise<void> => {
  const parsed = GetTrendingNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;
  // Trending: names with most claims in the last 30 days
  const results = await db
    .select({
      id: namesTable.id,
      name: namesTable.name,
      languageOrigin: namesTable.languageOrigin,
      culturalOrigin: namesTable.culturalOrigin,
      meaning: namesTable.meaning,
      variations: namesTable.variations,
      genderAssociation: namesTable.genderAssociation,
      createdAt: namesTable.createdAt,
      updatedAt: namesTable.updatedAt,
      claimCount: sql<number>`count(${nameClaimsTable.id})::int`,
    })
    .from(namesTable)
    .leftJoin(nameClaimsTable, sql`${nameClaimsTable.nameId} = ${namesTable.id} AND ${nameClaimsTable.status} = 'verified' AND ${nameClaimsTable.verifiedAt} > NOW() - INTERVAL '30 days'`)
    .groupBy(namesTable.id)
    .orderBy(desc(sql`count(${nameClaimsTable.id})`))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: n.claimCount,
    countries: 0,
    changePercent: 0,
    trend: "rising" as const,
    sparkline: [],
  })));
});

router.get("/names/declining", async (req, res): Promise<void> => {
  const parsed = GetDecliningNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;
  // Declining: names with least recent activity but some historical claims
  const results = await db
    .select()
    .from(namesTable)
    .orderBy(asc(namesTable.updatedAt))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: 0,
    countries: 0,
    changePercent: 0,
    trend: "falling" as const,
    sparkline: [],
  })));
});

router.get("/names/browse", async (req, res): Promise<void> => {
  const parsed = BrowseNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sort = "popular", page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  const orderBy = (() => {
    switch (sort) {
      case "longest":   return desc(sql`length(${namesTable.name})`);
      case "shortest":  return asc(sql`length(${namesTable.name})`);
      default:          return asc(namesTable.name);
    }
  })();

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(namesTable);

  const results = await db
    .select()
    .from(namesTable)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const total = totalRow?.count ?? 0;
  res.json({
    items: results.map((n) => formatName(n)),
    total,
    page,
    hasMore: offset + results.length < total,
  });
});

router.get("/names/rare", async (req, res): Promise<void> => {
  const parsed = GetRareNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;
  // Rare: names with fewest verified claims
  const results = await db
    .select({
      id: namesTable.id,
      name: namesTable.name,
      languageOrigin: namesTable.languageOrigin,
      culturalOrigin: namesTable.culturalOrigin,
      meaning: namesTable.meaning,
      variations: namesTable.variations,
      genderAssociation: namesTable.genderAssociation,
      createdAt: namesTable.createdAt,
      updatedAt: namesTable.updatedAt,
      claimCount: sql<number>`count(${nameClaimsTable.id})::int`,
    })
    .from(namesTable)
    .leftJoin(nameClaimsTable, sql`${nameClaimsTable.nameId} = ${namesTable.id} AND ${nameClaimsTable.status} = 'verified'`)
    .groupBy(namesTable.id)
    .orderBy(asc(sql`count(${nameClaimsTable.id})`))
    .limit(limit);
  res.json(results.map((n) => formatName(n, n.claimCount)));
});

router.get("/names/by-decade", async (_req, res): Promise<void> => {
  const decades = [
    { decade: 1950, names: ["Maria", "José", "Ana", "João", "Francisco"] },
    { decade: 1960, names: ["John", "Mary", "James", "Patricia", "Robert"] },
    { decade: 1970, names: ["Jennifer", "Michael", "Lisa", "David", "Linda"] },
    { decade: 1980, names: ["Michael", "Jessica", "Christopher", "Ashley", "Matthew"] },
    { decade: 1990, names: ["Jessica", "Michael", "Ashley", "Joshua", "Brittany"] },
    { decade: 2000, names: ["Emma", "Liam", "Olivia", "Noah", "Isabella"] },
    { decade: 2010, names: ["Olivia", "Noah", "Emma", "Liam", "Ava"] },
    { decade: 2020, names: ["Lucas", "Olivia", "Noah", "Emma", "Liam"] },
  ];
  res.json(decades);
});

router.get("/names/:name/history", async (req, res): Promise<void> => {
  const params = GetNameHistoryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;
  const [name] = await db
    .select()
    .from(namesTable)
    .where(ilike(namesTable.name, nameParam))
    .limit(1);
  if (!name) {
    res.json([]);
    return;
  }
  // History derived from verified claims grouped by year
  const history = await db
    .select({
      year: sql<number>`EXTRACT(YEAR FROM ${nameClaimsTable.verifiedAt})::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(nameClaimsTable)
    .where(sql`${nameClaimsTable.nameId} = ${name.id} AND ${nameClaimsTable.status} = 'verified'`)
    .groupBy(sql`EXTRACT(YEAR FROM ${nameClaimsTable.verifiedAt})`)
    .orderBy(asc(sql`EXTRACT(YEAR FROM ${nameClaimsTable.verifiedAt})`));
  res.json(history.map((h) => ({ year: h.year, count: h.count, rank: null })));
});

router.get("/names/:name/countries", async (req, res): Promise<void> => {
  const params = GetNameCountriesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;
  const [name] = await db
    .select()
    .from(namesTable)
    .where(ilike(namesTable.name, nameParam))
    .limit(1);
  if (!name) {
    res.json([]);
    return;
  }
  // Countries derived from people's birth_country via verified claims
  const { peopleTable } = await import("@workspace/db");
  const countries = await db
    .select({
      country: peopleTable.birthCountry,
      total: sql<number>`count(*)::int`,
    })
    .from(nameClaimsTable)
    .innerJoin(peopleTable, sql`${peopleTable.id} = ${nameClaimsTable.personId}`)
    .where(sql`${nameClaimsTable.nameId} = ${name.id} AND ${nameClaimsTable.status} = 'verified'`)
    .groupBy(peopleTable.birthCountry)
    .orderBy(desc(sql`count(*)`))
    .limit(10);
  res.json(countries.map((c) => ({
    country: c.country ?? "Unknown",
    countryCode: "",
    count: c.total,
    percentage: 0,
  })));
});

router.get("/names/:name", async (req, res): Promise<void> => {
  const params = GetNameDetailParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const nameParam = Array.isArray(params.data.name) ? params.data.name[0] : params.data.name;
  const [name] = await db
    .select()
    .from(namesTable)
    .where(ilike(namesTable.name, nameParam))
    .limit(1);
  if (!name) {
    res.status(404).json({ error: "Name not found" });
    return;
  }
  const [claimCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(nameClaimsTable)
    .where(sql`${nameClaimsTable.nameId} = ${name.id} AND ${nameClaimsTable.status} = 'verified'`);

  res.json({
    name: name.name,
    count: Number(claimCount?.total ?? 0),
    countries: 0,
    origin: name.languageOrigin ?? name.culturalOrigin ?? "Unknown",
    meaning: name.meaning ?? "Unknown",
    gender: name.genderAssociation ?? "neutral",
    topCountries: [],
    changePercent: null,
    sparkline: [],
  });
});

export default router;
