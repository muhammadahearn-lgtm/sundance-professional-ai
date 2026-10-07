import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RESUME_INSTRUCTIONS, RESUME_JSON_SCHEMA, RESUME_TEXT_MAX, prepareResumeText, sanitizeParsedResume, type ParsedResume } from "./resume-parse";

type Result = { ok: true; resume: ParsedResume } | { ok: false; error: string };

const MESSAGES: Record<number, string> = {
  402: "Resume auto-fill is temporarily unavailable. Please enter your details manually.",
  403: "Resume auto-fill is temporarily unavailable. Please enter your details manually.",
  429: "Lots of people are uploading right now. Please try again in a minute.",
};

/** Reads an SSE Responses stream and returns the final output text. */
async function readOutputText(body: ReadableStream<Uint8Array>): Promise<{ text: string; refused: boolean }> {
  const reader = body.getReader(); const dec = new TextDecoder();
  let buf = ""; let text = ""; let done = ""; let refused = false;
  for (;;) {
    const { value, done: end } = await reader.read();
    if (end) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const ev = JSON.parse(payload) as { type?: string; delta?: string; text?: string };
        if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        else if (ev.type === "response.output_text.done" && typeof ev.text === "string") done = ev.text;
        else if (ev.type === "response.refusal.delta" || ev.type === "response.refusal.done") refused = true;
      } catch { /* ignore partial lines */ }
    }
  }
  return { text: done || text, refused };
}

export const parseResume = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ text: z.string().max(RESUME_TEXT_MAX * 2) }).parse(d))
  .handler(async ({ data, context }): Promise<Result> => {
    const { data: isCandidate } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "candidate" });
    if (!isCandidate) return { ok: false, error: "Only candidate accounts can auto-fill from a resume." };
    const prep = prepareResumeText(data.text);
    if (!prep.ok) return prep;
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { ok: false, error: "Resume auto-fill isn't configured yet. Please enter your details manually." };

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          instructions: RESUME_INSTRUCTIONS,
          input: [{ role: "user", content: `Resume text:\n"""\n${prep.text}\n"""` }],
          stream: true, store: false,
          reasoning: { effort: "low" },
          text: { format: { type: "json_schema", name: "parsed_resume", strict: true, schema: RESUME_JSON_SCHEMA } },
        }),
      });
    } catch (e) {
      console.error("resume parse network error", e);
      return { ok: false, error: "We couldn't reach the resume reader. Please try again." };
    }
    if (!res.ok || !res.body) {
      console.error("resume parse gateway error", res.status, await res.text().catch(() => ""));
      return { ok: false, error: MESSAGES[res.status] ?? "We couldn't read this resume. Please try again or enter your details manually." };
    }
    const { text, refused } = await readOutputText(res.body);
    if (refused || !text) return { ok: false, error: "We couldn't read this resume. Please enter your details manually." };
    try {
      return { ok: true, resume: sanitizeParsedResume(JSON.parse(text)) };
    } catch {
      return { ok: false, error: "We couldn't read this resume. Please try again or enter your details manually." };
    }
  });
