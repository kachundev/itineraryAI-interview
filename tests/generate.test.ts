import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { generate, generateFromBody, loadGoldenFixture } from "../src/generate.js";

afterEach(() => {
  delete process.env.XAI_API_KEY;
  delete process.env.FIXTURE_MODE;
});

describe("generate without API key", () => {
  it("returns missing_api_key when no key and fixture mode off", async () => {
    delete process.env.XAI_API_KEY;
    process.env.FIXTURE_MODE = "0";
    const result = await generate({ destination: "Kyoto", dayCount: 3 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.body.error, "missing_api_key");
      assert.equal(result.status, 503);
    }
  });

  it("returns golden fixture when FIXTURE_MODE=1", async () => {
    delete process.env.XAI_API_KEY;
    process.env.FIXTURE_MODE = "1";
    const result = await generate({ destination: "Kyoto", dayCount: 3 });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.itinerary.dayCount, 3);
      assert.equal(result.itinerary.days.length, 3);
    }
  });
});

describe("generateFromBody invalid_input", () => {
  it("maps bad body to 400 invalid_input", async () => {
    const result = await generateFromBody({ destination: "", dayCount: 3 });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.status, 400);
      assert.equal(result.body.error, "invalid_input");
    }
  });
});

describe("loadGoldenFixture", () => {
  it("loads and validates fixture file", async () => {
    const itinerary = await loadGoldenFixture();
    assert.equal(itinerary.destination, "Kyoto");
    assert.equal(itinerary.dayCount, 3);
  });
});
