import { describe, expect, it } from "vitest";
import { descriptionTemplate, recommendationsFor, splitRecommended } from "./role-recommendations";

describe("role recommendations", () => {
  it("Data Scientist languages follow the spec", () => {
    expect(recommendationsFor("Data Scientist", "language")).toEqual(["Python", "SQL", "R", "Scala", "Julia"]);
  });
  it("unknown role gives no recommendations", () => {
    expect(recommendationsFor("Chef", "skill")).toEqual([]);
  });
  it("recommended first, all others still available alphabetically", () => {
    const opts = [{ name: "Ada" }, { name: "SQL" }, { name: "Python" }, { name: "Bash" }];
    const { rec, rest } = splitRecommended(opts, ["Python", "SQL", "Julia"]);
    expect(rec.map((o) => o.name)).toEqual(["Python", "SQL"]);
    expect(rest.map((o) => o.name)).toEqual(["Ada", "Bash"]);
  });
  it("Frontend Engineer bundle includes React", () => {
    expect(recommendationsFor("Frontend Engineer", "technology")).toContain("React");
  });
  it("description template names the role and is empty without one", () => {
    expect(descriptionTemplate("Backend Engineer")).toContain("Backend Engineer");
    expect(descriptionTemplate("")).toBe("");
  });
});
