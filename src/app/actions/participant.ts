"use server";

import { revalidatePath } from "next/cache";
import { emailOtpEnabled } from "@/lib/access-mode";
import { recoverParticipant, registerParticipant } from "@/lib/participant-manual-access";
import { clearSession, type Role } from "@/lib/session";
import {
  requestParticipantOtp, resendParticipantOtp, selectVerifiedParticipant, verifyParticipantOtp,
  type EntryState,
} from "@/lib/participant-access";

export type { EntryState } from "@/lib/participant-access";

/** El OTP automático solo se atiende cuando está habilitado en el servidor. */
export async function participantEntry(_prev: EntryState, form: FormData): Promise<EntryState> {
  const role = form.get("role");
  if (role !== "emprendedor" && role !== "evaluador") return { stage: "request", error: "Selecciona un rol válido." };
  const intent = form.get("intent");
  let result: EntryState;
  if (!emailOtpEnabled()) {
    if (intent === "register") {
      result = await registerParticipant({ role, email: String(form.get("email") ?? ""), name: String(form.get("name") ?? ""), consent: form.get("consent") === "on", isTest: form.get("demo") === "1" });
    } else if (intent === "recover") {
      result = await recoverParticipant(role, String(form.get("email") ?? ""), String(form.get("token") ?? ""));
    } else {
      return { stage: "request", error: "El envío automático está desactivado. Contacta a sarnolds@miuandes.cl para recuperar tu acceso." };
    }
    if (result?.ok) revalidatePath("/", "layout");
    return result;
  }
  if (intent === "request") {
    const mode = form.get("mode");
    if (mode !== "signup" && mode !== "resume") return { stage: "request", error: "Selecciona cómo quieres ingresar." };
    result = await requestParticipantOtp({
      role, mode, email: String(form.get("email") ?? ""), name: String(form.get("name") ?? ""),
      consent: form.get("consent") === "on", isTest: form.get("demo") === "1",
    });
  } else if (intent === "verify") {
    result = await verifyParticipantOtp(role, String(form.get("token") ?? ""));
  } else if (intent === "resend") {
    result = await resendParticipantOtp(role);
  } else if (intent === "select") {
    result = await selectVerifiedParticipant(role, String(form.get("participantId") ?? ""));
  } else {
    return { stage: "request", error: "Solicita un código para comenzar." };
  }
  if (result?.ok) revalidatePath("/", "layout");
  return result;
}

export async function leaveParticipant(role: Role) {
  if (role !== "emprendedor" && role !== "evaluador") return;
  await clearSession(role);
  revalidatePath("/", "layout");
}
