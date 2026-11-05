/**
 * NS Home Appliances — Product Availability Architecture
 *
 * Manages product availability states across the public storefront and admin portal:
 *
 * 1. "available": Confirmed in stock. Displays "Available" badge.
 * 2. "out_of_stock": Explicitly unavailable. Displays "Out of Stock" badge.
 * 3. "not_confirmed": Product is listed, stock is unverified/untracked.
 *    Displays "Availability Not Confirmed" badge.
 *
 * Inquiries remain open for all items, allowing customers to contact the showroom
 * regarding restocks, specifications, or alternatives.
 */

export type ProductAvailability = "available" | "out_of_stock" | "not_confirmed";

export interface AvailabilityCandidate {
  availability_status?: string | null;
  stock_quantity?: number | null;
  specifications?: Record<string, string> | null;
  status?: string | null;
}

/**
 * Resolves the genuine availability status of a product by evaluating explicit
 * status fields, specifications metadata, and verified stock quantities.
 *
 * Guaranteed Behavior:
 * - Products without entered/tracked stock default to "not_confirmed", NEVER "out_of_stock".
 * - Explicit stock > 0 resolves to "available" (unless explicitly marked out_of_stock).
 * - Explicit tracked stock of 0 resolves to "out_of_stock" only when stock tracking or out_of_stock was explicitly set.
 */
export function resolveAvailabilityStatus(
  product?: AvailabilityCandidate | null,
): ProductAvailability {
  if (!product) return "not_confirmed";

  // 1. Explicit availability_status column if set and valid
  const direct = product.availability_status;
  if (direct === "available" || direct === "out_of_stock" || direct === "not_confirmed") {
    return direct;
  }

  // 2. Explicit availability_status inside specifications JSONB (used as zero-downtime persistence)
  const specStatus = product.specifications?.availability_status;
  if (specStatus === "available" || specStatus === "out_of_stock" || specStatus === "not_confirmed") {
    return specStatus as ProductAvailability;
  }

  // 3. Explicit out-of-stock metadata in specifications
  if (
    product.specifications?.out_of_stock === "true" ||
    product.specifications?.explicit_zero_stock === "true"
  ) {
    return "out_of_stock";
  }

  // 4. Positive tracked stock quantity -> available
  if (typeof product.stock_quantity === "number" && product.stock_quantity > 0) {
    return "available";
  }

  // 5. Default rule for untracked / unverified stock:
  // Stock of 0 from database defaults or unentered values is treated as "not_confirmed",
  // NOT automatically "out_of_stock".
  return "not_confirmed";
}

export interface AvailabilityPresentation {
  status: ProductAvailability;
  label: string;
  badgeLabel: string;
  badgeClassName: string;
  buttonText: string;
  buttonTextMobile: string;
  supportingText: string;
}

export function getAvailabilityPresentation(status: ProductAvailability): AvailabilityPresentation {
  switch (status) {
    case "available":
      return {
        status: "available",
        label: "Available / In Stock",
        badgeLabel: "Available",
        badgeClassName: "available",
        buttonText: "Inquire About This Product",
        buttonTextMobile: "Inquire Now",
        supportingText: "Have a question about this appliance? Contact our team for details and availability.",
      };
    case "out_of_stock":
      return {
        status: "out_of_stock",
        label: "Out of Stock",
        badgeLabel: "Out of Stock",
        badgeClassName: "outOfStock",
        buttonText: "Inquire About This Product",
        buttonTextMobile: "Inquire Now",
        supportingText: "Currently out of stock. Contact our team to inquire about upcoming shipments or availability.",
      };
    case "not_confirmed":
    default:
      return {
        status: "not_confirmed",
        label: "Availability Not Confirmed",
        badgeLabel: "Availability Not Confirmed",
        badgeClassName: "notConfirmed",
        buttonText: "Inquire About This Product",
        buttonTextMobile: "Inquire Now",
        supportingText: "Have a question about this appliance? Contact our team for details and availability.",
      };
  }
}
