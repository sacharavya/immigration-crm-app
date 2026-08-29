import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy - Big Bang Immigration",
  description:
    "How Big Bang Immigration Consulting Inc collects, uses, stores, and protects your personal information under PIPEDA.",
};

const UPDATED = "August 29, 2026";

export default function PrivacyPolicyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={UPDATED}>
      <p>
        Big Bang Immigration Consulting Inc (&quot;Big Bang Immigration&quot;,
        &quot;we&quot;, &quot;us&quot;) is committed to protecting your personal
        information. This policy explains what we collect, why we collect it,
        how we protect it, and the rights you have over it. It is written to
        align with the Personal Information Protection and Electronic Documents
        Act (PIPEDA) and its ten fair information principles.
      </p>

      <LegalSection heading="1. Accountability">
        <p>
          We are responsible for the personal information under our control.
          Our Privacy Officer oversees compliance with this policy and can be
          reached at{" "}
          <a
            className="text-[var(--navy)] hover:underline"
            href="mailto:info@bigbangimmigration.com"
          >
            info@bigbangimmigration.com
          </a>{" "}
          or by mail at 211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5.
        </p>
      </LegalSection>

      <LegalSection heading="2. What we collect and why">
        <p>We collect personal information only for identified purposes:</p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Consultation bookings:</strong> your name, email, phone
            number, address, date of birth, marital status, education, language
            test results, and occupation, together with the reason for your
            appointment. This lets us prepare for your consultation and assess
            your immigration options.
          </li>
          <li>
            <strong>Consultation agreements:</strong> your signature, and the
            date, IP address, and browser details at the moment of signing.
            These form the record that you entered into the agreement.
          </li>
          <li>
            <strong>Payments:</strong> e-transfer confirmation screenshots you
            upload as proof of payment. We do not collect or store credit card
            numbers.
          </li>
          <li>
            <strong>Client files:</strong> documents you provide for your
            application (passports, certificates, financial records, and
            similar), your case history, and communications with our team.
          </li>
          <li>
            <strong>Free tools:</strong> the NOC finder sends the job title and
            duties you type to our search service to find matching occupation
            codes. The CRS calculator runs entirely in your browser; your
            answers are never sent to our servers. If you submit an application
            or interest form after using a tool, the details you enter and the
            tool results you were viewing are saved with your inquiry.
          </li>
          <li>
            <strong>Website operation:</strong> essential cookies for signed-in
            sessions. We do not use advertising trackers or sell data to
            advertisers.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="3. Consent">
        <p>
          We collect personal information with your knowledge and consent: you
          provide it directly through our forms, uploads, and meetings, each of
          which states or links to the purpose of collection. You may withdraw
          consent at any time, subject to legal or contractual restrictions and
          reasonable notice; withdrawing consent may limit our ability to
          provide services. To withdraw consent, contact our Privacy Officer.
        </p>
      </LegalSection>

      <LegalSection heading="4. Limiting collection, use, and disclosure">
        <p>
          We collect only what is needed for the purposes above, and we use and
          disclose it only for those purposes, with these exceptions:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            submission of your application materials to Immigration, Refugees
            and Citizenship Canada (IRCC) and other government bodies, on your
            instruction;
          </li>
          <li>where a law, regulation, or court order requires disclosure;</li>
          <li>
            to our regulator, the College of Immigration and Citizenship
            Consultants (CICC), where its rules require it.
          </li>
        </ul>
        <p>We never sell personal information.</p>
      </LegalSection>

      <LegalSection heading="5. Retention">
        <p>
          We keep client files for at least six years after your file closes,
          as required by our regulator, and then dispose of them securely.
          Inquiry and lead information that does not become a client file is
          kept only as long as reasonably needed to respond and follow up.
        </p>
      </LegalSection>

      <LegalSection heading="6. Accuracy">
        <p>
          We rely on the information you provide and update your file when you
          tell us something has changed. Immigration outcomes depend on
          accurate information, so please keep us informed.
        </p>
      </LegalSection>

      <LegalSection heading="7. Safeguards and where your data lives">
        <p>
          Access to your information is limited to authorized staff with
          role-based permissions, protected by authentication, encryption in
          transit, and audit logging. Our systems store data with these
          providers:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            our case management database, hosted in Canada (Canadian cloud
            region);
          </li>
          <li>
            client documents in Microsoft 365 (SharePoint/OneDrive), Canadian
            region;
          </li>
          <li>website hosting and transactional email delivery providers.</li>
        </ul>
        <p>
          One exception involves a transfer outside Canada: the NOC finder uses
          a third-party AI service hosted in the United States to interpret the
          job title and duties you type. That text is not linked to your name
          or account. Providers outside Canada are subject to the laws of their
          jurisdictions.
        </p>
      </LegalSection>

      <LegalSection heading="8. Openness">
        <p>
          This policy, together with our{" "}
          <a className="text-[var(--navy)] hover:underline" href="/data-usage">
            Data Usage Summary
          </a>
          , describes our practices in plain language. Questions are welcome at
          any time.
        </p>
      </LegalSection>

      <LegalSection heading="9. Access and correction">
        <p>
          You may request access to the personal information we hold about you,
          ask how it has been used and to whom it has been disclosed, and
          request corrections. Write to our Privacy Officer; we respond within
          30 days. In limited cases the law requires or permits us to refuse
          access (for example, information subject to solicitor-client style
          protections or containing another person&apos;s information); if we
          refuse, we will explain why.
        </p>
      </LegalSection>

      <LegalSection heading="10. Challenging compliance">
        <p>
          If you believe we have not handled your information appropriately,
          contact our Privacy Officer first; we investigate every complaint. If
          you are not satisfied with our response, you may complain to the
          Office of the Privacy Commissioner of Canada (
          <a
            className="text-[var(--navy)] hover:underline"
            href="https://www.priv.gc.ca"
            rel="noreferrer"
            target="_blank"
          >
            priv.gc.ca
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection heading="Changes to this policy">
        <p>
          We may update this policy as our services or the law change. The date
          at the top reflects the latest revision; material changes will be
          highlighted on this page.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
