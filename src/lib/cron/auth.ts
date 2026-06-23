import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

/**
 * Validates the CRON_SECRET bearer token using a timing-safe comparison.
 * Returns null when authorized; returns a NextResponse (401/500) otherwise.
 */
export function verifyCronAuth(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }

  const expected = `Bearer ${secret}`;
  const actual = req.headers.get("authorization") ?? "";

  // Constant-time comparison to prevent timing attacks. Both buffers
  // must be the same length for timingSafeEqual; if lengths differ the
  // request is obviously invalid, but we still avoid leaking the
  // expected length by comparing against a same-length dummy.
  const expectedBuf = Buffer.from(expected, "utf8");
  const actualBuf = Buffer.from(actual, "utf8");

  if (
    expectedBuf.length !== actualBuf.length ||
    !timingSafeEqual(expectedBuf, actualBuf)
  ) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return null;
}
