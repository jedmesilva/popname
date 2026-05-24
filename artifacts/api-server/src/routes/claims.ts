import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, namesTable, nameMeaningsTable, peopleTable, pool } from "@workspace/db";
import { SubmitClaimBody, GetClaimStatusParams } from "@workspace/api-zod";

const router: IRouter = Router();

// POST /claims — find-or-create person, then create a name instance
router.post("/claims", async (req, res): Promise<void> => {
  const parsed = SubmitClaimBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { name, fullName, country, birthYear, documentType, email } = parsed.data;

  // Ensure name_meanings entry exists (upsert semantic metadata)
  await db
    .insert(nameMeaningsTable)
    .values({ nameText: name })
    .onConflictDoNothing();

  // Find or create person by email
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

  // Create the name instance (claim)
  const [nameRow] = await db
    .insert(namesTable)
    .values({
      nameText: name,
      personId: personRow.id,
      birthCountry: country,
      status: "pending",
    })
    .returning();

  res.status(201).json({
    id: String(nameRow.id),
    name: nameRow.nameText,
    fullName: personRow.fullName,
    country: nameRow.birthCountry ?? country,
    status: nameRow.status,
    submittedAt: nameRow.claimedAt.toISOString(),
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
    `SELECT n.id, n.status, n.claimed_at, n.verified_at,
            n.name_text AS name, p.full_name, p.birth_country
     FROM names n
     JOIN people p ON p.id = n.person_id
     WHERE n.id = $1`,
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
