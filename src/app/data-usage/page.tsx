import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Data Usage Summary - genzdatalabs Immigration",
  description:
    "A plain-language summary of what genzdatalabs Immigration collects, why, who sees it, and how long we keep it.",
};

const UPDATED = "August 29, 2026";

const ROWS: Array<{
  what: string;
  why: string;
  who: string;
  howLong: string;
}> = [
  {
    what: "Booking details (name, contact, address, date of birth, marital status, education, language tests, occupation)",
    why: "Prepare your consultation and assess your options",
    who: "Our licensed consultants and staff",
    howLong: "With your client file; 6+ years after it closes",
  },
  {
    what: "Consultation agreement signature (with date, IP, browser)",
    why: "Record that the agreement was signed",
    who: "Our staff; stored with your file",
    howLong: "With your client file",
  },
  {
    what: "Payment proof screenshots (e-transfer)",
    why: "Confirm your consultation payment",
    who: "Our staff",
    howLong: "With your financial records",
  },
  {
    what: "Documents you upload (passports, certificates, records)",
    why: "Prepare and submit your application",
    who: "Our staff; IRCC on your instruction",
    howLong: "6+ years after your file closes",
  },
  {
    what: "NOC finder search text (job title, duties)",
    why: "Find your occupation code",
    who: "Processed by our search service and a US-hosted AI keyword service; not linked to your name",
    howLong: "Not stored with your identity",
  },
  {
    what: "CRS calculator answers",
    why: "Estimate your score",
    who: "Nobody: the calculator runs entirely in your browser",
    howLong: "Never sent to us",
  },
  {
    what: "Interest / application forms from our tools",
    why: "Follow up on your inquiry",
    who: "Our staff",
    howLong: "As long as needed to respond; longer if you become a client",
  },
];

export default function DataUsagePage() {
  return (
    <LegalPage title="Data Usage Summary" updated={UPDATED}>
      <p>
        The short version of our{" "}
        <a className="text-[var(--navy)] hover:underline" href="/privacy-policy">
          Privacy Policy
        </a>
        : what we collect, why, who sees it, and how long we keep it. If the
        two documents ever seem to differ, the Privacy Policy governs.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-stone-300 text-left text-xs uppercase tracking-wider text-stone-500">
              <th className="py-2 pr-4">What</th>
              <th className="py-2 pr-4">Why</th>
              <th className="py-2 pr-4">Who sees it</th>
              <th className="py-2">How long</th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map((r) => (
              <tr key={r.what} className="border-b border-stone-100 align-top">
                <td className="py-3 pr-4 font-medium text-stone-800">
                  {r.what}
                </td>
                <td className="py-3 pr-4">{r.why}</td>
                <td className="py-3 pr-4">{r.who}</td>
                <td className="py-3">{r.howLong}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LegalSection heading="Your choices">
        <ul className="list-disc space-y-2 pl-6">
          <li>Ask what we hold about you, and ask us to correct it.</li>
          <li>
            Withdraw consent (this may limit the services we can provide).
          </li>
          <li>
            Ask us to delete inquiry data that never became a client file.
          </li>
        </ul>
        <p>
          For any of these, email{" "}
          <a
            className="text-[var(--navy)] hover:underline"
            href="mailto:info@genzdatalabs.com"
          >
            info@genzdatalabs.com
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="What we never do">
        <ul className="list-disc space-y-2 pl-6">
          <li>Sell your personal information.</li>
          <li>Use advertising trackers on this website.</li>
          <li>Store your credit card numbers.</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
