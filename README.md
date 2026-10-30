# Itinerary Generator (interview slice)

A small TypeScript HTTP service that turns trip constraints into a **validated itinerary JSON**.

Built as a **thin slice** for an AI-assisted screening: one happy path, clear run instructions, and an explicit verification loop—not a full product dump.

Public repo target: [kachundev/itineraryAI-interview](https://github.com/kachundev/itineraryAI-interview)

## Why this project

Reviewers care about directing AI and checking output efficiently. This repo keeps only:

- one request → one structured response
- schema/validation as the acceptance gate
- documented AI workflow and known limits

It is **not** the production travel app (React + Supabase Edge + Vercel). That larger product inspired this slice; screening deliverable stays small on purpose.

## Requirements

- Node.js 20+
- An xAI API key (`XAI_API_KEY`) for **live** generation  
  *(Fixture / `npm test` works without a key.)*

Optional: Docker / Docker Compose.

## Run in 5 minutes

```bash
cp .env.example .env   # set XAI_API_KEY if you want live calls
npm install
npm start
```

Happy path (live key required unless `FIXTURE_MODE=1`):

```bash
curl -s localhost:8787/generate \
  -H 'content-type: application/json' \
  -d @samples/kyoto-3day.json | jq .
```

Without a live key, verify the contract:

```bash
npm test
```

Demo without a key (optional):

```bash
FIXTURE_MODE=1 npm start
# same curl — returns fixtures/kyoto-3day-response.json shaped output
```

### Docker

```bash
docker compose up --build
# then the same curl against localhost:8787
```

## API

| Method | Path | Notes |
|---|---|---|
| `GET` | `/health` | `{ "ok": true }` |
| `POST` | `/generate` | Trip JSON in → itinerary JSON or typed error |

**Request**

```json
{
  "destination": "Kyoto",
  "dayCount": 3,
  "preferences": ["temples", "food"]
}
```

`preferences` is optional (string or string array). `dayCount` must be an integer 1–14.

**Success (200)** — itinerary object with `destination`, `dayCount`, `tripDescription`, `days[]` (each day has morning/afternoon/evening activities; meals soft-filled).

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
src/            # HTTP handler, prompt Limits, xAI call, parse/validate
samples/        # example request body
fixtures/       # golden Kyoto response (tests + FIXTURE_MODE)
tests/          # schema + error-path checks (no API key required)
docs/           # architecture (mermaid)
AI_WORKFLOW.md  # tools, steps, time, how we verified
```

## Known limits

- Upstream call is aborted around **45s**; long prompts increase timeout risk.
- Activity copy is kept to **short sentences** on purpose (latency vs richness trade-off).
- Model output can refuse or return unparsable text; those map to explicit error codes.
- This slice does **not** include auth, database persistence, ads, community, or the full web UI.

## How to verify

1. `npm test` — fixture/schema path passes (no API key).
2. Live: Kyoto 3-day sample returns HTTP 200 and JSON with `days.length === 3`.
3. Bad input (missing destination / invalid `dayCount`) returns `invalid_input` with 400.
4. Compare one live response against the field checklist in `AI_WORKFLOW.md`.

## Pushing this folder to GitHub

If you received this directory (or zip) to upload yourself to an empty-ish public repo:

```bash
cd itineraryAI-interview
git init
git add .
git commit -m "Initial interview slice: generate path + docs + fixture tests"
git branch -M main
git remote add origin https://github.com/kachundev/itineraryAI-interview.git
# If GitHub already has a stub README, pull/rebase or allow unrelated histories once:
# git pull origin main --allow-unrelated-histories
git push -u origin main
```

Do **not** point this remote at the production `ItineraryAI` repo.

## Note on scope

The production app is larger. This submission deliberately freezes a **single vertical slice** so reviewers can clone, run, and judge the AI workflow without wading through product history.
