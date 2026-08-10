const cad = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
});

// Quoted-total breakdown: professional fee + HST + government fee.
// ponytail: HST % is derived from the stored amounts (hst / fee), not a stored
// rate — add a stored rate on the retainer if invoices ever need it exact.
export function PaymentBreakdown({
  fee,
  hst,
  governmentFee,
}: {
  fee: number;
  hst: number;
  governmentFee: number;
}) {
  const subtotal = fee + hst;
  const total = subtotal + governmentFee;
  const hstPct = fee > 0 ? Math.round((hst / fee) * 100) : 0;
  return (
    <dl className="space-y-1 text-xs text-stone-600">
      <Row label="Fee" value={cad.format(fee)} />
      <Row label={`HST${hst > 0 ? ` (${hstPct}%)` : ""}`} value={cad.format(hst)} />
      <Row label="Subtotal" value={cad.format(subtotal)} />
      <Row label="Government fees" value={cad.format(governmentFee)} />
      <div className="mt-1 flex justify-between border-t border-stone-200 pt-1 font-semibold text-stone-900">
        <span>Total (incl. tax)</span>
        <span className="tabular-nums">{cad.format(total)}</span>
      </div>
    </dl>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
