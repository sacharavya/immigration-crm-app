// The firms running on CaseBind. This is the whole list, so it is only ever
// firms that actually use the product — never a placeholder. To add one: a
// line here, and it appears on /firms and in the Company menu count.
export type Firm = {
  name: string;
  where: string;
  /** What they do with it, in their terms — not a testimonial. */
  note: string;
  since: string;
  href?: string;
};

export const FIRMS: Firm[] = [
  {
    name: "genzdatalabs Immigration Consulting",
    where: "Toronto · Kathmandu",
    note: "The regulated practice CaseBind was built inside. Every case, form, retainer and payment runs through the platform.",
    since: "Founding firm",
  },
];
