import { pgTable, serial, integer, text, real, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { peopleTable } from "./people";
import { documentsTable } from "./documents";

export const filiationsTable = pgTable("filiations", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").notNull().references(() => peopleTable.id, { onDelete: "cascade" }),
  parentId: integer("parent_id").notNull().references(() => peopleTable.id, { onDelete: "cascade" }),
  relationType: text("relation_type").notNull(),
  sourceDocumentId: integer("source_document_id").references(() => documentsTable.id),
  confidenceScore: real("confidence_score"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFiliationSchema = createInsertSchema(filiationsTable).omit({ id: true, createdAt: true });
export type InsertFiliation = z.infer<typeof insertFiliationSchema>;
export type Filiation = typeof filiationsTable.$inferSelect;
