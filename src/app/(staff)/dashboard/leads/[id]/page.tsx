// Same profile as clients/[id], served under /dashboard/leads/[id] so the
// URL matches where staff came from. Intake links inside still point to the
// clients path, which is fine once the lead converts.
export { default, dynamic } from "../../clients/[id]/page";
