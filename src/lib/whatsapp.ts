import "server-only";

// Sends WhatsApp template messages through Meta's WhatsApp Cloud API.
// Switched off until these are set (docs: setup guide, WhatsApp section):
//   WHATSAPP_ACCESS_TOKEN     permanent system-user token
//   WHATSAPP_PHONE_NUMBER_ID  the sending number's ID
//   WHATSAPP_TEMPLATE_NAME    an approved Utility template whose body has two
//                             variables: {{1}} first name, {{2}} end date
// Optional: WHATSAPP_TEMPLATE_LANG (default "en"), WHATSAPP_API_VERSION
// (default "v23.0"; raise it when Meta retires that version).

export const whatsappReady = () =>
  !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME);

export async function sendWhatsAppTemplate(phone: string, variables: string[]): Promise<{ sent: boolean }> {
  if (!whatsappReady()) return { sent: false };
  const version = process.env.WHATSAPP_API_VERSION || "v23.0";
  const res = await fetch(`https://graph.facebook.com/${version}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: `91${phone}`,
      type: "template",
      template: {
        name: process.env.WHATSAPP_TEMPLATE_NAME,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
        components: [{ type: "body", parameters: variables.map((text) => ({ type: "text", text })) }],
      },
    }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(`WhatsApp ${res.status}: ${body?.error?.message ?? res.statusText}`);
  }
  return { sent: true };
}
