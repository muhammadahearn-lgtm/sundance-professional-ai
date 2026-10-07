import { describe, expect, it } from "vitest";
import { confidentialName, maskCompany } from "./confidential";

describe("confidential search", () => {
  it("hides the real company name and logo on confidential jobs", () => {
    const c = maskCompany({ company_id: "x", company_name: "Apex Robotics", logo_url: "a.png", industry: "AI" }, { is_confidential: true, confidential_label: "Stealth AI Lab" });
    expect(c.company_name).toBe("Stealth AI Lab");
    expect(c.logo_url).toBeNull();
    expect(c.company_id).toBe("confidential");
  });
  it("keeps the company as is when not confidential", () => {
    expect(maskCompany({ company_name: "Apex" }, { is_confidential: false }).company_name).toBe("Apex");
  });
  it("defaults an empty label to Confidential Client", () => {
    expect(confidentialName("  ")).toBe("Confidential Client");
  });
});
