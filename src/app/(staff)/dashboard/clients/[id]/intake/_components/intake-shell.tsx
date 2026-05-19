"use client";

import { Check, Circle } from "lucide-react";
import { useEffect, useState } from "react";

import { Card, CardContent } from "@/components/ui/card";
import type {
  IntakeRelated,
  IntakeSection,
  SectionStatus,
} from "@/lib/intake/completeness";
import type { Database } from "@/lib/supabase/types";

import { AddressSection } from "./address-section";
import { BackgroundSection } from "./background-section";
import { BiometricsSection } from "./biometrics-section";
import { EducationSection } from "./education-section";
import { EmploymentSection } from "./employment-section";
import { FamilySection } from "./family-section";
import { GovernmentSection } from "./government-section";
import { MilitarySection } from "./military-section";
import { OrganisationSection } from "./organisation-section";
import { PersonalSection } from "./personal-section";
import { TravelSection } from "./travel-section";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];
type CountryOption = { code: string; name: string };

const SECTION_IDS: IntakeSection[] = [
  "personal",
  "family_parents_spouse",
  "family_children",
  "family_siblings",
  "education",
  "employment",
  "travel",
  "biometrics",
  "addresses",
  "background",
  "organisations",
  "government",
  "military",
];

export function IntakeShell({
  client,
  related,
  countries,
  sections,
  canEdit,
}: {
  client: ClientRow;
  related: IntakeRelated;
  countries: CountryOption[];
  sections: SectionStatus[];
  canEdit: boolean;
}) {
  const [active, setActive] = useState<IntakeSection>("personal");

  // Highlight the section currently centred in the viewport, so the rail
  // tracks scroll position.
  useEffect(() => {
    const handler = () => {
      const mid = window.scrollY + window.innerHeight / 3;
      let best: IntakeSection = "personal";
      let bestDelta = Infinity;
      for (const s of SECTION_IDS) {
        const el = document.getElementById(`section-${s}`);
        if (!el) continue;
        const top = el.offsetTop;
        const delta = Math.abs(mid - top);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = s;
        }
      }
      setActive(best);
    };
    window.addEventListener("scroll", handler, { passive: true });
    handler();
    return () => window.removeEventListener("scroll", handler);
  }, []);

  function jumpTo(s: IntakeSection) {
    const el = document.getElementById(`section-${s}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
      {/* Left rail */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-sm lg:overflow-visible">
          <ul className="flex gap-1 lg:flex-col lg:gap-0.5">
            {sections.map((s) => {
              const isActive = active === s.section;
              return (
                <li key={s.section} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => jumpTo(s.section)}
                    className={`flex w-full items-start gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors ${
                      isActive
                        ? "bg-stone-100 text-stone-900"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    {s.isComplete ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 shrink-0 text-stone-300" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{s.label}</span>
                      {!s.isComplete && s.reason && (
                        <span className="mt-0.5 block text-xs text-stone-500">
                          {s.reason}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>

      {/* Right pane: stacked section cards */}
      <div className="space-y-4">
        <SectionCard id="personal" title="Personal Details">
          <PersonalSection
            client={client}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard
          id="family_parents_spouse"
          title="Family — Parents & Spouse"
        >
          <FamilySection
            mode="parents_spouse"
            client={client}
            family={related.family}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="family_children" title="Family — Children">
          <FamilySection
            mode="children"
            client={client}
            family={related.family}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="family_siblings" title="Family — Siblings">
          <FamilySection
            mode="siblings"
            client={client}
            family={related.family}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="education" title="Education">
          <EducationSection
            client={client}
            education={related.education}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="employment" title="Personal History">
          <EmploymentSection
            clientId={client.id}
            employment={related.employment}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="travel" title="Travel History">
          <TravelSection
            client={client}
            travel={related.travel}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="biometrics" title="Biometrics History">
          <BiometricsSection
            client={client}
            records={related.biometrics}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="addresses" title="Address History">
          <AddressSection
            clientId={client.id}
            addresses={related.addresses}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="background" title="Background Questions">
          <BackgroundSection client={client} canEdit={canEdit} />
        </SectionCard>

        <SectionCard id="organisations" title="Organisation Memberships">
          <OrganisationSection
            client={client}
            organisations={related.organisations}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="government" title="Government Positions">
          <GovernmentSection
            client={client}
            government={related.government}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>

        <SectionCard id="military" title="Military Service">
          <MilitarySection
            client={client}
            military={related.military}
            countries={countries}
            canEdit={canEdit}
          />
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card id={`section-${id}`} className="scroll-mt-6">
      <CardContent className="space-y-4 p-6">
        <h2 className="text-lg font-semibold tracking-tight text-stone-900">
          {title}
        </h2>
        {children}
      </CardContent>
    </Card>
  );
}
