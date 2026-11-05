"use client";

import { memo, useCallback, useId, useState } from "react";
import Link from "next/link";
import { FAQ_DATA, type BilingualFaqItem } from "@/data/faq-data";
import styles from "@/app/faq/faq.module.css";

const URDU_NUMERALS = [
  "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹", "۱۰",
  "۱۱", "۱۲", "۱۳", "۱۴", "۱۵", "۱۶"
];

interface FaqRowItemProps {
  item: BilingualFaqItem;
  index: number;
  isOpen: boolean;
  isUrdu: boolean;
  baseId: string;
  onToggle: (id: string) => void;
}

const FaqRowItem = memo(function FaqRowItem({
  item,
  index,
  isOpen,
  isUrdu,
  baseId,
  onToggle,
}: FaqRowItemProps) {
  const buttonId = `${baseId}-trigger-${item.id}`;
  const panelId = `${baseId}-panel-${item.id}`;
  const itemNum = isUrdu
    ? URDU_NUMERALS[index] || String(index + 1)
    : String(index + 1);

  const content = isUrdu ? item.ur : item.en;

  return (
    <article
      className={`${styles.faqRow} ${isOpen ? styles.faqRowOpen : ""}`}
    >
      <h2 className={styles.questionHeading}>
        <button
          type="button"
          id={buttonId}
          className={styles.faqTrigger}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => onToggle(item.id)}
        >
          <span className={styles.numBadge} aria-hidden="true">
            {itemNum}
          </span>

          <span className={styles.questionText}>
            {content.question}
          </span>

          <span
            className={`${styles.actionBtn} ${isOpen ? styles.actionBtnOpen : ""}`}
            aria-hidden="true"
          >
            {isOpen ? (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            )}
          </span>
        </button>
      </h2>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        hidden={!isOpen}
        className={`${styles.answerWrap} ${isOpen ? styles.answerWrapOpen : ""}`}
      >
        <p className={styles.answerText}>{content.answer}</p>
      </div>
    </article>
  );
});

export function FaqAccordion() {
  const [lang, setLang] = useState<"en" | "ur">("en");
  const [openId, setOpenId] = useState<string | null>(null);
  const baseId = useId();

  const isUrdu = lang === "ur";

  const toggleLanguage = useCallback(() => {
    setLang((current) => (current === "en" ? "ur" : "en"));
  }, []);

  const toggleAccordion = useCallback((id: string) => {
    setOpenId((current) => (current === id ? null : id));
  }, []);

  return (
    <div
      className={styles.faqContent}
      dir={isUrdu ? "rtl" : "ltr"}
      lang={isUrdu ? "ur" : "en"}
      aria-labelledby="faq-page-title"
    >
      {/* HEADER WITH TRANSLATE BUTTON AND CENTER HEADING */}
      <div className={styles.panelHeader}>
        <button
          type="button"
          className={styles.translateBtn}
          onClick={toggleLanguage}
          aria-label={
            isUrdu
              ? "Switch language to English"
              : "Translate to Urdu (اردو میں ترجمہ کریں)"
          }
        >
          <svg
            className={styles.translateIcon}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <span>{isUrdu ? "English" : "Translate to Urdu"}</span>
        </button>

        <div className={styles.headerCenter}>
          <span className={styles.faqBadge}>
            {isUrdu ? "عمومی سوالات" : "FAQS"}
          </span>
          <h1 id="faq-page-title" className={styles.mainTitle}>
            {isUrdu ? "عام سوالات" : "Common Questions"}
          </h1>
        </div>
      </div>

      {/* QUESTION ROWS */}
      <div className={styles.faqList}>
        {FAQ_DATA.map((item, index) => (
          <FaqRowItem
            key={item.id}
            item={item}
            index={index}
            isOpen={openId === item.id}
            isUrdu={isUrdu}
            baseId={baseId}
            onToggle={toggleAccordion}
          />
        ))}
      </div>

      {/* CONTACT US ENDING */}
      <footer className={styles.contactSection}>
        <p className={styles.contactQuestion}>
          {isUrdu ? "کیا آپ کا کوئی اور سوال ہے؟" : "Have any other questions?"}
        </p>
        <Link href="/contact" className={styles.contactLink}>
          {isUrdu ? (
            <>
              <span>ہم سے رابطہ کریں</span>
              <span aria-hidden="true">&larr;</span>
            </>
          ) : (
            <>
              <span>Contact Us</span>
              <span aria-hidden="true">&rarr;</span>
            </>
          )}
        </Link>
      </footer>
    </div>
  );
}
