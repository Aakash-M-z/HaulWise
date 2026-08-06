import type { GeocodedLocation } from "./geocoding.js";
import type { RouteResult } from "./routing.js";
import { coordAtDistance } from "./routing.js";

// ─── HOS Constants ────────────────────────────────────────────────────────────
const SPEED_MPH = 55;
const FUEL_INTERVAL_MILES = 1000;
const FUEL_DURATION_H = 0.5;
const PICKUP_DURATION_H = 1;
const DROPOFF_DURATION_H = 1;
const MAX_DRIVE_H = 11; // max driving hours per shift
const MAX_WINDOW_H = 14; // max on-duty window per shift
const BREAK_TRIGGER_H = 8; // break required after 8 cumulative driving hours
const BREAK_DURATION_H = 0.5;
const REST_DURATION_H = 10;
const MAX_CYCLE_H = 70;

// ─── Internal Types ───────────────────────────────────────────────────────────
type ActivityType =
  | "drive"
  | "on_duty"
  | "break"
  | "rest"
  | "fuel"
  | "sleeper";

interface Activity {
  type: ActivityType;
  startTime: Date;
  endTime: Date;
  hours: number;
  reason?: string;
}

type StopType =
  | "current"
  | "pickup"
  | "dropoff"
  | "fuel"
  | "rest"
  | "break";

interface Stop {
  type: StopType;
  location: string;
  coordinates: { lat: number; lng: number };
  arrivalTime: Date;
  duration: number;
  distanceFromStart: number | null;
}

// ─── Public Types ─────────────────────────────────────────────────────────────
export interface LogSegment {
  startHour: number;
  endHour: number;
  status: "off_duty" | "sleeper_berth" | "driving" | "on_duty";
}

export interface DailyLog {
  date: string;
  dayNumber: number;
  segments: LogSegment[];
  totalOffDuty: number;
  totalSleeperBerth: number;
  totalDriving: number;
  totalOnDuty: number;
  remarks: string[];
}

export interface TripPlan {
  totalDistanceMiles: number;
  totalDrivingHours: number;
  totalTripHours: number;
  estimatedArrival: string;
  startTime: string;
  remainingCycleHours: number;
  fuelStopCount: number;
  restStopCount: number;
  stops: Array<{
    type: StopType;
    location: string;
    coordinates: { lat: number; lng: number };
    arrivalTime: string;
    duration: number;
    distanceFromStart: number | null;
  }>;
  dailyLogs: DailyLog[];
  routeGeometry: { coordinates: [number, number][] };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 3_600_000);
}

function hoursBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / 3_600_000;
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatHour(h: number): string {
  const total = Math.round(h * 60);
  const hh = Math.floor(total / 60)
    .toString()
    .padStart(2, "0");
  const mm = (total % 60).toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

// ─── ELD Log Generation ───────────────────────────────────────────────────────
function generateDailyLogs(
  activities: Activity[],
  tripStart: Date,
): DailyLog[] {
  if (!activities.length) return [];

  const firstDay = startOfDay(tripStart);
  const lastDay = startOfDay(activities[activities.length - 1].endTime);
  const logs: DailyLog[] = [];
  let dayDate = firstDay;
  let dayNumber = 1;

  while (dayDate <= lastDay) {
    const dayStart = dayDate.getTime();
    const dayEnd = dayStart + 24 * 3_600_000;

    const rawSegments: LogSegment[] = [];
    let totalOffDuty = 0;
    let totalSleeperBerth = 0;
    let totalDriving = 0;
    let totalOnDuty = 0;
    const remarks: string[] = [];

    for (const act of activities) {
      const overlapStart = Math.max(act.startTime.getTime(), dayStart);
      const overlapEnd = Math.min(act.endTime.getTime(), dayEnd);
      if (overlapEnd <= overlapStart) continue;

      const startHour = (overlapStart - dayStart) / 3_600_000;
      const endHour = (overlapEnd - dayStart) / 3_600_000;
      const hrs = endHour - startHour;
      if (hrs < 0.0001) continue;

      let status: LogSegment["status"];
      switch (act.type) {
        case "drive":
          status = "driving";
          totalDriving += hrs;
          break;
        case "on_duty":
          status = "on_duty";
          totalOnDuty += hrs;
          if (act.reason === "pickup")
            remarks.push(`${formatHour(startHour)} - Pickup stop (on duty, 1 hr)`);
          if (act.reason === "dropoff")
            remarks.push(`${formatHour(startHour)} - Dropoff stop (on duty, 1 hr)`);
          break;
        case "fuel":
          status = "on_duty";
          totalOnDuty += hrs;
          remarks.push(`${formatHour(startHour)} - Fuel stop (30 min)`);
          break;
        case "break":
          status = "off_duty";
          totalOffDuty += hrs;
          remarks.push(`${formatHour(startHour)} - Mandatory 30-min HOS break`);
          break;
        case "rest":
        case "sleeper":
          status = "sleeper_berth";
          totalSleeperBerth += hrs;
          remarks.push(`${formatHour(startHour)} - 10-hr mandatory rest (HOS)`);
          break;
        default:
          status = "off_duty";
          totalOffDuty += hrs;
      }

      rawSegments.push({ startHour, endHour, status });
    }

    rawSegments.sort((a, b) => a.startHour - b.startHour);

    // Fill gaps with off_duty
    const filled: LogSegment[] = [];
    let cursor = 0;

    for (const seg of rawSegments) {
      if (seg.startHour > cursor + 0.001) {
        const gapHrs = seg.startHour - cursor;
        totalOffDuty += gapHrs;
        filled.push({ startHour: cursor, endHour: seg.startHour, status: "off_duty" });
      }
      filled.push(seg);
      cursor = seg.endHour;
    }

    if (cursor < 24) {
      const gapHrs = 24 - cursor;
      totalOffDuty += gapHrs;
      filled.push({ startHour: cursor, endHour: 24, status: "off_duty" });
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    logs.push({
      date: dayDate.toISOString().split("T")[0],
      dayNumber: dayNumber++,
      segments: filled,
      totalOffDuty: round2(totalOffDuty),
      totalSleeperBerth: round2(totalSleeperBerth),
      totalDriving: round2(totalDriving),
      totalOnDuty: round2(totalOnDuty),
      remarks,
    });

    dayDate = new Date(dayEnd);
  }

  return logs;
}

// ─── Trip Planner ─────────────────────────────────────────────────────────────
export interface PlannerInput {
  currentLocation: GeocodedLocation;
  pickupLocation: GeocodedLocation;
  dropoffLocation: GeocodedLocation;
  leg1Route: RouteResult; // current → pickup
  leg2Route: RouteResult; // pickup → dropoff
  currentCycleUsed: number;
}

export function generateTripPlan(input: PlannerInput): TripPlan {
  const {
    currentLocation,
    pickupLocation,
    dropoffLocation,
    leg1Route,
    leg2Route,
    currentCycleUsed,
  } = input;

  // ── State ────────────────────────────────────────────────────────────────────
  let clock = new Date();
  const tripStart = new Date(clock);

  let shiftDriveH = 0;
  let shiftWindowStart: Date | null = null;
  let continuousDriveH = 0;
  let cycleHoursUsed = currentCycleUsed;
  let totalMilesDriven = 0;
  let nextFuelAtMile = FUEL_INTERVAL_MILES;

  const stops: Stop[] = [];
  const activities: Activity[] = [];
  let fuelStopCount = 0;
  let restStopCount = 0;

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function advance(hours: number, type: ActivityType, reason?: string): void {
    const start = new Date(clock);
    clock = addHours(clock, hours);
    activities.push({ type, startTime: start, endTime: new Date(clock), hours, reason });
  }

  function ensureWindowStarted(): void {
    if (!shiftWindowStart) {
      shiftWindowStart = new Date(clock);
    }
  }

  function takeRest(coords: [number, number], locationLabel: string): void {
    const arrivalTime = new Date(clock);
    advance(REST_DURATION_H, "sleeper");
    shiftDriveH = 0;
    shiftWindowStart = null;
    continuousDriveH = 0;
    stops.push({
      type: "rest",
      location: locationLabel,
      coordinates: { lat: coords[1], lng: coords[0] },
      arrivalTime,
      duration: REST_DURATION_H,
      distanceFromStart: Math.round(totalMilesDriven),
    });
    restStopCount++;
  }

  function takeBreak(coords: [number, number], locationLabel: string): void {
    const arrivalTime = new Date(clock);
    advance(BREAK_DURATION_H, "break");
    continuousDriveH = 0;
    stops.push({
      type: "break",
      location: locationLabel,
      coordinates: { lat: coords[1], lng: coords[0] },
      arrivalTime,
      duration: BREAK_DURATION_H,
      distanceFromStart: Math.round(totalMilesDriven),
    });
  }

  function takeFuel(coords: [number, number]): void {
    const mileLabel = Math.round(totalMilesDriven);
    const arrivalTime = new Date(clock);
    // fuel stop is on_duty time (not driving)
    advance(FUEL_DURATION_H, "fuel");
    nextFuelAtMile = totalMilesDriven + FUEL_INTERVAL_MILES;
    stops.push({
      type: "fuel",
      location: `Fuel Stop – Mile ${mileLabel}`,
      coordinates: { lat: coords[1], lng: coords[0] },
      arrivalTime,
      duration: FUEL_DURATION_H,
      distanceFromStart: mileLabel,
    });
    fuelStopCount++;
    cycleHoursUsed += FUEL_DURATION_H;
  }

  /**
   * Drive a leg of `legMiles` total miles.
   * routeCoords: the leg's [lng, lat] polyline.
   */
  function driveLeg(
    legMiles: number,
    routeCoords: [number, number][],
  ): void {
    ensureWindowStarted();
    let legMilesLeft = legMiles;
    let legMilesDone = 0;
    const MAX_ITERATIONS = 500; // safety cap
    let iter = 0;

    while (legMilesLeft > 0.01 && iter++ < MAX_ITERATIONS) {
      // ── Safety check: cycle exhausted ──────────────────────────────────────
      if (cycleHoursUsed >= MAX_CYCLE_H) {
        // No legal driving possible; take a mandatory rest regardless
        const pos = coordAtDistance(routeCoords, legMilesDone);
        takeRest(pos, `Rest Area – Mile ${Math.round(totalMilesDriven)} (cycle reset)`);
        // For simplicity treat rest as resetting cycle hours
        // (in reality this requires 34-hr restart; we'll simplify here)
        cycleHoursUsed = currentCycleUsed; // approximate
        ensureWindowStarted();
        continue;
      }

      // ── Check if rest needed ───────────────────────────────────────────────
      const windowUsed = shiftWindowStart ? hoursBetween(shiftWindowStart, clock) : 0;
      if (shiftDriveH >= MAX_DRIVE_H || windowUsed >= MAX_WINDOW_H) {
        const pos = coordAtDistance(routeCoords, legMilesDone);
        takeRest(pos, `Rest Area – Mile ${Math.round(totalMilesDriven)}`);
        ensureWindowStarted();
        continue;
      }

      // ── Check if 30-min break needed ──────────────────────────────────────
      if (continuousDriveH >= BREAK_TRIGGER_H) {
        const pos = coordAtDistance(routeCoords, legMilesDone);
        takeBreak(pos, `Rest Stop – Mile ${Math.round(totalMilesDriven)}`);
        ensureWindowStarted();
        continue;
      }

      // ── How far can we drive before next limit? ────────────────────────────
      const windowRemaining = MAX_WINDOW_H - windowUsed;
      const driveHoursAvail = Math.min(
        MAX_DRIVE_H - shiftDriveH,
        windowRemaining,
        BREAK_TRIGGER_H - continuousDriveH,
        MAX_CYCLE_H - cycleHoursUsed,
      );

      const canDriveMiles = driveHoursAvail * SPEED_MPH;

      // ── How far until next fuel stop? ─────────────────────────────────────
      const milesUntilFuel = nextFuelAtMile - totalMilesDriven;

      // ── Drive the minimum of: available, fuel, leg ────────────────────────
      const driveNow = Math.min(legMilesLeft, canDriveMiles, milesUntilFuel);

      if (driveNow < 0.001) {
        // Edge case: something is 0 — force a rest to avoid infinite loop
        const pos = coordAtDistance(routeCoords, legMilesDone);
        takeRest(pos, `Rest Area – Mile ${Math.round(totalMilesDriven)}`);
        ensureWindowStarted();
        continue;
      }

      const driveHours = driveNow / SPEED_MPH;
      advance(driveHours, "drive");
      shiftDriveH += driveHours;
      continuousDriveH += driveHours;
      cycleHoursUsed += driveHours;
      totalMilesDriven += driveNow;
      legMilesDone += driveNow;
      legMilesLeft -= driveNow;

      // ── Fuel stop if reached ──────────────────────────────────────────────
      if (totalMilesDriven >= nextFuelAtMile - 0.01 && legMilesLeft > 0.01) {
        const pos = coordAtDistance(routeCoords, legMilesDone);
        takeFuel(pos);
        ensureWindowStarted();
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Start stop
  stops.push({
    type: "current",
    location: currentLocation.name,
    coordinates: { lat: currentLocation.lat, lng: currentLocation.lng },
    arrivalTime: new Date(clock),
    duration: 0,
    distanceFromStart: 0,
  });

  // ── Leg 1: Drive current → pickup ─────────────────────────────────────────
  driveLeg(leg1Route.distanceMiles, leg1Route.coordinates);

  // ── Pickup stop ───────────────────────────────────────────────────────────
  const pickupArrival = new Date(clock);
  ensureWindowStarted();
  advance(PICKUP_DURATION_H, "on_duty", "pickup");
  cycleHoursUsed += PICKUP_DURATION_H;
  stops.push({
    type: "pickup",
    location: pickupLocation.name,
    coordinates: { lat: pickupLocation.lat, lng: pickupLocation.lng },
    arrivalTime: pickupArrival,
    duration: PICKUP_DURATION_H,
    distanceFromStart: Math.round(totalMilesDriven),
  });

  // ── Leg 2: Drive pickup → dropoff ─────────────────────────────────────────
  driveLeg(leg2Route.distanceMiles, leg2Route.coordinates);

  // ── Dropoff stop ──────────────────────────────────────────────────────────
  const dropoffArrival = new Date(clock);
  ensureWindowStarted();
  advance(DROPOFF_DURATION_H, "on_duty", "dropoff");
  cycleHoursUsed += DROPOFF_DURATION_H;
  stops.push({
    type: "dropoff",
    location: dropoffLocation.name,
    coordinates: { lat: dropoffLocation.lat, lng: dropoffLocation.lng },
    arrivalTime: dropoffArrival,
    duration: DROPOFF_DURATION_H,
    distanceFromStart: Math.round(totalMilesDriven),
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const totalDistanceMiles =
    leg1Route.distanceMiles + leg2Route.distanceMiles;
  const totalDrivingHours =
    activities
      .filter((a) => a.type === "drive")
      .reduce((s, a) => s + a.hours, 0);
  const totalTripHours = hoursBetween(tripStart, clock);
  const remainingCycleHours = Math.max(0, MAX_CYCLE_H - cycleHoursUsed);

  // ── Combined route geometry ───────────────────────────────────────────────
  // Dedupe the shared pickup point at the boundary
  const combinedCoords: [number, number][] = [
    ...leg1Route.coordinates,
    ...leg2Route.coordinates.slice(1),
  ];

  // ── ELD Daily Logs ────────────────────────────────────────────────────────
  const dailyLogs = generateDailyLogs(activities, tripStart);

  return {
    totalDistanceMiles: Math.round(totalDistanceMiles * 10) / 10,
    totalDrivingHours: Math.round(totalDrivingHours * 100) / 100,
    totalTripHours: Math.round(totalTripHours * 100) / 100,
    estimatedArrival: clock.toISOString(),
    startTime: tripStart.toISOString(),
    remainingCycleHours: Math.round(remainingCycleHours * 100) / 100,
    fuelStopCount,
    restStopCount,
    stops: stops.map((s) => ({
      ...s,
      arrivalTime: s.arrivalTime.toISOString(),
    })),
    dailyLogs,
    routeGeometry: { coordinates: combinedCoords },
  };
}
