"use client";

import { useEffect, useMemo, useState } from "react";

import { bookAppointment } from "../actions";

import { StepConfirmation } from "./step-confirmation";
import { StepDetails } from "./step-details";
import { StepPickSlot } from "./step-pick-slot";
import { StepPickType } from "./step-pick-type";
import type {
  BookingResult,
  LocationType,
  PublicBookingType,
  PublicSlot,
} from "./types";

type FlowState =
  | { step: "pick-type" }
  | { step: "pick-slot"; type: PublicBookingType }
  | { step: "details"; type: PublicBookingType; slot: PublicSlot }
  | { step: "submitting"; type: PublicBookingType; slot: PublicSlot }
  | { step: "result"; type: PublicBookingType; slot: PublicSlot; result: BookingResult };

export function BookingFlow({
  types,
  firmTimezone,
  officeAddress,
}: {
  types: PublicBookingType[];
  firmTimezone: string;
  officeAddress: string;
}) {
  // Detect the visitor's browser timezone. Falls back to the firm's
  // timezone on SSR or if Intl is unavailable.
  const clientTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return firmTimezone;
    }
  }, [firmTimezone]);

  const [state, setState] = useState<FlowState>(() =>
    types.length === 1
      ? { step: "pick-slot", type: types[0] }
      : { step: "pick-type" },
  );

  // When the page is hydrated with a single type, useEffect keeps it
  // consistent if the prop ever changes (defensive — unlikely in practice).
  useEffect(() => {
    if (types.length === 1 && state.step === "pick-type") {
      queueMicrotask(() => setState({ step: "pick-slot", type: types[0] }));
    }
  }, [types, state.step]);

  function back() {
    if (state.step === "pick-slot") {
      // If we auto-skipped (single type), there's nowhere to go back to.
      if (types.length > 1) setState({ step: "pick-type" });
    } else if (state.step === "details") {
      setState({ step: "pick-slot", type: state.type });
    } else if (state.step === "result" && state.result.ok === false) {
      if (state.result.error === "slot_taken") {
        setState({ step: "pick-slot", type: state.type });
      } else {
        setState({ step: "details", type: state.type, slot: state.slot });
      }
    }
  }

  async function submit(input: {
    name: string;
    email: string;
    phone: string;
    reason: string;
    location_type: LocationType;
    address: string;
    city: string;
    province: string;
    postal_code: string;
    date_of_birth: string;
    marital_status: string;
    highest_education: string;
    language_test: string;
    language_score: string;
    occupation: string;
  }) {
    if (state.step !== "details") return;
    setState({ step: "submitting", type: state.type, slot: state.slot });
    const result = await bookAppointment({
      appointment_type_id: state.type.id,
      starts_at: state.slot.start_utc,
      consent: true,
      client_timezone: clientTimezone,
      ...input,
    });
    setState({
      step: "result",
      type: state.type,
      slot: state.slot,
      result,
    });
  }

  if (state.step === "pick-type") {
    return (
      <StepPickType
        types={types}
        onSelect={(t) => setState({ step: "pick-slot", type: t })}
      />
    );
  }

  if (state.step === "pick-slot") {
    return (
      <StepPickSlot
        type={state.type}
        firmTimezone={firmTimezone}
        clientTimezone={clientTimezone}
        canGoBack={types.length > 1}
        onBack={back}
        onSelect={(slot) =>
          setState({ step: "details", type: state.type, slot })
        }
      />
    );
  }

  if (state.step === "details" || state.step === "submitting") {
    return (
      <StepDetails
        type={state.type}
        slot={state.slot}
        clientTimezone={clientTimezone}
        submitting={state.step === "submitting"}
        onBack={back}
        onSubmit={submit}
      />
    );
  }

  // result
  return (
    <StepConfirmation
      result={state.result}
      type={state.type}
      slot={state.slot}
      clientTimezone={clientTimezone}
      officeAddress={officeAddress}
      onPickAnotherSlot={() =>
        setState({ step: "pick-slot", type: state.type })
      }
      onEditDetails={() =>
        setState({ step: "details", type: state.type, slot: state.slot })
      }
    />
  );
}
