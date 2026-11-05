"use server";

import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { getSupabaseConfig, verifySameOrigin } from "@/lib/supabase-admin";
import { getWelcomePopupConfig } from "@/lib/welcome-popup-data";
import { normalizePakistanPhone } from "@/lib/welcome-popup";
import {
  generateSecureCustomerToken,
  registerCustomerTokenInDb,
  setCustomerRecognitionCookie,
} from "@/lib/customer-recognition";

const attempts = new Map<string, number[]>();
const CONSENT_VERSION = "welcome-popup-v1";

function acceptAttempt(requestHeaders: Headers) {
  const address = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-real-ip")
    || "unknown";
  const key = createHash("sha256").update(address).digest("hex");
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((time) => now - time < 30 * 60 * 1000);
  if (recent.length >= 6) throw new Error("Please wait a little before trying again.");
  recent.push(now);
  attempts.set(key, recent);
}

export async function submitWelcomeLead(input: {
  whatsappNumber: string;
  marketingConsent: boolean;
  honeypot?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const requestHeaders = await headers();
    await verifySameOrigin();
    if (typeof input.honeypot === "string" && input.honeypot.trim()) return { ok: true };
    if (typeof input.whatsappNumber !== "string" || input.whatsappNumber.length > 40 || typeof input.marketingConsent !== "boolean") {
      return { ok: false, message: "Please enter a valid WhatsApp number." };
    }
    const settings = await getWelcomePopupConfig();
    if (!settings.enabled || !getSupabaseConfig()) {
      return { ok: false, message: "The welcome offer is not accepting submissions right now." };
    }
    acceptAttempt(requestHeaders);
    const phone = normalizePakistanPhone(input.whatsappNumber);
    if (!/^\+923\d{9}$/.test(phone)) {
      return { ok: false, message: "Please enter a valid Pakistani WhatsApp mobile number." };
    }

    const config = getSupabaseConfig();
    const response = await fetch(`${config!.url}/rest/v1/rpc/submit_welcome_lead`, {
      method: "POST",
      headers: { apikey: config!.key, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_whatsapp_number: phone,
        p_marketing_consent: input.marketingConsent,
        p_consent_version: input.marketingConsent ? CONSENT_VERSION : null,
      }),
      cache: "no-store",
    });
    // Intentionally do not expose duplicate/not-found details to the visitor.
    if (!response.ok) return { ok: false, message: "We could not save your number right now. Please try again later." };

    // Establish persistent customer recognition cookie and link token hash in database
    const rawToken = generateSecureCustomerToken();
    await registerCustomerTokenInDb(phone, rawToken).catch(() => false);
    await setCustomerRecognitionCookie(rawToken).catch(() => {});

    return { ok: true };
  } catch (error) {
    return { ok: false, message: error instanceof Error && error.message.startsWith("Please wait") ? error.message : "We could not save your number right now. Please try again later." };
  }
}
