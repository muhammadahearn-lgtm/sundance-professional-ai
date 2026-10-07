import { describe, expect, it } from "vitest";
import { RESUME_JSON_SCHEMA, prepareResumeText, sanitizeParsedResume } from "./resume-parse";
import { validateResumeUpload } from "./document-text-extractor";

describe("resume parsing", () => {
  it("rejects files over 5 MB", () => {
    expect(validateResumeUpload({ name: "cv.pdf", type: "application/pdf", size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/);
  });
  it("accepts PDF, DOCX and TXT but not images", () => {
    expect(validateResumeUpload({ name: "cv.pdf", type: "", size: 10 })).toBeNull();
    expect(validateResumeUpload({ name: "cv.docx", type: "", size: 10 })).toBeNull();
    expect(validateResumeUpload({ name: "cv.txt", type: "", size: 10 })).toBeNull();
    expect(validateResumeUpload({ name: "cv.png", type: "image/png", size: 10 })).not.toBeNull();
  });
  it("rejects resumes with too little text", () => {
    expect(prepareResumeText("John Doe").ok).toBe(false);
  });
  it("never throws on malformed AI output and returns empty defaults", () => {
    const r = sanitizeParsedResume("garbage");
    expect(r.job_title).toBe("");
    expect(r.years_experience).toBeNull();
    expect(r.experience).toEqual([]);
  });
  it("clamps years of experience to 0-60", () => {
    expect(sanitizeParsedResume({ years_experience: 99 }).years_experience).toBe(60);
    expect(sanitizeParsedResume({ years_experience: -3 }).years_experience).toBe(0);
  });
  it("dedupes skills case-insensitively", () => {
    expect(sanitizeParsedResume({ tools: ["React", "react", "AWS"] }).tools).toEqual(["React", "AWS"]);
  });
  it("normalizes links and drops invalid ones", () => {
    const r = sanitizeParsedResume({ github_url: "github.com/jane", linkedin_url: "not a url" });
    expect(r.github_url).toBe("https://github.com/jane");
    expect(r.linkedin_url).toBe("");
  });
  it("clears end date for current positions and normalizes partial dates", () => {
    const [e] = sanitizeParsedResume({ experience: [{ company_name: "Acme", job_title: "Engineer", start_date: "2021-03", end_date: "2024-01-01", current_position: true }] }).experience;
    expect(e.start_date).toBe("2021-03-01");
    expect(e.end_date).toBeNull();
  });
  it("only accepts 2-letter country codes", () => {
    expect(sanitizeParsedResume({ location_country: "us" }).location_country).toBe("US");
    expect(sanitizeParsedResume({ location_country: "USA" }).location_country).toBe("US".slice(0, 0) || "");
  });
  it("schema is strict: every object lists all properties as required", () => {
    const check = (s: { type?: unknown; properties?: Record<string, unknown>; required?: string[]; items?: unknown; additionalProperties?: boolean }): void => {
      if (s.properties) {
        expect(s.additionalProperties).toBe(false);
        expect([...(s.required ?? [])].sort()).toEqual(Object.keys(s.properties).sort());
        Object.values(s.properties).forEach((p) => check(p as never));
      }
      if (s.items) check(s.items as never);
    };
    check(RESUME_JSON_SCHEMA as never);
  });
});
