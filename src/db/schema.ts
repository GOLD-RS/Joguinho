import { pgTable, serial, varchar, integer, timestamp, index } from "drizzle-orm/pg-core";

export const scores = pgTable(
  "scores",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 16 }).notNull(),
    score: integer("score").notNull(),
    perfects: integer("perfects").notNull().default(0),
    maxCombo: integer("max_combo").notNull().default(1),
    pipes: integer("pipes").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("scores_score_idx").on(t.score)]
);
