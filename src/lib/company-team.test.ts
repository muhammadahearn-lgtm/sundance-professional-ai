import { describe, expect, it } from "vitest";
import { canDemote, canRemove, isLastAdmin, type TeamMember } from "./company-team";

const m = (user_id: string, role: "admin" | "member"): TeamMember => ({ user_id, role, name: user_id, created_at: "" });

describe("isLastAdmin", () => {
  it("is true for the only admin", () => {
    expect(isLastAdmin([m("a", "admin"), m("b", "member")], "a")).toBe(true);
  });
  it("is false when another admin exists", () => {
    expect(isLastAdmin([m("a", "admin"), m("b", "admin")], "a")).toBe(false);
  });
  it("is false for plain members", () => {
    expect(isLastAdmin([m("a", "admin"), m("b", "member")], "b")).toBe(false);
  });
});

describe("canDemote", () => {
  const team = [m("a", "admin"), m("b", "admin"), m("c", "member")];
  it("lets an admin demote another admin", () => {
    expect(canDemote("admin", team[1]!, team)).toBe(true);
  });
  it("never demotes the last admin", () => {
    const solo = [m("a", "admin"), m("c", "member")];
    expect(canDemote("admin", solo[0]!, solo)).toBe(false);
  });
  it("members cannot demote anyone", () => {
    expect(canDemote("member", team[1]!, team)).toBe(false);
  });
});

describe("canRemove", () => {
  const team = [m("a", "admin"), m("b", "admin"), m("c", "member")];
  it("lets an admin remove a member", () => {
    expect(canRemove("admin", "a", team[2]!, team)).toBe(true);
  });
  it("lets an admin remove another admin", () => {
    expect(canRemove("admin", "a", team[1]!, team)).toBe(true);
  });
  it("never removes yourself", () => {
    expect(canRemove("admin", "a", team[0]!, team)).toBe(false);
  });
  it("never removes the last admin", () => {
    const solo = [m("a", "admin"), m("c", "member")];
    expect(canRemove("admin", "c", solo[0]!, solo)).toBe(false);
  });
  it("members cannot remove anyone", () => {
    expect(canRemove("member", "c", team[2]!, team)).toBe(false);
  });
});
