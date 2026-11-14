import type { ParsedOpportunity } from "./parseSchema";

type DemoOpportunityFixture = ParsedOpportunity & {
  rawText: string;
};

export function getDemoOpportunity(): DemoOpportunityFixture {
  const yearEvidenceQuote =
    "Applicants must be currently enrolled in year 1 or above.";
  const conditionsEvidenceQuote =
    "Applicants should describe how the proposed project will benefit a defined student or community group.";
  const documentsEvidenceQuote =
    "Please submit a short project proposal and a current CV.";

  return {
    title: "Northbridge Student Innovation Grant",
    category: "scholarship",
    organizer: "Northbridge University Innovation Office",
    summary:
      "A small grant for undergraduate students developing practical ideas with measurable campus or community impact.",
    deadline: null,
    eligibility: {
      minYear: 1,
      maxYear: null,
      minGpa: null,
      englishTest: null,
      minEnglishScore: null,
      majorRequirement: null,
      otherConditions: [
        conditionsEvidenceQuote,
      ],
    },
    requiredDocuments: ["Project proposal", "CV"],
    tags: ["innovation", "community", "student projects"],
    uncertainFields: ["GPA requirement not stated", "Deadline not stated"],
    rawText: `The Northbridge University Innovation Office invites undergraduate students to apply for the Student Innovation Grant. The programme supports practical ideas that improve campus life or respond to a clearly defined community need, and selected applicants will receive mentoring from staff members who have experience in project delivery.

${yearEvidenceQuote} ${conditionsEvidenceQuote} ${documentsEvidenceQuote} The review timetable will be published on the Innovation Office website once the current funding round opens; applicants who need an earlier answer should contact the office directly.`,
    evidence: [
      {
        field: "eligibility.minYear",
        quote: yearEvidenceQuote,
      },
      {
        field: "eligibility.otherConditions",
        quote: conditionsEvidenceQuote,
      },
      {
        field: "requiredDocuments",
        quote: documentsEvidenceQuote,
      },
    ],
  };
}
