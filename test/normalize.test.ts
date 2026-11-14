import { describe, expect, it } from "vitest";

import {
  canonicalizeEvidenceField,
  optionalNullFields,
  sanitizeUncertainFields,
} from "../lib/normalize";

describe("canonicalizeEvidenceField", () => {
  it("promotes a bare eligibility leaf to a dot path", () => {
    expect(canonicalizeEvidenceField("minYear")).toBe("eligibility.minYear");
    expect(canonicalizeEvidenceField("minGpa")).toBe("eligibility.minGpa");
    expect(canonicalizeEvidenceField("minEnglishScore")).toBe(
      "eligibility.minEnglishScore",
    );
  });

  it("leaves an already canonical path alone", () => {
    expect(canonicalizeEvidenceField("eligibility.minGpa")).toBe(
      "eligibility.minGpa",
    );
  });

  it("leaves top-level fields untouched", () => {
    expect(canonicalizeEvidenceField("deadline")).toBe("deadline");
    expect(canonicalizeEvidenceField("requiredDocuments")).toBe(
      "requiredDocuments",
    );
  });
});

describe("sanitizeUncertainFields", () => {
  it("drops bare identifiers the model emitted instead of notes", () => {
    const result = sanitizeUncertainFields(
      ["maxYear", "organizer", "summary"],
      ["maxYear", "organizer", "summary"],
    );

    expect(result).toEqual([]);
  });

  it("keeps a real sentence and de-duplicates it", () => {
    const result = sanitizeUncertainFields(
      [
        "GPA requirement not stated",
        "GPA requirement not stated",
        "Deadline described only as late November",
      ],
      [],
    );

    expect(result).toEqual([
      "GPA requirement not stated",
      "Deadline described only as late November",
    ]);
  });

  it("drops an optional field even when it arrives as a bare leaf", () => {
    expect(sanitizeUncertainFields(["majorRequirement"], [])).toEqual([]);
  });
});

describe("optionalNullFields", () => {
  it("lists only the fields that are actually null", () => {
    expect(
      optionalNullFields({
        maxYear: null,
        organizer: "Northbridge",
        summary: null,
        majorRequirement: null,
      }),
    ).toEqual(["maxYear", "summary", "majorRequirement"]);
  });
});
