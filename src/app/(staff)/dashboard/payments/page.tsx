import { format } from "date-fns";
import { ExternalLink, Paperclip } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { staffCan } from "@/lib/auth/permissions";
import { getStaff } from "@/lib/auth/staff";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/index";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABEL,
  type PaymentMethod,
} from "@/lib/validators/payment";

import { ConsultationOutcomeCell } from "./_components/consultation-outcome-cell";
import { PaymentsFilters } from "./_components/payments-filters";

const cadFormatter = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});
const fmtCad = (n: number) => cadFormatter.format(n);

const PAYMENT_METHOD_SET = new Set<PaymentMethod>(PAYMENT_METHODS);

// Always re-render server-side. Payments change frequently and the
// page reads cumulative totals; cached HTML would be misleading.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    method?: string;
    q?: string;
    proof?: string;
  }>;
};

export default async function PaymentsPage({ searchParams }: Props) {
  const me = await getStaff();
  if (!me) redirect("/login");
  if (!staffCan(me, "view_financials")) {
    redirect("/dashboard?error=forbidden_view_financials");
  }
  // APPT-8: only staff with review_payments can flip the consultation outcome.
  const canReviewPayments = staffCan(me, "review_payments");

  const sp = await searchParams;
  const from = isIsoDate(sp.from) ? sp.from! : null;
  const to = isIsoDate(sp.to) ? sp.to! : null;
  const method =
    sp.method && PAYMENT_METHOD_SET.has(sp.method as PaymentMethod)
      ? (sp.method as PaymentMethod)
      : null;
  const q = (sp.q ?? "").trim();
  const proof: "all" | "with" | "without" =
    sp.proof === "with" || sp.proof === "without" ? sp.proof : "all";

  const supabase = await createClient();

  let query = supabase
    .schema("crm")
    .from("payments")
    .select(
      `
        id,
        amount_cad,
        method,
        reference,
        received_date,
        notes,
        is_refund,
        recorded_by,
        proof_document_id,
        case_id,
        client_id,
        consultation_payment_nature,
        client_uploaded_at,
        case:cases(id, case_number, client:clients(legal_name_full))
      `,
    )
    .is("deleted_at", null)
    .order("received_date", { ascending: false })
    .limit(200);

  if (from) query = query.gte("received_date", from);
  if (to) query = query.lte("received_date", to);
  if (method) query = query.eq("method", method);

  const { data: payments } = await query;

  // Proof + search filters in memory. The 200-row cap means this stays
  // cheap, and avoids PostgREST's stricter type-narrowing under .not().
  const filtered = (payments ?? []).filter((p) => {
    if (proof === "with" && !p.proof_document_id) return false;
    if (proof === "without" && p.proof_document_id) return false;
    if (q) {
      const text =
        `${p.case?.case_number ?? ""} ${p.case?.client?.legal_name_full ?? ""}`.toLowerCase();
      if (!text.includes(q.toLowerCase())) return false;
    }
    return true;
  });

  // Resolve recorder names + proof doc URLs in two follow-up queries.
  const recorderIds = [
    ...new Set(
      filtered
        .map((p) => p.recorded_by)
        .filter((v): v is string => Boolean(v)),
    ),
  ];
  const proofIds = filtered
    .map((p) => p.proof_document_id)
    .filter((v): v is string => Boolean(v));

  const [{ data: recorders }, { data: proofDocs }] = await Promise.all([
    recorderIds.length
      ? supabase
          .schema("crm")
          .from("staff")
          .select("id, first_name, last_name")
          .in("id", recorderIds)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            first_name: string;
            last_name: string;
          }>,
        }),
    proofIds.length
      ? supabase
          .schema("files")
          .from("documents")
          .select("id, file_name, sharepoint_web_url")
          .in("id", proofIds)
          .is("deleted_at", null)
      : Promise.resolve({
          data: [] as Array<{
            id: string;
            file_name: string | null;
            sharepoint_web_url: string | null;
          }>,
        }),
  ]);

  const recorderById = new Map(
    (recorders ?? []).map((r) => [
      r.id,
      `${r.first_name} ${r.last_name}`.trim(),
    ]),
  );
  const proofById = new Map(
    (proofDocs ?? []).map((d) => [
      d.id,
      { fileName: d.file_name, webUrl: d.sharepoint_web_url },
    ]),
  );

  const totalCollected = filtered.reduce(
    (sum, p) => sum + Number(p.amount_cad),
    0,
  );
  const withProofCount = filtered.filter(
    (p) => p.proof_document_id !== null,
  ).length;

  // Firm-wide outstanding balance: for every non-closed case, the gap
  // between quoted_fee_cad and what's been received. Independent of the
  // table filters above — the table shows filtered payments, this stat
  // tells staff how much money is still expected across the practice.
  const [{ data: openCases }, { data: openPayments }] = await Promise.all([
    supabase
      .schema("crm")
      .from("cases")
      .select("id, quoted_fee_cad")
      .is("deleted_at", null)
      .neq("status", "closed"),
    supabase
      .schema("crm")
      .from("payments")
      .select("case_id, amount_cad")
      .is("deleted_at", null),
  ]);
  const collectedByCase = new Map<string, number>();
  for (const p of openPayments ?? []) {
    if (!p.case_id) continue;
    collectedByCase.set(
      p.case_id,
      (collectedByCase.get(p.case_id) ?? 0) + Number(p.amount_cad),
    );
  }
  const pendingTotal = (openCases ?? []).reduce((sum, c) => {
    const collected = collectedByCase.get(c.id) ?? 0;
    const outstanding = Number(c.quoted_fee_cad) - collected;
    return sum + Math.max(0, outstanding);
  }, 0);
  const casesWithBalance = (openCases ?? []).filter((c) => {
    const collected = collectedByCase.get(c.id) ?? 0;
    return Number(c.quoted_fee_cad) - collected > 0;
  }).length;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--navy)]">
          Payments
        </h1>
        <p className="mt-1 text-sm text-stone-500">
          All payments recorded across cases. Use filters to narrow by date,
          method, or proof status. Click a row to open the case.
        </p>
      </div>

      <PaymentsFilters
        from={from}
        to={to}
        method={method}
        q={q}
        proof={proof}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat
          label="Total collected"
          value={fmtCad(totalCollected)}
          accent="emerald"
          hint="Matches the filtered payment list below."
        />
        <Stat
          label="Pending payments"
          value={fmtCad(pendingTotal)}
          accent={pendingTotal > 0 ? "amber" : undefined}
          hint={
            casesWithBalance === 0
              ? "All active cases paid in full."
              : `${casesWithBalance} active case${casesWithBalance === 1 ? "" : "s"} with a balance.`
          }
        />
        <Stat
          label="With proof"
          value={`${withProofCount} / ${filtered.length}`}
          hint="Of the filtered list."
        />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-stone-500">
            No payments match these filters.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Case</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead>Recorded by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const proofRow = p.proof_document_id
                  ? proofById.get(p.proof_document_id)
                  : null;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-stone-700">
                      {format(new Date(p.received_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums text-stone-900">
                      {fmtCad(Number(p.amount_cad))}
                    </TableCell>
                    <TableCell className="text-stone-700">
                      {PAYMENT_METHOD_LABEL[p.method as PaymentMethod] ??
                        p.method}
                    </TableCell>
                    <TableCell className="text-stone-500">
                      <div>{p.reference || "—"}</div>
                      {p.client_uploaded_at && (
                        <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                          Client-uploaded · verify
                        </div>
                      )}
                      {p.consultation_payment_nature && (
                        <div className="mt-1">
                          <ConsultationOutcomeCell
                            paymentId={p.id}
                            initial={
                              p.consultation_payment_nature as
                                | "pending_decision"
                                | "applied_as_deposit"
                                | "kept_as_consultation_fee"
                            }
                            canEdit={canReviewPayments}
                          />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.case?.id ? (
                        <Link
                          href={`/dashboard/cases/${p.case.id}?tab=payments`}
                          className="font-mono text-xs text-[var(--navy)] underline-offset-2 hover:underline"
                        >
                          {p.case.case_number}
                        </Link>
                      ) : (
                        <span className="text-stone-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-stone-700">
                      {p.case?.client?.legal_name_full ?? "—"}
                    </TableCell>
                    <TableCell>
                      {proofRow?.webUrl ? (
                        <a
                          href={proofRow.webUrl}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--navy)] underline-offset-2 hover:underline"
                          title={proofRow.fileName ?? undefined}
                        >
                          <Paperclip className="h-3 w-3" />
                          <span className="max-w-[10rem] truncate">
                            {proofRow.fileName ?? "View"}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-xs text-stone-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-stone-500">
                      {p.recorded_by
                        ? recorderById.get(p.recorded_by) ?? "—"
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-stone-500">
        Showing the most recent {filtered.length} payment
        {filtered.length === 1 ? "" : "s"}. To upload proof or record a new
        payment, open the case.
      </p>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
  hint,
}: {
  label: string;
  value: string;
  accent?: "emerald" | "amber";
  hint?: string;
}) {
  const tone =
    accent === "emerald"
      ? "text-emerald-700"
      : accent === "amber"
        ? "text-amber-700"
        : "text-stone-900";
  return (
    <Card>
      <CardContent className="space-y-1 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-500">
          {label}
        </div>
        <div className={cn("text-xl font-semibold tabular-nums", tone)}>
          {value}
        </div>
        {hint && <p className="text-[11px] text-stone-500">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function isIsoDate(v: string | undefined): v is string {
  return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
}
