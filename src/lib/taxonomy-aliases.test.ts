import { describe, expect, it } from "vitest";
import { closeMatch, optionMatches, resolveAlias } from "./taxonomy-aliases";

describe("taxonomy aliases", () => {
  it("resolves XL to Excel", () => expect(resolveAlias("XL")).toBe("Excel"));
  it("resolves k8s to Kubernetes", () => expect(resolveAlias("k8s")).toBe("Kubernetes"));
  it("search for XL shows the Excel option", () => expect(optionMatches({ name: "Excel" }, "xl")).toBe(true));
  it("catches a typo of an existing entry", () => expect(closeMatch("Dokcer", [{ name: "Docker" }, { name: "Django" }])?.name).toBe("Docker"));
  it("does not flag unrelated short words", () => expect(closeMatch("Go", [{ name: "Git" }])).toBeNull());
});
