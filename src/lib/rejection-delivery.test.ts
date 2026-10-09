import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { rejectionDeliverAt, isRejectionPending, DEFAULT_REJECTION_TIMING } from "./rejection-delivery";

const now = new Date(2026, 9, 9, 22, 30);

describe("rejection delivery timing", () => {
  it("defaults to a 24-hour buffer", () => expect(DEFAULT_REJECTION_TIMING).toBe("24h"));
  it("24h is exactly one day later", () => expect(rejectionDeliverAt("24h", now)!.getTime() - now.getTime()).toBe(86_400_000));
  it("morning is next day at 9:00", () => {
    const d = rejectionDeliverAt("morning", now)!;
    expect([d.getDate(), d.getHours(), d.getMinutes()]).toEqual([10, 9, 0]);
  });
  it("now sends immediately", () => expect(rejectionDeliverAt("now", now)).toBeNull());
  it("pending only before delivery and when not yet sent", () => {
    const later = new Date(now.getTime() + 3600_000).toISOString();
    expect(isRejectionPending(later, null, now)).toBe(true);
    expect(isRejectionPending(later, now.toISOString(), now)).toBe(false);
    expect(isRejectionPending(new Date(now.getTime() - 1).toISOString(), null, now)).toBe(false);
  });
});
