// Approval success rate per service and per category. EVERY case type with
// at least one case (any status, including archived) gets an axis: axes with
// no decisions yet plot dimmed with their decided count, so the radar always
// shows the firm's full shape. Outcome is derived from case status (no
// outcome enum): approved = passport_requested, refused = refused. Archived
// (closed) cases lose the decision status, so their outcome is recovered
// from the status_changed event log (event_data carries { from, to }).
// Decisions are windowed to the trailing 12 months by decided_at.

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

import type { RadarAxis, RadarData } from "./types";

// Below this many decided cases an axis is treated as no signal (successRate
// null): plotted dimmed and labelled with a count, excluded from the summary.
// 1 = show every axis that has any decision; raise once caseload grows.
export const MIN_DECIDED = 1;

type Bucket = { key: string; label: string; decided: number; approved: number };

function toAxis(b: Bucket): RadarAxis {
  return {
    key: b.key,
    label: b.label,
    decidedCount: b.decided,
    approvedCount: b.approved,
    successRate: b.decided >= MIN_DECIDED ? b.approved / b.decided : null,
  };
}

const DECISION_STATUSES = ["passport_requested", "refused"] as const;

export async function getSuccessRate(
  supabase: SupabaseClient<Database>,
): Promise<RadarData> {
  const since = new Date();
  since.setMonth(since.getMonth() - 12);

  const { data: casesData } = await supabase
    .schema("crm")
    .from("cases")
    .select("id, service_type_id, status, decided_at")
    .is("deleted_at", null);

  const allCases = casesData ?? [];

  const inWindow = (v: string | null) =>
    v !== null && new Date(v).getTime() >= since.getTime();

  // Decided-at-a-decision-status cases resolve directly; archived ones go
  // through the event log below.
  const decisions = new Map<string, boolean>();
  const closedDecided: typeof allCases = [];
  for (const c of allCases) {
    if (!inWindow(c.decided_at)) continue;
    if ((DECISION_STATUSES as readonly string[]).includes(c.status)) {
      decisions.set(c.id, c.status === "passport_requested");
    } else if (c.status === "closed") {
      closedDecided.push(c);
    }
  }

  if (closedDecided.length > 0) {
    const { data: events } = await supabase
      .schema("crm")
      .from("case_events")
      .select("case_id, event_data, created_at")
      .eq("event_type", "status_changed")
      .in("case_id", closedDecided.map((c) => c.id))
      .order("created_at", { ascending: true });

    // Last decision status the case passed through wins (a refusal later
    // overturned to passport_requested counts as approved). Closed without
    // ever passing a decision status (withdrawn, administrative close) is
    // not a decision and stays uncounted.
    for (const e of events ?? []) {
      const to = (e.event_data as { to?: string } | null)?.to;
      if (to === "passport_requested") decisions.set(e.case_id, true);
      else if (to === "refused") decisions.set(e.case_id, false);
    }
  }

  // EVERY active service type is an axis, cases or not: a type with no
  // cases plots dimmed at "0 cases" so the radar shows the full offering.
  const [{ data: serviceTypes }, { data: categories }] = await Promise.all([
    supabase
      .schema("ref")
      .from("service_types")
      .select("id, code, name, category_code")
      .is("deactivated_at", null)
      .order("code"),
    supabase.schema("ref").from("service_categories").select("code, name"),
  ]);

  const categoryNameByCode = new Map(
    (categories ?? []).map((c) => [c.code, c.name]),
  );
  const serviceById = new Map(
    (serviceTypes ?? []).map((s) => [
      s.id,
      { code: s.code, name: s.name, categoryCode: s.category_code },
    ]),
  );

  const serviceBuckets = new Map<string, Bucket>();
  const categoryBuckets = new Map<string, Bucket>();

  // Seed a zero bucket for every service type and every category it
  // belongs to, so caseless axes still render.
  for (const s of serviceTypes ?? []) {
    serviceBuckets.set(s.id, {
      key: s.code,
      label: s.name ?? s.code,
      decided: 0,
      approved: 0,
    });
    if (!categoryBuckets.has(s.category_code)) {
      categoryBuckets.set(s.category_code, {
        key: s.category_code,
        label: categoryNameByCode.get(s.category_code) ?? s.category_code,
        decided: 0,
        approved: 0,
      });
    }
  }

  for (const r of allCases) {
    const svc = serviceById.get(r.service_type_id);
    if (!svc) continue;
    const outcome = decisions.get(r.id);
    const decided = outcome !== undefined ? 1 : 0;
    const approved = outcome === true ? 1 : 0;

    const sb =
      serviceBuckets.get(r.service_type_id) ??
      serviceBuckets
        .set(r.service_type_id, {
          key: svc.code,
          label: svc.name ?? svc.code,
          decided: 0,
          approved: 0,
        })
        .get(r.service_type_id)!;
    sb.decided += decided;
    sb.approved += approved;

    const cb =
      categoryBuckets.get(svc.categoryCode) ??
      categoryBuckets
        .set(svc.categoryCode, {
          key: svc.categoryCode,
          label: categoryNameByCode.get(svc.categoryCode) ?? svc.categoryCode,
          decided: 0,
          approved: 0,
        })
        .get(svc.categoryCode)!;
    cb.decided += decided;
    cb.approved += approved;
  }

  return {
    service: [...serviceBuckets.values()].map(toAxis),
    category: [...categoryBuckets.values()].map(toAxis),
  };
}
