import { Router, type IRouter } from "express";
import { ilike, desc, asc, eq, sql, inArray } from "drizzle-orm";
import { db, namesTable, nameCountriesTable, nameHistoryTable } from "@workspace/db";
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

const GENERATION_DECADES: Record<string, number[]> = {
  boomer:     [1946, 1947, 1948, 1949, 1950, 1951, 1952, 1953, 1954, 1955, 1956, 1957, 1958, 1959, 1960, 1961, 1962, 1963, 1964],
  genx:       [1965, 1966, 1967, 1968, 1969, 1970, 1971, 1972, 1973, 1974, 1975, 1976, 1977, 1978, 1979, 1980],
  millennial: [1981, 1982, 1983, 1984, 1985, 1986, 1987, 1988, 1989, 1990, 1991, 1992, 1993, 1994, 1995, 1996],
  genz:       [1997, 1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012],
  alpha:      [2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024],
};

router.get("/names/browse", async (req, res): Promise<void> => {
  const parsed = BrowseNamesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { sort = "popular", country, generation, page = 1, limit = 20 } = parsed.data;
  const offset = (page - 1) * limit;

  // Build order expression
  const orderBy = (() => {
    switch (sort) {
      case "rare":      return asc(namesTable.count);
      case "longest":   return desc(sql`length(${namesTable.name})`);
      case "shortest":  return asc(sql`length(${namesTable.name})`);
      case "trending":  return desc(namesTable.changePercent);
      case "declining": return asc(namesTable.changePercent);
      default:          return desc(namesTable.count);
    }
  })();

  // Build where conditions
  const conditions: ReturnType<typeof sql>[] = [];

  if (sort === "trending")  conditions.push(sql`${namesTable.changePercent} > 0`);
  if (sort === "declining") conditions.push(sql`${namesTable.changePercent} < 0`);

  // Generation filter: get names that appear in the history for those birth years
  let generationNameIds: number[] | null = null;
  if (generation && GENERATION_DECADES[generation]) {
    const years = GENERATION_DECADES[generation];
    const historyRows = await db
      .selectDistinct({ nameId: nameHistoryTable.nameId })
      .from(nameHistoryTable)
      .where(inArray(nameHistoryTable.year, years));
    generationNameIds = historyRows.map((r) => r.nameId);
    if (generationNameIds.length > 0) {
      conditions.push(inArray(namesTable.id, generationNameIds));
    } else {
      // No data — return empty result
      res.json({ items: [], total: 0, page, hasMore: false });
      return;
    }
  }

  // Country filter: join through name_countries
  let countryNameIds: number[] | null = null;
  if (country) {
    const countryRows = await db
      .selectDistinct({ nameId: nameCountriesTable.nameId })
      .from(nameCountriesTable)
      .where(eq(nameCountriesTable.countryCode, country));
    countryNameIds = countryRows.map((r) => r.nameId);
    if (countryNameIds.length > 0) {
      conditions.push(inArray(namesTable.id, countryNameIds));
    } else {
      res.json({ items: [], total: 0, page, hasMore: false });
      return;
    }
  }

  const whereClause = conditions.length > 0
    ? sql`${conditions.reduce((acc, c) => sql`${acc} AND ${c}`)}`
    : undefined;

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(namesTable)
    .where(whereClause);

  const results = await db
    .select()
    .from(namesTable)
    .where(whereClause)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset);

  const total = totalRow?.count ?? 0;

  res.json({
    items: results.map((n) => ({
      name: n.name,
      count: n.count,
      countries: n.countries,
      origin: n.origin ?? null,
      meaning: n.meaning ?? null,
      gender: n.gender ?? null,
    })),
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
