export type OpportunityCategory =
  | "competition"
  | "internship"
  | "scholarship"
  | "exchange"
  | "research"
  | "summer_school";

export type EligibilityStatus = "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_VERIFICATION";

export type EnglishTest = "IELTS" | "TOEFL";

export interface EligibilityCriteria {
  minYear: number | null;        // 1-4, undergraduate year of study
  maxYear: number | null;
  minGpa: number | null;         // on a 4.0 scale ONLY
  englishTest: EnglishTest | null;
  minEnglishScore: number | null;
  majorRequirement: string | null;   // free text, advisory only, never a hard fail
  otherConditions: string[];         // free text, shown to the user as-is
}

export interface EvidenceEntry {
  field: string;   // dot path, e.g. "eligibility.minGpa"
  quote: string;   // EXACT substring of Opportunity.rawText
}

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  organizer: string | null;
  summary: string | null;
  sourceUrl: string | null;
  deadline: string | null;            // ISO date, "YYYY-MM-DD", null if not stated
  rawText: string;
  eligibility: EligibilityCriteria;
  requiredDocuments: string[];
  tags: string[];                     // lowercase keywords for relevance matching
  uncertainFields: string[];          // human-readable notes, e.g. "GPA requirement not stated"
  evidence: EvidenceEntry[];
  createdAt: string;                  // ISO datetime
}

export interface UserProfile {
  name: string;
  studyYear: number;                  // 1-4
  major: string;
  gpa: number;                        // 4.0 scale
  gpaScale: "4.0";                    // v1 supports only this value
  englishTest: EnglishTest | null;
  englishScore: number | null;
  skills: string[];
  interests: string[];                // free text keywords, lowercased on save
  weeklyHours: number;                // hours per week the student can commit
}

export interface MatchResult {
  status: EligibilityStatus;
  score: number;                      // 0-100, ordering only, never a probability
  breakdown: { G: number; Y: number; R: number; T: number };
  reasons: string[];                  // plain-English explanations, max 4
  blockers: string[];                 // hard-fail explanations, empty unless NOT_ELIGIBLE
  verificationNotes: string[];        // what is missing or ambiguous
}

export type TaskPriority = "high" | "medium" | "low";

export interface ApplicationTask {
  id: string;
  opportunityId: string;
  name: string;
  dueDate: string;      // ISO date
  status: "todo" | "done";
  priority: TaskPriority;
  isCustom: boolean;
}

export interface AppState {
  profile: UserProfile | null;
  opportunities: Opportunity[];
  tasks: ApplicationTask[];
}
