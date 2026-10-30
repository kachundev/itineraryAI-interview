import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  extractJsonObject,
  parseTripInput,
  validateItinerary,
} from "../src/validate.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("parseTripInput", () => {
  it("accepts Kyoto sample shape", async () => {
    const sample = JSON.parse(
      await readFile(join(root, "samples", "kyoto-3day.json"), "utf8")
    );
    const parsed = parseTripInput(sample);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.equal(parsed.value.destination, "Kyoto");
      assert.equal(parsed.value.dayCount, 3);
    }
  });

  it("rejects missing destination", () => {
    const parsed = parseTripInput({ dayCount: 3 });
    assert.equal(parsed.ok, false);
  });

  it("rejects out-of-range dayCount", () => {
    const parsed = parseTripInput({ destination: "Kyoto", dayCount: 0 });
    assert.equal(parsed.ok, false);
  });

  it("rejects non-object body", () => {
    const parsed = parseTripInput([]);
    assert.equal(parsed.ok, false);
  });
});

describe("validateItinerary + golden fixture", () => {
  it("golden Kyoto fixture passes schema and dayCount", async () => {
    const raw = JSON.parse(
      await readFile(join(root, "fixtures", "kyoto-3day-response.json"), "utf8")
    );
    const checked = validateItinerary(raw, {
      destination: "Kyoto",
      dayCount: 3,
    });
    assert.equal(checked.ok, true);
    if (checked.ok) {
      assert.equal(checked.value.days.length, 3);
      for (const day of checked.value.days) {
        assert.ok(day.activities.length >= 3);
      }
    }
  });

  it("rejects days.length mismatch", () => {
    const checked = validateItinerary({
      destination: "Kyoto",
      dayCount: 2,
      tripDescription: "x",
      days: [
        {
          day: 1,
          title: "A",
          activities: [
            {
              timeOfDay: "morning",
              title: "t",
              description: "d",
            },
          ],
        },
      ],
    });
    assert.equal(checked.ok, false);
  });
});

describe("extractJsonObject", () => {
  it("parses fenced JSON", () => {
    const obj = extractJsonObject('Here:\n```json\n{"a":1}\n```');
    assert.deepEqual(obj, { a: 1 });
  });

  it("parses raw object with preamble", () => {
    const obj = extractJsonObject('Sure. {"destination":"Kyoto","ok":true}');
    assert.deepEqual(obj, { destination: "Kyoto", ok: true });
  });

  it("throws when no object", () => {
    assert.throws(() => extractJsonObject("no json here"));
  });
});
