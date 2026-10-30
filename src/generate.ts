import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { extractJsonObject, parseTripInput, validateItinerary } from "./validate.js";
import { callXai } from "./xai.js";
import type { GenerateResult, Itinerary, TripInput } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export function timeoutMsFromEnv(): number {
  const n = Number(process.env.GENERATE_TIMEOUT_MS ?? "45000");
  return Number.isFinite(n) && n > 0 ? n : 45000;
}

export async function loadGoldenFixture(): Promise<Itinerary> {
  const path = join(ROOT, "fixtures", "kyoto-3day-response.json");
  const raw = JSON.parse(await readFile(path, "utf8"));
  const checked = validateItinerary(raw, { destination: "Kyoto", dayCount: 3 });
  if (!checked.ok) {
    throw new Error(`Golden fixture invalid: ${checked.message}`);
  }
  return checked.value;
}

/**
 * Core generate path used by the HTTP server.
 * - invalid body → invalid_input 400
 * - no key + FIXTURE_MODE=1 → golden Kyoto fixture (demo only)
 * - no key → missing_api_key 503
 * - live: xAI → parse → validate
 */
export async function generateFromBody(raw: unknown): Promise<GenerateResult> {
  const parsed = parseTripInput(raw);
  if (!parsed.ok) {
    return {
      ok: false,
      status: 400,
      body: { error: "invalid_input", message: parsed.message },
    };
  }
  return generate(parsed.value);
}

export async function generate(input: TripInput): Promise<GenerateResult> {
  const apiKey = process.env.XAI_API_KEY?.trim() ?? "";
  const fixtureMode = process.env.FIXTURE_MODE === "1";

  if (!apiKey) {
    if (fixtureMode) {
      const itinerary = await loadGoldenFixture();
      // Soft-adapt destination/dayCount labels for demo curl; days stay Kyoto-shaped.
      return {
        ok: true,
        itinerary: {
          ...itinerary,
          destination: input.destination,
          dayCount: itinerary.dayCount,
        },
      };
    }
    return {
      ok: false,
      status: 503,
      body: {
        error: "missing_api_key",
        message:
          "Set XAI_API_KEY in .env for live generation, or FIXTURE_MODE=1 for the golden demo response",
      },
    };
  }

  const upstream = await callXai(input, {
    apiKey,
    timeoutMs: timeoutMsFromEnv(),
  });

  if (!upstream.ok) {
    if (upstream.kind === "timeout") {
      return {
        ok: false,
        status: 504,
        body: { error: "timeout", message: upstream.message },
      };
    }
    return {
      ok: false,
      status: 502,
      body: { error: "upstream_error", message: upstream.message },
    };
  }

  let json: unknown;
  try {
    json = extractJsonObject(upstream.text);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: 502,
      body: { error: "parse_error", message },
    };
  }

  const checked = validateItinerary(json, {
    destination: input.destination,
    dayCount: input.dayCount,
  });
  if (!checked.ok) {
    return {
      ok: false,
      status: 502,
      body: { error: "parse_error", message: checked.message },
    };
  }

  return { ok: true, itinerary: checked.value };
}
