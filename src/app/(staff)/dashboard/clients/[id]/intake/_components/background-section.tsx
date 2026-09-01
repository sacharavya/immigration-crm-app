"use client";

import { useTransition } from "react";

import {
  BACKGROUND_QUESTION_CODES,
  type BackgroundQuestionCode,
  type BackgroundResponse,
  type BackgroundResponses,
} from "@/lib/intake/completeness";
import type { Database } from "@/lib/supabase/types";

import { updateBackgroundResponse } from "../actions";
import { TextareaField, YesNoField } from "./fields";

type ClientRow = Database["crm"]["Tables"]["clients"]["Row"];

const QUESTIONS: Record<BackgroundQuestionCode, string> = {
  "3a": "Convicted of a crime in Canada (no pardon)?",
  "3b": "Convicted of, charged with, or party to a crime in another country?",
  "3c":
    "Made previous refugee protection claims (Canada, abroad, or to UNHCR)?",
  "3d":
    "Refused status, immigrant or PR visa (CSQ, PNP), or visitor visa to Canada or any other country?",
  "3e":
    "Refused admission to or ordered to leave Canada or any other country?",
  "3f": "Involved in genocide, war crime, or crime against humanity?",
  "3g":
    "Used or advocated armed struggle for political, religious, or social objectives?",
  "3h":
    "Associated with a group that uses or advocates armed struggle?",
  "3i":
    "Member of an organisation engaged in a pattern of criminal activity?",
  "3j": "Detained, incarcerated, or jailed?",
  "3k":
    "Had any serious disease, physical disorder, or mental disorder?",
};

export function BackgroundSection({
  client,
  canEdit,
}: {
  client: ClientRow;
  canEdit: boolean;
}) {
  const responses = (client.background_responses ?? {}) as BackgroundResponses;

  return (
    <div className="space-y-3">
      <p className="text-xs text-stone-500">
        Answer all 11 questions. Provide details whenever the answer is Yes.
      </p>
      {BACKGROUND_QUESTION_CODES.map((code) => (
        <BackgroundQuestion
          key={code}
          code={code}
          question={QUESTIONS[code]}
          response={responses[code]}
          clientId={client.id}
          canEdit={canEdit}
        />
      ))}
    </div>
  );
}

function BackgroundQuestion({
  code,
  question,
  response,
  clientId,
  canEdit,
}: {
  code: BackgroundQuestionCode;
  question: string;
  response: BackgroundResponse | undefined;
  clientId: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const answer =
    response?.answer === "yes" ? true : response?.answer === "no" ? false : null;
  const details = response?.details ?? null;

  function setAnswer(v: boolean) {
    return new Promise<{ ok: true } | { error: string }>((resolve) => {
      startTransition(async () => {
        resolve(
          await updateBackgroundResponse({
            clientId,
            questionCode: code,
            answer: v ? "yes" : "no",
            details,
          }),
        );
      });
    });
  }

  function saveDetails(text: string | null) {
    if (!response) {
      // Defensive: shouldn't happen since the textarea only renders when
      // an answer is already chosen. Fall back to "yes" so the save can
      // attach the details.
      return updateBackgroundResponse({
        clientId,
        questionCode: code,
        answer: "yes",
        details: text,
      });
    }
    return updateBackgroundResponse({
      clientId,
      questionCode: code,
      answer: response.answer,
      details: text,
    });
  }

  return (
    <div className="rounded-md border border-stone-200 bg-white p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-stone-500">{code}</span>
          <span className="text-sm text-stone-800">{question}</span>
        </div>
        <YesNoField
          name={`bg-${code}`}
          initial={answer}
          onChange={setAnswer}
          disabled={!canEdit || pending}
        />
      </div>
      {answer === true && (
        <div className="mt-3">
          <TextareaField
            label="Details"
            initial={details}
            save={saveDetails}
            disabled={!canEdit}
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
