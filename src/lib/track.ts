import { supabase } from "@/integrations/supabase/client";

export type TrackEvent = "job_view" | "recommendation_view" | "recommendation_click" | "candidate_view";

/** Fire-and-forget usage event; at most one per user, event, item and day. Never throws. */
export function track(type: TrackEvent, ids: string | string[]) {
  const list = [...new Set(Array.isArray(ids) ? ids : [ids])].filter(Boolean);
  if (!list.length) return;
  void supabase.from("analytics_events")
    .upsert(list.map((entity_id) => ({ event_type: type, entity_id })), { onConflict: "user_id,event_type,entity_id,event_date", ignoreDuplicates: true })
    .then(() => undefined, () => undefined);
}
