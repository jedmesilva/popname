import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, nameClaimsTable, namesTable, peopleTable, pool } from "@workspace/db";
import { SubmitClaimBody, GetClaimStatusParams } from "@workspace/api-zod";

const router: IRouter = Router();

// POST /claims — find-or-create person + name, then create a claim
router.post("/claims", async (req, res): Promise<void> => {
  const parsed = SubmitClaimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, fullName, country, birthYear, documentType, email } = parsed.data;

  // Find or create the name entry
  let [nameRow] = await db
    .select()
    .from(namesTable)
    .where(sql`LOWER(${namesTable.name}) = LOWER(${name})`)
    .limit(1);

  if (!nameRow) {
    const [inserted] = await db
      .insert(namesTable)
      .values({ name, languageOrigin: null, culturalOrigin: null, meaning: null })
      .returning();
    nameRow = inserted;
  }

  // Find or create the person by email
  let personRow;
  if (email) {
    const [existing] = await db
      .select()
      .from(peopleTable)
      .where(eq(peopleTable.email, email))
      .limit(1);
    personRow = existing;
  }

  if (!personRow) {
    const birthDate = birthYear ? `${birthYear}-01-01` : null;
    const [inserted] = await db
      .insert(peopleTable)
      .values({
        fullName,
        birthDate: birthDate ?? undefined,
        birthCountry: country,
        email: email ?? undefined,
      })
      .returning();
    personRow = inserted;
  }

  // Create the claim
  const [claim] = await db
    .insert(nameClaimsTable)
    .values({
      personId: personRow.id,
      nameId: nameRow.id,
      status: "pending",
    })
    .returning();

  res.status(201).json({
    id: String(claim.id),
    name: nameRow.name,
    fullName: personRow.fullName,
    country: personRow.birthCountry ?? country,
    status: claim.status,
    submittedAt: claim.claimedAt.toISOString(),
  });
});

// GET /claims/:id
router.get("/claims/:id", async (req, res): Promise<void> => {
  const parsed = GetClaimStatusParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const id = Number(parsed.data.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid claim id" });
    return;
  }
  const { rows } = await pool.query(
    `SELECT nc.id, nc.status, nc.claimed_at, nc.verified_at,
            n.name, p.full_name, p.birth_country
     FROM name_claims nc
     JOIN names n ON n.id = nc.name_id
     JOIN people p ON p.id = nc.person_id
     WHERE nc.id = $1`,
    [id]
  );
  if (!rows.length) {
    res.status(404).json({ error: "Claim not found" });
    return;
  }
  const c = rows[0];
  res.json({
    id: String(c.id),
    name: c.name,
    fullName: c.full_name,
    country: c.birth_country ?? "",
    status: c.status,
    submittedAt: c.claimed_at,
  });
});

export default router;
