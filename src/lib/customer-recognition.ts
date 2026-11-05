import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "@/lib/supabase-admin";

export const CUSTOMER_TOKEN_COOKIE = "ns_customer_token";
const TOKEN_MAX_AGE_SECONDS = 180 * 24 * 60 * 60; // 180 days

/**
 * Generates an opaque cryptographically secure random token string for the browser.
 */
export function generateSecureCustomerToken(): string {
  return randomBytes(32).toString("base64url");
}

/**
 * Computes a SHA-256 hash of the browser token.
 * Only the hash is stored server-side in Supabase.
 */
export function hashCustomerToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Sets the secure HttpOnly customer recognition cookie.
 */
export async function setCustomerRecognitionCookie(rawToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_TOKEN_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
}

/**
 * Reads the raw token from the incoming cookie jar.
 */
export async function getCustomerRecognitionCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_TOKEN_COOKIE)?.value?.trim();
  return token || null;
}

/**
 * Deletes the recognition cookie (e.g. on opt-out or explicit reset).
 */
export async function clearCustomerRecognitionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CUSTOMER_TOKEN_COOKIE);
}

/**
 * Checks whether the incoming request has a recognized customer token cookie.
 */
export async function hasRecognizedCustomerCookie(): Promise<boolean> {
  const token = await getCustomerRecognitionCookie();
  return Boolean(token && token.length >= 16);
}

/**
 * Registers or links a token hash to a customer's WhatsApp number in Supabase.
 */
export async function registerCustomerTokenInDb(
  whatsappNumber: string,
  rawToken: string,
): Promise<boolean> {
  const config = getSupabaseConfig();
  if (!config) return false;

  const tokenHash = hashCustomerToken(rawToken);

  try {
    const response = await fetch(`${config.url}/rest/v1/rpc/register_customer_token`, {
      method: "POST",
      headers: {
        apikey: config.key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_whatsapp_number: whatsappNumber,
        p_token_hash: tokenHash,
      }),
      cache: "no-store",
    });

    return response.ok;
  } catch {
    return false;
  }
}
