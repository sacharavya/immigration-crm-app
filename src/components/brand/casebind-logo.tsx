import Image from "next/image";

import logo from "../../../public/casebind-logo.png";

/**
 * The CaseBind Systems logo — the platform's own mark.
 *
 * Firms see their own logo through <FirmLogo>; this is what shows before a
 * firm has uploaded one, and on every surface that belongs to the platform
 * rather than to a firm: login, the operator portal, the marketing site.
 *
 * The artwork is black type with a green/sage/gold mark, drawn for a light
 * surface. `tone="dark"` knocks the whole thing out to white for dark panels;
 * the mark's colours are lost there, but a white silhouette is what a dark
 * footer wants anyway.
 *
 * Static import so the intrinsic size is known and nothing shifts while the
 * PNG loads. Callers size it with a height class (`h-8 w-auto`).
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
      src={logo}
      alt={title}
      priority
      className={[className, tone === "dark" && "brightness-0 invert"]
        .filter(Boolean)
        .join(" ")}
    />
  );
}
