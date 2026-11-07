import "server-only";

/** El correo automático queda en espera hasta habilitarlo expresamente en el servidor. */
export function emailOtpEnabled(): boolean {
  return process.env.PARTICIPANT_EMAIL_OTP_ENABLED === "true";
}
