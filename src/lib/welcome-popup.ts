/**
 * NS Home Appliances — Customer Welcome Offer & Registration Architecture (Phase 1)
 *
 * This module contains browser-safe validation and the display shape used by
 * the customer welcome-offer modal. Database access stays in server-only files.
 */

export interface WelcomePopupConfig {
  /** Master toggle: controls whether the popup can appear to visitors */
  enabled: boolean;
  /** Small uppercase kicker above the headline */
  eyebrow: string;
  /** Primary modal headline */
  headline: string;
  /** Supporting explanatory paragraph */
  description: string;
  /** Owner-approved optional offer copy. It must not imply a verified discount. */
  offerText?: string | null;
  /** Accessible label for the attached input action */
  buttonLabel: string;
  /**
   * Isolated Phase-1 media slot. A future Admin → Welcome Offer control can
   * replace this source and alt text without changing the visual stage.
   */
  imageSrc?: string;
  imageAlt: string;
  /** Seconds of active browsing before presenting the popup (default: 10s) */
  displayDelaySeconds: number;
}

/**
 * Default configuration for the welcome popup.
 *
 * Safety: enabled is set to false by default so real public visitors
 * will not see a nonfunctional signup form before Phase 2 backend is deployed.
 */
export const DEFAULT_WELCOME_POPUP_CONFIG: WelcomePopupConfig = {
  enabled: false,
  eyebrow: "NS HOME APPLIANCES",
  headline: "WELCOME OFFER",
  description: "Get first access to thoughtful updates from our showroom.",
  buttonLabel: "Submit WhatsApp number",
  imageSrc: undefined,
  imageAlt: "NS Home Appliances welcome offer",
  displayDelaySeconds: 10,
};

/**
 * Payload used by the public server action. It deliberately contains no name,
 * email, account, or verification data.
 */
export interface WelcomeOfferPayload {
  whatsappNumber: string; // E.164 normalized, e.g. +923001234567
  whatsappConsent: boolean;
  registeredAt?: string;
}

export interface WelcomeOfferFormValues {
  whatsappNumber: string;
  whatsappConsent: boolean;
}

export interface WelcomeOfferFormErrors {
  whatsappNumber?: string;
}

/**
 * Normalizes Pakistani mobile numbers into standard E.164 format (+923XXXXXXXXX).
 *
 * Handles common user entry patterns:
 * - 0300 1234567  -> +923001234567
 * - 0300-1234567  -> +923001234567
 * - +92 300 1234567 -> +923001234567
 * - 923001234567  -> +923001234567
 * - 3001234567    -> +923001234567
 */
export function normalizePakistanPhone(input: string): string {
  if (!input) return "";
  const clean = input.trim().replace(/[\s\-\(\)\.]/g, "");

  if (clean.startsWith("+92")) {
    return clean;
  }
  if (clean.startsWith("0092")) {
    return `+${clean.slice(2)}`;
  }
  if (clean.startsWith("92") && clean.length === 12) {
    return `+${clean}`;
  }
  if (clean.startsWith("03") && clean.length === 11) {
    return `+92${clean.slice(1)}`;
  }
  if (clean.startsWith("3") && clean.length === 10) {
    return `+92${clean}`;
  }

  return clean;
}

/**
 * Validates whether the given string is a valid Pakistani mobile number.
 * Pakistani mobile numbers consist of a 4-digit network code (0300-0349, 0355, etc.)
 * followed by 7 subscriber digits (11 digits local, or 12 digits international).
 */
export function isValidPakistanPhone(input: string): boolean {
  if (!input) return false;
  const digitsOnly = input.replace(/\D/g, "");

  // Local 11-digit format starting with 03 (e.g. 03001234567)
  if (digitsOnly.length === 11 && digitsOnly.startsWith("03")) {
    return true;
  }
  // International 12-digit format starting with 923 (e.g. 923001234567)
  if (digitsOnly.length === 12 && digitsOnly.startsWith("923")) {
    return true;
  }
  // 10-digit format starting with 3 (e.g. 3001234567)
  if (digitsOnly.length === 10 && digitsOnly.startsWith("3")) {
    return true;
  }

  return false;
}

/**
 * Formats a Pakistani phone number for pleasant display: "03XX XXXXXXX"
 */
export function formatPakistanPhoneDisplay(input: string): string {
  const digits = input.replace(/\D/g, "");
  let localDigits = digits;

  if (digits.startsWith("92") && digits.length >= 12) {
    localDigits = `0${digits.slice(2)}`;
  } else if (digits.startsWith("3") && digits.length >= 10) {
    localDigits = `0${digits}`;
  }

  if (localDigits.length <= 4) return localDigits;
  return `${localDigits.slice(0, 4)} ${localDigits.slice(4, 11)}`;
}

/**
 * Validates optional email syntax.
 */
export function isValidEmail(input: string): boolean {
  if (!input || !input.trim()) return true;
  const trimmed = input.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(trimmed);
}

/**
 * Validates customer form values on the client side.
 */
export function validateWelcomeOfferForm(
  values: WelcomeOfferFormValues,
): WelcomeOfferFormErrors {
  const errors: WelcomeOfferFormErrors = {};

  const phone = values.whatsappNumber.trim();
  if (!phone) {
    errors.whatsappNumber = "Please enter your WhatsApp mobile number.";
  } else if (!isValidPakistanPhone(phone)) {
    errors.whatsappNumber = "Please enter a valid Pakistani mobile number (e.g. 0300 1234567).";
  }

  return errors;
}
