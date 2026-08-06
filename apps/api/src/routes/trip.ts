import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, tripsTable } from "@haulwise/db";
import { PlanTripBody } from "@haulwise/api-zod";
import { geocode } from "../lib/geocoding.js";
import { getRoute } from "../lib/routing.js";
import { generateTripPlan, type TripPlan } from "../lib/planner.js";

const router: IRouter = Router();

interface MemoryTrip {
  id: number;
  createdAt: string;
  currentLocation: string;
  pickupLocation: string;
  dropoffLocation: string;
  currentCycleUsed: number;
  plan: TripPlan;
}

const memoryTrips: MemoryTrip[] = [];
let nextMemoryId = 1;

// POST /api/trip — plan and save a new trip
router.post("/trip", async (req, res): Promise<void> => {
  const parsed = PlanTripBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { current_location, pickup_location, dropoff_location, current_cycle_used } =
    parsed.data;

  req.log.info(
    { current_location, pickup_location, dropoff_location, current_cycle_used },
    "Planning trip",
  );

  // ── Geocode all three locations in parallel ─────────────────────────────
  let currentLoc, pickupLoc, dropoffLoc;
  try {
    [currentLoc, pickupLoc, dropoffLoc] = await Promise.all([
      geocode(current_location),
      geocode(pickup_location),
      geocode(dropoff_location),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Geocoding failed";
    req.log.warn({ err }, "Geocoding error");
    res.status(400).json({ error: msg });
    return;
  }

  // ── Get routing for both legs in parallel ──────────────────────────────
  let leg1Route, leg2Route;
  try {
    [leg1Route, leg2Route] = await Promise.all([
      getRoute(currentLoc, pickupLoc),
      getRoute(pickupLoc, dropoffLoc),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Routing failed";
    req.log.warn({ err }, "Routing error");
    res.status(503).json({ error: msg });
    return;
  }

  // ── Run HOS planner ────────────────────────────────────────────────────
  const plan = generateTripPlan({
    currentLocation: currentLoc,
    pickupLocation: pickupLoc,
    dropoffLocation: dropoffLoc,
    leg1Route,
    leg2Route,
    currentCycleUsed: current_cycle_used,
  });

  req.log.info(
    {
      totalMiles: plan.totalDistanceMiles,
      totalDrivingH: plan.totalDrivingHours,
      fuelStops: plan.fuelStopCount,
      restStops: plan.restStopCount,
      days: plan.dailyLogs.length,
    },
    "Trip planned successfully",
  );

  // Save to memory store fallback first
  const memoryTripItem: MemoryTrip = {
    id: nextMemoryId++,
    createdAt: new Date().toISOString(),
    currentLocation: currentLoc.name,
    pickupLocation: pickupLoc.name,
    dropoffLocation: dropoffLoc.name,
    currentCycleUsed: current_cycle_used,
    plan,
  };
  memoryTrips.unshift(memoryTripItem);

  // ── Save to PostgreSQL database if available ─────────────────────────────
  if (db) {
    try {
      await db.insert(tripsTable).values({
        currentLocation: currentLoc.name,
        pickupLocation: pickupLoc.name,
        dropoffLocation: dropoffLoc.name,
        currentCycleUsed: String(current_cycle_used),
        plan: plan as unknown as Record<string, unknown>,
      });
    } catch (err) {
      req.log.warn({ err }, "Failed to save trip to database, using memory store");
    }
  }

  res.json(plan);
});

// GET /api/trips — list recent trips
router.get("/trips", async (req, res): Promise<void> => {
  if (db) {
    try {
      const rows = await db
        .select()
        .from(tripsTable)
        .orderBy(desc(tripsTable.createdAt))
        .limit(20);

      const result = rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt.toISOString(),
        currentLocation: row.currentLocation,
        pickupLocation: row.pickupLocation,
        dropoffLocation: row.dropoffLocation,
        currentCycleUsed: Number(row.currentCycleUsed),
        plan: row.plan as TripPlan,
      }));

      res.json(result);
      return;
    } catch (err) {
      req.log.warn({ err }, "Failed to fetch trips from database, returning memory trips");
    }
  }

  res.json(memoryTrips);
});

// GET /api/trips/:id — get a single trip
router.get("/trips/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);

  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid trip ID" });
    return;
  }

  if (db) {
    try {
      const [row] = await db
        .select()
        .from(tripsTable)
        .where(eq(tripsTable.id, id));

      if (row) {
        res.json({
          id: row.id,
          createdAt: row.createdAt.toISOString(),
          currentLocation: row.currentLocation,
          pickupLocation: row.pickupLocation,
          dropoffLocation: row.dropoffLocation,
          currentCycleUsed: Number(row.currentCycleUsed),
          plan: row.plan as TripPlan,
        });
        return;
      }
    } catch (err) {
      req.log.warn({ err }, "Failed to fetch single trip from database, checking memory store");
    }
  }

  const memoryMatch = memoryTrips.find((t) => t.id === id);
  if (memoryMatch) {
    res.json(memoryMatch);
    return;
  }

  res.status(404).json({ error: "Trip not found" });
});

export default router;
