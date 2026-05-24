import { pgTable, serial, integer, text, date, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { peopleTable } from "./people";
import { nameClaimsTable } from "./name_claims";

export const documentsTable = pgTable("documents", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => peopleTable.id, { onDelete: "cascade" }),
  claimId: integer("claim_id").references(() => nameClaimsTable.id),
  documentType: text("document_type").notNull(),
  fileUrl: text("file_url"),
  extractedName: text("extracted_name"),
  extractedBirthDate: date("extracted_birth_date"),
  extractedFiliationParent1: text("extracted_filiation_parent1"),
  extractedFiliationParent2: text("extracted_filiation_parent2"),
  extractionConfidence: real("extraction_confidence"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Document = typeof documentsTable.$inferSelect;
