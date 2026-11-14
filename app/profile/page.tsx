"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";

import EligibilityBadge from "@/components/EligibilityBadge";
import { evaluateEligibility } from "@/lib/rules";
import { useApp } from "@/lib/store";
import type { EnglishTest, UserProfile } from "@/lib/types";

const TODAY = new Date();

type FormValues = {
  name: string;
  studyYear: string;
  major: string;
  gpa: string;
  englishTest: "" | EnglishTest;
  englishScore: string;
  skills: string;
  interests: string;
  weeklyHours: string;
};

type FormErrors = Partial<
  Record<"studyYear" | "gpa" | "englishScore" | "weeklyHours", string>
>;

const inputClassName =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy outline-none transition placeholder:text-slate-400 focus:border-navy focus:ring-2 focus:ring-navy focus:ring-offset-1";

function profileToFormValues(profile: UserProfile | null): FormValues {
  return {
    name: profile?.name ?? "",
    studyYear: profile === null ? "" : String(profile.studyYear),
    major: profile?.major ?? "",
    gpa: profile === null ? "" : String(profile.gpa),
    englishTest: profile?.englishTest ?? "",
    englishScore:
      profile?.englishScore === null || profile === null
        ? ""
        : String(profile.englishScore),
    skills: profile?.skills.join(", ") ?? "",
    interests: profile?.interests.join(", ") ?? "",
    weeklyHours: profile === null ? "" : String(profile.weeklyHours),
  };
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter((item) => item.length > 0);
}

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  const studyYear = Number(values.studyYear);
  const gpa = Number(values.gpa);
  const englishScore = Number(values.englishScore);
  const weeklyHours = Number(values.weeklyHours);

  if (
    values.studyYear.trim() === "" ||
    !Number.isInteger(studyYear) ||
    studyYear < 1 ||
    studyYear > 4
  ) {
    errors.studyYear = "Study year must be an integer from 1 to 4.";
  }
  if (values.gpa.trim() === "" || Number.isNaN(gpa) || gpa < 0 || gpa > 4) {
    errors.gpa = "GPA must be between 0 and 4.";
  }
  if (
    values.englishScore.trim() !== "" &&
    (Number.isNaN(englishScore) || englishScore <= 0)
  ) {
    errors.englishScore = "English score must be positive.";
  }
  if (
    values.weeklyHours.trim() === "" ||
    Number.isNaN(weeklyHours) ||
    weeklyHours < 0 ||
    weeklyHours > 60
  ) {
    errors.weeklyHours = "Weekly hours must be between 0 and 60.";
  }

  return errors;
}

export default function ProfilePage() {
  const { state, setProfile } = useApp();
  const [values, setValues] = useState<FormValues>(() =>
    profileToFormValues(state.profile),
  );
  const [saved, setSaved] = useState(false);
  const errors = validate(values);
  const savedProfileRef = useRef(state.profile);

  useEffect(() => {
    // Every save writes a new profile object, which would otherwise reset the form
    // mid-edit. Only re-sync when the profile changed from outside this form,
    // such as Reset demo data.
    if (state.profile === savedProfileRef.current) {
      return;
    }
    savedProfileRef.current = state.profile;
    setValues(profileToFormValues(state.profile));
    setSaved(false);
  }, [state.profile]);

  function updateValue(field: keyof FormValues, value: string) {
    setSaved(false);
    setValues((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (Object.keys(errors).length > 0) {
      return;
    }

    const profile: UserProfile = {
      name: values.name,
      studyYear: Number(values.studyYear),
      major: values.major,
      gpa: Number(values.gpa),
      gpaScale: "4.0",
      englishTest: values.englishTest === "" ? null : values.englishTest,
      englishScore:
        values.englishScore.trim() === ""
          ? null
          : Number(values.englishScore),
      skills: parseList(values.skills),
      interests: parseList(values.interests),
      weeklyHours: Number(values.weeklyHours),
    };

    // Record the object we are about to save so the sync effect recognises it as
    // this form's own update and leaves the confirmation message on screen.
    savedProfileRef.current = profile;
    setProfile(profile);
    setSaved(true);
  }

  const profile = state.profile;
  const evaluated = profile === null
    ? []
    : state.opportunities.map((opportunity) => ({
        opportunity,
        result: evaluateEligibility(opportunity, profile, TODAY),
      }));

  return (
    <main className="min-h-screen bg-slate-50 text-navy">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
            My profile
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">
            Profile settings
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Update your profile to recompute opportunity eligibility immediately.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-8 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-semibold text-navy">
              Name
              <input
                value={values.name}
                onChange={(event) => updateValue("name", event.target.value)}
                className={`${inputClassName} mt-2`}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Major
              <input
                value={values.major}
                onChange={(event) => updateValue("major", event.target.value)}
                className={`${inputClassName} mt-2`}
              />
            </label>
            <label className="text-sm font-semibold text-navy">
              Study year
              <input
                type="number"
                min="1"
                max="4"
                step="1"
                value={values.studyYear}
                onChange={(event) =>
                  updateValue("studyYear", event.target.value)
                }
                className={`${inputClassName} mt-2`}
              />
              {errors.studyYear && (
                <p className="mt-2 text-xs text-status-not-eligible-foreground">
                  {errors.studyYear}
                </p>
              )}
            </label>
            <label className="text-sm font-semibold text-navy">
              GPA
              <input
                type="number"
                min="0"
                max="4"
                step="0.1"
                value={values.gpa}
                onChange={(event) => updateValue("gpa", event.target.value)}
                className={`${inputClassName} mt-2`}
              />
              {errors.gpa && (
                <p className="mt-2 text-xs text-status-not-eligible-foreground">
                  {errors.gpa}
                </p>
              )}
              <span className="mt-2 block text-xs text-slate-500">
                GPA scale: 4.0 (fixed)
              </span>
            </label>
            <label className="text-sm font-semibold text-navy">
              English test
              <select
                value={values.englishTest}
                onChange={(event) =>
                  updateValue("englishTest", event.target.value)
                }
                className={`${inputClassName} mt-2`}
              >
                <option value="">Not stated</option>
                <option value="IELTS">IELTS</option>
                <option value="TOEFL">TOEFL</option>
              </select>
            </label>
            <label className="text-sm font-semibold text-navy">
              English score
              <input
                type="number"
                min="0"
                step="0.1"
                value={values.englishScore}
                onChange={(event) =>
                  updateValue("englishScore", event.target.value)
                }
                className={`${inputClassName} mt-2`}
              />
              {errors.englishScore && (
                <p className="mt-2 text-xs text-status-not-eligible-foreground">
                  {errors.englishScore}
                </p>
              )}
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Skills
              <input
                value={values.skills}
                onChange={(event) => updateValue("skills", event.target.value)}
                className={`${inputClassName} mt-2`}
                placeholder="python, sql, data analysis"
              />
              <span className="mt-2 block text-xs font-normal text-slate-500">
                Separate entries with commas.
              </span>
            </label>
            <label className="text-sm font-semibold text-navy sm:col-span-2">
              Interests
              <input
                value={values.interests}
                onChange={(event) =>
                  updateValue("interests", event.target.value)
                }
                className={`${inputClassName} mt-2`}
                placeholder="consulting, fintech"
              />
              <span className="mt-2 block text-xs font-normal text-slate-500">
                Separate entries with commas.
              </span>
            </label>
            <label className="text-sm font-semibold text-navy">
              Weekly hours
              <input
                type="number"
                min="0"
                max="60"
                step="1"
                value={values.weeklyHours}
                onChange={(event) =>
                  updateValue("weeklyHours", event.target.value)
                }
                className={`${inputClassName} mt-2`}
              />
              {errors.weeklyHours && (
                <p className="mt-2 text-xs text-status-not-eligible-foreground">
                  {errors.weeklyHours}
                </p>
              )}
            </label>
          </div>

          <div className="mt-7 flex flex-col items-start gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="rounded-md bg-navy px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              Save profile
            </button>
            {saved && (
              <p className="text-sm text-status-eligible-foreground">
                Profile saved.
              </p>
            )}
          </div>
        </form>

        <section className="mt-10">
          <h2 className="text-xl font-bold tracking-tight">
            Current opportunity matches
          </h2>
          {evaluated.length === 0 ? (
            <div className="mt-4 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              No opportunities yet.
            </div>
          ) : (
            <div className="mt-4 grid gap-3">
              {evaluated.map(({ opportunity, result }) => (
                <Link
                  key={opportunity.id}
                  href={`/opportunities/${opportunity.id}`}
                  className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="min-w-0 break-words text-sm font-semibold text-navy">
                    {opportunity.title}
                  </span>
                  <EligibilityBadge status={result.status} />
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
