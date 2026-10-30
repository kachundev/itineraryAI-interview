import type { Activity, DayPlan, Itinerary, TripInput } from "./types.js";

const TIME_OF_DAY = new Set(["morning", "afternoon", "evening"]);

export function parseTripInput(raw: unknown):
  | { ok: true; value: TripInput }
  | { ok: false; message: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Body must be a JSON object" };
  }
  const obj = raw as Record<string, unknown>;
  const destination = obj.destination;
  const dayCount = obj.dayCount;
  const preferences = obj.preferences;

  if (typeof destination !== "string" || destination.trim().length === 0) {
    return { ok: false, message: "destination must be a non-empty string" };
  }
  if (
    typeof dayCount !== "number" ||
    !Number.isInteger(dayCount) ||
    dayCount < 1 ||
    dayCount > 14
  ) {
    return { ok: false, message: "dayCount must be an integer from 1 to 14" };
  }
  if (
    preferences !== undefined &&
    typeof preferences !== "string" &&
    !(
      Array.isArray(preferences) &&
      preferences.every((p) => typeof p === "string")
    )
  ) {
    return {
      ok: false,
      message: "preferences must be a string or string array when present",
    };
  }

  const value: TripInput = {
    destination: destination.trim(),
    dayCount,
  };
  if (preferences !== undefined) {
    value.preferences = preferences as string | string[];
  }
  return { ok: true, value };
}

function isActivity(a: unknown): a is Activity {
  if (a === null || typeof a !== "object" || Array.isArray(a)) return false;
  const o = a as Record<string, unknown>;
  return (
    typeof o.timeOfDay === "string" &&
    TIME_OF_DAY.has(o.timeOfDay) &&
    typeof o.title === "string" &&
    o.title.length > 0 &&
    typeof o.description === "string" &&
    o.description.length > 0 &&
    (o.tips === undefined || typeof o.tips === "string") &&
    (o.transport === undefined || typeof o.transport === "string")
  );
}

function isDayPlan(d: unknown): d is DayPlan {
  if (d === null || typeof d !== "object" || Array.isArray(d)) return false;
  const o = d as Record<string, unknown>;
  if (typeof o.day !== "number" || !Number.isInteger(o.day) || o.day < 1) {
    return false;
  }
  if (typeof o.title !== "string" || o.title.length === 0) return false;
  if (!Array.isArray(o.activities) || o.activities.length === 0) return false;
  if (!o.activities.every(isActivity)) return false;
  if (o.meals !== undefined) {
    if (o.meals === null || typeof o.meals !== "object" || Array.isArray(o.meals)) {
      return false;
    }
    const m = o.meals as Record<string, unknown>;
    for (const k of ["breakfast", "lunch", "dinner"] as const) {
      if (m[k] !== undefined && typeof m[k] !== "string") return false;
    }
  }
  return true;
}

/** Validate model/fixture output against the itinerary contract. */
export function validateItinerary(
  raw: unknown,
  expected?: { destination?: string; dayCount?: number }
): { ok: true; value: Itinerary } | { ok: false; message: string } {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, message: "Itinerary must be a JSON object" };
  }
  const o = raw as Record<string, unknown>;
  if (typeof o.destination !== "string" || o.destination.length === 0) {
    return { ok: false, message: "destination missing" };
  }
  if (typeof o.dayCount !== "number" || !Number.isInteger(o.dayCount)) {
    return { ok: false, message: "dayCount missing or not an integer" };
  }
  if (typeof o.tripDescription !== "string" || o.tripDescription.length === 0) {
    return { ok: false, message: "tripDescription missing" };
  }
  if (!Array.isArray(o.days) || o.days.length === 0) {
    return { ok: false, message: "days must be a non-empty array" };
  }
  if (!o.days.every(isDayPlan)) {
    return { ok: false, message: "one or more days failed activity/day shape checks" };
  }
  if (o.days.length !== o.dayCount) {
    return {
      ok: false,
      message: `days.length (${o.days.length}) !== dayCount (${o.dayCount})`,
    };
  }
  if (expected?.dayCount !== undefined && o.dayCount !== expected.dayCount) {
    return {
      ok: false,
      message: `expected dayCount ${expected.dayCount}, got ${o.dayCount}`,
    };
  }
  if (
    expected?.destination !== undefined &&
    o.destination.toLowerCase() !== expected.destination.toLowerCase()
  ) {
    return {
      ok: false,
      message: `expected destination ${expected.destination}, got ${o.destination}`,
    };
  }
  return { ok: true, value: o as Itinerary };
}

/** Extract first JSON object from model text (handles fences / preamble). */
export function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in model text");
  }
  return JSON.parse(candidate.slice(start, end + 1));
}
