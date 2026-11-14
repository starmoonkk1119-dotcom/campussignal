import { describe, expect, it } from "vitest";

import { findHighlightRange } from "../lib/highlight";

const RAW = `Northbridge University's Centre for Applied Analytics invites students.

Applicants   must be currently enrolled in year 1 or above. Applications close on 2026-12-01.`;

describe("findHighlightRange", () => {
  it("maps a quote onto exact offsets for a simple case", () => {
    const range = findHighlightRange(RAW, "Applications close on 2026-12-01.");

    expect(range).not.toBeNull();
    expect(RAW.slice(range!.start, range!.end)).toBe(
      "Applications close on 2026-12-01.",
    );
  });

  it("maps a quote that differs only by a collapsed whitespace run", () => {
    const range = findHighlightRange(
      RAW,
      "Applicants must be currently enrolled in year 1 or above.",
    );

    expect(range).not.toBeNull();
    expect(RAW.slice(range!.start, range!.end)).toBe(
      "Applicants   must be currently enrolled in year 1 or above.",
    );
  });

  it("maps a quote that differs only by case", () => {
    const range = findHighlightRange(
      RAW,
      "applicants MUST be currently enrolled in year 1 or above.",
    );

    expect(range).not.toBeNull();
    expect(RAW.slice(range!.start, range!.end)).toContain(
      "Applicants   must",
    );
  });

  it("maps a curly apostrophe quote onto a straight one", () => {
    const range = findHighlightRange(RAW, "Northbridge University’s Centre");

    expect(range).not.toBeNull();
    expect(RAW.slice(range!.start, range!.end)).toBe(
      "Northbridge University's Centre",
    );
  });

  it("returns null rather than guessing when the quote is absent", () => {
    expect(
      findHighlightRange(RAW, "Applicants must be currently enrolled in year 3."),
    ).toBeNull();
    expect(findHighlightRange(RAW, null)).toBeNull();
    expect(findHighlightRange(RAW, "")).toBeNull();
  });

  it("never returns a range outside the source text", () => {
    const range = findHighlightRange(RAW, "Applications close on 2026-12-01.");

    expect(range!.start).toBeGreaterThanOrEqual(0);
    expect(range!.end).toBeLessThanOrEqual(RAW.length);
    expect(range!.end).toBeGreaterThan(range!.start);
  });
});
