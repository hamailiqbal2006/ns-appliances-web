"use server";

export async function submitWelcomeLead(input?: {
  whatsappNumber?: string;
  marketingConsent?: boolean;
  honeypot?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  void input;
  // Controlled retired response: Welcome offer / newsletter registrations are disabled.
  return { ok: false, message: "Welcome offer registrations are currently retired." };
}
