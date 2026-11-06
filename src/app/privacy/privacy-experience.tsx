"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./privacy.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function PrivacyExperience() {
  const containerRef = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const introRef = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      // 1. Hero choreographed entrance on page load
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

      if (eyebrowRef.current) {
        tl.fromTo(
          eyebrowRef.current,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5 },
          0.05
        );
      }

      if (titleRef.current) {
        tl.fromTo(
          titleRef.current,
          { opacity: 0, y: 32 },
          { opacity: 1, y: 0, duration: 0.8 },
          0.15
        );
      }

      if (introRef.current) {
        tl.fromTo(
          introRef.current,
          { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.55 },
          0.35
        );
      }

      // 2. Subtle scroll-linked motion for hero headline
      if (heroRef.current && titleRef.current) {
        gsap.to(titleRef.current, {
          y: 40,
          opacity: 0.88,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.5,
          },
        });
      }

      // 3. Subtle reveals for section headers as they enter viewport
      const sections = container.querySelectorAll(`.${styles.policySection}`);
      sections.forEach((section) => {
        const header = section.querySelector(`.${styles.sectionHeader}`);
        if (header) {
          gsap.fromTo(
            header,
            { opacity: 0.35, y: 16 },
            {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
              scrollTrigger: {
                trigger: section,
                start: "top 85%",
                toggleActions: "play none none none",
              },
            }
          );
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <article ref={containerRef} className={styles.mainArticle}>
      {/* Full-Screen Immersive Editorial Hero */}
      <header ref={heroRef} className={styles.hero}>
        <p ref={eyebrowRef} className={styles.eyebrow}>
          NS HOME APPLIANCES / PRIVACY
        </p>
        <h1 ref={titleRef} className={styles.title}>
          Your Privacy Matters.
        </h1>
        <p ref={introRef} className={styles.intro}>
          At NS Home Appliances, we handle the information you share with care and transparency, so you can explore our products and stay connected with confidence.
        </p>
        <div className={styles.heroDivider} />
      </header>

      {/* Editorial 2-Column Policy Sections */}
      <section aria-label="Privacy policy details" className={styles.contentContainer}>
        <div className={styles.sectionsList}>
          {/* Section 01: Information You Share */}
          <article className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>01</span>
              <h2 className={styles.sectionTitle}>Information You Share</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                We collect only the essential personal details you voluntarily provide to assist with your appliance inquiries, deliver showroom consultations, and keep you informed about our offerings:
              </p>
              <ul className={styles.sectionList}>
                <li>
                  <strong>WhatsApp Phone Numbers:</strong> When you voluntarily submit your phone number through showroom contact forms or previously through our welcome invitations, we record your phone number along with your affirmative opt-in preference to receive store updates.
                </li>
                <li>
                  <strong>Showroom &amp; Product Inquiries:</strong> When you submit a request through our Contact Us page or inquire about specific appliances, we collect your name, phone number or email address, inquiry topic, and message details to provide an accurate consultation.
                </li>
                <li>
                  <strong>Technical Infrastructure Logs:</strong> Temporary, automated server logs (such as IP address, browser user-agent, and access timestamps) are generated by cloud infrastructure solely to deliver reliable web pages, manage rate limiting, and protect against automated security threats.
                </li>
              </ul>
            </div>
          </article>

          {/* Section 02: How We Use Your Information */}
          <article className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>02</span>
              <h2 className={styles.sectionTitle}>How We Use Your Information</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                Every piece of information you share with NS Home Appliances is used exclusively for straightforward showroom, customer service, and store communication purposes:
              </p>
              <ul className={styles.sectionList}>
                <li>Providing showroom pricing, availability, and detailed appliance specifications upon your request.</li>
                <li>Delivering curated seasonal discounts, new model announcements, or promotional vouchers via WhatsApp when you have opted in.</li>
                <li>Offering personalized pre-purchase advice and after-sale showroom support.</li>
                <li>Maintaining website reliability, preventing fraudulent form abuse, and safeguarding technical infrastructure.</li>
              </ul>
            </div>
          </article>

          {/* Section 03: Offers and WhatsApp Updates */}
          <article className={styles.policySection} id="welcome-whatsapp">
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>03</span>
              <h2 className={styles.sectionTitle}>Offers and WhatsApp Updates</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                Our customer communications operate directly over WhatsApp to provide personal, conversational assistance:
              </p>
              <ul className={styles.sectionList}>
                <li>
                  <strong>Affirmative Opt-In:</strong> Registering your WhatsApp phone number records your interest. While new online welcome offer popup registrations are currently retired, promotional announcements or group invites are sent only to customers who explicitly chose to opt in.
                </li>
                <li>
                  <strong>Direct Human Assistance:</strong> All WhatsApp interactions are conducted by authorized showroom personnel rather than automated spam bots.
                </li>
                <li>
                  <strong>Group Transparency:</strong> If you accept an invitation to join a community broadcast or announcement group, please be aware that other participants in the group may see your visible WhatsApp phone number.
                </li>
                <li>
                  <strong>Immediate Opt-Out:</strong> You may unsubscribe from future promotional messages at any time by replying &quot;STOP&quot; to any WhatsApp message or by contacting our showroom team.
                </li>
              </ul>
            </div>
          </article>

          {/* Section 04: How We Handle Customer Information */}
          <article className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>04</span>
              <h2 className={styles.sectionTitle}>How We Handle Customer Information</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                Customer inquiry records and opt-in leads are stored in managed Supabase database infrastructure protected with SSL/TLS encryption in transit and encrypted storage volumes at rest.
              </p>
              <p>
                Administrative access to store records is strictly restricted to authorized showroom staff through multi-factor authentication, secure session verification, and role-based permissions.
              </p>
              <p>
                We do not sell, rent, or trade your contact information with third-party advertisers or data brokers. Information is shared only with verified cloud infrastructure providers required to operate our website, or when strictly necessary to comply with applicable legal obligations in Pakistan.
              </p>
            </div>
          </article>

          {/* Section 05: Cookies and Website Operation */}
          <article className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>05</span>
              <h2 className={styles.sectionTitle}>Cookies and Website Operation</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                Our website operates cleanly without third-party advertising cookies, social media tracking pixels, or cross-domain user profiling:
              </p>
              <ul className={styles.sectionList}>
                <li>
                  <strong>Essential Local Storage:</strong> First-party browser storage is used solely to remember functional preferences—such as honoring reduced motion preferences and caching image assets for smooth navigation.
                </li>
                <li>
                  <strong>Private In-Browser Search:</strong> Our catalog search (which supports English and Roman Urdu search terms like &apos;dhulai&apos; or &apos;pankha&apos;) runs entirely inside your browser against a local catalog index. Your search queries are never transmitted or logged on our servers.
                </li>
              </ul>
            </div>
          </article>

          {/* Section 06: Your Choices and Rights */}
          <article className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>06</span>
              <h2 className={styles.sectionTitle}>Your Choices and Rights</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                You maintain full control over the personal information you share with NS Home Appliances:
              </p>
              <ul className={styles.sectionList}>
                <li>
                  <strong>Anonymous Browsing:</strong> You can explore our complete catalog, compare product specifications, and view showroom pricing freely without creating an account or providing your contact details.
                </li>
                <li>
                  <strong>Information Access:</strong> You may request a summary of the contact or inquiry records associated with your phone number or email address at any time.
                </li>
                <li>
                  <strong>Data Deletion:</strong> You may request the permanent removal of your WhatsApp signup or showroom inquiry record by reaching out to our showroom team.
                </li>
              </ul>
            </div>
          </article>

          {/* Section 07: Contact Us About Privacy */}
          <article className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>07</span>
              <h2 className={styles.sectionTitle}>Contact Us About Privacy</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                If you have questions regarding this Privacy Policy, wish to update your contact details, or would like to request record removal, please contact our showroom:
              </p>
              <div className={styles.highlightCard}>
                <p style={{ margin: "0 0 6px", fontWeight: 650, color: "#111618" }}>
                  NS Home Appliances Showroom
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  Main Showroom, Commercial Area, Pakistan
                </p>
                <p style={{ margin: "0 0 6px" }}>
                  Direct WhatsApp &amp; Phone: +92 300 1234567
                </p>
                <p style={{ margin: "0" }}>
                  Online Message:{" "}
                  <Link href="/contact" style={{ color: "#141c1b", fontWeight: 600, textDecoration: "underline" }}>
                    Visit our Contact Page
                  </Link>
                </p>
              </div>
            </div>
          </article>

          {/* Section 08: Policy Updates */}
          <article className={styles.policySection}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionNumber}>08</span>
              <h2 className={styles.sectionTitle}>Policy Updates</h2>
            </div>
            <div className={styles.sectionBody}>
              <p>
                We may periodically update this Privacy Policy as our showroom services evolve or regulatory standards change. Any updates will be reflected directly on this page with an updated revision date.
              </p>
              <p style={{ fontStyle: "italic", color: "#68706f", fontSize: "13px", marginTop: "14px" }}>
                Last revised: October 31, 2026. Effective immediately.
              </p>
            </div>
          </article>
        </div>

        {/* Footer Navigation Bar */}
        <nav aria-label="Privacy page navigation" className={styles.ctaBar}>
          <Link href="/products" className={styles.btnPrimary}>
            Explore All Products &rarr;
          </Link>
          <Link href="/about" className={styles.btnSecondary}>
            About Our Store
          </Link>
          <Link href="/faq" className={styles.btnSecondary}>
            FAQs
          </Link>
          <Link href="/contact" className={styles.btnSecondary}>
            Contact Us
          </Link>
        </nav>
      </section>
    </article>
  );
}
