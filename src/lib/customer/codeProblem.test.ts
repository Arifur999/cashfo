import { describe, expect, it } from "vitest";
import { codeProblem } from "./codeProblem";

describe("codeProblem", () => {
  it("counts the tries left on a wrong code", () => {
    expect(codeProblem({ reason: "CODE_WRONG", attemptsLeft: 3 })).toEqual({ message: "That code is not right. {count} tries left.", values: { count: 3 }, gone: false });
    expect(codeProblem({ reason: "CODE_WRONG", attemptsLeft: 1 })).toEqual({ message: "That code is not right. {count} try left.", values: { count: 1 }, gone: false });
    expect(codeProblem({ reason: "CODE_WRONG" })).toEqual({ message: "That code is not right.", gone: false });
  });

  it("says only a new code helps after the last try or when the code lapsed", () => {
    expect(codeProblem({ reason: "CODE_WRONG", attemptsLeft: 0 }).gone).toBe(true);
    expect(codeProblem({ reason: "CODE_EXPIRED" })).toEqual({ message: "This code has expired. Start again to get a new one.", gone: true });
    expect(codeProblem({ reason: "TOO_MANY_SENDS" }).gone).toBe(true);
  });

  it("words the phone's own refusals, and keeps the API's message otherwise", () => {
    expect(codeProblem({ reason: "PHONE_TAKEN" })).toEqual({ message: "This number is already verified on another account.", gone: false });
    expect(codeProblem({ reason: "SOMETHING_NEW", message: "Server says no" })).toEqual({ message: "Server says no", gone: false });
    expect(codeProblem({})).toEqual({ message: "Something went wrong. Please try again.", gone: false });
  });
});
