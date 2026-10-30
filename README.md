# Itinerary Generator (screening submission)

Candidate work for an AI-assisted technical screen: I used AI tools to deliver a **small, runnable** TypeScript service and an explicit way to verify it.

**What this proves:** I can direct AI under constraints, catch bad output with validation, and keep scope small enough for a reviewer to clone and check in minutes—not that I shipped a full travel product.

**Suggested review order (≈10 min):**
1. `npm install && npm test` (no API key)
2. [`AI_WORKFLOW.md`](./AI_WORKFLOW.md) — tools, steps, time, how I verified
3. [`docs/architecture.md`](./docs/architecture.md) — one diagram

Repo: [kachundev/itineraryAI-interview](https://github.com/kachundev/itineraryAI-interview)

## Why this slice

I chose one vertical path—**trip constraints → validated itinerary JSON**—because it forces the hard parts of AI work (prompt limits, parse failures, timeouts) without a large UI or infra surface.

Deliberately cut: auth, database, ads, community, full web app. Inspired by a larger travel prototype; **this repo is the screening deliverable**.

## Requirements

- Node.js 20+
- **No API key needed** for the default check (`npm test`)
- Optional: `XAI_API_KEY` for live generation; Docker / Compose for containerized run

## Verify first (no API key)

```bash
npm install
npm test
```

Expected: all tests pass (schema, happy fixture path, invalid input → `invalid_input`).

## Optional: run the server

```bash
cp .env.example .env
# leave XAI_API_KEY empty and use fixture mode, or set a key for live calls
FIXTURE_MODE=1 npm start
```

```bash
curl -s localhost:8787/generate \
  -H 'content-type: application/json' \
  -d @samples/kyoto-3day.json | jq .
```

With a real `XAI_API_KEY` in `.env`, omit `FIXTURE_MODE` for live generation.

### Docker (optional)

```bash
docker compose up --build
# same curl against localhost:8787
```

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | `{ "ok": true }` |
| `POST` | `/generate` | Trip JSON → itinerary JSON or typed error |

**Request**

```json
{
  "destination": "Kyoto",
  "dayCount": 3,
  "preferences": ["temples", "food"]
}
```

`preferences` is optional. `dayCount` is an integer 1–14.

**Success (200)** — abbreviated example:

```json
{
  "destination": "Kyoto",
  "dayCount": 3,
  "tripDescription": "A compact three-day Kyoto walk…",
  "days": [
    {
      "day": 1,
      "title": "Higashiyama classics",
      "activities": [
        {
          "timeOfDay": "morning",
          "title": "Kiyomizu-dera",
          "description": "Visit the wooden terrace early…",
          "tips": "Wear shoes you can slip off…",
          "transport": "Bus to Gojozaka…"
        }
      ],
      "meals": {
        "breakfast": "Cafe near your hotel",
        "lunch": "Nishiki-adjacent noodles",
        "dinner": "Kaiseki-light or izakaya in Gion"
      }
    }
  ]
}
```

Full golden shape: `fixtures/kyoto-3day-response.json`.

**Errors**

| HTTP | `error` code | When |
|---|---|---|
| 400 | `invalid_input` | Bad/missing fields or non-JSON body |
| 503 | `missing_api_key` | No `XAI_API_KEY` and fixture mode off |
| 504 | `timeout` | Upstream aborted (~45s default) |
| 502 | `parse_error` | Model text not valid itinerary JSON |
| 502 | `upstream_error` | xAI HTTP/network failure |

## Layout

```
src/              HTTP handler, prompt Limits, xAI, parse/validate
samples/          example request
fixtures/         golden Kyoto response (tests + FIXTURE_MODE)
tests/            no API key required
docs/             architecture (mermaid)
AI_WORKFLOW.md    tools, steps, time, verification
```

## Known limits

- Upstream abort ~**45s**; longer prompts raise timeout risk.
- Activity copy stays **short sentences** on purpose (latency vs richness).
- Model refusals / unparsable text map to stable error codes—not a half response.
- No auth, persistence, or full UI in this submission.

## How I checked “good enough”

1. `npm test` green without a key  
2. Live (optional): Kyoto 3-day → 200 and `days.length === 3`  
3. Bad input → `invalid_input` / 400  
4. Spot-check fields against the checklist in `AI_WORKFLOW.md`
