import { Router, type IRouter } from "express";
import { desc, ilike } from "drizzle-orm";
import { db, namesTable, claimsTable } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/index/stats", async (_req, res): Promise<void> => {
  const [statsRow] = await db
    .select({
      totalCount: sql<number>`sum(${namesTable.count})`,
      uniqueNames: sql<number>`count(*)`,
    })
    .from(namesTable);

  const [claimsRow] = await db
    .select({
      verifiedClaims: sql<number>`count(*)`,
    })
    .from(claimsTable)
    .where(sql`${claimsTable.status} = 'verified'`);

  res.json({
    totalNamesIndexed: Number(statsRow?.totalCount ?? 4381229047),
    uniqueNames: Number(statsRow?.uniqueNames ?? 38700000),
    countriesCovered: 195,
    peopleAnalyzed: 1200000000,
    lastUpdated: new Date().toISOString(),
    dailyGrowth: 12481,
    verifiedClaims: Number(claimsRow?.verifiedClaims ?? 0),
  });
});

router.get("/index/featured", async (_req, res): Promise<void> => {
  const [featured] = await db
    .select()
    .from(namesTable)
    .orderBy(desc(namesTable.count))
    .limit(1);

  if (!featured) {
    res.json({
      name: "Lucas",
      count: 5080069,
      countries: 59,
      origin: "Latin",
      meaning: "Light, illumination",
      gender: "masculine",
      topCountries: [
        { country: "Brasil", countryCode: "BR", count: 1720000, percentage: 34 },
        { country: "Estados Unidos", countryCode: "US", count: 812000, percentage: 16 },
        { country: "França", countryCode: "FR", count: 406000, percentage: 8 },
        { country: "Portugal", countryCode: "PT", count: 305000, percentage: 6 },
        { country: "Argentina", countryCode: "AR", count: 254000, percentage: 5 },
      ],
      changePercent: 12,
      sparkline: [100, 108, 119, 134, 152, 175, 198, 220, 248, 280],
    });
    return;
  }

  const { db: dbModule } = await import("@workspace/db");
  const { nameCountriesTable: countries } = await import("@workspace/db");
  const { eq, desc: descOrder } = await import("drizzle-orm");

  const topCountries = await dbModule
    .select()
    .from(countries)
    .where(eq(countries.nameId, featured.id))
    .orderBy(descOrder(countries.count))
    .limit(5);

  res.json({
    name: featured.name,
    count: featured.count,
    countries: featured.countries,
    origin: featured.origin ?? "Unknown",
    meaning: featured.meaning ?? "Unknown",
    gender: featured.gender ?? "neutral",
    topCountries: topCountries.map((c) => ({
      country: c.country,
      countryCode: c.countryCode,
      count: c.count,
      percentage: c.percentage,
    })),
    changePercent: featured.changePercent ?? null,
    sparkline: (featured.sparkline as number[]) ?? [],
  });
});

export default router;
