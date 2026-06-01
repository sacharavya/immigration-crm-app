import { GraphApiError, graphFetch } from "./client";

// Calendar operations on the firm's shared mailbox. Built on the same
// raw-fetch `graphFetch` helper the OneDrive code uses (client-credentials
// auth via getAccessToken) — the project does not use the
// @microsoft/microsoft-graph-client SDK, so there is no `client.api(...)`.
//
// Events are PLAIN calendar events (no Teams meeting). teams_auto_create is
// false this iteration; the isOnlineMeeting flag is added in a later prompt
// once OnlineMeetings.ReadWrite.All (Application) is granted in Azure.

const CALENDAR_OWNER = "info@bigbangimmigration.com";

export type BusyInterval = {
  start: string; // ISO datetime, UTC
  end: string; // ISO datetime, UTC
};

type GraphDateTimeTimeZone = { dateTime: string; timeZone?: string };

type GetScheduleResponse = {
  value?: Array<{
    scheduleItems?: Array<{
      status?: string;
      start: GraphDateTimeTimeZone;
      end: GraphDateTimeTimeZone;
    }>;
  }>;
};

type GraphEvent = {
  id: string;
  "@odata.etag"?: string;
  // Populated when isOnlineMeeting=true was passed AND the calendar owner
  // has the OnlineMeetings.ReadWrite.All Application permission granted.
  onlineMeeting?: {
    joinUrl?: string;
    conferenceId?: string;
  };
};

// Graph's getSchedule returns dateTime strings in the requested timeZone
// (we ask for UTC) but WITHOUT a trailing 'Z'. `new Date("...T13:00:00")`
// would then be parsed as local time and shift the busy window, which could
// let a genuinely-busy slot slip through (a double-booking). Normalise to a
// real UTC instant by appending 'Z' when no offset/zone designator present.
function toUtcIso(graphDateTime: string): string {
  const hasZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(graphDateTime);
  return new Date(hasZone ? graphDateTime : `${graphDateTime}Z`).toISOString();
}

/**
 * Get busy intervals on the info@ shared calendar.
 * Returns empty array on any failure (degrades gracefully).
 */
export async function getBusyIntervals(
  startISO: string,
  endISO: string,
): Promise<BusyInterval[]> {
  try {
    const result = await graphFetch<GetScheduleResponse>(
      `/users/${CALENDAR_OWNER}/calendar/getSchedule`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schedules: [CALENDAR_OWNER],
          startTime: { dateTime: startISO, timeZone: "UTC" },
          endTime: { dateTime: endISO, timeZone: "UTC" },
          availabilityViewInterval: 15,
        }),
      },
    );

    const schedule = result.value?.[0];
    if (!schedule?.scheduleItems) return [];

    return schedule.scheduleItems
      .filter(
        (item) => item.status === "busy" || item.status === "tentative",
      )
      .map((item) => ({
        start: toUtcIso(item.start.dateTime),
        end: toUtcIso(item.end.dateTime),
      }));
  } catch (err) {
    console.error("[graph.calendar] getBusyIntervals failed:", err);
    return []; // degrade: CRM bookings are still enforced separately
  }
}

export type CreateAppointmentEventInput = {
  subject: string;
  bodyHtml: string;
  startISO: string;
  endISO: string;
  timezone: string;
  location: string;
  attendeeEmail: string;
  attendeeName: string;
  // APPT-7: when true, attach a Teams meeting via isOnlineMeeting +
  // onlineMeetingProvider on the same create-event call. Requires the
  // calendar owner's mailbox to have OnlineMeetings.ReadWrite.All
  // Application permission granted in Azure. When the permission is
  // missing the event is still created — just without onlineMeeting in
  // the response, and teamsJoinUrl falls back to null.
  createTeamsMeeting?: boolean;
};

export type GraphEventResult = {
  id: string;
  etag: string;
  teamsJoinUrl: string | null;
  teamsMeetingId: string | null;
};

/**
 * Create a calendar event on info@'s calendar. When createTeamsMeeting is
 * true, the event has a Teams meeting attached and the returned
 * teamsJoinUrl / teamsMeetingId are populated (or null if the Azure
 * permission isn't there — the event itself still gets created).
 * Throws on Graph failure; caller marks graph_sync_status='failed'.
 */
export async function createAppointmentEvent(
  input: CreateAppointmentEventInput,
): Promise<GraphEventResult> {
  const body: Record<string, unknown> = {
    subject: input.subject,
    body: { contentType: "HTML", content: input.bodyHtml },
    start: { dateTime: input.startISO, timeZone: input.timezone },
    end: { dateTime: input.endISO, timeZone: input.timezone },
    location: { displayName: input.location },
    attendees: [
      {
        emailAddress: {
          address: input.attendeeEmail,
          name: input.attendeeName,
        },
        type: "required",
      },
    ],
  };
  if (input.createTeamsMeeting) {
    body.isOnlineMeeting = true;
    body.onlineMeetingProvider = "teamsForBusiness";
  }

  const event = await graphFetch<GraphEvent>(
    `/users/${CALENDAR_OWNER}/calendar/events`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return {
    id: event.id,
    etag: event["@odata.etag"] ?? "",
    teamsJoinUrl: event.onlineMeeting?.joinUrl ?? null,
    teamsMeetingId: event.onlineMeeting?.conferenceId ?? null,
  };
}

export type UpdateAppointmentEventPatch = {
  subject?: string;
  bodyHtml?: string;
  startISO?: string;
  endISO?: string;
  timezone?: string;
  location?: string;
};

/**
 * Update an existing calendar event. Used for reschedules.
 */
export async function updateAppointmentEvent(
  graphEventId: string,
  patch: UpdateAppointmentEventPatch,
): Promise<{ etag: string }> {
  const body: Record<string, unknown> = {};
  if (patch.subject !== undefined) body.subject = patch.subject;
  if (patch.bodyHtml !== undefined) {
    body.body = { contentType: "HTML", content: patch.bodyHtml };
  }
  if (patch.startISO && patch.timezone) {
    body.start = { dateTime: patch.startISO, timeZone: patch.timezone };
  }
  if (patch.endISO && patch.timezone) {
    body.end = { dateTime: patch.endISO, timeZone: patch.timezone };
  }
  if (patch.location !== undefined) {
    body.location = { displayName: patch.location };
  }

  const updated = await graphFetch<GraphEvent>(
    `/users/${CALENDAR_OWNER}/calendar/events/${graphEventId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  return { etag: updated["@odata.etag"] ?? "" };
}

/**
 * Delete a calendar event. Used for cancellations.
 * Idempotent: if the event is already gone (404), returns silently.
 */
export async function deleteAppointmentEvent(
  graphEventId: string,
): Promise<void> {
  try {
    await graphFetch<void>(
      `/users/${CALENDAR_OWNER}/calendar/events/${graphEventId}`,
      { method: "DELETE" },
    );
  } catch (err) {
    if (err instanceof GraphApiError && err.status === 404) return;
    throw err;
  }
}
