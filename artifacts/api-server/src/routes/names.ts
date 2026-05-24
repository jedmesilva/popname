import { Router, type IRouter } from "express";
import { ilike, desc, asc, eq, sql } from "drizzle-orm";
import { db, namesTable, nameCountriesTable, nameHistoryTable } from "@workspace/db";
import {
  SearchNamesQueryParams,
  GetPopularNamesQueryParams,
  GetTrendingNamesQueryParams,
  GetDecliningNamesQueryParams,
  GetRareNamesQueryParams,
  GetNameDetailParams,
  GetNameHistoryParams,
  GetNameCountriesParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
    .orderBy(desc(namesTable.count))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: n.count,
    countries: n.countries,
    origin: n.origin ?? null,
    meaning: n.meaning ?? null,
    gender: n.gender ?? null,
  })));
});

router.get("/names/popular", async (req, res): Promise<void> => {
  const parsed = GetPopularNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 20 } = parsed.data;
  const results = await db
    .select()
    .from(namesTable)
    .orderBy(desc(namesTable.count))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: n.count,
    countries: n.countries,
    origin: n.origin ?? null,
    meaning: n.meaning ?? null,
    gender: n.gender ?? null,
  })));
});

router.get("/names/trending", async (req, res): Promise<void> => {
  const parsed = GetTrendingNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;
  const results = await db
    .select()
    .from(namesTable)
    .where(sql`${namesTable.changePercent} > 0`)
    .orderBy(desc(namesTable.changePercent))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: n.count,
    countries: n.countries,
    changePercent: n.changePercent ?? 0,
    trend: "rising" as const,
    sparkline: (n.sparkline as number[]) ?? [],
  })));
});

router.get("/names/declining", async (req, res): Promise<void> => {
  const parsed = GetDecliningNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;
  const results = await db
    .select()
    .from(namesTable)
    .where(sql`${namesTable.changePercent} < 0`)
    .orderBy(asc(namesTable.changePercent))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: n.count,
    countries: n.countries,
    changePercent: n.changePercent ?? 0,
    trend: "falling" as const,
    sparkline: (n.sparkline as number[]) ?? [],
  })));
});

router.get("/names/rare", async (req, res): Promise<void> => {
  const parsed = GetRareNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { limit = 10 } = parsed.data;
  const results = await db
    .select()
    .from(namesTable)
    .orderBy(asc(namesTable.count))
    .limit(limit);
  res.json(results.map((n) => ({
    name: n.name,
    count: n.count,
    countries: n.countries,
    origin: n.origin ?? null,
    meaning: n.meaning ?? null,
    gender: n.gender ?? null,
  })));
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
  const countries = await db
    .select()
    .from(nameCountriesTable)
    .where(eq(nameCountriesTable.nameId, name.id))
    .orderBy(desc(nameCountriesTable.count))
    .limit(10);
  res.json({
    name: name.name,
    count: name.count,
    countries: name.countries,
    origin: name.origin ?? "Unknown",
    meaning: name.meaning ?? "Unknown",
    gender: name.gender ?? "neutral",
    topCountries: countries.map((c) => ({
      country: c.country,
      countryCode: c.countryCode,
      count: c.count,
      percentage: c.percentage,
    })),
    changePercent: name.changePercent ?? null,
    sparkline: (name.sparkline as number[]) ?? [],
  });
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
  const history = await db
    .select()
    .from(nameHistoryTable)
    .where(eq(nameHistoryTable.nameId, name.id))
    .orderBy(asc(nameHistoryTable.year));
  res.json(history.map((h) => ({
    year: h.year,
    count: h.count,
    rank: h.rank ?? null,
  })));
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
  const countries = await db
    .select()
    .from(nameCountriesTable)
    .where(eq(nameCountriesTable.nameId, name.id))
    .orderBy(desc(nameCountriesTable.count));
  res.json(countries.map((c) => ({
    country: c.country,
    countryCode: c.countryCode,
    count: c.count,
    percentage: c.percentage,
  })));
});

export default router;
