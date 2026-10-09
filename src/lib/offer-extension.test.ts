import { describe, expect, it } from "vitest";
import { canRequestExtension, extensionDate } from "./offer-rules";

const today = "2026-10-09";
describe("offer extensions", () => {
  it("allows a request on a pending offer before the deadline", () => {
    expect(canRequestExtension({ status: "pending", expires_on: "2026-10-12" }, today)).toBe(true);
  });
  it("allows a request up to 2 days after expiry, not 3", () => {
    expect(canRequestExtension({ status: "pending", expires_on: "2026-10-07" }, today)).toBe(true);
    expect(canRequestExtension({ status: "pending", expires_on: "2026-10-06" }, today)).toBe(false);
  });
  it("blocks a second open request and decided offers", () => {
    expect(canRequestExtension({ status: "pending", expires_on: "2026-10-12", extension_status: "requested" }, today)).toBe(false);
    expect(canRequestExtension({ status: "accepted", expires_on: "2026-10-12" }, today)).toBe(false);
  });
  it("extends from the later of deadline or today", () => {
    expect(extensionDate("2026-10-12", today, 3)).toBe("2026-10-15");
    expect(extensionDate("2026-10-07", today, 3)).toBe("2026-10-12");
  });
});
