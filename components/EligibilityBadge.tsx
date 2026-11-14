import type { EligibilityStatus } from "@/lib/types";

const badgeStyles: Record<
  EligibilityStatus,
  { label: string; className: string }
> = {
  ELIGIBLE: {
    label: "Eligible",
    className:
      "bg-status-eligible-background text-status-eligible-foreground ring-status-eligible-ring",
  },
  NOT_ELIGIBLE: {
    label: "Not eligible",
    className:
      "bg-status-not-eligible-background text-status-not-eligible-foreground ring-status-not-eligible-ring",
  },
  NEEDS_VERIFICATION: {
    label: "Needs verification",
    className:
      "bg-status-needs-verification-background text-status-needs-verification-foreground ring-status-needs-verification-ring",
  },
};

export default function EligibilityBadge({
  status,
}: {
  status: EligibilityStatus;
}) {
  const badge = badgeStyles[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold leading-5 ring-1 ring-inset ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}
