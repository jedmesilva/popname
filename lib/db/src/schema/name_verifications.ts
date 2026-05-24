import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { nameClaimsTable } from "./name_claims";
import { peopleTable } from "./people";

export const nameVerificationsTable = pgTable("name_verifications", {
  id: serial("id").primaryKey(),
  claimId: integer("claim_id").notNull().references(() => nameClaimsTable.id, { onDelete: "cascade" }),
  verifiedBy: integer("verified_by").references(() => peopleTable.id),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
  result: text("result").notNull(),
  rejectionReason: text("rejection_reason"),
  notes: text("notes"),
});

export const insertNameVerificationSchema = createInsertSchema(nameVerificationsTable).omit({ id: true, verifiedAt: true });
export type InsertNameVerification = z.infer<typeof insertNameVerificationSchema>;
export type NameVerification = typeof nameVerificationsTable.$inferSelect;
