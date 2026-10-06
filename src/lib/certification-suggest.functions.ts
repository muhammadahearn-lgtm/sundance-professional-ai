import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CertSuggestion = { catalog_name: string; name: string; issuer: string; failed?: boolean };

const SCHEMA = {
  type: "object", additionalProperties: false,
  properties: { catalog_name: { type: "string" }, name: { type: "string" }, issuer: { type: "string" } },
  required: ["catalog_name", "name", "issuer"],
};

const INSTRUCTIONS = `You clean up professional certification names typed by job candidates (they may misspell, abbreviate, reorder words, or change case).
If the input clearly refers to one entry in the provided catalog, set catalog_name to that exact catalog name.
Otherwise set catalog_name to "" and give the official, correctly spelled full certification name and its official issuing organization (empty issuer if unknown).
Never invent a certification: if the input is unrecognizable, return it cleaned up in Title Case.`;

/** Suggests the official certification for a typed name. Never blocks saving. */
export const suggestCertification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { name: string }) => {
    const name = String(input?.name ?? "").trim().slice(0, 150);
    if (!name) throw new Error("Name required");
    return { name };
  })
  .handler(async ({ data, context }): Promise<CertSuggestion> => {
    const fallback: CertSuggestion = { catalog_name: "", name: data.name, issuer: "", failed: true };
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return fallback;
    try {
      const { data: cat } = await context.supabase.from("certification_catalog").select("name, abbreviation");
      const catalog = (cat ?? []).map((c) => (c.abbreviation ? `${c.name} [${c.abbreviation}]` : c.name)).join("\n");
      const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra", instructions: INSTRUCTIONS,
          input: `Catalog:\n${catalog}\n\nTyped: ${data.name}`,
          stream: true, store: false, reasoning: { effort: "low" },
          text: { format: { type: "json_schema", name: "cert_suggestion", strict: true, schema: SCHEMA } },
        }),
      });
      if (!res.ok || !res.body) { console.error("cert suggest failed", res.status); return fallback; }
      const reader = res.body.getReader(); const dec = new TextDecoder();
      let buf = "", text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n"); buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const p = line.slice(5).trim();
          if (!p || p === "[DONE]") continue;
          try { const ev = JSON.parse(p); if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") text += ev.delta; } catch { /* ignore */ }
        }
      }
      const r = JSON.parse(text) as CertSuggestion;
      return { catalog_name: String(r.catalog_name ?? "").slice(0, 150), name: String(r.name ?? data.name).slice(0, 150), issuer: String(r.issuer ?? "").slice(0, 150) };
    } catch (e) { console.error("cert suggest error", e); return fallback; }
  });
