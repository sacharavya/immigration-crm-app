"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { PipelinePhase } from "@/lib/dashboard/types";
import type { SnapshotPoint } from "@/lib/dashboard/getSnapshotSeries";

// One quiet palette for every chart: the brand green for the line that
// matters, its tints for the rest, grey for context. No rainbow.
const INK = "#0F5132";
const TINT = "#D5E5DB";
const GREY = "#C9CED6";
const AXIS = { fontSize: 11, fill: "#6B7280" } as const;

const fmtDay = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric" });

export function CaseloadArea({ points }: { points: SnapshotPoint[] }) {
  if (points.length < 2) {
    return <p className="flex h-[260px] items-center justify-center text-[13px] text-muted-foreground">Not enough history yet — the chart fills in as nightly snapshots accumulate.</p>;
  }
  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="caseload-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={INK} stopOpacity={0.14} />
              <stop offset="100%" stopColor={INK} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#EEF0F3" />
          <XAxis dataKey="date" tickFormatter={fmtDay} tick={AXIS} axisLine={false} tickLine={false} minTickGap={32} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
          <Tooltip
            labelFormatter={(v) => fmtDay(String(v))}
            contentStyle={{ borderRadius: 10, border: "1px solid #E6E8EC", boxShadow: "0 4px 12px rgba(15,23,42,.06)", fontSize: 12 }}
          />
          <Area type="monotone" dataKey="clients" name="Clients" stroke={GREY} strokeWidth={1.5} fill="transparent" dot={false} />
          <Area type="monotone" dataKey="active" name="Active cases" stroke={INK} strokeWidth={2} fill="url(#caseload-fill)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PipelineBars({ phases }: { phases: PipelinePhase[] }) {
  const max = Math.max(...phases.map((p) => p.count), 0);
  return (
    <div className="h-[200px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={phases} margin={{ top: 8, right: 4, left: -22, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid vertical={false} stroke="#EEF0F3" />
          <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval={0} />
          <YAxis tick={AXIS} axisLine={false} tickLine={false} allowDecimals={false} width={36} />
          <Tooltip cursor={{ fill: "#F5F6F8" }} contentStyle={{ borderRadius: 10, border: "1px solid #E6E8EC", fontSize: 12 }} formatter={(v) => [String(v), "cases"]} />
          <Bar dataKey="count" radius={[6, 6, 0, 0]}>
            {phases.map((p) => (
              <Cell key={p.phase} fill={p.count === max && max > 0 ? INK : TINT} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export type DonutSlice = { label: string; value: number };
const SHADES = [INK, "#5C8F73", "#8CA98F", "#ACCBB8", "#D5E5DB", GREY];

export function ServiceDonut({ slices, centreLabel }: { slices: DonutSlice[]; centreLabel: string }) {
  const total = slices.reduce((n, s) => n + s.value, 0);
  if (total === 0) {
    return <p className="py-10 text-center text-[13px] text-muted-foreground">No active cases yet.</p>;
  }
  const top = slices[0];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-[150px] w-[150px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={slices} dataKey="value" nameKey="label" innerRadius={52} outerRadius={70} paddingAngle={2} stroke="none">
              {slices.map((s, i) => (
                <Cell key={s.label} fill={SHADES[i % SHADES.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #E6E8EC", fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[20px] font-semibold leading-none tabular-nums text-foreground">{Math.round((top.value / total) * 100)}%</span>
          <span className="mt-1 text-[11px] text-muted-foreground">{centreLabel}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5">
        {slices.map((s, i) => (
          <li key={s.label} className="flex items-center gap-2 text-[12px]">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: SHADES[i % SHADES.length] }} />
            <span className="min-w-0 flex-1 truncate text-foreground">{s.label}</span>
            <span className="tabular-nums text-muted-foreground">{Math.round((s.value / total) * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
