import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClassifyResult = { category: "skill" | "technology"; reason: string; canonicalName?: string; valid?: boolean; failed?: boolean };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: { type: "string", enum: ["skill", "technology"] },
    reason: { type: "string" },
    canonical_name: { type: "string" },
    valid: { type: "boolean" },
  },
  required: ["category", "reason", "canonical_name", "valid"],
};

const INSTRUCTIONS = `You classify tech terms for a hiring platform into exactly one bucket.
"technology" = an instrument you install, import, or log into: libraries, frameworks, SDKs, databases, cloud platforms/services, software products, developer tools (e.g. JAX, PyTorch, Docker, AWS Lambda, PostgreSQL, Jira, Snowflake).
"skill" = a concept, discipline, methodology, or practice (e.g. Machine Learning, Distributed Systems, API Design, Data Modeling, CI/CD, System Design).
Also return canonical_name: the official, most common industry spelling and capitalization (e.g. "fastapi" -> "FastAPI", "nodejs" -> "Node.js", "XL" -> "Excel", "k8s" -> "Kubernetes"; fix obvious typos; expand slang/abbreviations to the standard name; no version numbers; max 60 chars).
valid = false if the term is not a recognized professional technical skill or software/tool (gibberish, a sentence, a personality trait or soft skill like "hard worker", a person or company name, a joke).
Reply with the category, canonical_name, valid, and one short plain-English sentence (max 20 words) saying what the term is (or why it isn't valid).`;

/** Suggests whether a brand-new term is a Technical Skill or a Tool & Technology. Never blocks adding. */
export const classifyTaxonomyTerm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    const name = String(input?.name ?? "").trim().slice(0, 60);
    if (!name) throw new Error("Name required");
    return { name };
  })
  .handler(async ({ data }): Promise<ClassifyResult> => {
    const key = process.env["LOVABLE_API_KEY"];
    const fallback: ClassifyResult = { category: "skill", reason: "", failed: true };
    if (!key) return fallback;
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra",
          instructions: INSTRUCTIONS,
          input: `Term: ${data.name}`,
          stream: true,
          store: false,
          reasoning: { effort: "low" },
          text: { format: { type: "json_schema", name: "taxonomy_category", strict: true, schema: SCHEMA } },
        }),
      });
      if (!res.ok || !res.body) { console.error("classify failed", res.status, await res.text().catch(() => "")); return fallback; }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "", text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try { const ev = JSON.parse(payload); if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta; } catch { /* ignore */ }
        }
      }
      const parsed = JSON.parse(text) as { category?: string; reason?: string; canonical_name?: string; valid?: boolean };
      if (parsed.category !== "skill" && parsed.category !== "technology") return fallback;
      const canon = String(parsed.canonical_name ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
      return { category: parsed.category, reason: String(parsed.reason ?? "").slice(0, 160), canonicalName: canon || data.name, valid: parsed.valid !== false };
    } catch (e) {
      console.error("classify error", e);
      return fallback;
    }
  });
