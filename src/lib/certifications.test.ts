import { describe, expect, it } from "vitest";
import { certKey, exactCatalogMatch, normalizeCertName, searchCatalog, type CatalogCert } from "./certifications";

const PMP: CatalogCert = { catalog_id: "1", name: "Project Management Professional", abbreviation: "PMP", issuer: "Project Management Institute (PMI)", category: "Project Management", aliases: ["Project Manager Professional"] };
const CKA: CatalogCert = { catalog_id: "2", name: "Certified Kubernetes Administrator", abbreviation: "CKA", issuer: "The Linux Foundation (CNCF)", category: "DevOps", aliases: [] };
const list = [PMP, CKA];

describe("certification governance", () => {
  it("ignores case and word order", () => {
    expect(certKey("professional MANAGEMENT project")).toBe(certKey("Project Management Professional"));
  });
  it("abbreviation maps to the catalog entry", () => {
    expect(exactCatalogMatch(list, "pmp")?.catalog_id).toBe("1");
  });
  it("reordered, pluralized wording surfaces the right certification", () => {
    expect(searchCatalog(list, "Professionals Manager Project")[0]?.catalog_id).toBe("1");
  });
  it("custom names are cleaned to Title Case", () => {
    expect(normalizeCertName("  ADVANCED   widget  builder ")).toBe("Advanced Widget Builder");
  });
});
