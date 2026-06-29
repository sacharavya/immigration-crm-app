"use client";

import dynamic from "next/dynamic";

import type { RadarData } from "@/lib/dashboard/types";

// recharts (and its d3 dependencies) is the heaviest client library in the app
// and the chart is below the fold on the dashboard landing page. Load it as a
// separate chunk on the client after hydration instead of in the route's
// first-load JS, so the dashboard becomes interactive sooner.
const SuccessRadarImpl = dynamic(
  () => import("./SuccessRadar").then((m) => m.SuccessRadar),
  {
    ssr: false,
    loading: () => (
      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
        <div className="p-4">
          <div className="h-64 w-full animate-pulse rounded-md bg-muted" />
        </div>
      </section>
    ),
  },
);

export function SuccessRadar({ data }: { data: RadarData }) {
  return <SuccessRadarImpl data={data} />;
}
