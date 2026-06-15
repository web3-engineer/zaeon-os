"use client";

import { useState } from "react";
import InviteCard from "./InviteCard";
import GoogleFinishStep from "./GoogleFinishStep";

type Step = "card" | "google";

interface Props {
  initialCode?: string;
}

/**
 * Fluxo de convite — CARD-ONLY: o cartão coleta os dados e o comprovante, depois
 * finaliza com o login Google (a porta conversacional foi removida de vez).
 */
export default function ConviteFlow({ initialCode }: Props) {
  const [step, setStep] = useState<Step>("card");
  const [sessionToken, setSessionToken] = useState("");

  if (step === "card") {
    return (
      <InviteCard
        initialCode={initialCode}
        onDone={(token) => { setSessionToken(token); setStep("google"); }}
      />
    );
  }

  return <GoogleFinishStep sessionToken={sessionToken} />;
}
