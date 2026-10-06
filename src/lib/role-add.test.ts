import { describe, expect, it } from "vitest";
import { newRoleName, stripLevelPrefix } from "./role-add";

const opts = [{ name: "Data Engineer" }, { name: "Software Engineer" }];

describe("role add governance", () => {
  it("strips seniority words", () => expect(stripLevelPrefix("Senior Lead Firmware Engineer")).toBe("Firmware Engineer"));
  it("blocks an existing role typed with a level", () => expect(newRoleName("senior data engineer", opts)).toBeNull());
  it("offers a genuinely new role in Title Case", () => expect(newRoleName("quantum software engineer", opts)).toBe("Quantum Software Engineer"));
  it("rejects names over 60 characters", () => expect(newRoleName("a".repeat(61), opts)).toBeNull());
});
