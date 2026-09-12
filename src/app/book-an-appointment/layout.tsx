// Public booking surface chrome: the shared marketing shell (sticky glass
// nav, gradient breadcrumb band, shared footer). The root layout still owns
// <html>/<body>; booking steps render inside the shell's content well.

import { MarketingShell } from "@/components/marketing/shell";

export default function BookLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MarketingShell
      crumbs={[{ label: "Book an appointment" }]}
      title="Book an appointment"
      subtitle="Pick a consultation type, choose a time that works for you, and tell us a little about your case."
    >
      <div className="pb-24 pt-2">{children}</div>
    </MarketingShell>
  );
}
