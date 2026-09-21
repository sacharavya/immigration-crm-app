// Everything the product does, grouped the way a firm thinks about its work.
// One list feeds the Platform menu, the Solutions menu and /platform, so a
// feature is described once. Each entry maps to a staff route or a client
// portal that exists today; anything not yet shipped carries a tag rather
// than being quietly listed as done.
//
// To add a feature: add a line. Tags are "In development" or "Planned";
// omit the tag once it ships.

export type Feature = {
  slug: string;
  label: string;
  description: string;
  tag?: "In development" | "Planned";
};

export type FeatureGroup = { heading: string; features: Feature[] };

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    heading: "Case management",
    features: [
      { slug: "case-pipeline", label: "Case pipeline", description: "Every active file by phase, from retainer to decision, with who owns it." },
      { slug: "case-requests", label: "Case requests", description: "Triage incoming requests before they become files." },
      { slug: "clients-leads", label: "Clients & leads", description: "One record per person, with source, history and notes." },
      { slug: "tasks-deadlines", label: "Tasks & deadlines", description: "What is due, who owns it, and what is blocking it." },
      { slug: "checklists", label: "Checklists", description: "Versioned document checklists per program and service." },
    ],
  },
  {
    heading: "Documents & forms",
    features: [
      { slug: "ircc-form-autofill", label: "IRCC form autofill", description: "Data entered once flows into every form on the file." },
      { slug: "submission-packages", label: "Submission packages", description: "Assembled in the browser, so documents never leave it." },
      { slug: "pdf-tool", label: "PDF tool", description: "Merge, split, stamp and paginate without leaving the case." },
      { slug: "e-signature", label: "E-signature", description: "Retainers and consultation agreements signed online." },
      { slug: "client-portal", label: "Client portal", description: "Clients upload, sign and track progress from a single link." },
      { slug: "import", label: "Officio & spreadsheet import", description: "Bring an existing practice across without re-keying.", tag: "In development" },
    ],
  },
  {
    heading: "Practice operations",
    features: [
      { slug: "appointments", label: "Appointments & booking", description: "A public booking page, consultant calendars and reminders." },
      { slug: "payments", label: "Payments & invoicing", description: "Fees, government charges and HST, with pay-by-link." },
      { slug: "reports", label: "Reports", description: "Pipeline, revenue and approval rates across the firm." },
      { slug: "audit-log", label: "Compliance & audit log", description: "Every view, edit and export recorded for practice review." },
      { slug: "team-permissions", label: "Team & permissions", description: "Roles, supervision hierarchies and per-case access." },
      { slug: "referral-partners", label: "Referral partners", description: "A scoped portal for agents, with no access to full files." },
      { slug: "microsoft-storage", label: "OneDrive & SharePoint", description: "Keep documents in the firm's own Microsoft tenant." },
      { slug: "google-storage", label: "Google Drive storage", description: "The same document sync against Google Workspace.", tag: "Planned" },
    ],
  },
];

export const featureHref = (f: Feature) => `/platform#${f.slug}`;

/** The Platform menu: the same groups, as nav columns. */
export const PLATFORM_COLUMNS = FEATURE_GROUPS.map((g) => ({
  heading: g.heading,
  links: g.features.map((f) => ({
    label: f.label,
    href: featureHref(f),
    description: f.description,
    tag: f.tag,
  })),
}));

// The Solutions menu is the same product read from the other side: the
// problem a firm walks in with, and which part of the platform answers it.
export const SOLUTIONS: { problem: string; solution: string; slug: string }[] = [
  { problem: "Files scattered across email, drives and desktops", solution: "One case folder per client, kept in your own OneDrive or SharePoint.", slug: "microsoft-storage" },
  { problem: "Deadlines slip between consultants", solution: "Tasks with owners and due dates, on the case they belong to.", slug: "tasks-deadlines" },
  { problem: "Re-typing the same client data into every IRCC form", solution: "Enter it once; autofill carries it into every form on the file.", slug: "ircc-form-autofill" },
  { problem: "Clients calling for updates and sending documents by WhatsApp", solution: "A portal link where they upload, sign and see progress.", slug: "client-portal" },
  { problem: "Chasing retainers and payments", solution: "E-signed agreements and pay-by-link, tracked on the case.", slug: "payments" },
  { problem: "Practice reviews and CICC audits", solution: "An audit log of every view, edit and export, ready to hand over.", slug: "audit-log" },
];
