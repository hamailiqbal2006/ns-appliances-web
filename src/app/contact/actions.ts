"use server";

import { revalidatePath } from "next/cache";
import { submitContactInquiry } from "@/lib/supabase-admin";

export type ContactFormState = {
  success: boolean;
  error: string | null;
  fieldErrors?: {
    name?: string;
    contactMethod?: string;
    email?: string;
    phone?: string;
    subject?: string;
    message?: string;
  };
};

function cleanText(val: FormDataEntryValue | null): string {
  return typeof val === "string" ? val.trim() : "";
}

export async function submitContactInquiryAction(
  _prevState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  // Anti-spam honeypot: bots usually fill hidden input fields
  const honeypot = cleanText(formData.get("website_hp"));
  if (honeypot) {
    // Silently return success to avoid tipping off bots
    return { success: true, error: null };
  }

  const name = cleanText(formData.get("customer_name"));
  const email = cleanText(formData.get("email")).toLowerCase();
  const phone = cleanText(formData.get("phone"));
  const subject = cleanText(formData.get("subject"));
  const message = cleanText(formData.get("message"));
  const productName = cleanText(formData.get("product_name"));
  const productId = cleanText(formData.get("product_id"));
  const productSlug = cleanText(formData.get("product_slug"));

  const finalSubject = subject || (productName ? `Inquiry: ${productName}`.slice(0, 160) : "");

  let finalMessage = message;
  if (productName && !finalMessage.toLowerCase().includes(productName.toLowerCase())) {
    const metaTag = `[Appliance: ${productName}${productSlug ? ` | /products/${productSlug}` : ""}${productId ? ` | ID: ${productId}` : ""}]\n\n`;
    finalMessage = `${metaTag}${finalMessage}`.slice(0, 3000);
  } else if (productSlug && !finalMessage.includes(productSlug)) {
    finalMessage = `${finalMessage}\n\n[Appliance Link: /products/${productSlug}]`.slice(0, 3000);
  }

  const fieldErrors: ContactFormState["fieldErrors"] = {};

  if (!name || name.length < 1) {
    fieldErrors.name = "Please enter your name.";
  } else if (name.length > 120) {
    fieldErrors.name = "Name must be 120 characters or fewer.";
  }

  if (!email && !phone) {
    fieldErrors.contactMethod = "Please provide an email address or a phone number so we can reach you.";
  }

  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      fieldErrors.email = "Please enter a valid email address.";
    }
  }

  if (phone) {
    // Conservative validation: digits, spaces, plus, parentheses, dashes, length 7-40
    const phoneClean = phone.replace(/[\s\-\(\)\+]/g, "");
    if (phoneClean.length < 7 || phone.length > 40 || !/^[0-9+\s\-\(\)]+$/.test(phone)) {
      fieldErrors.phone = "Please enter a valid phone number (at least 7 digits).";
    }
  }

  if (subject && subject.length > 160) {
    fieldErrors.subject = "Subject must be 160 characters or fewer.";
  }

  if (!message || message.length < 5) {
    fieldErrors.message = "Please write a message with at least 5 characters.";
  } else if (message.length > 3000) {
    fieldErrors.message = "Message must be 3,000 characters or fewer.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: fieldErrors.name || fieldErrors.contactMethod || fieldErrors.email || fieldErrors.phone || fieldErrors.message || "Please correct the errors in the form.",
      fieldErrors,
    };
  }

  try {
    await submitContactInquiry({
      customerName: name,
      customerEmail: email || null,
      customerPhone: phone || null,
      subject: finalSubject || null,
      message: finalMessage,
    });

    try {
      revalidatePath("/admin");
    } catch {
      // Revalidation is secondary
    }

    return {
      success: true,
      error: null,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error
        ? err.message
        : "Your inquiry could not be submitted. Please check your connection and try again.";
    return {
      success: false,
      error: errorMessage,
    };
  }
}
