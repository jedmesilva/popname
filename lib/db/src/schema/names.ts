import { pgTable, text, serial, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const namesTable = pgTable("names", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  normalizedName: text("normalized_name").notNull(),
  count: integer("count").notNull().default(0),
  countries: integer("countries").notNull().default(0),
  origin: text("origin"),
  meaning: text("meaning"),
  gender: text("gender"),
  changePercent: real("change_percent"),
  sparkline: jsonb("sparkline").$type<number[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNameSchema = createInsertSchema(namesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertName = z.infer<typeof insertNameSchema>;
export type Name = typeof namesTable.$inferSelect;

export const nameCountriesTable = pgTable("name_countries", {
  id: serial("id").primaryKey(),
  nameId: integer("name_id").notNull().references(() => namesTable.id),
  country: text("country").notNull(),
  countryCode: text("country_code").notNull(),
  count: integer("count").notNull().default(0),
  percentage: real("percentage").notNull().default(0),
});

export const nameHistoryTable = pgTable("name_history", {
  id: serial("id").primaryKey(),
  nameId: integer("name_id").notNull().references(() => namesTable.id),
  year: integer("year").notNull(),
  count: integer("count").notNull().default(0),
  rank: integer("rank"),
});
