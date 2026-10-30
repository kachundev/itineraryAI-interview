import { buildUserPrompt, SYSTEM_PROMPT } from "./prompt.js";
import type { TripInput } from "./types.js";

const DEFAULT_MODEL = "grok-4-1-fast-non-reasoning";
const XAI_URL = "https://api.x.ai/v1/responses";

export type UpstreamCall =
  | { ok: true; text: string }
  | { ok: false; kind: "timeout" | "upstream_error"; message: string };

/**
 * Call xAI Responses API. Aborts at timeoutMs (~45s by default).
 * Response text is taken from output_text or concatenated message content.
 */
export async function callXai(
  input: TripInput,
  opts: { apiKey: string; model?: string; timeoutMs: number }
): Promise<UpstreamCall> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

  try {
    const res = await fetch(XAI_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${opts.apiKey}`,
      },
      body: JSON.stringify({
        model: opts.model ?? process.env.XAI_MODEL ?? DEFAULT_MODEL,
        input: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(input) },
        ],
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        kind: "upstream_error",
        message: `xAI HTTP ${res.status}: ${body.slice(0, 200)}`,
      };
    }

    const data = (await res.json()) as Record<string, unknown>;
    const text = extractOutputText(data);
    if (!text) {
      return {
        ok: false,
        kind: "upstream_error",
        message: "xAI response had no output text",
      };
    }
    return { ok: true, text };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        kind: "timeout",
        message: `Upstream aborted after ${opts.timeoutMs}ms`,
      };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, kind: "upstream_error", message };
  } finally {
    clearTimeout(timer);
  }
}

function extractOutputText(data: Record<string, unknown>): string | null {
  if (typeof data.output_text === "string" && data.output_text.length > 0) {
    return data.output_text;
  }
  const output = data.output;
  if (!Array.isArray(output)) return null;
  const parts: string[] = [];
  for (const item of output) {
    if (item === null || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      if (c === null || typeof c !== "object") continue;
      const block = c as { type?: string; text?: string };
      if (
        (block.type === "output_text" || block.type === "text") &&
        typeof block.text === "string"
      ) {
        parts.push(block.text);
      }
    }
  }
  const joined = parts.join("\n").trim();
  return joined.length > 0 ? joined : null;
}
