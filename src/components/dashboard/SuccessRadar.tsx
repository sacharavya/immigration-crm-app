"use client";

import { useState } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

import type { RadarAxis, RadarData } from "@/lib/dashboard/types";
import { cn } from "@/lib/utils/index";

type View = "service" | "category";

type Point = {
  axis: string;
  value: number | null;
  decided: number;
  dimmed: boolean;
};

function toPoints(axes: RadarAxis[]): Point[] {
  return axes.map((a) => ({
    axis: a.label,
    value: a.successRate === null ? null : Math.round(a.successRate * 100),
    decided: a.decidedCount,
    dimmed: a.successRate === null,
  }));
}

export function SuccessRadar({ data }: { data: RadarData }) {
  const [view, setView] = useState<View>("service");
  const axes = data[view];
  const points = toPoints(axes);
  const metaByLabel = new Map(points.map((p) => [p.axis, p]));

  // A custom angle tick: percent for a scored axis, the decided count for a
  // dimmed one. The constraint reads in text, not by color alone.
  function renderTick(props: {
    x: number;
    y: number;
    textAnchor: string;
    payload: { value: string };
  }) {
    const { x, y, textAnchor, payload } = props;
    const meta = metaByLabel.get(payload.value);
    const detail = meta
      ? meta.dimmed
        ? `${meta.decided} case${meta.decided === 1 ? "" : "s"}`
        : `${meta.value}%, ${meta.decided} case${meta.decided === 1 ? "" : "s"}`
      : "";
    return (
      <text
        x={x}
        y={y}
        textAnchor={textAnchor as "start" | "middle" | "end"}
        dominantBaseline="central"
        fill={meta?.dimmed ? "var(--subtle-foreground)" : "var(--muted-foreground)"}
        opacity={meta?.dimmed ? 0.7 : 1}
      >
        <tspan x={x} fontSize={11} fontWeight={500}>
          {payload.value}
        </tspan>
        <tspan x={x} dy={13} fontSize={10} fill="var(--subtle-foreground)">
          {detail}
        </tspan>
      </text>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Success rate by service
          </h2>
          <p className="text-xs text-muted-foreground">
            Approvals over decisions, last 12 months.
          </p>
        </div>
        <div
          role="tablist"
          aria-label="Radar grouping"
          className="flex shrink-0 overflow-hidden rounded-md border border-border text-[11px] font-medium"
        >
          {(["service", "category"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={view === v}
              onClick={() => setView(v)}
              className={cn(
                "px-2.5 py-1 capitalize transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted",
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {points.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No services configured yet.
          </p>
        ) : (
          <>
            <div
              role="img"
              aria-label={`Success rate by ${view}`}
              className="h-64 w-full"
            >
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={points} outerRadius="72%">
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={renderTick as never}
                  />
                  <PolarRadiusAxis
                    domain={[0, 100]}
                    tick={false}
                    axisLine={false}
                  />
                  <Radar
                    dataKey="value"
                    stroke="var(--primary)"
                    fill="var(--primary)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                    connectNulls
                    isAnimationActive={false}
                    dot
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
