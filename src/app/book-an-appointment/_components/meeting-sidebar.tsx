"use client";

import {
  Check,
  Circle,
  Clock,
  DollarSign,
  MapPin,
  Video,
} from "lucide-react";

import type { PublicBookingType, PublicSlot } from "./types";

function formatFee(fee: number | null): string {
  if (fee === null || fee === 0) return "Free";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(fee);
}

function formatSlot(iso: string, tz: string): string {
  return new Date(iso).toLocaleString("en-CA", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

// ---------------------------------------------------------------------------
// Preparation notes parser
//
// Turns plain-text prep notes into structured sections. Recognises:
//   - Lines starting with a heading pattern (e.g. "What we'll cover:")
//   - Lines starting with "- " as list items
//   - Lines wrapped in quotes as a blockquote
//   - Everything else as paragraph text
// ---------------------------------------------------------------------------

type Section =
  | { type: "heading"; text: string }
  | { type: "checklist"; items: string[] }
  | { type: "bullets"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "paragraph"; text: string };

function parsePrepNotes(raw: string): Section[] {
  const lines = raw.split("\n");
  const sections: Section[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    // Skip empty lines
    if (!line) {
      i++;
      continue;
    }

    // Quoted line (starts and ends with quotes, or starts with ")
    if (
      (line.startsWith('"') && line.endsWith('"')) ||
      (line.startsWith("'") && line.endsWith("'")) ||
      (line.startsWith("\u201C") && line.includes("\u201D"))
    ) {
      sections.push({
        type: "quote",
        text: line.replace(/^["'\u201C]+|["'\u201D]+$/g, "").trim(),
      });
      i++;
      continue;
    }

    // Heading: line ends with ":" and is NOT a list item
    if (line.endsWith(":") && !line.startsWith("- ")) {
      const headingText = line.slice(0, -1).trim();
      sections.push({ type: "heading", text: headingText });
      i++;

      // Collect following list items
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (next.startsWith("- ")) {
          items.push(next.slice(2).trim());
          i++;
        } else if (next === "") {
          i++;
          // Check if more list items follow after blank line
          if (i < lines.length && lines[i].trim().startsWith("- ")) continue;
          break;
        } else {
          break;
        }
      }

      if (items.length > 0) {
        // Use checkmarks for "cover/discuss/expect" headings, bullets for others
        const isChecklist = /cover|discuss|expect|review|include/i.test(
          headingText,
        );
        sections.push({
          type: isChecklist ? "checklist" : "bullets",
          items,
        });
      }
      continue;
    }

    // Standalone list items without a heading
    if (line.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length) {
        const next = lines[i].trim();
        if (next.startsWith("- ")) {
          items.push(next.slice(2).trim());
          i++;
        } else if (next === "") {
          i++;
          break;
        } else {
          break;
        }
      }
      sections.push({ type: "bullets", items });
      continue;
    }

    // Regular paragraph
    sections.push({ type: "paragraph", text: line });
    i++;
  }

  return sections;
}

function PrepNotesDisplay({ notes }: { notes: string }) {
  const sections = parsePrepNotes(notes);

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => {
        switch (section.type) {
          case "heading":
            return (
              <h3
                key={idx}
                className="text-sm font-bold text-[#0F5132]"
              >
                {section.text}
              </h3>
            );
          case "checklist":
            return (
              <ul key={idx} className="space-y-2.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--gold)]" />
                    <span className="text-sm leading-relaxed text-stone-600">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "bullets":
            return (
              <ul key={idx} className="space-y-2.5">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    <Circle className="mt-1.5 h-2 w-2 shrink-0 fill-stone-400 text-stone-400" />
                    <span className="text-sm leading-relaxed text-stone-600">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "quote":
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-stone-300 pl-3 text-sm italic leading-relaxed text-stone-500"
              >
                {section.text}
              </blockquote>
            );
          case "paragraph":
            return (
              <p
                key={idx}
                className="text-sm leading-relaxed text-stone-600"
              >
                {section.text}
              </p>
            );
        }
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

export function MeetingSidebar({
  type,
  slot,
  clientTimezone,
}: {
  type: PublicBookingType;
  slot?: PublicSlot;
  clientTimezone?: string;
}) {
  const isPaid = type.fee_cad !== null && type.fee_cad > 0;

  return (
    <div className="shrink-0 lg:w-80 lg:sticky lg:top-6">
      <div className="rounded-2xl border border-[#D9E2EC] bg-white p-6 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)]">
        {/* Type label */}
        {isPaid && (
          <p className="text-xs font-medium text-stone-400">
            Paid consultation
          </p>
        )}

        <h2
          className={`text-[22px] font-extrabold tracking-[-.01em] text-[#0F5132] ${isPaid ? "mt-1" : ""}`}
        >
          {type.name}
        </h2>

        {/* Meta */}
        <div className="mt-3 space-y-2 text-sm text-stone-700">
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-[#D4AF7C]" />
            <span className="font-medium">{type.duration_minutes} minutes</span>
          </div>
          <div className="flex items-center gap-2.5">
            {type.default_location_type === "online" ? (
              <Video className="h-4 w-4 text-[#D4AF7C]" />
            ) : (
              <MapPin className="h-4 w-4 text-[#D4AF7C]" />
            )}
            <span className="font-medium">
              {type.default_location_type === "online"
                ? "Online meeting"
                : "In-person"}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <DollarSign className="h-4 w-4 text-[#D4AF7C]" />
            <span className="font-medium">
              {formatFee(type.fee_cad)} CAD
            </span>
          </div>
        </div>

        {/* Description */}
        {type.description && (
          <p className="mt-4 border-t border-[#EDF1F7] pt-4 text-sm leading-relaxed text-stone-600">
            {type.description}
          </p>
        )}

        {/* Selected time (shown on details + confirmation steps) */}
        {slot && clientTimezone && (
          <div className="mt-4 border-t border-[#EDF1F7] pt-4">
            <p className="font-[family-name:var(--font-dm-mono)] text-[11px] font-medium uppercase tracking-[.14em] text-[#4B5563]">
              Selected time
            </p>
            <p className="mt-1 text-[15px] font-bold text-[#0F5132]">
              {formatSlot(slot.start_utc, clientTimezone)}
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              {clientTimezone.replace(/_/g, " ")}
            </p>
          </div>
        )}

        {/* Preparation notes — structured */}
        {type.preparation_notes?.trim() && (
          <div className="mt-4 border-t border-[#EDF1F7] pt-4">
            <p className="font-[family-name:var(--font-dm-mono)] text-[11px] font-medium uppercase tracking-[.14em] text-[#4B5563]">
              What to expect
            </p>
            <div className="mt-3">
              <PrepNotesDisplay notes={type.preparation_notes} />
            </div>
          </div>
        )}

        {/* Payment notice */}
        {isPaid && (
          <div className="mt-4 flex items-start gap-2 rounded-lg bg-[#FBEBD9] px-3 py-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-[#9A5B12]" />
            <p className="text-xs leading-relaxed text-[#9A5B12]">
              Payment via Interac e-Transfer is required to confirm your
              booking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
