"use client";

import { useState, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";

import { seedOpportunities } from "@/lib/seed";
import { useApp } from "@/lib/store";
import type {
  EligibilityCriteria,
  Opportunity,
  OpportunityCategory,
} from "@/lib/types";

type OpportunityDraft = Omit<Opportunity, "id" | "createdAt">;
type ErrorCode = "BAD_INPUT" | "RATE_LIMITED" | "MODEL_ERROR";
type EditableListField = "requiredDocuments" | "tags";

type ParseResponse =
  | {
      ok: true;
      opportunity: OpportunityDraft;
      warnings: string[];
    }
  | {
      ok: false;
      code?: ErrorCode;
    };

const SAMPLE_ANNOUNCEMENT = seedOpportunities(new Date())[0]?.rawText ?? "";

const categoryOptions: OpportunityCategory[] = [
  "competition",
  "internship",
  "scholarship",
  "exchange",
  "research",
  "summer_school",
];

const inputClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy focus:ring-offset-1";

function errorMessage(code: ErrorCode | undefined): string {
  if (code === "BAD_INPUT") {
    return "The announcement is too short. Paste at least a couple of sentences.";
  }
  if (code === "RATE_LIMITED") {
    return "Too many analyses in a short time. Wait a few minutes and try again.";
  }
  return "Could not read this announcement. You can still add it manually.";
}

function fieldQuote(
  opportunity: OpportunityDraft,
  field: string,
): string | null {
  return opportunity.evidence.find((entry) => entry.field === field)?.quote ?? null;
}

function EvidenceNote({
  opportunity,
  field,
}: {
  opportunity: OpportunityDraft;
  field: string;
}) {
  const quote = fieldQuote(opportunity, field);

  return quote === null ? (
    <p className="mt-2 text-xs text-status-needs-verification-foreground">
      No supporting quote — please check
    </p>
  ) : (
    <p className="mt-2 break-words text-xs leading-5 text-slate-500">
      &quot;{quote}&quot;
    </p>
  );
}

function parseNullableNumber(value: string): number | null {
  return value === "" ? null : Number(value);
}

export default function DiscoverPage() {
  const router = useRouter();
  const { addOpportunity } = useApp();
  const [rawText, setRawText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [review, setReview] = useState<OpportunityDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [newCondition, setNewCondition] = useState("");
  const [newDocument, setNewDocument] = useState("");
  const [newTag, setNewTag] = useState("");

  const canAnalyze = rawText.trim().length >= 40;

  function updateEligibility(
    field: keyof EligibilityCriteria,
    value: EligibilityCriteria[keyof EligibilityCriteria],
  ) {
    setReview((current) =>
      current === null
        ? current
        : {
            ...current,
            eligibility: {
              ...current.eligibility,
              [field]: value,
            },
          },
    );
  }

  function updateList(
    field: EditableListField,
    index: number,
    value: string,
  ) {
    setReview((current) => {
      if (current === null) {
        return current;
      }

      const values = [...current[field]];
      values[index] = value;
      return { ...current, [field]: values };
    });
  }

  function removeListItem(
    field: EditableListField,
    index: number,
  ) {
    setReview((current) => {
      if (current === null) {
        return current;
      }

      return {
        ...current,
        [field]: current[field].filter((_, itemIndex) => itemIndex !== index),
      };
    });
  }

  function addListItem(
    field: EditableListField,
    value: string,
  ) {
    const trimmedValue = value.trim();
    if (trimmedValue === "") {
      return;
    }

    setReview((current) =>
      current === null
        ? current
        : {
            ...current,
            [field]: [...current[field], trimmedValue],
          },
    );
  }

  async function handleAnalyze() {
    if (!canAnalyze || loading) {
      return;
    }

    setError(null);
    setReview(null);
    setLoading(true);

    try {
      const response = await fetch("/api/parse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          rawText,
          sourceUrl: sourceUrl.trim() === "" ? null : sourceUrl.trim(),
        }),
      });

      let payload: ParseResponse;
      try {
        payload = (await response.json()) as ParseResponse;
      } catch {
        setError(errorMessage("MODEL_ERROR"));
        return;
      }

      if (!response.ok || !payload.ok) {
        setError(errorMessage(payload.ok ? "MODEL_ERROR" : payload.code));
        return;
      }

      setReview(payload.opportunity);
    } catch {
      setError("Could not reach the server. Check your connection.");
    } finally {
      setLoading(false);
    }
  }

  function handleSave() {
    if (review === null) {
      return;
    }

    const opportunity: Opportunity = {
      ...review,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    addOpportunity(opportunity);
    router.push(`/opportunities/${opportunity.id}`);
  }

  function handleListKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
    field: EditableListField,
    value: string,
    clear: () => void,
  ) {
    if (event.key === "Enter") {
      event.preventDefault();
      addListItem(field, value);
      clear();
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 text-navy">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            Discover
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Analyze an announcement
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Paste a university announcement to extract its opportunity details
            for review.
          </p>
        </div>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <label
            htmlFor="announcement"
            className="text-sm font-semibold text-navy"
          >
            Announcement
          </label>
          <textarea
            id="announcement"
            value={rawText}
            onChange={(event) => setRawText(event.target.value)}
            className={`${inputClassName} mt-2 h-[400px] resize-y leading-6`}
            placeholder="Paste the announcement text here."
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label
                htmlFor="source-url"
                className="text-sm font-semibold text-navy"
              >
                Source URL{" "}
                <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <input
                id="source-url"
                type="url"
                value={sourceUrl}
                onChange={(event) => setSourceUrl(event.target.value)}
                className={`${inputClassName} mt-2`}
                placeholder="https://"
              />
            </div>
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_ANNOUNCEMENT)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              Use sample announcement
            </button>
          </div>
          <div className="mt-5 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze || loading}
              className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {loading ? "Analyzing" : "Analyze"}
            </button>
            {!canAnalyze && (
              <p className="text-sm text-slate-500">
                Add at least 40 characters to enable analysis.
              </p>
            )}
          </div>
          {error !== null && (
            <p
              role="alert"
              className="mt-4 rounded-md border border-status-not-eligible-ring bg-status-not-eligible-background px-4 py-3 text-sm text-status-not-eligible-foreground"
            >
              {error}
            </p>
          )}
        </section>

        {review !== null && (
          <section className="mt-10 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Review
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight">
                  Review and confirm
                </h2>
              </div>
              {review.uncertainFields.length > 0 && (
                <p className="text-sm text-status-needs-verification-foreground">
                  Check the fields marked for verification.
                </p>
              )}
            </div>

            <div className="mt-7 grid gap-6">
              <label className="text-sm font-semibold text-navy">
                Title
                <input
                  value={review.title}
                  onChange={(event) =>
                    setReview({ ...review, title: event.target.value })
                  }
                  className={`${inputClassName} mt-2`}
                />
                <EvidenceNote opportunity={review} field="title" />
              </label>

              <label className="text-sm font-semibold text-navy">
                Category
                <select
                  value={review.category}
                  onChange={(event) =>
                    setReview({
                      ...review,
                      category: event.target.value as OpportunityCategory,
                    })
                  }
                  className={`${inputClassName} mt-2`}
                >
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category.replace("_", " ")}
                    </option>
                  ))}
                </select>
                <EvidenceNote opportunity={review} field="category" />
              </label>

              <label className="text-sm font-semibold text-navy">
                Organizer
                <input
                  value={review.organizer ?? ""}
                  onChange={(event) =>
                    setReview({
                      ...review,
                      organizer:
                        event.target.value === "" ? null : event.target.value,
                    })
                  }
                  className={`${inputClassName} mt-2`}
                />
                <EvidenceNote opportunity={review} field="organizer" />
              </label>

              <label className="text-sm font-semibold text-navy">
                Summary
                <textarea
                  value={review.summary ?? ""}
                  onChange={(event) =>
                    setReview({
                      ...review,
                      summary:
                        event.target.value === "" ? null : event.target.value,
                    })
                  }
                  className={`${inputClassName} mt-2 min-h-28 resize-y leading-6`}
                />
                <EvidenceNote opportunity={review} field="summary" />
              </label>

              <label className="text-sm font-semibold text-navy">
                Deadline
                <input
                  type="date"
                  value={review.deadline ?? ""}
                  onChange={(event) =>
                    setReview({
                      ...review,
                      deadline:
                        event.target.value === "" ? null : event.target.value,
                    })
                  }
                  className={`${inputClassName} mt-2`}
                />
                <EvidenceNote opportunity={review} field="deadline" />
              </label>

              <div>
                <h3 className="text-sm font-semibold text-navy">Eligibility</h3>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Minimum year
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={review.eligibility.minYear ?? ""}
                      onChange={(event) =>
                        updateEligibility(
                          "minYear",
                          parseNullableNumber(event.target.value),
                        )
                      }
                      className={`${inputClassName} mt-2`}
                    />
                    <EvidenceNote
                      opportunity={review}
                      field="eligibility.minYear"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Maximum year
                    <input
                      type="number"
                      min="1"
                      max="4"
                      value={review.eligibility.maxYear ?? ""}
                      onChange={(event) =>
                        updateEligibility(
                          "maxYear",
                          parseNullableNumber(event.target.value),
                        )
                      }
                      className={`${inputClassName} mt-2`}
                    />
                    <EvidenceNote
                      opportunity={review}
                      field="eligibility.maxYear"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Minimum GPA
                    <input
                      type="number"
                      min="0"
                      max="4"
                      step="0.1"
                      value={review.eligibility.minGpa ?? ""}
                      onChange={(event) =>
                        updateEligibility(
                          "minGpa",
                          parseNullableNumber(event.target.value),
                        )
                      }
                      className={`${inputClassName} mt-2`}
                    />
                    <EvidenceNote
                      opportunity={review}
                      field="eligibility.minGpa"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    English test
                    <select
                      value={review.eligibility.englishTest ?? ""}
                      onChange={(event) =>
                        updateEligibility(
                          "englishTest",
                          event.target.value === ""
                            ? null
                            : (event.target.value as "IELTS" | "TOEFL"),
                        )
                      }
                      className={`${inputClassName} mt-2`}
                    >
                      <option value="">Not stated</option>
                      <option value="IELTS">IELTS</option>
                      <option value="TOEFL">TOEFL</option>
                    </select>
                    <EvidenceNote
                      opportunity={review}
                      field="eligibility.englishTest"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Minimum English score
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={review.eligibility.minEnglishScore ?? ""}
                      onChange={(event) =>
                        updateEligibility(
                          "minEnglishScore",
                          parseNullableNumber(event.target.value),
                        )
                      }
                      className={`${inputClassName} mt-2`}
                    />
                    <EvidenceNote
                      opportunity={review}
                      field="eligibility.minEnglishScore"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2">
                    Major requirement
                    <input
                      value={review.eligibility.majorRequirement ?? ""}
                      onChange={(event) =>
                        updateEligibility(
                          "majorRequirement",
                          event.target.value === "" ? null : event.target.value,
                        )
                      }
                      className={`${inputClassName} mt-2`}
                    />
                    <EvidenceNote
                      opportunity={review}
                      field="eligibility.majorRequirement"
                    />
                  </label>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-navy">
                  Other conditions
                </h3>
                <div className="mt-3 grid gap-2">
                  {review.eligibility.otherConditions.map((condition, index) => (
                    <div key={`${condition}-${index}`} className="flex gap-2">
                      <input
                        value={condition}
                        onChange={(event) => {
                          const values = [...review.eligibility.otherConditions];
                          values[index] = event.target.value;
                          updateEligibility("otherConditions", values);
                        }}
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateEligibility(
                            "otherConditions",
                            review.eligibility.otherConditions.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                          )
                        }
                        className="shrink-0 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:border-slate-500 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <input
                    value={newCondition}
                    onChange={(event) => setNewCondition(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || review === null) {
                        return;
                      }
                      event.preventDefault();
                      const trimmedValue = newCondition.trim();
                      if (trimmedValue !== "") {
                        updateEligibility("otherConditions", [
                          ...review.eligibility.otherConditions,
                          trimmedValue,
                        ]);
                        setNewCondition("");
                      }
                    }}
                    placeholder="Add a condition and press Enter"
                    className={inputClassName}
                  />
                </div>
                <EvidenceNote
                  opportunity={review}
                  field="eligibility.otherConditions"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-navy">
                  Required documents
                </h3>
                <div className="mt-3 grid gap-2">
                  {review.requiredDocuments.map((document, index) => (
                    <div key={`${document}-${index}`} className="flex gap-2">
                      <input
                        value={document}
                        onChange={(event) =>
                          updateList(
                            "requiredDocuments",
                            index,
                            event.target.value,
                          )
                        }
                        className={inputClassName}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          removeListItem("requiredDocuments", index)
                        }
                        className="shrink-0 rounded-md border border-slate-300 px-3 text-sm font-semibold text-slate-600 hover:border-slate-500 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <input
                    value={newDocument}
                    onChange={(event) => setNewDocument(event.target.value)}
                    onKeyDown={(event) =>
                      handleListKeyDown(
                        event,
                        "requiredDocuments",
                        newDocument,
                        () => setNewDocument(""),
                      )
                    }
                    placeholder="Add a document and press Enter"
                    className={inputClassName}
                  />
                </div>
                <EvidenceNote
                  opportunity={review}
                  field="requiredDocuments"
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-navy">Tags</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {review.tags.map((tag, index) => (
                    <div
                      key={`${tag}-${index}`}
                      className="flex max-w-full items-center gap-1 rounded-full border border-slate-300 bg-slate-50 pl-3"
                    >
                      <input
                        value={tag}
                        onChange={(event) =>
                          updateList("tags", index, event.target.value)
                        }
                        className="w-28 min-w-0 bg-transparent py-1 text-sm text-navy outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem("tags", index)}
                        className="px-2 py-1 text-xs font-semibold text-slate-500 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <input
                  value={newTag}
                  onChange={(event) => setNewTag(event.target.value)}
                  onKeyDown={(event) =>
                    handleListKeyDown(event, "tags", newTag, () => setNewTag(""))
                  }
                  placeholder="Add a tag and press Enter"
                  className={`${inputClassName} mt-3`}
                />
                <EvidenceNote opportunity={review} field="tags" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-navy">
                  Supporting text
                </h3>
                <p className="mt-2 break-words whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {review.rawText}
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-end border-t border-slate-200 pt-6">
              <button
                type="button"
                onClick={handleSave}
                className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                Save opportunity
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
