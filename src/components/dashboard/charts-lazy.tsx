"use client";

import dynamic from "next/dynamic";

// recharts is the heaviest client library in the app; load it as its own
// chunk after hydration so the dashboard becomes interactive sooner.
const Skeleton = ({ h }: { h: number }) => <div className="w-full animate-pulse rounded-md bg-muted" style={{ height: h }} />;

export const CaseloadArea = dynamic(() => import("./charts").then((m) => m.CaseloadArea), { ssr: false, loading: () => <Skeleton h={260} /> });
export const PipelineBars = dynamic(() => import("./charts").then((m) => m.PipelineBars), { ssr: false, loading: () => <Skeleton h={200} /> });
export const ServiceDonut = dynamic(() => import("./charts").then((m) => m.ServiceDonut), { ssr: false, loading: () => <Skeleton h={220} /> });
