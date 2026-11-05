"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { submitContactInquiryAction, type ContactFormState } from "@/app/contact/actions";
import styles from "./contact-inquiry-form.module.css";

const initialState: ContactFormState = {
  success: false,
  error: null,
};

export interface ContactInquiryFormProps {
  productName?: string;
  productId?: string;
  productSlug?: string;
  initialSubject?: string;
  initialMessage?: string;
}

export function ContactInquiryForm({
  productName,
  productId,
  productSlug,
  initialSubject,
  initialMessage,
}: ContactInquiryFormProps = {}) {
  const [state, formAction, isPending] = useActionState(submitContactInquiryAction, initialState);
  const [dismissed, setDismissed] = useState(false);

  const defaultSubject =
    initialSubject || (productName ? `Inquiry: ${productName}` : "");
  const defaultMessage =
    initialMessage ||
    (productName
      ? `Hello, I would like to inquire about ${productName}. Please let me know about its specifications, pricing, and showroom availability.`
      : "");

  if (state.success && !dismissed) {
    return (
      <div className={styles.successPanel} role="status" aria-live="polite">
        <div className={styles.successBadge}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h3 className={styles.successHeading}>Your inquiry has been received.</h3>
        <p className={styles.successCopy}>
          Thank you for reaching out. Our showroom team will review your message and contact you using the details you provided.
        </p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className={styles.resetButton}
        >
          Send another inquiry
        </button>
      </div>
    );
  }

  return (
    <form action={formAction} className={styles.form} noValidate>
      {/* Anti-spam honeypot */}
      <div className={styles.honeypot} aria-hidden="true">
        <label htmlFor="website_hp">Leave this field blank</label>
        <input
          type="text"
          name="website_hp"
          id="website_hp"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {/* Hidden Product Metadata */}
      {productName && <input type="hidden" name="product_name" value={productName} />}
      {productId && <input type="hidden" name="product_id" value={productId} />}
      {productSlug && <input type="hidden" name="product_slug" value={productSlug} />}

      <div className={styles.formHeader}>
        <h3 className={styles.formTitle}>
          {productName ? "Inquire About This Appliance" : "Send an Inquiry"}
        </h3>
        <p className={styles.formSubtitle}>
          {productName
            ? "Have questions regarding availability, specifications, or pricing? Fill out the form below and our team will get back to you promptly."
            : "Fill out the details below. Please include at least one way for us to reach you (email or phone)."}
        </p>
      </div>

      {/* Product Context Banner */}
      {productName && (
        <div className={styles.productContextBadge}>
          <div className={styles.productContextInfo}>
            <span className={styles.productContextLabel}>Product:</span>
            <span className={styles.productContextName}>{productName}</span>
          </div>
          {productSlug && (
            <Link href={`/products/${productSlug}`} className={styles.productContextLink}>
              View appliance &rarr;
            </Link>
          )}
        </div>
      )}

      {state.error && !state.fieldErrors && (
        <div className={styles.formBannerError} role="alert">
          {state.error}
        </div>
      )}

      <div className={styles.fields}>
        {/* Name */}
        <div className={styles.fieldGroup}>
          <label htmlFor="customer_name" className={styles.label}>
            Your Name <span className={styles.requiredMark}>*</span>
          </label>
          <input
            id="customer_name"
            name="customer_name"
            type="text"
            required
            maxLength={120}
            placeholder="e.g. Tariq Khan"
            className={`${styles.input} ${state.fieldErrors?.name ? styles.inputError : ""}`}
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={state.fieldErrors?.name ? "name-error" : undefined}
            disabled={isPending}
          />
          {state.fieldErrors?.name && (
            <p id="name-error" className={styles.fieldError}>
              {state.fieldErrors.name}
            </p>
          )}
        </div>

        {/* Contact info row: Email & Phone */}
        <div className={styles.fieldRow}>
          {/* Email */}
          <div className={styles.fieldGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="email" className={styles.label}>
                Email Address
              </label>
              <span className={styles.optionalMark}>Optional with phone</span>
            </div>
            <input
              id="email"
              name="email"
              type="email"
              maxLength={254}
              placeholder="name@example.com"
              className={`${styles.input} ${state.fieldErrors?.email ? styles.inputError : ""}`}
              aria-invalid={Boolean(state.fieldErrors?.email)}
              aria-describedby={state.fieldErrors?.email ? "email-error" : undefined}
              disabled={isPending}
            />
            {state.fieldErrors?.email && (
              <p id="email-error" className={styles.fieldError}>
                {state.fieldErrors.email}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className={styles.fieldGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="phone" className={styles.label}>
                Phone Number
              </label>
              <span className={styles.optionalMark}>Optional with email</span>
            </div>
            <input
              id="phone"
              name="phone"
              type="tel"
              maxLength={40}
              placeholder="+92 300 1234567"
              className={`${styles.input} ${state.fieldErrors?.phone ? styles.inputError : ""}`}
              aria-invalid={Boolean(state.fieldErrors?.phone)}
              aria-describedby={state.fieldErrors?.phone ? "phone-error" : undefined}
              disabled={isPending}
            />
            {state.fieldErrors?.phone && (
              <p id="phone-error" className={styles.fieldError}>
                {state.fieldErrors.phone}
              </p>
            )}
          </div>
        </div>

        {state.fieldErrors?.contactMethod && (
          <p className={styles.fieldBannerNotice}>
            {state.fieldErrors.contactMethod}
          </p>
        )}

        {/* Subject */}
        <div className={styles.fieldGroup}>
          <div className={styles.labelRow}>
            <label htmlFor="subject" className={styles.label}>
              Subject
            </label>
            <span className={styles.optionalMark}>Optional</span>
          </div>
          <input
            id="subject"
            name="subject"
            type="text"
            maxLength={160}
            defaultValue={defaultSubject}
            placeholder="e.g. Inquiring about French Door Refrigerator availability"
            className={`${styles.input} ${state.fieldErrors?.subject ? styles.inputError : ""}`}
            aria-invalid={Boolean(state.fieldErrors?.subject)}
            aria-describedby={state.fieldErrors?.subject ? "subject-error" : undefined}
            disabled={isPending}
          />
          {state.fieldErrors?.subject && (
            <p id="subject-error" className={styles.fieldError}>
              {state.fieldErrors.subject}
            </p>
          )}
        </div>

        {/* Message */}
        <div className={styles.fieldGroup}>
          <label htmlFor="message" className={styles.label}>
            Message <span className={styles.requiredMark}>*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows={5}
            required
            maxLength={3000}
            defaultValue={defaultMessage}
            placeholder="Tell us about the appliance model, specifications, or inquiry you need assistance with..."
            className={`${styles.textarea} ${state.fieldErrors?.message ? styles.inputError : ""}`}
            aria-invalid={Boolean(state.fieldErrors?.message)}
            aria-describedby={state.fieldErrors?.message ? "message-error" : undefined}
            disabled={isPending}
          />
          {state.fieldErrors?.message && (
            <p id="message-error" className={styles.fieldError}>
              {state.fieldErrors.message}
            </p>
          )}
        </div>
      </div>

      <div className={styles.submitRow}>
        <button
          type="submit"
          disabled={isPending}
          className={styles.submitButton}
          aria-busy={isPending}
        >
          {isPending ? (
            <span className={styles.loadingWrapper}>
              <span className={styles.spinner} aria-hidden="true" />
              <span>Sending Inquiry…</span>
            </span>
          ) : (
            <span>Send Inquiry</span>
          )}
        </button>
        <span className={styles.privacyNote}>
          Your contact information remains strictly confidential.
        </span>
      </div>
    </form>
  );
}
