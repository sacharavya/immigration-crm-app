"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { CaseBindLogo } from "@/components/brand/casebind-logo";
import { cn } from "@/lib/utils/index";

import type { MediaSlot } from "./media";

export type MenuLink = {
  label: string;
  href: string;
  description?: string;
  /** Shipping status. Omit for anything already live. */
  tag?: "In development" | "Planned";
};

export type MenuItem = {
  label: string;
  /** A plain link when there are no columns. */
  href?: string;
  /** Each column may carry a heading above its links. */
  columns?: { heading?: string; links: MenuLink[] }[];
  featured?: {
    image: MediaSlot;
    title: string;
    body: string;
    href: string;
    tag?: string;
  };
};

// Dismissible strip above the bar. Dismissal is a per-viewer convenience, so
// localStorage is the right home for it — but it throws outright in some
// privacy modes, so every access is guarded and the bar simply shows.
//
// Read through useSyncExternalStore rather than an effect: localStorage does
// not exist during SSR, and this is exactly the external-store case the hook
// is for. The server snapshot renders the bar, since most visitors have not
// dismissed it; anyone who has loses it on hydration.
const DISMISS_KEY = "genz-announcement-dismissed";

let listeners: Array<() => void> = [];

function subscribe(cb: () => void) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

function isDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* Private mode: dismissing for this page view is enough. */
  }
  for (const l of listeners) l();
}

function Announcement({ text, href }: { text: string; href: string }) {
  const hidden = useSyncExternalStore(subscribe, isDismissed, () => false);
  if (hidden) return null;

  return (
    <div className="relative bg-[var(--slab)] px-10 py-2 text-center text-white">
      <span className="text-[12.5px]">
        {text}{" "}
        <Link href={href} className="font-semibold underline underline-offset-2">
          Learn more
        </Link>
      </span>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/60 transition-colors hover:text-white"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function MegaNav({
  items,
  actions,
  announcement,
}: {
  items: MenuItem[];
  actions: React.ReactNode;
  announcement?: { text: string; href: string };
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Escape closes, matching what a keyboard user expects from a disclosure.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(null);
      setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // A small grace period on leave: the pointer has to cross a gap between the
  // trigger and the panel, and closing instantly makes the menu unusable.
  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const active = items.find((i) => i.label === open && i.columns);

  return (
    <div className="sticky top-0 z-50">
      {announcement && <Announcement {...announcement} />}

      <div
        className="relative border-b border-[var(--rule)] bg-[var(--paper)]"
        onMouseLeave={scheduleClose}
      >
        <nav className="mx-auto flex w-full max-w-[1280px] items-center gap-6 px-6 py-3.5">
          <Link href="/" className="flex shrink-0 items-center">
            <CaseBindLogo className="h-7 w-auto" />
          </Link>

          <div className="mx-auto hidden items-center gap-1 md:flex">
            {items.map((item) =>
              item.columns ? (
                <button
                  key={item.label}
                  type="button"
                  aria-expanded={open === item.label}
                  aria-haspopup="true"
                  onMouseEnter={() => {
                    cancelClose();
                    setOpen(item.label);
                  }}
                  onFocus={() => setOpen(item.label)}
                  onClick={() =>
                    setOpen(open === item.label ? null : item.label)
                  }
                  className={cn(
                    "relative flex items-center gap-1 px-3 py-2 text-[13.5px] font-medium transition-colors",
                    open === item.label
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                  )}
                >
                  {item.label}
                  <ChevronDown
                    aria-hidden
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      open === item.label && "rotate-180",
                    )}
                  />
                  {/* The active trigger keeps a rule that reads as continuous
                      with the panel below it. */}
                  {open === item.label && (
                    <span
                      aria-hidden
                      className="absolute inset-x-2 -bottom-[14px] h-px bg-[var(--ink)]"
                    />
                  )}
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.href ?? "#"}
                  onMouseEnter={scheduleClose}
                  className="px-3 py-2 text-[13.5px] font-medium text-[var(--ink-muted)] transition-colors hover:text-[var(--ink)]"
                >
                  {item.label}
                </Link>
              ),
            )}
          </div>

          <div className="ml-auto flex flex-none items-center gap-2 md:ml-0">
            {actions}
            <button
              type="button"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((v) => !v)}
              className="rounded-[var(--radius)] border border-[var(--ink)]/20 p-2 text-[var(--ink)] md:hidden"
            >
              {mobileOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </button>
          </div>
        </nav>

        {mobileOpen && (
          <div className="max-h-[70vh] overflow-y-auto border-t border-[var(--rule)] px-6 py-5 md:hidden">
            {items.map((item) => (
              <div key={item.label} className="border-b border-[var(--rule)] py-4 last:border-0">
                {item.href ? (
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className="text-[15px] font-semibold text-[var(--ink)]"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <>
                    <div className="font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.18em] text-[var(--ink-faint)]">
                      {item.label}
                    </div>
                    <div className="mt-3 flex flex-col gap-3">
                      {item.columns?.flatMap((c) => c.links).map((l) => (
                        <Link
                          key={l.href + l.label}
                          href={l.href}
                          onClick={() => setMobileOpen(false)}
                          className="text-[15px] font-medium text-[var(--ink)]"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {active && (
          <div
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            className="absolute inset-x-0 top-full hidden border-b border-[var(--rule)] bg-[var(--paper)] shadow-[0_24px_48px_-32px_rgba(30,33,54,.35)] md:block"
          >
            <div className="mx-auto grid w-full max-w-[1280px] gap-x-10 gap-y-10 px-6 py-12 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,300px)]">
              {active.columns?.map((col, i) => (
                <div key={i} className="flex flex-col gap-5">
                  {col.heading && (
                    <div className="border-b border-[var(--rule)] pb-3 font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[.18em] text-[var(--ink-faint)]">
                      {col.heading}
                    </div>
                  )}
                  {col.links.map((l) => (
                    <Link
                      key={l.href + l.label}
                      href={l.href}
                      onClick={() => setOpen(null)}
                      className="group/link flex flex-col gap-1"
                    >
                      <span className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[var(--ink)] group-hover/link:underline">
                        {l.label}
                        {l.tag && (
                          <span className="rounded-[3px] border border-[var(--ink)]/15 px-1.5 py-px font-[family-name:var(--font-dm-mono)] text-[9px] font-medium uppercase tracking-[.12em] text-[var(--ink-faint)]">
                            {l.tag}
                          </span>
                        )}
                      </span>
                      {l.description && (
                        <span className="max-w-[32ch] text-[12.5px] leading-relaxed text-[var(--ink-muted)]">
                          {l.description}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              ))}

              {active.featured && (
                <Link
                  href={active.featured.href}
                  onClick={() => setOpen(null)}
                  className="group/feat flex flex-col gap-4"
                >
                  <div className="relative aspect-[16/10] overflow-hidden rounded-[calc(var(--radius)*1.5)] bg-[var(--slab)]">
                    <Image
                      src={active.featured.image.src}
                      alt={active.featured.image.alt}
                      fill
                      sizes="420px"
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover/feat:scale-[1.03]"
                      style={{
                        objectPosition: active.featured.image.position ?? "50% 50%",
                      }}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="flex items-center gap-2 text-[15px] font-semibold text-[var(--ink)]">
                      {active.featured.title}
                      {active.featured.tag && (
                        <span className="rounded-[3px] bg-[var(--gold)] px-1.5 py-0.5 font-[family-name:var(--font-dm-mono)] text-[9.5px] uppercase tracking-[.14em] text-[var(--ink)]">
                          {active.featured.tag}
                        </span>
                      )}
                    </span>
                    <span className="text-[13px] leading-relaxed text-[var(--ink-muted)]">
                      {active.featured.body}
                    </span>
                  </div>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
