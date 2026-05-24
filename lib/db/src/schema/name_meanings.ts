import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const nameMeaningsTable = pgTable("name_meanings", {
  nameText: text("name_text").primaryKey(),
  meaning: text("meaning"),
  languageOrigin: text("language_origin"),
  culturalOrigin: text("cultural_origin"),
  genderAssociation: text("gender_association"),
  variations: jsonb("variations").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNameMeaningSchema = createInsertSchema(nameMeaningsTable).omit({ createdAt: true, updatedAt: true });
export type InsertNameMeaning = z.infer<typeof insertNameMeaningSchema>;
export type NameMeaning = typeof nameMeaningsTable.$inferSelect;
