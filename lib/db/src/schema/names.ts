import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { peopleTable } from "./people";

export const namesTable = pgTable("names", {
  id: serial("id").primaryKey(),
  nameText: text("name_text").notNull(),
  personId: integer("person_id").notNull().references(() => peopleTable.id, { onDelete: "cascade" }),
  birthCountry: text("birth_country"),
  status: text("status").notNull().default("pending"),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  verifiedAt: timestamp("verified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertNameSchema = createInsertSchema(namesTable).omit({ id: true, claimedAt: true, createdAt: true, updatedAt: true });
export type InsertName = z.infer<typeof insertNameSchema>;
export type Name = typeof namesTable.$inferSelect;
