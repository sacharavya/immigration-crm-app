import type { Metadata } from "next";

import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use - genzdatalabs Immigration",
  description:
    "Terms governing the use of the genzdatalabs Immigration website, free tools, and online booking.",
};

const UPDATED = "August 29, 2026";

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated={UPDATED}>
      <p>
        These terms govern your use of the genzdatalabs Immigration Consulting Inc
        website, including our free tools and online booking. By using this
        site you agree to them. They are governed by the laws of Ontario and
        Canada.
      </p>

      <LegalSection heading="1. Who we are">
        <p>
          genzdatalabs Immigration Consulting Inc provides Canadian immigration
          consulting services through Regulated Canadian Immigration
          Consultants (RCICs) who are members in good standing of the College
          of Immigration and Citizenship Consultants (CICC), the federal
          regulator of immigration consultants. More information about the
          College is available at{" "}
          <a
            className="text-[var(--navy)] hover:underline"
            href="https://college-ic.ca"
            rel="noreferrer"
            target="_blank"
          >
            college-ic.ca
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="2. Tools are estimates, not advice">
        <p>
          The CRS calculator, NOC finder, and pathway resources are provided
          for general information. Their results are estimates based on the
          information you enter and on published rules that change frequently.
          They are not immigration or legal advice, they do not account for
          your full circumstances, and eligibility rules (including spousal
          open work permit occupation lists) are set and changed by IRCC
          without notice. Always confirm against official IRCC sources or a
          licensed consultant before acting.
        </p>
      </LegalSection>

      <LegalSection heading="3. No client relationship until an agreement is signed">
        <p>
          Using this website, its tools, or submitting an inquiry form does not
          make you a client and does not create a consultant-client
          relationship. A relationship begins only when you and genzdatalabs Immigration
          Immigration sign a consultation agreement or retainer agreement, and
          it is governed by that agreement. Until then, do not send us
          confidential material beyond what our forms request.
        </p>
      </LegalSection>

      <LegalSection heading="4. Bookings and payments">
        <p>
          Paid consultations are confirmed when payment is received (by
          e-transfer proof or, for in-office payment, at booking). Fees for
          consultations are stated at booking time and include applicable tax
          where indicated. Slots held for unpaid online bookings are released
          at the end of the day. To reschedule or cancel, use the link in your
          confirmation email. Consultation fees may be credited toward a
          retainer if you retain us, as stated during booking.
        </p>
      </LegalSection>

      <LegalSection heading="5. Acceptable use">
        <p>
          You agree not to misuse the site: no attempts to gain unauthorized
          access, no automated scraping of our tools, no submitting content
          that is unlawful or infringes the rights of others, and no
          impersonating another person in bookings or forms.
        </p>
      </LegalSection>

      <LegalSection heading="6. Intellectual property">
        <p>
          The content of this site (text, design, tools) belongs to genzdatalabs Immigration
          Immigration Consulting Inc or its licensors. You may use it for
          personal, non-commercial purposes; any other use requires our
          written permission.
        </p>
      </LegalSection>

      <LegalSection heading="7. Limitation of liability">
        <p>
          To the maximum extent permitted by law, genzdatalabs Immigration is not
          liable for losses arising from your use of this website or its free
          tools, including decisions made in reliance on tool results.
          Services provided under a signed agreement are governed by that
          agreement, not by this section. Nothing in these terms limits
          liability that cannot be limited under applicable law or CICC
          rules.
        </p>
      </LegalSection>

      <LegalSection heading="8. Privacy">
        <p>
          Our collection and use of personal information is described in the{" "}
          <a className="text-[var(--navy)] hover:underline" href="/privacy-policy">
            Privacy Policy
          </a>{" "}
          and{" "}
          <a className="text-[var(--navy)] hover:underline" href="/data-usage">
            Data Usage Summary
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection heading="9. Changes">
        <p>
          We may update these terms; the date above reflects the latest
          revision. Continued use of the site after a change means you accept
          the updated terms.
        </p>
      </LegalSection>

      <LegalSection heading="10. Contact">
        <p>
          Questions about these terms: {" "}
          <a
            className="text-[var(--navy)] hover:underline"
            href="mailto:info@genzdatalabs.com"
          >
            info@genzdatalabs.com
          </a>{" "}
          or 211-2390 Eglinton Avenue East, Toronto, ON M1K 2P5.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
