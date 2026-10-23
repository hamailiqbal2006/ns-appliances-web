"use client";

import { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How can I browse appliances on this website?",
    answer:
      "You can browse by category directly on our homepage showroom, review our All Products catalog, or use the instant search bar (press '/' or click Search in the navigation). The search bar supports both English and Roman Urdu keywords like 'dhulai', 'pankha', or 'cooler' to help you find items naturally.",
  },
  {
    question: "Can I purchase directly through the website?",
    answer:
      "No. This website is designed as a digital exploration catalog and showroom guide. Direct online checkout and payment processing are not active. All purchases are completed in person at our physical showroom so you can inspect the appliance, verify specifications, and receive official documentation.",
  },
  {
    question: "Can I reserve a product through the website?",
    answer:
      "Product pages feature an inquiry framework to assist you in preparing requests. However, because store floor inventory changes continuously, final unit reservations and holds must be confirmed directly with our showroom team.",
  },
  {
    question: "Where can I see and test products in person?",
    answer:
      "All featured appliance categories are available for hands-on inspection at our physical NS Home Appliances showroom. You can see physical dimensions, verify cabinet finishes, and assess operating volume before deciding.",
  },
  {
    question: "How does the search bar handle Roman Urdu?",
    answer:
      "Our search engine has built-in colloquial terminology mapping. Searching for common everyday words such as 'dhulai machine', 'hawa', 'istri', 'pankha', or 'cooler' automatically routes you to the matching products and categories.",
  },
  {
    question: "Are product availability and prices confirmed online?",
    answer:
      "Digital listings show representative models and temporary demonstration cutouts while inventory systems are finalized. Official retail pricing, manufacturer warranty terms, and active stock levels are confirmed on-site at the store.",
  },
  {
    question: "How can I contact the store?",
    answer:
      "You can visit our showroom in person during retail business hours. Please refer to our Contact Us page for guidance on store consultations and visiting our physical location.",
  },
];

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="faq-list" role="region" aria-label="Frequently Asked Questions">
      {FAQS.map((faq, idx) => {
        const isOpen = openIndex === idx;
        const panelId = `faq-panel-${idx}`;
        const buttonId = `faq-btn-${idx}`;

        return (
          <div key={idx} className={`faq-item ${isOpen ? "is-open" : ""}`}>
            <h3>
              <button
                type="button"
                id={buttonId}
                className="faq-trigger"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => toggle(idx)}
              >
                <span>{faq.question}</span>
                <span className="faq-icon" aria-hidden="true">
                  +
                </span>
              </button>
            </h3>
            {isOpen && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className="faq-answer"
              >
                <p style={{ margin: 0 }}>{faq.answer}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
