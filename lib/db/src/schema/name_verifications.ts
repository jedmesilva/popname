import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { namesTable } from "./names";

export const nameVerificationsTable = pgTable("name_verifications", {
  id: serial("id").primaryKey(),
  nameId: integer("name_id").notNull().references(() => namesTable.id, { onDelete: "cascade" }),
  documentType: text("document_type"),
  documentUrl: text("document_url"),
  status: text("status").notNull().default("pending"),
  failureReason: text("failure_reason"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNameVerificationSchema = createInsertSchema(nameVerificationsTable).omit({ id: true, createdAt: true });
export type InsertNameVerification = z.infer<typeof insertNameVerificationSchema>;
export type NameVerification = typeof nameVerificationsTable.$inferSelect;
