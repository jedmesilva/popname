import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { peopleTable } from "./people";
import { sessionsTable } from "./sessions";

export const nameSearchesTable = pgTable("name_searches", {
  id: serial("id").primaryKey(),
  personId: integer("person_id").references(() => peopleTable.id),
  nameSearched: text("name_searched").notNull(),
  sessionId: integer("session_id").references(() => sessionsTable.id),
  searchedAt: timestamp("searched_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertNameSearchSchema = createInsertSchema(nameSearchesTable).omit({ id: true, searchedAt: true });
export type InsertNameSearch = z.infer<typeof insertNameSearchSchema>;
export type NameSearch = typeof nameSearchesTable.$inferSelect;
