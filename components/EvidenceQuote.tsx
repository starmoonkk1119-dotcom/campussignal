"use client";

import { useEffect, useMemo, useRef } from "react";

import { findHighlightRange } from "@/lib/highlight";

type EvidenceQuoteProps = {
  rawText: string;
  quote: string | null;
  label: string;
};

export default function EvidenceQuote({
  rawText,
  quote,
  label,
}: EvidenceQuoteProps) {
  const highlightRef = useRef<HTMLSpanElement>(null);
  const highlight = useMemo(
    () => findHighlightRange(rawText, quote),
    [rawText, quote],
  );

  useEffect(() => {
    if (highlight !== null) {
      highlightRef.current?.scrollIntoView({ block: "center" });
    }
  }, [highlight]);

  return (
    <section aria-label={label}>
      <div className="max-h-[320px] overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-4 font-mono text-sm leading-6 text-slate-700">
        <p className="whitespace-pre-wrap break-words">
          {highlight === null ? (
            rawText
          ) : (
            <>
              {rawText.slice(0, highlight.start)}
              <span
                ref={highlightRef}
                tabIndex={-1}
                className="border-l-2 border-yellow-300 bg-yellow-100 transition-colors duration-200"
              >
                {rawText.slice(highlight.start, highlight.end)}
              </span>
              {rawText.slice(highlight.end)}
            </>
          )}
        </p>
      </div>
      {highlight === null && (
        <p className="mt-2 text-xs text-status-needs-verification-foreground">
          No supporting quote
        </p>
      )}
    </section>
  );
}
