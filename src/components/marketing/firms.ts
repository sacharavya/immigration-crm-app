// The firms running on CaseBind. This is the whole list, so it is only ever
// firms that actually use the product — never a placeholder. To add one: a
// line here and its logo under public/.
export type Firm = { name: string; logo: string; hidden?: boolean };

export const FIRMS: Firm[] = [
  { name: "Big Bang Immigration", logo: "/bigbang.png" },
  // Not live yet: kept here so going live is a one-word change.
  { name: "MDS Visa", logo: "/mdsvisa.png", hidden: true },
  { name: "White Bunny", logo: "/whitebunny.png", hidden: true },
  { name: "Aayam Immigration", logo: "/aayam.svg", hidden: true },
];

/** The firms shown publicly. */
export const LIVE_FIRMS = FIRMS.filter((f) => !f.hidden);

/** A marquee of one or two logos just repeats itself; show it from five. */
export const SHOW_MARQUEE = LIVE_FIRMS.length >= 5;
