// Nested layout for the public booking surface (`/book-an-appointment` + `/book-an-appointment/manage/...`).
// The root layout at src/app/layout.tsx still owns <html>/<body>; this layer
// just wraps the page content in a minimal public chrome (header + footer)
// with no staff theming, no auth helpers, no sidebar.

import { Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-stone-50 text-stone-900">
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

      <main className="mx-auto max-w-[1130px] px-6 py-8">{children}</main>

      {/* ── Footer ─────────────────────────────────────────────── */}
      <footer className="mt-12 border-t border-stone-200 bg-[var(--navy)] px-6 py-10 text-sm text-stone-300">
        <div className="mx-auto max-w-[1130px] space-y-6">
          {/* Firm name + tagline */}
          <div>
            <p className="text-base font-semibold text-white">
              Big Bang Immigration Consulting Inc.
            </p>
            <p className="mt-1 text-xs text-stone-400">
              Licensed by the College of Immigration and Citizenship
              Consultants (CICC)
            </p>
          </div>

          {/* Contact grid */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
              <span>
                211-2390 Eglinton Avenue East,
                <br />
                Toronto, ON M1K 2P5
              </span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
              <a
                href="tel:+14163865351"
                className="hover:text-white hover:underline"
              >
                +1 (416) 386-5351
              </a>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
              <a
                href="mailto:info@bigbangimmigration.com"
                className="hover:text-white hover:underline"
              >
                info@bigbangimmigration.com
              </a>
            </div>
          </div>

          {/* Bottom divider + copyright */}
          <div className="border-t border-stone-600/40 pt-4 text-xs text-stone-500">
            &copy; {new Date().getFullYear()} Big Bang Immigration Consulting
            Inc. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
