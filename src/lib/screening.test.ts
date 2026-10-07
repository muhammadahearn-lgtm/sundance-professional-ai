import { describe, expect, it } from "vitest";
import { answerFit, equitySummary, fromPreset, validateAnswers, validateEquity, validateQuestions, type ScreeningQ } from "./screening";

const q = (p: Partial<ScreeningQ>): ScreeningQ => ({ id: "q1", text: "Do you need a visa?", type: "yes_no", options: [], ideal: "", required: true, ...p });

describe("screening", () => {
  it("requires answers to required questions", () => {
    expect(validateAnswers([q({})], {})).toEqual({ q1: "Please answer this question." });
  });
  it("allows optional questions to be skipped", () => {
    expect(validateAnswers([q({ required: false })], {})).toEqual({});
  });
  it("rejects answers outside the yes/no options", () => {
    expect(validateAnswers([q({})], { q1: "Maybe" })["q1"]).toBe("Pick one of the options.");
  });
  it("needs at least two options for choice questions", () => {
    expect(validateQuestions([q({ type: "choice", options: ["Only one"] })])["q1"]).toBe("Add at least two answer options.");
  });
  it("flags answers that differ from the preferred answer", () => {
    expect(answerFit({ ideal: "No" }, "Yes")).toBe("mismatch");
    expect(answerFit({ ideal: "No" }, "no")).toBe("match");
    expect(answerFit({ ideal: "" }, "Yes")).toBeNull();
  });
  it("notice preset offers four start options", () => {
    expect(fromPreset("notice")?.options).toEqual(["Immediately", "2 weeks", "1 month", "2+ months"]);
  });
});

describe("equity", () => {
  it("shows nothing when there is no equity", () => {
    expect(equitySummary({ equity_type: "none", equity_range: "1%" })).toBe("");
  });
  it("summarises type and range", () => {
    expect(equitySummary({ equity_type: "percentage", equity_range: "0.1% – 0.5%" })).toBe("Equity % · 0.1% – 0.5%");
  });
  it("limits range to 80 characters", () => {
    expect(validateEquity({ equity_type: "rsu", equity_range: "x".repeat(81), equity_vesting: "" }).equity_range).toBeTruthy();
  });
});
