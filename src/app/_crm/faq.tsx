"use client";

import { useState } from "react";

const FAQS: Array<[string, string]> = [
  [
    "What does an alpha firm get?",
    "Full platform access at no cost through alpha and beta, a week of hands-on training for your team, and a direct line to the builders. Your feedback becomes amendments, often within days.",
  ],
  [
    "What do you ask in return?",
    "Use it on real work and tell us honestly where it falls short, a short feedback session every few weeks, and patience with rough edges.",
  ],
  [
    "Where is our data stored?",
    "Inside Canada. PDF assembly happens in your browser, so documents never leave it. Access is scoped per firm and per case with encryption and access logs.",
  ],
  [
    "Does the AI layer train on client data?",
    "No. It runs inference only, meaning completeness checks, consistency checks and drafting, with nothing retained for training.",
  ],
  [
    "What happens when alpha ends?",
    "No obligation. If the platform has earned a place in your firm, migrate to a subscription and keep everything. Otherwise download your complete data and we permanently delete what remains.",
  ],
  [
    "Can we import from Officio or spreadsheets?",
    "Yes. Data import from Officio and other incumbents is in development, and alpha firms decide its priority.",
  ],
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <div className="mt-10 flex w-full max-w-[860px] flex-col gap-2">
      {FAQS.map(([q, a], i) => (
        <div
          key={q}
          className="rounded-xl border border-[#D9E2EC] bg-white"
        >
          <button
            type="button"
            onClick={() => setOpen(open === i ? -1 : i)}
            aria-expanded={open === i}
            className="flex w-full items-center justify-between gap-4 px-5.5 py-4.5 text-left text-[15px] font-semibold text-[#0F5132]"
          >
            {q}
            <span className="flex-none font-[family-name:var(--font-dm-mono)] text-[#0F5132]">
              {open === i ? "−" : "+"}
            </span>
          </button>
          {open === i && (
            <p className="px-5.5 pb-5 text-sm leading-relaxed text-[#4B5563]">
              {a}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
