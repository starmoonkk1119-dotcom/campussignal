import { describe, expect, it } from "vitest";

import { normalizeForMatch, quoteAppearsIn } from "../lib/evidence";

describe("quoteAppearsIn", () => {
  it("returns true for an exact match", () => {
    expect(
      quoteAppearsIn(
        "Applicants must submit a CV.",
        "Applicants must submit a CV.",
      ),
    ).toBe(true);
  });

  it("ignores whitespace, case, and smart quote variants", () => {
    expect(
      quoteAppearsIn(
        "“Applicants must submit a student’s CV.”",
        "Applicants   must submit a student's CV.",
      ),
    ).toBe(true);
  });

  it("returns false for a paraphrase", () => {
    expect(
      quoteAppearsIn(
        "Students need to submit a CV.",
        "Applicants must submit a CV.",
      ),
    ).toBe(false);
  });

  it("returns false when separate sentences are merged", () => {
    expect(
      quoteAppearsIn(
        "Applicants must submit a CV and provide a transcript.",
        "Applicants must submit a CV. Applicants must provide a transcript.",
      ),
    ).toBe(false);
  });

  it("returns false for an empty quote", () => {
    expect(quoteAppearsIn("", "Applicants must submit a CV.")).toBe(false);
    expect(normalizeForMatch("   ")).toBe("");
  });
});
