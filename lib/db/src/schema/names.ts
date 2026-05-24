import { pgTable, text, serial, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const namesTable = pgTable("names", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  languageOrigin: text("language_origin"),
  culturalOrigin: text("cultural_origin"),
  meaning: text("meaning"),
  variations: jsonb("variations").$type<string[]>().default([]),
  genderAssociation: text("gender_association"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNameSchema = createInsertSchema(namesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertName = z.infer<typeof insertNameSchema>;
export type Name = typeof namesTable.$inferSelect;
