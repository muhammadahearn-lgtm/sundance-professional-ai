import { describe, expect, it } from "vitest";
import { candidateBoardStage } from "./talent-rules";
describe("candidateBoardStage", () => {
  it("groups viewed and contacted as In Review", () => { expect(candidateBoardStage("viewed")).toBe("review"); expect(candidateBoardStage("recruiter_contacted")).toBe("review"); });
  it("keeps interviewing and offer", () => { expect(candidateBoardStage("interviewing")).toBe("interviewing"); expect(candidateBoardStage("offer")).toBe("offer"); });
  it("closes hired and rejected", () => { expect(candidateBoardStage("hired")).toBe("closed"); expect(candidateBoardStage("rejected")).toBe("closed"); });
  it("defaults to applied", () => { expect(candidateBoardStage("applied")).toBe("applied"); });
});
