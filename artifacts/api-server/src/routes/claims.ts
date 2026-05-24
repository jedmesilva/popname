import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, claimsTable } from "@workspace/db";
import { SubmitClaimBody, GetClaimStatusParams } from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router: IRouter = Router();

router.post("/claims", async (req, res): Promise<void> => {
  const parsed = SubmitClaimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, fullName, country, birthYear, documentType, email } = parsed.data;
  const claimUuid = randomUUID();
  const [claim] = await db
    .insert(claimsTable)
    .values({
      claimUuid,
      name,
      fullName,
      country,
      birthYear,
      documentType: documentType ?? null,
      email: email ?? null,
      status: "pending",
    })
    .returning();
  res.status(201).json({
    id: claim.claimUuid,
    name: claim.name,
    fullName: claim.fullName,
    country: claim.country,
    status: claim.status,
    submittedAt: claim.submittedAt.toISOString(),
  });
});

router.get("/claims/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const [claim] = await db
    .select()
    .from(claimsTable)
    .where(eq(claimsTable.claimUuid, rawId))
    .limit(1);
  if (!claim) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }
  res.json({
    id: claim.claimUuid,
    name: claim.name,
    fullName: claim.fullName,
    country: claim.country,
    status: claim.status,
    submittedAt: claim.submittedAt.toISOString(),
  });
});

export default router;
