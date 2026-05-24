/**
 * FLOW-3a: pure computation that maps case state to an "action chip" —
 * a one-line summary of what needs to happen next, who's responsible,
 * and how urgent it is.
 *
 * Inputs come from crm.v_case_chip_inputs (a view that joins cases,
 * retainer_agreements, payments, documents, and latest material event).
 * The function is exhaustive over case_status; TypeScript catches any
 * future status that lands without a branch.
 *
 * The vocabulary table this function implements is the spec; changing
 * chip text without updating the table is a bug.
 */

import type { Database } from "@/lib/supabase/types";

export type CaseStatus = Database["crm"]["Enums"]["case_status"];
export type RetainerStatus =
  Database["crm"]["Enums"]["retainer_agreement_status"];
export type BiometricsStatus = Database["crm"]["Enums"]["biometrics_status"];
export type EventType = Database["crm"]["Enums"]["event_type"];

export type ChipResponsibility = "us" | "client" | "ircc" | "passive";
export type ChipUrgency = "normal" | "sensitive" | "overdue";

export type ChipInput = {
  case: {
    status: CaseStatus;
    biometrics_status: BiometricsStatus;
    updated_at: string;
    retainer_minimum_cad: number | null;
    quoted_fee_cad: number;
  };
  retainer: {
    status: RetainerStatus;
    sent_at: string | null;
    has_fee_breakdown: boolean;
  } | null;
  payments: {
    collected_cad: number;
  };
  documents: {
    required: number;
    uploaded: number;
    accepted: number;
    rejected: number;
    last_rejected_at: string | null;
  };
  latest_event: {
    event_type: EventType;
    occurred_at: string;
    event_data: Record<string, unknown>;
  } | null;
  // FLOW-3d: ad-hoc IRCC document requests, while the case stays at
  // submitted_to_ircc. Null when no such requests exist.
  additional_docs: {
    requested: number;
    uploaded: number;
    accepted: number;
    latest_request_due: string | null;
    submitted_after_request: boolean;
  } | null;
  now: Date;
};

export type ChipOutput = {
  text: string;
  responsibility: ChipResponsibility;
  urgency: ChipUrgency;
  waiting_days: number | null;
};

// Tunable thresholds. Centralised so adjusting "what counts as overdue"
// doesn't require editing the function body.
const URGENCY_THRESHOLDS = {
  client_action_stale_days: 7,
  client_action_overdue_days: 14,
  passport_submit_overdue_days: 7,
  ircc_response_concerning_days: 90,
  document_rejection_stale_days: 7,
} as const;

function daysBetween(from: string, to: Date): number {
  const fromMs = new Date(from).getTime();
  const toMs = to.getTime();
  return Math.floor((toMs - fromMs) / (1000 * 60 * 60 * 24));
}

function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
  });
}

export function computeActionChip(input: ChipInput): ChipOutput {
  const { case: c, retainer, payments, documents, latest_event, now } = input;

  // ---- Phase 5 outcomes -------------------------------------------------
  if (c.status === "passport_requested") {
    const sinceTransition = daysBetween(c.updated_at, now);
    if (sinceTransition >= URGENCY_THRESHOLDS.passport_submit_overdue_days) {
      return {
        text: `Submit passport to IRCC · ${sinceTransition} days`,
        responsibility: "us",
        urgency: "overdue",
        waiting_days: sinceTransition,
      };
    }
    return {
      text: "Submit passport to IRCC",
      responsibility: "us",
      urgency: "sensitive",
      waiting_days: sinceTransition,
    };
  }

  if (c.status === "refused") {
    return {
      text: "Discuss refusal with client",
      responsibility: "us",
      urgency: "normal",
      waiting_days: null,
    };
  }

  if (c.status === "closed") {
    return {
      text: "Closed",
      responsibility: "passive",
      urgency: "normal",
      waiting_days: null,
    };
  }

  // ---- Phase 4: submitted_to_ircc --------------------------------------
  if (c.status === "submitted_to_ircc") {
    const evt = latest_event?.event_type ?? null;
    const evtData = (latest_event?.event_data ?? {}) as Record<string, unknown>;

    if (evt === "biometrics_requested") {
      return {
        text: "Schedule biometrics with client",
        responsibility: "us",
        urgency: "sensitive",
        waiting_days: latest_event
          ? daysBetween(latest_event.occurred_at, now)
          : null,
      };
    }

    if (evt === "biometrics_scheduled") {
      const scheduledDate =
        typeof evtData.scheduled_date === "string"
          ? evtData.scheduled_date
          : null;
      return {
        text: scheduledDate
          ? `Biometrics on ${formatShortDate(scheduledDate)}`
          : "Biometrics scheduled",
        responsibility: "passive",
        urgency: "normal",
        waiting_days: null,
      };
    }

    if (evt === "additional_info_requested") {
      const dueDate =
        typeof evtData.due_date === "string" ? evtData.due_date : null;
      return {
        text: dueDate
          ? `Respond to IRCC by ${formatShortDate(dueDate)}`
          : "Respond to IRCC",
        responsibility: "us",
        urgency: "sensitive",
        waiting_days: latest_event
          ? daysBetween(latest_event.occurred_at, now)
          : null,
      };
    }

    if (evt === "interview_scheduled") {
      const interviewDate =
        typeof evtData.interview_date === "string"
          ? evtData.interview_date
          : null;
      return {
        text: interviewDate
          ? `Interview on ${formatShortDate(interviewDate)}`
          : "Interview scheduled",
        responsibility: "passive",
        urgency: "normal",
        waiting_days: null,
      };
    }

    if (evt === "application_returned") {
      return {
        text: "Review returned application",
        responsibility: "us",
        urgency: "sensitive",
        waiting_days: null,
      };
    }

    // Additional-documents request takes priority over the generic
    // "awaiting IRCC" default. Falls through once additional_info_submitted
    // has been recorded after the most recent request.
    const ad = input.additional_docs;
    if (
      ad &&
      ad.requested > 0 &&
      !ad.submitted_after_request
    ) {
      const due = ad.latest_request_due;
      const isOverdue =
        due !== null && new Date(due).getTime() < now.getTime();

      if (ad.uploaded < ad.requested) {
        return {
          text: due
            ? `Upload additional documents · due ${formatShortDate(due)}`
            : "Upload additional documents",
          responsibility: "client",
          urgency: isOverdue ? "overdue" : "sensitive",
          waiting_days: null,
        };
      }
      if (ad.accepted < ad.requested) {
        return {
          text: "Review additional documents",
          responsibility: "us",
          urgency: "normal",
          waiting_days: null,
        };
      }
      // All uploaded and accepted — staff needs to send them back to IRCC.
      return {
        text: "Submit additional documents to IRCC",
        responsibility: "us",
        urgency: "sensitive",
        waiting_days: null,
      };
    }

    // Default: awaiting IRCC. Also covers biometrics_completed,
    // additional_info_submitted, interview_completed — all of which
    // return us to "waiting on IRCC" state.
    const submittedDays = daysBetween(c.updated_at, now);
    if (submittedDays >= URGENCY_THRESHOLDS.ircc_response_concerning_days) {
      return {
        text: `Awaiting IRCC response · ${submittedDays} days`,
        responsibility: "ircc",
        urgency: "sensitive",
        waiting_days: submittedDays,
      };
    }
    return {
      text: "Awaiting IRCC response",
      responsibility: "ircc",
      urgency: "normal",
      waiting_days: submittedDays,
    };
  }

  // ---- Phase 3: documentation_review -----------------------------------
  if (c.status === "documentation_review") {
    if (documents.accepted >= documents.required && documents.required > 0) {
      return {
        text: "Submit to IRCC",
        responsibility: "us",
        urgency: "normal",
        waiting_days: null,
      };
    }
    return {
      text: "RCIC reviewing documents",
      responsibility: "us",
      urgency: "normal",
      waiting_days: null,
    };
  }

  // ---- Phase 2: documentation_in_progress ------------------------------
  if (c.status === "documentation_in_progress") {
    if (documents.required === 0) {
      return {
        text: "Mark required documents",
        responsibility: "us",
        urgency: "normal",
        waiting_days: null,
      };
    }

    if (documents.rejected > 0 && documents.last_rejected_at) {
      const daysSinceRejection = daysBetween(documents.last_rejected_at, now);
      if (
        daysSinceRejection >= URGENCY_THRESHOLDS.document_rejection_stale_days
      ) {
        return {
          text: `Awaiting client re-upload · ${daysSinceRejection} days`,
          responsibility: "client",
          urgency: "sensitive",
          waiting_days: daysSinceRejection,
        };
      }
      return {
        text: "Awaiting client re-upload",
        responsibility: "client",
        urgency: "normal",
        waiting_days: daysSinceRejection,
      };
    }

    if (documents.uploaded < documents.required) {
      return {
        text: "Awaiting client documents",
        responsibility: "client",
        urgency: "normal",
        waiting_days: null,
      };
    }

    if (documents.accepted < documents.uploaded) {
      return {
        text: "Review uploaded documents",
        responsibility: "us",
        urgency: "normal",
        waiting_days: null,
      };
    }

    // All required uploaded and accepted
    return {
      text: "Advance to Review",
      responsibility: "us",
      urgency: "normal",
      waiting_days: null,
    };
  }

  // ---- Phase 1: retainer_pending ---------------------------------------
  if (c.status === "retainer_pending") {
    if (!retainer || retainer.status === "draft") {
      if (!retainer || !retainer.has_fee_breakdown) {
        return {
          text: "Prepare retainer",
          responsibility: "us",
          urgency: "normal",
          waiting_days: null,
        };
      }
      return {
        text: "Send retainer to client",
        responsibility: "us",
        urgency: "normal",
        waiting_days: null,
      };
    }

    if (retainer.status === "pending_signature") {
      const sentDays = retainer.sent_at
        ? daysBetween(retainer.sent_at, now)
        : 0;
      if (sentDays >= URGENCY_THRESHOLDS.client_action_overdue_days) {
        return {
          text: `Awaiting client signature · ${sentDays} days`,
          responsibility: "client",
          urgency: "overdue",
          waiting_days: sentDays,
        };
      }
      if (sentDays >= URGENCY_THRESHOLDS.client_action_stale_days) {
        return {
          text: `Awaiting client signature · ${sentDays} days`,
          responsibility: "client",
          urgency: "sensitive",
          waiting_days: sentDays,
        };
      }
      return {
        text: "Awaiting client signature",
        responsibility: "client",
        urgency: "normal",
        waiting_days: sentDays,
      };
    }

    if (retainer.status === "signed" || retainer.status === "uploaded") {
      const minimum = c.retainer_minimum_cad ?? 0;
      if (payments.collected_cad < minimum) {
        return {
          text: "Record retainer payment",
          responsibility: "us",
          urgency: "normal",
          waiting_days: null,
        };
      }
      return {
        text: "Advance to Documents",
        responsibility: "us",
        urgency: "normal",
        waiting_days: null,
      };
    }

    // Retainer is void or expired — back to "prepare".
    return {
      text: "Prepare retainer",
      responsibility: "us",
      urgency: "normal",
      waiting_days: null,
    };
  }

  // Exhaustive guard — TypeScript errors if a new case_status appears.
  const _exhaustive: never = c.status;
  return _exhaustive;
}

// ---------------------------------------------------------------------------
// Bridge from the v_case_chip_inputs view row (mostly nullable) to ChipInput
// (mostly non-null). Pages call this to assemble inputs cheaply.
// ---------------------------------------------------------------------------

export type ChipInputViewRow =
  Database["crm"]["Views"]["v_case_chip_inputs"]["Row"];

export function chipInputFromViewRow(
  row: ChipInputViewRow,
  now: Date = new Date(),
): ChipInput | null {
  if (!row.case_id || !row.status || !row.updated_at) return null;

  return {
    case: {
      status: row.status,
      biometrics_status: row.biometrics_status ?? "pending",
      updated_at: row.updated_at,
      retainer_minimum_cad:
        row.retainer_minimum_cad !== null
          ? Number(row.retainer_minimum_cad)
          : null,
      quoted_fee_cad: row.quoted_fee_cad !== null ? Number(row.quoted_fee_cad) : 0,
    },
    retainer: row.retainer_status
      ? {
          status: row.retainer_status,
          sent_at: row.retainer_sent_at,
          has_fee_breakdown: row.retainer_has_fee_breakdown ?? false,
        }
      : null,
    payments: {
      collected_cad: row.collected_cad !== null ? Number(row.collected_cad) : 0,
    },
    documents: {
      required: row.required_docs ?? 0,
      uploaded: row.uploaded_docs ?? 0,
      accepted: row.accepted_docs ?? 0,
      rejected: row.rejected_docs ?? 0,
      last_rejected_at: row.last_rejected_at,
    },
    latest_event: row.latest_event_type
      ? {
          event_type: row.latest_event_type,
          occurred_at: row.latest_event_at ?? row.updated_at,
          event_data:
            row.latest_event_data && typeof row.latest_event_data === "object"
              ? (row.latest_event_data as Record<string, unknown>)
              : {},
        }
      : null,
    additional_docs:
      (row.additional_docs_requested ?? 0) > 0
        ? {
            requested: row.additional_docs_requested ?? 0,
            uploaded: row.additional_docs_uploaded ?? 0,
            accepted: row.additional_docs_accepted ?? 0,
            latest_request_due: row.additional_docs_latest_due,
            submitted_after_request:
              row.additional_docs_submitted_after_request ?? false,
          }
        : null,
    now,
  };
}
