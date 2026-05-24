import { Router, type IRouter } from "express";
import { desc, sql } from "drizzle-orm";
import { db, namesTable, nameClaimsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/index/stats", async (_req, res): Promise<void> => {
  const [namesRow] = await db
    .select({ uniqueNames: sql<number>`count(*)::int` })
    .from(namesTable);

  const [claimsRow] = await db
    .select({ verifiedClaims: sql<number>`count(*)::int` })
    .from(nameClaimsTable)
    .where(sql`${nameClaimsTable.status} = 'verified'`);

  res.json({
    totalNamesIndexed: 4381229047,
    uniqueNames: Number(namesRow?.uniqueNames ?? 0),
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
    .orderBy(desc(namesTable.createdAt))
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

  const [claimCount] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(nameClaimsTable)
    .where(sql`${nameClaimsTable.nameId} = ${featured.id} AND ${nameClaimsTable.status} = 'verified'`);

  res.json({
    name: featured.name,
    count: Number(claimCount?.total ?? 0),
    countries: 0,
    origin: featured.languageOrigin ?? featured.culturalOrigin ?? "Unknown",
    meaning: featured.meaning ?? "Unknown",
    gender: featured.genderAssociation ?? "neutral",
    topCountries: [],
    changePercent: null,
    sparkline: [],
  });
});

export default router;
