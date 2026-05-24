import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { peopleTable } from "./people";
import { namesTable } from "./names";

export const nameClaimsTable = pgTable("name_claims", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => peopleTable.id, { onDelete: "cascade" }),
  nameId: integer("name_id").notNull().references(() => namesTable.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNameClaimSchema = createInsertSchema(nameClaimsTable).omit({ id: true, claimedAt: true, updatedAt: true });
export type InsertNameClaim = z.infer<typeof insertNameClaimSchema>;
export type NameClaim = typeof nameClaimsTable.$inferSelect;
