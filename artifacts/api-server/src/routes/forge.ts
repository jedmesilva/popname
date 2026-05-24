import { Router, type IRouter } from "express";
import { db, nameMeaningsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { ForgeNameBody } from "@workspace/api-zod";

const router: IRouter = Router();

function combineParts(bases: string[]): string[] {
  if (bases.length === 0) return [];
  const results: string[] = [];
  for (const base of bases) {
    const half1 = base.slice(0, Math.ceil(base.length / 2));
    const half2 = base.slice(Math.floor(base.length / 2));
    results.push(half1, half2);
  }
  const combined: string[] = [];
  for (let i = 0; i < results.length - 1; i++) {
    const a = results[i];
    const b = results[i + 1];
    combined.push(
      (a + b).charAt(0).toUpperCase() + (a + b).slice(1).toLowerCase()
    );
  }
  return combined.slice(0, 3);
}

function generateName(style?: string | null, meaning?: string | null, origin?: string | null): { name: string; meaning: string; origin: string } {
  const prefixes = {
    classic: ["Alex", "Adrian", "Cass", "Clar", "Emil", "Leon", "Mar", "Nat", "Syl", "Val"],
    modern: ["Zyn", "Kael", "Ryn", "Aex", "Vel", "Xan", "Ori", "Zev", "Lyr", "Nyx"],
    mythological: ["Eos", "Astr", "Heli", "Ther", "Pyx", "Neph", "Kron", "Zyph", "Ael", "Aeg"],
    nature: ["Aur", "River", "Sky", "Storm", "Ash", "Fern", "Reed", "Sol", "Lark", "Wren"],
  };
  const suffixes = ["ia", "el", "on", "ara", "ith", "wyn", "ael", "ora", "is", "iel"];
  const selectedStyle = (style as keyof typeof prefixes) ?? "classic";
  const prefix = (prefixes[selectedStyle] ?? prefixes.classic)[Math.floor(Math.random() * 10)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  return {
    name: prefix + suffix,
    meaning: meaning ?? "A name forged from the essence of human expression",
    origin: origin ?? "Constructed",
  };
}

router.post("/forge", async (req, res): Promise<void> => {
  const parsed = ForgeNameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { baseNames = [], meaning, origin, gender: _gender, style } = parsed.data;

  const suggestions = [];

  if (baseNames.length >= 2) {
    const combined = combineParts(baseNames);
    for (const candidate of combined.slice(0, 2)) {
      const [existing] = await db
        .select()
        .from(nameMeaningsTable)
        .where(eq(nameMeaningsTable.nameText, candidate))
        .limit(1);
      suggestions.push({
        name: candidate,
        meaning: meaning ?? "A fusion born from the roots of your lineage",
        origin: origin ?? "Hybrid",
        isUnique: !existing,
        existingCount: 0,
        inspirations: baseNames,
      });
    }
  }

  while (suggestions.length < 3) {
    const generated = generateName(style, meaning, origin);
    const [existing] = await db
      .select()
      .from(nameMeaningsTable)
      .where(eq(nameMeaningsTable.nameText, generated.name))
      .limit(1);
    suggestions.push({
      name: generated.name,
      meaning: generated.meaning,
      origin: generated.origin,
      isUnique: !existing,
      existingCount: 0,
      inspirations: baseNames,
    });
  }

  res.json({ suggestions });
});

export default router;
