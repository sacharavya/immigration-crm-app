import { fromZonedTime } from "date-fns-tz";
import { NextRequest, NextResponse } from "next/server";

import { getOpenSlotsForType } from "@/lib/appointments/get-open-slots";

// Public, anonymous endpoint the /book slot picker calls each time the
// prospect changes the date. Service-role inside; reads only — no writes.
// Day bucketing goes through date-fns-tz (the same library APPT-2 added)
// so a "date" param maps to its real UTC bounds on either side of a DST
// transition. Hard-coding a UTC-04:00 offset would silently lose or
// duplicate an hour the day clocks change.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Until per-type-tz settings exist this is the firm-wide timezone.
const FIRM_TZ = "America/Toronto";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const typeId = url.searchParams.get("type_id");
  const dateParam = url.searchParams.get("date"); // YYYY-MM-DD

  if (!typeId) {
    return NextResponse.json({ error: "missing_type" }, { status: 400 });
  }
  if (!/^[0-9a-f-]{36}$/i.test(typeId)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }
  if (dateParam && !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "invalid_date" }, { status: 400 });
  }

  try {
    const allSlots = await getOpenSlotsForType(typeId);

    if (!dateParam) {
      return NextResponse.json({ slots: allSlots });
    }

    // Build the UTC instants that bound the requested calendar date
    // *in the firm's timezone*, so we get the right 24 hours regardless
    // of DST.
    const startUtc = fromZonedTime(`${dateParam}T00:00:00`, FIRM_TZ);
    const endUtc = fromZonedTime(`${dateParam}T23:59:59.999`, FIRM_TZ);
    const startMs = startUtc.getTime();
    const endMs = endUtc.getTime();

    const filtered = allSlots.filter((s) => {
      const t = new Date(s.start_utc).getTime();
      return t >= startMs && t <= endMs;
    });
    return NextResponse.json({ slots: filtered });
  } catch (err) {
    console.error("[api/public/slots]", err);
    return NextResponse.json(
      { error: "slot_load_failed" },
      { status: 500 },
    );
  }
}
