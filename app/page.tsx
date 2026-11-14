import EligibilityBadge from "@/components/EligibilityBadge";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16 text-navy">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Hackathon MVP
          </p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight">CampusSignal</h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <EligibilityBadge status="ELIGIBLE" />
          <EligibilityBadge status="NOT_ELIGIBLE" />
          <EligibilityBadge status="NEEDS_VERIFICATION" />
        </div>
      </div>
    </main>
  );
}
