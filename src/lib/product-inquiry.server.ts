const LOCAL_SITE_ORIGIN = "http://localhost:3000";
const EXISTING_STORE_WHATSAPP_NUMBER = "923006791460";

function configuredSiteOrigin(): string | null {
  const configuredUrl = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (!configuredUrl) return null;

  try {
    const origin = new URL(configuredUrl).origin;
    return origin === "null" ? null : origin;
  } catch {
    return null;
  }
}

/**
 * The production origin is configured with SITE_URL. Local development has no
 * public share URL, so it deliberately uses the stable localhost origin rather
 * than reading the browser location during hydration.
 */
export function getStorefrontOrigin(): string {
  return configuredSiteOrigin() || LOCAL_SITE_ORIGIN;
}

export function getCanonicalProductUrl(slug: string): string {
  return new URL(`/products/${slug}`, getStorefrontOrigin()).toString();
}

function normalizeWhatsAppNumber(rawNumber?: string | null): string {
  if (!rawNumber) return EXISTING_STORE_WHATSAPP_NUMBER;

  const digits = rawNumber.replace(/\D/g, "");
  if (!digits) return EXISTING_STORE_WHATSAPP_NUMBER;
  if (digits.startsWith("0") && digits.length === 11) return `92${digits.slice(1)}`;
  return digits;
}

export function getProductInquiryWhatsAppUrl({
  productName,
  productUrl,
  whatsappNumber,
  phoneNumber,
}: {
  productName: string;
  productUrl: string;
  whatsappNumber?: string | null;
  phoneNumber?: string | null;
}): string {
  const message = [
    "Assalam-o-Alaikum!",
    "",
    `I'm interested in ${productName} at NS Home Appliances.`,
    "",
    "I'd like to visit your showroom to see this appliance and learn more about its price and availability.",
    "",
    productUrl,
    "",
    "Could you please share your location and visiting hours?",
  ].join("\n");

  const encodedMessage = encodeURIComponent(message).replace(/'/g, "%27");
  return `https://wa.me/${normalizeWhatsAppNumber(whatsappNumber || phoneNumber)}?text=${encodedMessage}`;
}
