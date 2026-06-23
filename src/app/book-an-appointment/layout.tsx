// Nested layout for the public booking surface (`/book-an-appointment` + `/book-an-appointment/manage/...`).
// The root layout at src/app/layout.tsx still owns <html>/<body>; this layer
// just wraps the page content in a minimal public chrome (header + footer)
// with no staff theming, no auth helpers, no sidebar.

import Image from "next/image";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-6 py-4">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration"
            width={1933}
            height={537}
            priority
            className="h-10 w-auto"
          />
          <span className="text-lg font-semibold text-[var(--navy)]">
            Big Bang Immigration
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-8">{children}</main>
      <footer className="mt-12 border-t border-stone-200 bg-white px-6 py-6 text-sm text-stone-600">
        <div className="mx-auto max-w-3xl space-y-1">
          <p className="font-medium text-stone-700">
            Big Bang Immigration Consulting Inc.
          </p>
          <p>211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5</p>
          <p>
            Questions?{" "}
            <a
              className="text-[var(--navy)] underline-offset-2 hover:underline"
              href="mailto:info@bigbangimmigration.com"
            >
              info@bigbangimmigration.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
