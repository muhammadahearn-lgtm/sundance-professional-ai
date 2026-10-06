import { describe, expect, it } from "vitest";
import { candidateBoardColumn } from "./talent-rules";
describe("candidate board columns", () => {
  it("viewed and contacted go to In Review", () => { expect(candidateBoardColumn("viewed")).toBe("review"); expect(candidateBoardColumn("recruiter_contacted")).toBe("review"); });
  it("hired and rejected are archived", () => { expect(candidateBoardColumn("hired")).toBe("archived"); expect(candidateBoardColumn("rejected")).toBe("archived"); });
  it("applied stays applied", () => expect(candidateBoardColumn("applied")).toBe("applied"));
  it("interviewing and offer keep their columns", () => { expect(candidateBoardColumn("interviewing")).toBe("interviewing"); expect(candidateBoardColumn("offer")).toBe("offer"); });
});
