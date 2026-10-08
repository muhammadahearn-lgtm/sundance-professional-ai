import { describe, expect, it } from "vitest";
import { parseTheme, resolveTheme } from "./theme";

describe("theme", () => {
  it("defaults to following the browser setting", () => {
    expect(parseTheme(null)).toBe("system");
    expect(parseTheme("weird")).toBe("system");
  });
  it("system follows the browser", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });
  it("manual choice overrides the browser", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});
