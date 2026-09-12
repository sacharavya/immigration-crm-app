import { AlertCircle } from "lucide-react";

import { loadCaseByPayToken } from "./actions";
import { PayUploadForm } from "./_components/pay-upload-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

const PAYMENT_RECIPIENT_EMAIL = "info@genzdatalabs.com";

function formatCad(cad: number): string {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(cad);
}

export default async function PublicPayPage({ params }: Props) {
  const { token } = await params;
  const caseRow = await loadCaseByPayToken(token);

  if (!caseRow) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-stone-100 text-stone-500">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-stone-900">
          This link isn&rsquo;t active.
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          The payment link may have been revoked, replaced, or the case may
          have moved past the payment phase. Please reply to the email it
          came from, or contact our office at{" "}
          <a
            href="mailto:info@genzdatalabs.com"
            className="text-[var(--navy)] underline-offset-2 hover:underline"
          >
            info@genzdatalabs.com
          </a>
          .
        </p>
      </div>
    );
  }

  if (caseRow.amount_due_cad <= 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-stone-900">
          Your case is paid in full.
        </h1>
        <p className="mt-3 text-sm text-stone-600">
          We have no outstanding balance on file for case {caseRow.case_number}.
          If you believe this is a mistake, reply to the email this link came
          from.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">
          Case {caseRow.case_number}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--navy)]">
          Hi {caseRow.client_name}, here&rsquo;s how to pay
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Send the e-transfer first, then upload a screenshot of the
          confirmation below. Our team will verify it and update your
          file.
        </p>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Outstanding balance
        </h2>
        {/*
          Line items mirror the payment-request email's conditional
          structure: service fee always shows, government fee + HST
          show only when > 0, "Total" row appears when there's more
          than one line item so the breakdown adds up visibly.
        */}
        <table className="mt-3 w-full max-w-md text-sm">
          <tbody>
            <tr>
              <td className="py-1 text-stone-500">Service fee</td>
              <td className="py-1 text-right tabular-nums text-stone-900">
                {formatCad(caseRow.quoted_fee_cad)}
              </td>
            </tr>
            {caseRow.government_fee_cad > 0 && (
              <tr>
                <td className="py-1 text-stone-500">Government fee</td>
                <td className="py-1 text-right tabular-nums text-stone-900">
                  {formatCad(caseRow.government_fee_cad)}
                </td>
              </tr>
            )}
            {caseRow.hst_cad > 0 && (
              <tr>
                <td className="py-1 text-stone-500">HST</td>
                <td className="py-1 text-right tabular-nums text-stone-900">
                  {formatCad(caseRow.hst_cad)}
                </td>
              </tr>
            )}
            {(caseRow.government_fee_cad > 0 || caseRow.hst_cad > 0) && (
              <tr className="border-t border-stone-200">
                <td className="py-1 font-semibold text-stone-900">Total</td>
                <td className="py-1 text-right tabular-nums font-semibold text-stone-900">
                  {formatCad(caseRow.total_due_cad)}
                </td>
              </tr>
            )}
            <tr
              className={
                caseRow.government_fee_cad > 0 || caseRow.hst_cad > 0
                  ? ""
                  : "border-t border-stone-200"
              }
            >
              <td className="py-1 text-stone-500">Already paid</td>
              <td className="py-1 text-right tabular-nums text-stone-900">
                {formatCad(caseRow.already_paid_cad)}
              </td>
            </tr>
            <tr className="border-t border-stone-200">
              <td className="py-2 font-semibold text-amber-700">
                Amount due now
              </td>
              <td className="py-2 text-right tabular-nums font-semibold text-amber-700">
                {formatCad(caseRow.amount_due_cad)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-500">
          Interac e-transfer instructions
        </h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-stone-700">
          <li>
            Send an Interac e-transfer for the amount above to{" "}
            <a
              href={`mailto:${PAYMENT_RECIPIENT_EMAIL}`}
              className="text-[var(--navy)] underline-offset-2 hover:underline"
            >
              {PAYMENT_RECIPIENT_EMAIL}
            </a>
            .
          </li>
          <li>
            Put this reference in the e-transfer message field so we can
            match it to your file:
            <div className="mt-1 inline-block rounded-md border border-stone-200 bg-stone-50 px-3 py-1 font-mono text-xs">
              {caseRow.case_number}
            </div>
          </li>
          <li>Upload a screenshot of the confirmation below.</li>
        </ol>
      </div>

      <PayUploadForm
        token={token}
        amountDueCad={caseRow.amount_due_cad}
      />
    </div>
  );
}
