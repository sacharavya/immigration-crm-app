// The firms running on CaseBind. This is the whole list, so it is only ever
// firms that actually use the product — never a placeholder. To add one: a
// line here and its logo under public/.
export type Firm = { name: string; logo: string };

export const FIRMS: Firm[] = [
  { name: "Big Bang Immigration", logo: "/bigbang.png" },
];
