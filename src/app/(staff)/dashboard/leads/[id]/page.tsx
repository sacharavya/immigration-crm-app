// Same profile as clients/[id], served under /dashboard/leads/[id] so the
// URL matches where staff came from. Intake links inside still point to the
// clients path, which is fine once the lead converts.
export { default } from "../../clients/[id]/page";
// Route segment config must be declared literally, not re-exported.
export const dynamic = "force-dynamic";
