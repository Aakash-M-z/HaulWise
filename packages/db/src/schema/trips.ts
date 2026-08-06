import { pgTable, serial, text, numeric, jsonb, timestamp } from "drizzle-orm/pg-core";

export const tripsTable = pgTable("trips", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  currentLocation: text("current_location").notNull(),
  pickupLocation: text("pickup_location").notNull(),
  dropoffLocation: text("dropoff_location").notNull(),
  currentCycleUsed: numeric("current_cycle_used", { precision: 5, scale: 2 }).notNull(),
  plan: jsonb("plan").notNull(),
});

export type Trip = typeof tripsTable.$inferSelect;
