"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_WELCOME_POPUP_CONFIG,
  validateWelcomeOfferForm,
  type WelcomeOfferFormErrors,
  type WelcomeOfferFormValues,
  type WelcomePopupConfig,
} from "@/lib/welcome-popup";
import { submitWelcomeLead } from "@/app/welcome-actions";
import styles from "./welcome-popup.module.css";

const SESSION_STORAGE_KEY = "ns_welcome_offer_dismissed_v1";
const subscribeToHydration = () => () => {};
const getClientHydrationState = () => true;
const getServerHydrationState = () => false;

export function WelcomePopup({
  config = DEFAULT_WELCOME_POPUP_CONFIG,
  initialOpen = false,
  isRecognizedCustomer = false,
}: {
  config?: WelcomePopupConfig;
  initialOpen?: boolean;
  isRecognizedCustomer?: boolean;
}) {
  const shouldReduceMotion = useReducedMotion();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isOpen, setIsOpen] = useState(initialOpen);
  const hasMounted = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrationState,
    getServerHydrationState,
  );
  const [submitState, setSubmitState] = useState<{ type: "idle" | "success" | "error"; message?: string }>({ type: "idle" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [values, setValues] = useState<WelcomeOfferFormValues>({
    whatsappNumber: "",
    whatsappConsent: false,
  });
  const [errors, setErrors] = useState<WelcomeOfferFormErrors>({});

  const modalRef = useRef<HTMLDivElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const keepPhoneFieldVisible = useCallback(() => {
    // The dialog is its own scrolling region. Centering the focused field in
    // that region keeps the primary action usable above mobile soft keyboards.
    window.requestAnimationFrame(() => {
      phoneInputRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
    });
  }, []);

  // Development environment flag for launcher pill
  const isDev = process.env.NODE_ENV === "development";
  const isStorefrontRoute = pathname !== null && !pathname.startsWith("/admin");
  const isPreviewUrl = isDev && (
    searchParams.get("welcome_preview") === "true" ||
    searchParams.get("preview") === "welcome"
  );

  const closePopup = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    setIsOpen(false);
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    } catch {
      // sessionStorage unavailable or blocked
    }
    // Restore focus to element that triggered the dialog
    if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === "function") {
      previousActiveElementRef.current.focus();
    }
  }, []);

  const openPopup = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = null;
    }
    if (typeof document !== "undefined") {
      previousActiveElementRef.current = document.activeElement as HTMLElement | null;
    }
    setSubmitState({ type: "idle" });
    setIsOpen(true);
  }, []);

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current);
      }
    };
  }, []);

  // Preload and decode appliance image during the display delay period so the
  // modal and its visual asset appear as one unified component without pop-in.
  useEffect(() => {
    if (!config.imageSrc || !isStorefrontRoute) {
      return;
    }

    const img = new window.Image();
    img.src = config.imageSrc;
    if (typeof img.decode === "function") {
      img.decode().catch(() => {});
    }
  }, [config.imageSrc, isStorefrontRoute]);

  // Timer and session trigger logic
  useEffect(() => {
    // Never display on protected admin routes, including while navigating
    // there from a storefront page.
    if (!hasMounted || !isStorefrontRoute) return;

    // Force open if explicitly requested via URL parameter
    if (isPreviewUrl) {
      const openTimer = setTimeout(() => {
        openPopup();
      }, 0);
      return () => clearTimeout(openTimer);
    }

    // Never auto-show for recognized customers
    if (isRecognizedCustomer) {
      return;
    }

    // Check if user already dismissed the modal this session.
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem(SESSION_STORAGE_KEY) === "true";
    } catch {
      dismissed = false;
    }

    if (dismissed) {
      return;
    }

    // Only auto-trigger if config.enabled is true (or in dev preview)
    if (!config.enabled) {
      return;
    }

    const delayMs = (config.displayDelaySeconds ?? 10) * 1000;
    const timer = setTimeout(() => {
      openPopup();
    }, delayMs);

    return () => clearTimeout(timer);
  }, [config.displayDelaySeconds, config.enabled, hasMounted, isPreviewUrl, isRecognizedCustomer, isStorefrontRoute, openPopup]);

  // Freeze the document at its current position while preserving a scrollable
  // dialog. Locking only body is not sufficient in mobile Safari, where the
  // document element can still rubber-band behind a fixed overlay.
  useLayoutEffect(() => {
    if (!hasMounted || !isStorefrontRoute || !isOpen) return;

    const { body, documentElement } = document;
    const scrollY = window.scrollY;
    const original = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: documentElement.style.overflow,
      viewportHeight: documentElement.style.getPropertyValue("--welcome-viewport-height"),
    };
    const viewport = window.visualViewport;
    const updateViewportHeight = () => {
      documentElement.style.setProperty(
        "--welcome-viewport-height",
        `${Math.round(viewport?.height ?? window.innerHeight)}px`,
      );
    };

    updateViewportHeight();
    documentElement.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    viewport?.addEventListener("resize", updateViewportHeight);
    viewport?.addEventListener("scroll", updateViewportHeight);

    return () => {
      viewport?.removeEventListener("resize", updateViewportHeight);
      viewport?.removeEventListener("scroll", updateViewportHeight);
      body.style.overflow = original.bodyOverflow;
      body.style.position = original.bodyPosition;
      body.style.top = original.bodyTop;
      body.style.width = original.bodyWidth;
      documentElement.style.overflow = original.htmlOverflow;
      if (original.viewportHeight) {
        documentElement.style.setProperty("--welcome-viewport-height", original.viewportHeight);
      } else {
        documentElement.style.removeProperty("--welcome-viewport-height");
      }
      window.scrollTo(0, scrollY);
    };
  }, [hasMounted, isOpen, isStorefrontRoute]);

  // Focus management & accessible keyboard trap
  useEffect(() => {
    if (!hasMounted || !isStorefrontRoute || !isOpen) return;

    // Focus the only data field once the dialog appears.
    const focusTimer = setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 70);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePopup();
        return;
      }

      if (event.key === "Tab") {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        );
        const focusable = Array.from(focusableElements).filter(
          (el) => !el.hasAttribute("disabled") && el.offsetParent !== null,
        );

        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closePopup, hasMounted, isOpen, isStorefrontRoute]);

  const handlePhoneChange = (whatsappNumber: string) => {
    setValues((current) => ({ ...current, whatsappNumber }));
    setSubmitState({ type: "idle" });
    if (errors.whatsappNumber) setErrors({});
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (isSubmitting || submitState.type === "success") {
      return;
    }

    const formErrors = validateWelcomeOfferForm(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      phoneInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    const result = await submitWelcomeLead({
      whatsappNumber: values.whatsappNumber,
      marketingConsent: values.whatsappConsent,
      honeypot,
    });
    setIsSubmitting(false);
    if (!result.ok) {
      setSubmitState({ type: "error", message: result.message });
      return;
    }

    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, "true");
    } catch {
      /* session storage unavailable */
    }

    setValues({ whatsappNumber: "", whatsappConsent: false });
    setSubmitState({
      type: "success",
      message: "Thanks — we’ve saved your number.",
    });

    // Automatically close the popup after 650ms (within 500–800ms) with existing smooth animation
    autoCloseTimerRef.current = setTimeout(() => {
      closePopup();
    }, 650);
  };

  // The server and first client pass both render no popup markup. This avoids
  // hydrating a dev-only launcher that cannot have existed in the server HTML.
  if (!hasMounted || !isStorefrontRoute) {
    return null;
  }

  return (
    <>
      {/* Background Next.js image cache priming during initial display delay */}
      {config.imageSrc && !isOpen && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            width: 1,
            height: 1,
            padding: 0,
            margin: -1,
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            whiteSpace: "nowrap",
            border: 0,
            pointerEvents: "none",
            opacity: 0,
          }}
        >
          <Image
            src={config.imageSrc}
            alt=""
            priority
            sizes="(max-width: 640px) 250px, 360px"
            width={250}
            height={250}
          />
        </div>
      )}

      {/* Development Preview Pill Launcher (Visible in dev mode for quick inspection) */}
      {isPreviewUrl && !isOpen && (
        <button
          type="button"
          className={styles.devLauncher}
          onClick={openPopup}
          aria-label="Open Welcome Offer Popup preview"
          title="Preview the customer welcome modal"
        >
          <span className={styles.devLauncherDot} aria-hidden="true" />
          <span>Preview Welcome Offer</span>
        </button>
      )}

      {/* Main Accessible Modal Dialog */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.12 : 0.24,
              ease: "easeOut",
            }}
            onClick={closePopup}
          >
            <motion.div
              ref={modalRef}
              className={styles.modal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="welcome-modal-title"
              aria-describedby="welcome-modal-desc"
              initial={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: shouldReduceMotion ? 0 : 6,
              }}
              transition={{
                duration: shouldReduceMotion ? 0.12 : 0.28,
                ease: [0.16, 1, 0.3, 1],
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                className={styles.closeButton}
                onClick={closePopup}
                aria-label="Close welcome offer dialog"
              >
                <span aria-hidden="true">×</span>
              </button>

              <div className={styles.visualColumn}>
                <span className={styles.watermark} aria-hidden="true">NS</span>
                <span className={styles.watermarkWord} aria-hidden="true">APPLIANCES</span>
                <div className={styles.imageStage}>
                  {config.imageSrc ? (
                    <Image
                      className={styles.applianceImage}
                      src={config.imageSrc}
                      alt={config.imageAlt}
                      fill
                      priority
                      sizes="(max-width: 640px) 250px, 360px"
                    />
                  ) : (
                    <span className={styles.placeholderAppliance} aria-label="Appliance image placeholder" role="img" />
                  )}
                </div>
              </div>

              <div className={styles.contentColumn}>
                <p className={styles.eyebrow}>{config.eyebrow}</p>
                <h2 id="welcome-modal-title" className={styles.headline}>
                  {config.headline}
                </h2>
                <p id="welcome-modal-desc" className={styles.description}>
                  {config.description}
                </p>
                {config.offerText ? <p className={styles.offerText}>{config.offerText}</p> : null}
                <form className={styles.form} onSubmit={handleSubmit} noValidate>
                  <label className={styles.srOnly} htmlFor="welcome-phone">
                    WhatsApp number
                  </label>
                  <div className={`${styles.inputRow} ${errors.whatsappNumber ? styles.inputRowError : ""}`}>
                    <span className={styles.inputPrefix} aria-hidden="true">+92</span>
                    <input
                      ref={phoneInputRef}
                      id="welcome-phone"
                      name="whatsappNumber"
                      type="tel"
                      inputMode="tel"
                      className={styles.input}
                      placeholder="300 1234567"
                      value={values.whatsappNumber}
                      onChange={(event) => handlePhoneChange(event.target.value)}
                      onFocus={keepPhoneFieldVisible}
                      maxLength={20}
                      autoComplete="tel"
                      aria-invalid={Boolean(errors.whatsappNumber)}
                      aria-describedby={errors.whatsappNumber ? "welcome-phone-error" : undefined}
                      disabled={isSubmitting || submitState.type === "success"}
                      required
                    />
                    <button
                      type="submit"
                      className={styles.submitButton}
                      aria-label={isSubmitting ? "Submitting..." : config.buttonLabel}
                      disabled={isSubmitting || submitState.type === "success"}
                    >
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M5 12h13M13 6l6 6-6 6" />
                      </svg>
                    </button>
                  </div>
                  {errors.whatsappNumber && <p id="welcome-phone-error" className={styles.fieldError} role="alert">{errors.whatsappNumber}</p>}

                  <label className={styles.honeypot} aria-hidden="true">
                    Leave this field empty
                    <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} />
                  </label>

                  <label className={styles.consentRow}>
                    <input
                      type="checkbox"
                      className={styles.consentCheckbox}
                      checked={values.whatsappConsent}
                      onChange={(event) => setValues((current) => ({ ...current, whatsappConsent: event.target.checked }))}
                      disabled={isSubmitting || submitState.type === "success"}
                    />
                    <span>I’d like WhatsApp offers and group invitations. Joining a group can reveal my number to other members.</span>
                  </label>
                </form>
                {submitState.type !== "idle" ? <p className={submitState.type === "error" ? styles.submitError : styles.submitNotice} role={submitState.type === "error" ? "alert" : "status"}>{submitState.message}</p> : null}
                <p className={styles.privacyInline}>We store this number to manage your request. Marketing/group consent is optional. <a className={styles.privacyLink} href="/privacy#welcome-whatsapp">Privacy details</a></p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
