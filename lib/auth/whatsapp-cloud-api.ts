import "server-only";

/**
 * Meta WhatsApp Business Cloud API client, scoped to exactly what OTP
 * delivery needs. Requires a real Business account + an approved
 * message template (Meta requires pre-approved templates for business-
 * initiated conversations) -- see docs/AUTH_ALTERNATIVES.md and
 * .env.example for what to configure. Until those env vars are set,
 * this throws rather than silently pretending to send -- the same
 * "never fabricate success" rule CLAUDE.md applies to payments applies
 * here too.
 *
 * Template shape: WHATSAPP_OTP_TEMPLATE_NAME is expected to be an
 * approved "Authentication" category template with one body parameter
 * (the code) -- Meta's own recommended OTP template shape, which also
 * supports an optional "Copy code" button component carrying the same
 * code. Adjust the `components` array below to match whatever template
 * actually gets approved; this is the one place that needs to change
 * once it is.
 */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured. See docs/AUTH_ALTERNATIVES.md.`);
  return value;
}

export async function sendWhatsAppOtp(phoneE164: string, code: string): Promise<void> {
  const phoneNumberId = requireEnv("WHATSAPP_PHONE_NUMBER_ID");
  const accessToken = requireEnv("WHATSAPP_ACCESS_TOKEN");
  const templateName = requireEnv("WHATSAPP_OTP_TEMPLATE_NAME");
  const languageCode = process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE ?? "en_US";

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phoneE164.replace(/^\+/, ""), // Cloud API expects the number without a leading "+"
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [
          { type: "body", parameters: [{ type: "text", text: code }] },
          { type: "button", sub_type: "url", index: "0", parameters: [{ type: "text", text: code }] },
        ],
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`WhatsApp Cloud API send failed: ${res.status} ${body}`);
  }
}
