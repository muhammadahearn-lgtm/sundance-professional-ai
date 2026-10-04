import { describe, expect, it } from "vitest";
import { canAccessPath, dashboardPath, friendlyAuthError, validateRegistration } from "./auth-rules";

const valid = { firstName: "Ada", lastName: "Lovelace", email: "ada@example.com", password: "supersecret", confirm: "supersecret", agreed: true };

describe("role routing", () => {
  it("sends candidates to /candidate/dashboard", () => expect(dashboardPath("candidate")).toBe("/candidate/dashboard"));
  it("sends recruiters to /recruiter/dashboard", () => expect(dashboardPath("recruiter")).toBe("/recruiter/dashboard"));
  it("blocks recruiters from candidate pages", () => expect(canAccessPath("recruiter", "/candidate/jobs")).toBe(false));
  it("blocks candidates from recruiter pages", () => expect(canAccessPath("candidate", "/recruiter/pipeline")).toBe(false));
  it("lets candidates into candidate pages", () => expect(canAccessPath("candidate", "/candidate/settings")).toBe(true));
});

describe("registration validation", () => {
  it("accepts a valid form", () => expect(validateRegistration(valid)).toEqual({}));
  it("requires at least 8 password characters", () => expect(validateRegistration({ ...valid, password: "short12", confirm: "short12" }).password).toBeTruthy());
  it("requires matching passwords", () => expect(validateRegistration({ ...valid, confirm: "different1" }).confirm).toBeTruthy());
  it("requires a valid email", () => expect(validateRegistration({ ...valid, email: "nope" }).email).toBeTruthy());
  it("requires agreeing to terms", () => expect(validateRegistration({ ...valid, agreed: false }).agreed).toBeTruthy());
});

describe("auth errors", () => {
  it("explains duplicate emails", () => expect(friendlyAuthError("User already registered")).toMatch(/already exists/));
  it("explains unverified email", () => expect(friendlyAuthError("Email not confirmed")).toMatch(/verify your email/));
});
