import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, nameClaimsTable, peopleTable, namesTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/claims/:id", async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid claim id" });
    return;
  }
  const [claim] = await db
    .select({
      id: nameClaimsTable.id,
      personId: nameClaimsTable.personId,
      nameId: nameClaimsTable.nameId,
      status: nameClaimsTable.status,
      claimedAt: nameClaimsTable.claimedAt,
      verifiedAt: nameClaimsTable.verifiedAt,
      name: namesTable.name,
      personFullName: peopleTable.fullName,
    })
    .from(nameClaimsTable)
    .innerJoin(namesTable, eq(nameClaimsTable.nameId, namesTable.id))
    .innerJoin(peopleTable, eq(nameClaimsTable.personId, peopleTable.id))
    .where(eq(nameClaimsTable.id, id))
    .limit(1);

  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }
  res.json(claim);
});

export default router;
