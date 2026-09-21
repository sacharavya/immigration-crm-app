import Image from "next/image";

import logo from "../../../public/casebind-logo.png";
import logoDark from "../../../public/casebind-logo-dark.png";

/**
 * The CaseBind Systems logo — the platform's own mark.
 *
 * Firms see their own logo through <FirmLogo>; this is what shows before a
 * firm has uploaded one, and on every surface that belongs to the platform
 * rather than to a firm: login, the operator portal, the marketing site.
 *
 * `tone="dark"` is the brand sheet's on-green lockup — white wordmark, the
 * forest slab turned white, sage and gold kept — for anything on a dark
 * surface. Static imports so the intrinsic size is known and nothing shifts
 * while the PNG loads. Callers size it with a height class (`h-8 w-auto`).
 */
export function CaseBindLogo({
  className,
  tone = "auto",
  title = "CaseBind Systems",
}: {
  className?: string;
  tone?: "auto" | "dark";
  title?: string;
}) {
  return (
    <Image
      src={tone === "dark" ? logoDark : logo}
      alt={title}
      priority
      className={className}
    />
  );
}
