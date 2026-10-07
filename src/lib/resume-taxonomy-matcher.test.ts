import { describe, expect, it } from "vitest";
import { sanitizeParsedResume } from "./resume-parse";
import { degreeTypeFor, matchCountry, matchResume, matchRole, type Catalogs } from "./resume-taxonomy-matcher";

const o = (names: string[], p: string) => names.map((name, i) => ({ id: `${p}${i}`, name }));
const cat: Catalogs = {
  languages: o(["JavaScript", "TypeScript", "Python", "Go", "C#", "C++", "SQL"], "l"),
  skills: o(["Machine Learning", "REST APIs", "ETL", "Data Modeling"], "s"),
  technologies: o(["React", "Node.js", "Vue.js", "AWS", "Kubernetes", "PostgreSQL", "Spark", "Google Cloud", "Docker"], "t"),
  softSkills: o(["Communication", "Leadership"], "x"),
  roles: o(["Data Engineer", "Software Engineer", "Frontend Engineer", "Full Stack Engineer"], "r"),
  certifications: [{ catalog_id: "c1", name: "AWS Certified Solutions Architect – Associate", abbreviation: "SAA", issuer: "Amazon Web Services", category: "Cloud", aliases: ["AWS Solutions Architect Associate"] }],
  countries: ["United States", "Canada", "Pakistan"],
};
const run = (p: object) => matchResume(sanitizeParsedResume(p), cat);
const names = (xs: { name: string }[]) => xs.map((x) => x.name);

describe("resume taxonomy matcher", () => {
  it("ReactJS becomes React", () => expect(names(run({ tools: ["ReactJS"] }).technologies)).toEqual(["React"]));
  it("matches common spellings: NodeJS, Vue, Postgres, K8s, GCP", () =>
    expect(names(run({ tools: ["NodeJS", "Vue", "Postgres", "K8s", "GCP"] }).technologies)).toEqual(["Node.js", "Vue.js", "PostgreSQL", "Kubernetes", "Google Cloud"]));
  it("matches language aliases: JS, Golang, C Sharp", () =>
    expect(names(run({ programming_languages: ["JS", "Golang", "C Sharp"] }).languages)).toEqual(["JavaScript", "Go", "C#"]));
  it("moves an item to the catalog where it actually exists", () => {
    const r = run({ technical_skills: ["React"], tools: ["Python"] });
    expect(names(r.technologies)).toEqual(["React"]);
    expect(names(r.languages)).toEqual(["Python"]);
    expect(r.skills).toEqual([]);
  });
  it("dedupes React and ReactJS to one entry", () => expect(run({ tools: ["React", "ReactJS", "react.js"] }).technologies).toHaveLength(1));
  it("unknown items are returned as unmatched, unknown languages offered as technologies", () => {
    const r = run({ tools: ["Weaviate"], programming_languages: ["Zig"] });
    expect(r.unmatched).toEqual([{ kind: "technology", name: "Weaviate" }, { kind: "technology", name: "Zig" }]);
  });
  it("picks up known tools mentioned only in work history", () =>
    expect(names(run({ experience: [{ company_name: "A", job_title: "B", technologies_used: ["Docker", "SomeInternalTool"] }] }).technologies)).toEqual(["Docker"]));
  it("strips seniority when matching roles", () => expect(matchRole("Senior Data Engineer", cat.roles)?.name).toBe("Data Engineer"));
  it("maps degrees to the fixed list", () => {
    expect(degreeTypeFor("B.S.")).toBe("Bachelor's Degree");
    expect(degreeTypeFor("MSc Computer Science")).toBe("Master's Degree");
    expect(degreeTypeFor("PhD")).toBe("Doctorate (PhD)");
  });
  it("maps ISO country code to governed country name", () => expect(matchCountry("US", cat.countries)).toBe("United States"));
  it("links certifications to the catalog by alias", () =>
    expect(run({ certifications: [{ certification_name: "AWS Solutions Architect Associate" }] }).certifications[0]?.catalog?.catalog_id).toBe("c1"));
});
