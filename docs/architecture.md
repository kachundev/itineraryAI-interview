# Architecture

One vertical slice: HTTP → prompt + xAI → parse/validate → JSON or typed error.

```mermaid
flowchart LR
  Client["Client / curl"] -->|POST /generate| Handler["Node HTTP handler"]
  Handler --> ValidateIn["Validate trip input"]
  ValidateIn -->|invalid_input 400| Client
  ValidateIn --> KeyCheck{"XAI_API_KEY?"}
  KeyCheck -->|no + FIXTURE_MODE| Fixture["Golden fixture"]
  KeyCheck -->|no| Missing["missing_api_key 503"]
  KeyCheck -->|yes| XAI["xAI Responses API"]
  XAI -->|abort ~45s| Timeout["timeout 504"]
  XAI -->|HTTP/network fail| Upstream["upstream_error 502"]
  XAI -->|text| Parse["Extract JSON + schema validate"]
  Parse -->|shape fail| ParseErr["parse_error 502"]
  Parse -->|ok| OK["Itinerary JSON 200"]
  Fixture --> OK
  Missing --> Client
  Timeout --> Client
  Upstream --> Client
  ParseErr --> Client
  OK --> Client
```

## Notes

- **Timeout**: `GENERATE_TIMEOUT_MS` (default `45000`) aborts the upstream fetch so the client gets `timeout` instead of hanging.
- **Limits**: system prompt asks for short sentences to keep latency predictable (see `src/prompt.ts`).
- **No auth / DB / UI** in this slice — intentional for screening scope.
