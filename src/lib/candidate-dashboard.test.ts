import { describe, expect, it } from "vitest";
import { applicationMetrics, buildActivity, statusBreakdown, type AppLite } from "./candidate-dashboard";

const a = (status: string, date: string): AppLite => ({ application_id: date + status, application_date: date, application_status: status, updated_at: date, job_title: "Job" });
const apps = [a("applied", "2026-10-02T00:00:00Z"), a("offer", "2026-10-01T00:00:00Z"), a("hired", "2026-09-10T00:00:00Z"), a("rejected", "2026-08-01T00:00:00Z")];

describe("candidate dashboard", () => {
  it("counts applications from real statuses", () => {
    expect(applicationMetrics(apps, new Date("2026-10-04T00:00:00Z"))).toEqual({ total: 4, thisMonth: 2, active: 2, offers: 1, hires: 1, rejected: 1 });
  });
  it("breaks down all 7 statuses", () => {
    const b = statusBreakdown(apps);
    expect(b).toHaveLength(7);
    expect(b.find((x) => x.key === "viewed")?.n).toBe(0);
  });
  it("orders activity newest first", () => {
    const acts = buildActivity({ apps: [], saved: [{ saved_date: "2026-01-01", job_title: "A" }], skills: [{ created_at: "2026-02-01", name: "SQL" }], certs: [], profileUpdatedAt: null });
    expect(acts.map((x) => x.text)).toEqual(["Added skill SQL", "Saved A"]);
  });
});
