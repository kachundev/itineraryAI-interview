# AI-assisted workflow

## Tools

- **Cursor** (editor + cloud coding agent) for scaffolding, refactors, and PR-sized edits
- **Grok Bot team** (PM / Backend / Prompt / QA roles) for tasking, prompt limits, and acceptance runs
- **xAI API** (`api.x.ai` responses) as the generation backend
- Local **Node 20 + TypeScript** for this screening HTTP boundary (same contract ideas as a larger Edge deployment)

## Steps (what I actually did)

1. **Freeze the contract** — trip input fields, itinerary JSON shape, error codes. AI drafted; I kept only what a reviewer can curl.
2. **Constrain the model** — system prompt Limits (short sentences, soft-fill rules). Targeting “richer copy” / word ranges once caused heavy timeouts; we restored short-sentence Limits and re-verified.
3. **Wire the path** — handler → upstream call → parse → validate → JSON or typed error. Abort ~45s so failures are visible, not hung.
4. **Verify** — sample Kyoto request; count ok vs timeout; check day count and required soft fields.
5. **Cut for submission** — drop FE/auth/DB/community; keep one runnable path + this write-up + one diagram + fixture tests that pass without an API key.

## Approximate time

| Phase | Time |
|---|---|
| Contract + scaffold | ~1 h |
| Prompt / Limits iteration | ~2–3 h |
| Timeout diagnosis + restore short Limits | ~1–2 h |
| Slice repo + docs + diagram + fixture tests | ~1 h |
| **Total (screening-shaped)** | **~5–7 h** of focused work on this path |

*(Larger product history existed around this slice; screening time above is what matters for this brief.)*

## How I checked the result

- **Schema / parse gate**: invalid or partial model text → `parse_error`, not a half-UI.
- **Smoke**: Kyoto-style 3-day generate; success = HTTP 200 + expected `days` length.
- **Regression signal**: batch of ~10 runs — watch `ok` vs `timeout` (target ≥8/10 before calling it good).
- **Error mapping**: missing key, abort, upstream non-OK each have a stable code for the client.
- **Manual spot-check**: one successful JSON against a short checklist:
  - `tripDescription` present (one short sentence)
  - each day has morning / afternoon / evening activities
  - meals soft-filled when sensible
  - `days.length === dayCount`
- **Offline gate for reviewers**: `npm test` validates input parsing, golden fixture shape, and JSON extraction without needing `XAI_API_KEY`.

## Directing AI — two concrete corrections

1. **“Make descriptions richer / target word ranges”** → model slowed down → timeouts spiked. Fix: roll back to **one short sentence** Limits; re-run smoke before any further enrich.
2. **AI suggested more features (UI, ads, community)** → rejected for this deliverable; brief priority is a working path + verifiable workflow, not size.

## What “good enough” meant here

Clone → install → `npm test` (and optionally one curl) → readable JSON or a clear error. Documentation stays short; architecture is one diagram. Project size was treated as a risk, not a goal.
