// Public booking surface: nav + footer chrome only. The booking flow owns
// the gradient band so its breadcrumb and title follow the current step.

import { PublicChrome } from "@/components/marketing/shell";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicChrome>{children}</PublicChrome>;
}
