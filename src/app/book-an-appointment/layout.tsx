// Nested layout for the public booking surface (`/book-an-appointment` + `/book-an-appointment/manage/...`).
// The root layout at src/app/layout.tsx still owns <html>/<body>; this layer
// just wraps the page content in a minimal public chrome (header + footer)
// with no staff theming, no auth helpers, no sidebar.

import Image from "next/image";

import { PublicFooter } from "@/components/public-footer";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-50 text-stone-900">
      {/* ── Navbar ─────────────────────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-[1130px] items-center gap-3 px-6 py-4">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration"
            width={1933}
            height={537}
            priority
            className="h-10 w-auto"
          />
        </div>
      </header>

      <main className="mx-auto max-w-[1130px] flex-1 px-6 py-8">{children}</main>

      <PublicFooter />
    </div>
  );
}
