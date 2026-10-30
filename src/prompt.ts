import type { TripInput } from "./types.js";

/**
 * Short-sentence Limits keep latency predictable.
 * Longer "target word range" prompts previously caused timeout spikes in production smoke.
 */
export const SYSTEM_PROMPT = `You are a travel itinerary planner. Reply with ONE JSON object only — no markdown, no preamble.

Schema:
{
  "destination": string,
  "dayCount": number,
  "tripDescription": string,
  "days": [{
    "day": number,
    "title": string,
    "activities": [{
      "timeOfDay": "morning" | "afternoon" | "evening",
      "title": string,
      "description": string,
      "tips"?: string,
      "transport"?: string
    }],
    "meals"?: { "breakfast"?: string, "lunch"?: string, "dinner"?: string }
  }]
}

Limits (hard — prefer completeness over flourish):
- tripDescription: ONE short sentence (≤ ~70 words).
- Each activity description: ONE short sentence (≤ ~55 words).
- tips / transport: ONE short sentence each when present (≤ ~45 / ~40 words).
- Soft-fill: every day has morning+afternoon+evening activities; include meals when sensible for the destination.
- days.length MUST equal dayCount; day numbers 1..dayCount.
- Realistic places and pacing; respect preferences when given.
`;

export function buildUserPrompt(input: TripInput): string {
  const prefs = Array.isArray(input.preferences)
    ? input.preferences.join(", ")
    : input.preferences ?? "(none)";
  return [
    `Destination: ${input.destination}`,
    `Days: ${input.dayCount}`,
    `Preferences: ${prefs}`,
    "Return the itinerary JSON now.",
  ].join("\n");
}
