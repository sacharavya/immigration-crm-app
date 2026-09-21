/**
 * Shared footer for all public-facing pages.
 * Contact details + copyright in a consistent layout.
 */

import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";

export function PublicFooter() {
  return (
    <footer className="border-t border-stone-200 bg-white">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h2 className="text-lg font-semibold text-stone-900">Contact us</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="flex items-start gap-2.5 text-sm text-stone-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
            <span>
              211-2390 Eglinton Avenue East,
              <br />
              Toronto, ON M1K 2P5
            </span>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-stone-600">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
            <a
              href="tel:+14163865351"
              className="hover:text-stone-900 hover:underline"
            >
              +1 (416) 386-5351
            </a>
          </div>
          <div className="flex items-start gap-2.5 text-sm text-stone-600">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
            <a
              href="mailto:info@genzdatalabs.com"
              className="hover:text-stone-900 hover:underline"
            >
              info@genzdatalabs.com
            </a>
          </div>
        </div>
      </div>
      <div className="border-t border-stone-200 px-6 py-4 text-center text-xs text-stone-400">
        <div className="mb-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
          <Link href="/privacy-policy" className="hover:text-stone-600 hover:underline">
            Privacy Policy
          </Link>
          <Link href="/data-usage" className="hover:text-stone-600 hover:underline">
            Data Usage
          </Link>
          <Link href="/terms" className="hover:text-stone-600 hover:underline">
            Terms of Use
          </Link>
          <Link
            href="/"
            className="hover:text-stone-600 hover:underline"
          >
            CaseBind for firms
          </Link>
        </div>
        &copy; {new Date().getFullYear()} genzdatalabs Immigration Consulting Inc.
        &middot; Partnered with licensed RCIC &middot; RCIC# R7111111
      </div>
    </footer>
  );
}
