import { MEDIA, type MediaSlot } from "./media";

// The firms running on CaseBind. This is the whole list, so it is only ever
// firms that actually use the product — never a placeholder. To add one: a
// line here, and it appears on /firms.
export type Firm = {
  name: string;
  where: string;
  since: string;
  /** The story card's headline: what changed for them, in one line. */
  story: string;
  image: MediaSlot;
  /** Where "Read the story" goes. */
  href: string;
};

export const FIRMS: Firm[] = [
  {
    name: "Big Bang Immigration",
    where: "Toronto · Kathmandu",
    since: "Founding firm",
    story:
      "How a Toronto practice replaced spreadsheets, email threads and shared drives with one system for every file.",
    image: MEDIA.heroConsulting,
    href: "/about",
  },
];

// True of the platform today; shown as the strip under the hero.
export const FIRM_FACTS = [
  { big: "Alpha", small: "Open to a small group of firms, free through alpha and beta." },
  { big: "Canada", small: "Data stays in Canada; documents stay in the firm's own storage." },
  { big: "1 week", small: "Hands-on training for every firm we onboard." },
];
