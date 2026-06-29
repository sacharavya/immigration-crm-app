import { format, formatDistanceToNowStrict } from "date-fns";
import { ArrowUpRight, Mail, Phone, Quote } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { AGENT_TYPE_LABEL, type AgentType } from "@/lib/validators/agent";
import { cn } from "@/lib/utils/index";

import { DismissRequestButton } from "./dismiss-request-button";
import type { RequestStatus } from "./status-tabs";

export type RequestCardData = {
  id: string;
  status: RequestStatus;
  note: string | null;
  createdAt: string;
  handledAt: string | null;
  clientId: string;
  client: {
    name: string;
    number: string;
    email: string | null;
    phone: string | null;
  } | null;
  agent: {
    name: string;
    organization: string | null;
    type: AgentType;
    email: string | null;
  } | null;
  serviceName: string | null;
  resultingCase: { id: string; number: string } | null;
  handledByName: string | null;
};

const STATUS_BADGE: Record<RequestStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-[color:var(--warning-subtle)] text-[color:var(--warning-text)]",
  },
  opened: {
    label: "Opened",
    className: "bg-[color:var(--success-subtle)] text-[color:var(--success-text)]",
  },
  dismissed: {
    label: "Dismissed",
    className: "bg-muted text-muted-foreground",
  },
};

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function RequestCard({
  request: r,
  canCreate,
}: {
  request: RequestCardData;
  canCreate: boolean;
}) {
  const clientName = r.client?.name ?? "Unknown client";
  const badge = STATUS_BADGE[r.status];

  return (
    <article className="rounded-xl border border-border bg-card p-4">
      {/* Client identity + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span
            aria-hidden
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            {initials(clientName)}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Link
                href={`/dashboard/clients/${r.clientId}`}
                className="text-sm font-semibold text-foreground hover:underline"
              >
                {clientName}
              </Link>
              {r.client && (
                <span className="font-mono text-xs text-[color:var(--subtle-foreground)]">
                  {r.client.number}
                </span>
              )}
            </div>
            {r.client && (r.client.email || r.client.phone) && (
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                {r.client.email && (
                  <span className="inline-flex items-center gap-1">
                    <Mail aria-hidden className="h-3 w-3" />
                    {r.client.email}
                  </span>
                )}
                {r.client.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone aria-hidden className="h-3 w-3" />
                    {r.client.phone}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
            badge.className,
          )}
        >
          {badge.label}
        </span>
      </div>

      {/* Service + referrer */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
        <span className="inline-flex items-center gap-1.5">
          <span className="text-muted-foreground">Service</span>
          {r.serviceName ? (
            <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[11px] font-medium text-navy-700">
              {r.serviceName}
            </span>
          ) : (
            <span className="font-medium text-[color:var(--warning-text)]">
              Not specified
            </span>
          )}
        </span>

        {r.agent && (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className="text-muted-foreground">Referred by</span>
            <span
              aria-hidden
              className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold text-muted-foreground"
            >
              {initials(r.agent.name)}
            </span>
            <span className="font-medium text-foreground">{r.agent.name}</span>
            <span className="inline-flex items-center rounded-full border border-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {AGENT_TYPE_LABEL[r.agent.type]}
            </span>
            {r.agent.organization && (
              <span className="text-muted-foreground">· {r.agent.organization}</span>
            )}
          </span>
        )}
      </div>

      {/* Note */}
      {r.note && (
        <div className="mt-3 flex gap-2 rounded-lg border border-border bg-[color:var(--surface-sunken)] px-3 py-2">
          <Quote aria-hidden className="h-3.5 w-3.5 shrink-0 text-[color:var(--subtle-foreground)]" />
          <p className="whitespace-pre-wrap text-sm text-foreground">{r.note}</p>
        </div>
      )}

      {/* Footer: timestamp + status-specific actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span
          className="text-xs text-muted-foreground"
          title={format(new Date(r.createdAt), "PPpp")}
        >
          Requested{" "}
          {formatDistanceToNowStrict(new Date(r.createdAt), { addSuffix: true })}
          {r.status !== "pending" && r.handledAt && (
            <>
              {" · "}
              {r.status === "opened" ? "opened" : "dismissed"}{" "}
              {formatDistanceToNowStrict(new Date(r.handledAt), { addSuffix: true })}
              {r.handledByName ? ` by ${r.handledByName}` : ""}
            </>
          )}
        </span>

        <div className="flex shrink-0 items-center gap-2">
          {r.status === "opened" && r.resultingCase && (
            <Link
              href={`/dashboard/cases/${r.resultingCase.id}`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1")}
            >
              View case {r.resultingCase.number}
              <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          )}
          {r.status === "pending" && canCreate && (
            <>
              <Link
                href={`/dashboard/cases/new?client_id=${r.clientId}&request_id=${r.id}`}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Open case
              </Link>
              <DismissRequestButton requestId={r.id} />
            </>
          )}
        </div>
      </div>
    </article>
  );
}
