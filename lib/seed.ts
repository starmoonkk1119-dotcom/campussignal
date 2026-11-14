import type { Opportunity, UserProfile } from "./types";

function midnightLocal(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function addDays(value: Date, days: number): Date {
  const result = midnightLocal(value);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCreatedAt(value: Date): string {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
    12,
  ).toISOString();
}

export function seedProfile(): UserProfile {
  return {
    name: "Demo Student",
    studyYear: 2,
    major: "Business Analytics",
    gpa: 3.4,
    gpaScale: "4.0",
    englishTest: "IELTS",
    englishScore: 7,
    skills: ["python", "sql", "data analysis", "case competition"],
    interests: ["consulting", "fintech"],
    weeklyHours: 8,
  };
}

// Deadlines are relative to load time so the demo stays sensible however long the project lives.
export function seedOpportunities(today: Date): Opportunity[] {
  const baseDate = midnightLocal(today);
  const caseCompetitionDeadline = formatDate(addDays(baseDate, 12));
  const internshipDeadline = formatDate(addDays(baseDate, 20));
  const scholarshipDeadline = formatDate(addDays(baseDate, 4));
  const createdAt = buildCreatedAt(baseDate);

  const caseCompetitionDeadlineQuote = `Applications close on ${caseCompetitionDeadline} at 11:59 p.m.`;
  const internshipDeadlineQuote = `Applications close on ${internshipDeadline} at 5:00 p.m.`;
  const scholarshipDeadlineQuote = `Applications close on ${scholarshipDeadline} at 5:00 p.m.`;

  const caseCompetitionYearQuote =
    "Applicants must be currently enrolled in year 1 or above.";
  const caseCompetitionGpaQuote =
    "Applicants must have a cumulative GPA of 3.0 or above on a 4.0 scale.";
  const caseCompetitionEnglishQuote =
    "Applicants must provide an IELTS score of at least 6.5.";
  const caseCompetitionDocumentsQuote =
    "Please upload a current CV and complete the application form.";

  const internshipYearQuote =
    "Applicants must be currently enrolled in year 3 or above.";
  const internshipGpaQuote =
    "Applicants must have a cumulative GPA of 3.2 or above on a 4.0 scale.";
  const internshipEnglishQuote =
    "Applicants must provide an IELTS score of at least 6.5.";

  const researchDeadlineQuote =
    "The closing date will be confirmed in late November.";

  const scholarshipYearQuote =
    "Applicants must be currently enrolled in year 1 or above.";
  const scholarshipGpaQuote =
    "A cumulative GPA of 3.0 or above is required.";
  const scholarshipDocumentsQuote =
    "Submit a personal statement, one recommendation letter, and an official transcript.";

  return [
    {
      id: "seed-data-for-good-case-challenge",
      title: "Northbridge Data for Good Case Challenge",
      category: "competition",
      organizer: "Northbridge University Centre for Applied Analytics",
      summary:
        "An undergraduate case competition focused on turning public-service data into practical recommendations.",
      sourceUrl: null,
      deadline: caseCompetitionDeadline,
      rawText: `Northbridge University's Centre for Applied Analytics invites undergraduate students to enter the 2026 Northbridge Data for Good Case Challenge. Teams will examine a practical problem supplied by a local public-service partner and present a concise recommendation to a panel of faculty and industry judges. The challenge is designed for students who enjoy turning messy information into clear business decisions.

${caseCompetitionYearQuote} ${caseCompetitionGpaQuote} ${caseCompetitionEnglishQuote} ${caseCompetitionDeadlineQuote} ${caseCompetitionDocumentsQuote} Shortlisted teams will receive the case materials after registration, and the final presentation workshop will be held on campus during the week before judging.`,
      eligibility: {
        minYear: 1,
        maxYear: null,
        minGpa: 3,
        englishTest: "IELTS",
        minEnglishScore: 6.5,
        majorRequirement: null,
        otherConditions: [],
      },
      requiredDocuments: ["CV", "Application form"],
      tags: ["case competition", "data analysis", "business", "python"],
      uncertainFields: [],
      evidence: [
        { field: "eligibility.minYear", quote: caseCompetitionYearQuote },
        { field: "eligibility.minGpa", quote: caseCompetitionGpaQuote },
        { field: "eligibility.englishTest", quote: caseCompetitionEnglishQuote },
        {
          field: "eligibility.minEnglishScore",
          quote: caseCompetitionEnglishQuote,
        },
        { field: "deadline", quote: caseCompetitionDeadlineQuote },
        {
          field: "requiredDocuments",
          quote: caseCompetitionDocumentsQuote,
        },
      ],
      createdAt,
    },
    {
      id: "seed-westbridge-consulting-internship",
      title: "Westbridge Strategy Consulting Analyst Internship",
      category: "internship",
      organizer: "Westbridge University School of Management",
      summary:
        "A consulting internship for students interested in client research, structured problem solving, and data analysis.",
      sourceUrl: null,
      deadline: internshipDeadline,
      rawText: `Westbridge University School of Management is accepting applications for its 2026 Strategy Consulting Analyst Internship. Interns will support small project teams working with regional companies on market-entry, pricing, and operating-model questions. The programme includes structured training in client communication, spreadsheet modelling, and case preparation, with opportunities to attend supervised client briefings.

${internshipYearQuote} ${internshipGpaQuote} ${internshipEnglishQuote} ${internshipDeadlineQuote} The selection committee will look for evidence of consulting interest, data analysis, and disciplined case preparation. The internship is open to students who can commit to three full days each week during the placement period and who are comfortable working in a collaborative office environment.`,
      eligibility: {
        minYear: 3,
        maxYear: null,
        minGpa: 3.2,
        englishTest: "IELTS",
        minEnglishScore: 6.5,
        majorRequirement: null,
        otherConditions: [],
      },
      requiredDocuments: ["CV", "Cover letter"],
      tags: ["consulting", "data analysis", "case"],
      uncertainFields: [],
      evidence: [
        { field: "eligibility.minYear", quote: internshipYearQuote },
        { field: "eligibility.minGpa", quote: internshipGpaQuote },
        { field: "eligibility.englishTest", quote: internshipEnglishQuote },
        { field: "eligibility.minEnglishScore", quote: internshipEnglishQuote },
        { field: "deadline", quote: internshipDeadlineQuote },
      ],
      createdAt,
    },
    {
      id: "seed-east-harbor-research-assistantship",
      title: "East Harbor Community Research Assistantship",
      category: "research",
      organizer: "East Harbor University Office of Social Research",
      summary:
        "A supervised research assistantship supporting interviews and literature review for a community finance study.",
      sourceUrl: null,
      deadline: null,
      rawText: `East Harbor University's Office of Social Research is inviting expressions of interest for a part-time research assistantship on household financial resilience. Assistants will help organize interview notes, review academic literature, and prepare clear summaries for a faculty-led project studying how families respond to changes in employment and access to credit. Training will be provided before any participant-facing work begins.

The announcement is intended for students who can work carefully with confidential material and communicate questions promptly to the research team. The project is open to undergraduates across all years and disciplines, and prior research experience is welcome but not required; the office assesses applicants on the quality of their written summary rather than on their grade average. ${researchDeadlineQuote} Interested students should review the project description and contact the office for the full timetable, supervision arrangements, and application instructions before submitting materials.`,
      eligibility: {
        minYear: null,
        maxYear: null,
        minGpa: null,
        englishTest: null,
        minEnglishScore: null,
        majorRequirement: null,
        otherConditions: [],
      },
      requiredDocuments: ["CV", "Short statement of interest"],
      tags: ["research", "fintech", "data analysis"],
      uncertainFields: [
        "GPA requirement not stated",
        "Deadline described only as late November",
      ],
      evidence: [{ field: "deadline", quote: researchDeadlineQuote }],
      createdAt,
    },
    {
      id: "seed-meridian-future-leaders-scholarship",
      title: "Meridian Future Leaders Scholarship",
      category: "scholarship",
      organizer: "Meridian University Scholarship Office",
      summary:
        "A scholarship for students who can connect academic achievement with practical leadership and community impact.",
      sourceUrl: null,
      deadline: scholarshipDeadline,
      rawText: `Meridian University's Scholarship Office invites applications for the 2026 Future Leaders Scholarship. The award supports undergraduate students who have demonstrated initiative in a student society, community project, or part-time role and who can explain how their education will contribute to a more inclusive economy. Shortlisted applicants will be invited to a brief online conversation with the selection panel.

${scholarshipYearQuote} ${scholarshipGpaQuote} ${scholarshipDeadlineQuote} ${scholarshipDocumentsQuote} The personal statement should describe one specific leadership experience, the decision the applicant made, and the result that followed. Recommendation letters should comment on reliability and follow-through, while the transcript must show the applicant's current programme and completed coursework.`,
      eligibility: {
        minYear: 1,
        maxYear: null,
        minGpa: 3,
        englishTest: null,
        minEnglishScore: null,
        majorRequirement: null,
        otherConditions: [],
      },
      requiredDocuments: [
        "Personal statement",
        "Recommendation letter",
        "Transcript",
      ],
      tags: ["scholarship", "leadership", "business", "fintech"],
      uncertainFields: [],
      evidence: [
        { field: "eligibility.minYear", quote: scholarshipYearQuote },
        { field: "eligibility.minGpa", quote: scholarshipGpaQuote },
        { field: "deadline", quote: scholarshipDeadlineQuote },
        {
          field: "requiredDocuments",
          quote: scholarshipDocumentsQuote,
        },
      ],
      createdAt,
    },
  ];
}
