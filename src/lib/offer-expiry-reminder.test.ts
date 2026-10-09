import { describe, it, expect } from "vitest";
import { offerExpiringSoon } from "./offer-rules";
const t = "2026-10-09";
describe("offer expiry reminder window", () => {
  it("flags pending offers due tomorrow", () => expect(offerExpiringSoon({ status: "pending", expires_on: "2026-10-10" }, t)).toBe(true));
  it("flags pending offers due today", () => expect(offerExpiringSoon({ status: "pending", expires_on: t }, t)).toBe(true));
  it("ignores offers due in 2 days", () => expect(offerExpiringSoon({ status: "pending", expires_on: "2026-10-11" }, t)).toBe(false));
  it("ignores expired offers", () => expect(offerExpiringSoon({ status: "pending", expires_on: "2026-10-08" }, t)).toBe(false));
  it("ignores accepted offers", () => expect(offerExpiringSoon({ status: "accepted", expires_on: t }, t)).toBe(false));
  it("ignores offers with an open extension request", () => expect(offerExpiringSoon({ status: "pending", expires_on: t, extension_status: "requested" }, t)).toBe(false));
});
