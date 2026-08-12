// Initial Consultation Agreement — on-screen (HTML) rendering, shown to the
// client before they sign inline during booking, and to staff afterwards.
// The PDF archival copy (consultation-agreement-pdf-document.tsx) renders the
// SAME clauses from the same data. Any wording change must be made in both.

export type ConsultationAgreementData = {
  // "18 December 2025" style — pre-formatted so both surfaces match.
  agreement_date: string;
  appointment_date: string;
  appointment_time: string;
  subject: string; // e.g. "Permanent Resident Pathway to Canada"

  client_name: string;
  client_address: string;
  client_phone: string;
  client_email: string;

  rcic_name: string;
  rcic_membership_number: string;
  rcic_address: string;
  rcic_phone: string;
  rcic_email: string;

  // "$50 (inclusive of HST)" when the appointment type is priced; null for a
  // complimentary consultation (no fee clause shown).
  fee_line: string | null;

  // Final/signed render only.
  client_signature_image_url?: string | null;
  rcic_signature_image_url?: string | null;
  signed_date?: string | null;
};

export type ConsultationMode = "signing" | "final";

// The legal body as data, so the HTML view and the PDF stay in lock-step.
export function consultationClauses(d: ConsultationAgreementData) {
  const intro = `This consultation agreement is made this ${d.agreement_date}, for a consultation between Regulated Canadian Immigration Consultant (RCIC) ${d.rcic_name} Membership Number ${d.rcic_membership_number} with the purpose of discussing options for the client with respect to:`;

  const governing = `This Agreement shall be governed by the laws in the Province of Ontario and Canada which are applicable therein. Please be advised that ${d.rcic_name} is a member in good standing of The College of Immigration and Citizenship Consultants (CICC), and as such, is bound by its By-law(s), Regulations, Code of Professional Conduct for College of Immigration and Citizenship Consultants Licensees, and the RCIC Code of Professional Ethics. The role of CICC is to regulate licensed immigration consultants. The College requires the Licensee to conform to all provisions of the Code with regards to all issues resulting from this consultation. More information can be found at https://college-ic.ca/.`;

  const terms = [
    d.fee_line
      ? `The Client agrees to pay ${d.fee_line} for this consultation. The fee includes a 30 min initial consultation regarding PR pathways to Canada.`
      : null,
    "The consultation is meant to provide general guidance for your matter and not legal services.",
    "The consultation does not mean you have retained the RCIC, and it is regarding above referenced subject matter only. Retaining the RCIC means that you have entered into a separate Service Agreement.",
    "The RCIC is providing a consultation as per current government laws and policies etc. The RCIC is only accountable or responsible for actions based on the information provided during the consultation. The RCIC is not accountable or responsible for actions of others based on information provided during the consultation.",
  ].filter((t): t is string => t !== null);

  return { intro, governing, terms };
}

export function ConsultationAgreementDocument({
  data,
  mode,
}: {
  data: ConsultationAgreementData;
  mode: ConsultationMode;
}) {
  const { intro, governing, terms } = consultationClauses(data);
  return (
    <div className="mx-auto max-w-[680px] bg-white px-8 py-6 font-serif text-[13px] leading-relaxed text-stone-900">
      <div className="text-center">
        <div className="text-lg font-bold">The Big Bang Immigration Consulting Inc</div>
        <div className="font-semibold">Initial Consultation Agreement</div>
      </div>

      <p className="mt-5">{intro}</p>
      <p className="my-3 font-semibold">{data.subject}</p>

      <div className="my-4 rounded border border-stone-300 px-4 py-2">
        <DetailLine label="Date" value={data.appointment_date} />
        <DetailLine label="Time" value={data.appointment_time} />
        <DetailLine
          label="Cost"
          value={data.fee_line ?? "Complimentary"}
        />
        <DetailLine label="RCIC" value={data.rcic_name} />
        <DetailLine label="RCIC Number" value={data.rcic_membership_number} />
      </div>

      <p>{governing}</p>

      <p className="mt-5 font-bold">CLIENT INFORMATION</p>
      <Field label="Client Name" value={data.client_name} />
      <Field label="Client Address" value={data.client_address} />
      <Field label="Client Telephone number" value={data.client_phone} />
      <Field label="Client email address" value={data.client_email} />

      <p className="mt-4 font-bold">RCIC INFORMATION:</p>
      <Field label="RCIC Name" value={data.rcic_name} />
      <Field label="RCIC Address" value={data.rcic_address} />
      <Field label="RCIC Telephone no." value={data.rcic_phone} />
      <Field label="RCIC Email" value={data.rcic_email} />

      <p className="mt-5">
        Upon signing this agreement, the Client hereby agrees to following terms
        and conditions:
      </p>
      <ul className="mt-2 list-disc space-y-2 pl-6">
        {terms.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>

      <div className="mt-8 grid grid-cols-2 gap-8">
        <SignatureBlock
          line="Client Signature"
          imageUrl={mode === "final" ? data.client_signature_image_url : null}
          date={mode === "final" ? data.signed_date : null}
        />
        <SignatureBlock
          line="RCIC"
          // RCIC counter-signs only once the applicant has signed.
          imageUrl={mode === "final" ? data.rcic_signature_image_url : null}
          date={mode === "final" ? data.signed_date : null}
        />
      </div>
    </div>
  );
}

// Bolded key detail (cost / date / time / RCIC name + number).
function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4">
      <span>{label}:</span>
      <span className="font-bold">{value || "—"}</span>
    </p>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="mt-1">
      <span className="font-semibold">{label}:</span> {value || "—"}
    </p>
  );
}

function SignatureBlock({
  line,
  imageUrl,
  date,
}: {
  line: string;
  imageUrl?: string | null;
  date?: string | null;
}) {
  return (
    <div>
      <div className="flex h-12 items-end">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="max-h-12 object-contain" />
        ) : null}
      </div>
      <div className="border-t border-stone-800 pt-1 text-xs">{line}</div>
      <div className="mt-3 text-xs text-stone-600">
        {date ? date : "Date (Month/Day/Year)"}
      </div>
    </div>
  );
}
