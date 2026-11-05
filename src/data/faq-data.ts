export interface BilingualFaqItem {
  id: string;
  en: {
    question: string;
    answer: string;
  };
  ur: {
    question: string;
    answer: string;
  };
}

export const FAQ_DATA: BilingualFaqItem[] = [
  {
    id: "inquire-workflow",
    en: {
      question: "How can I inquire about an appliance?",
      answer:
        "You can explore appliances in our digital catalog and submit an inquiry online or call us directly. Our showroom team will assist you with model details, pricing, and availability for your visit.",
    },
    ur: {
      question: "میں کسی اپلائنس کے بارے میں معلومات کیسے حاصل کر سکتا ہوں؟",
      answer:
        "آپ ہمارے ڈیجیٹل کیٹلاگ پر پروڈکٹس دیکھ کر آن لائن انکوائری بھیج سکتے ہیں یا براہ راست کال کر سکتے ہیں۔ ہماری شو روم ٹیم ماڈل کی تفصیلات، قیمت اور دستیابی کے بارے میں آپ کی مکمل رہنمائی کرے گی۔",
    },
  },
  {
    id: "inquiry-charges",
    en: {
      question: "Will I be charged for inquiring about an appliance?",
      answer:
        "No. Submitting an online product inquiry or asking questions is completely free. All purchases and payments take place in person at our physical store.",
    },
    ur: {
      question: "کیا پروڈکٹ کے بارے میں انکوائری کرنے پر کوئی چارجز ہوتے ہیں؟",
      answer:
        "نہیں، ویب سائٹ پر انکوائری بھیجنے یا معلومات حاصل کرنے پر کوئی فیس نہیں ہے۔ تمام حتمی ادائیگیاں اور خریداری شو روم پر ذاتی وزٹ کے دوران ہوتی ہے۔",
    },
  },
  {
    id: "bulk-orders",
    en: {
      question: "Can I order appliances in bulk?",
      answer:
        "Yes. For commercial projects, new homes, or multi-unit purchases, you can submit an inquiry or visit our showroom. Our team will review stock availability and discuss feasible options for your quantity needs.",
    },
    ur: {
      question: "کیا میں بڑی تعداد میں اپلائنسز آرڈر کر سکتا ہوں؟",
      answer:
        "جی ہاں، کمرشل منصوبوں یا بڑی تعداد میں خریداری کے لیے آپ درخواست دے سکتے ہیں یا شو روم تشریف لا سکتے ہیں۔ ہماری ٹیم موجودہ اسٹاک کا جائزہ لے کر آپ کی ضرورت کے مطابق دستیاب آپشنز پر بات کرے گی۔",
    },
  },
  {
    id: "online-purchase",
    en: {
      question: "Can I buy an appliance directly from the website?",
      answer:
        "No. Our website serves as a digital showroom catalog to help you browse specifications and compare models. All final purchases, payment processing, and paperwork take place in person at our physical store.",
    },
    ur: {
      question: "کیا میں ویب سائٹ سے براہ راست اپلائنس خرید سکتا ہوں؟",
      answer:
        "نہیں، یہ ویب سائٹ ڈیجیٹل کیٹلاگ کے طور پر کام کرتی ہے تاکہ آپ ماڈلز اور فیچرز کا موازنہ کر سکیں۔ تمام حتمی ادائیگیاں، رسیدیں اور خریداری کے مراحل ہمارے شو روم پر ذاتی وزٹ کے دوران مکمل کیے جاتے ہیں۔",
    },
  },
  {
    id: "store-visit",
    en: {
      question: "Can I visit the store before purchasing?",
      answer:
        "Yes, we encourage visiting our showroom. Seeing appliances in person allows you to inspect dimensions, finish quality, and features before making a final purchasing decision.",
    },
    ur: {
      question: "کیا میں خریداری سے پہلے اسٹور کا وزٹ کر سکتا ہوں؟",
      answer:
        "جی ہاں، ہم کسٹمرز کو شو روم تشریف لانے کی بھرپور ترغیب دیتے ہیں۔ پروڈکٹس کو ذاتی طور پر دیکھ کر آپ سائز، فنشنگ اور فیچرز کا تسلی بخش جائزہ لے سکتے ہیں۔",
    },
  },
  {
    id: "check-availability",
    en: {
      question: "How can I check whether an appliance is available?",
      answer:
        "You can browse model details online and submit an inquiry, or visit our showroom directly where our team can confirm current floor display and warehouse stock.",
    },
    ur: {
      question: "میں کیسے معلوم کروں کہ کوئی اپلائنس اسٹاک میں دستیاب ہے یا نہیں؟",
      answer:
        "آپ ویب سائٹ پر ماڈل کی تفصیلات دیکھ کر انکوائری بھیج سکتے ہیں، یا براہ راست شو روم تشریف لا سکتے ہیں جہاں عملہ موجودہ اسٹاک اور دستیابی کی تصدیق کر دے گا۔",
    },
  },
  {
    id: "inquire-multiple",
    en: {
      question: "Can I inquire about more than one appliance?",
      answer:
        "Yes. You can submit inquiries for multiple items—such as a kitchen suite or laundry set—and our showroom team will verify the availability of each model for your visit.",
    },
    ur: {
      question: "کیا میں ایک سے زیادہ اپلائنسز کے بارے میں معلوم کر سکتا ہوں؟",
      answer:
        "جی ہاں، آپ کچن یا لانڈری کے لیے ایک سے زیادہ مصنوعات کے بارے میں انکوائری بھیج سکتے ہیں، اور شو روم عملہ آپ کے وزٹ کے لیے تمام ماڈلز کی دستیابی کی تصدیق کرے گا۔",
    },
  },
  {
    id: "find-appliance",
    en: {
      question: "How can I find a specific appliance?",
      answer:
        "Browse by category (Cooling, Laundry, Kitchen, Everyday), view the All Products catalog, or use the Search tool in the navbar, which also recognizes everyday Roman Urdu terms like fridge, ac, and istari.",
    },
    ur: {
      question: "میں اپنی مطلوبہ مخصوص اپلائنس کیسے تلاش کروں؟",
      answer:
        "آپ کیٹیگریز (کولنگ، لانڈری، کچن، روزمرہ) کے ذریعے، تمام پروڈکٹس کی فہرست میں، یا سرچ بار استعمال کر کے تلاش کر سکتے ہیں۔ ہمارا سرچ ٹول عام فہم اصطلاحات جیسے fridge، ac اور istari کو بھی پہچانتا ہے۔",
    },
  },
  {
    id: "inquiry-response-time",
    en: {
      question: "How quickly does the team respond to inquiries?",
      answer:
        "Our showroom team typically reviews and responds to customer inquiries during store operating hours to assist with product specifications, pricing, and scheduling a visit.",
    },
    ur: {
      question: "شو روم ٹیم انکوائری کا جواب کتنی دیر میں دیتی ہے؟",
      answer:
        "ہماری شو روم ٹیم عام طور پر اسٹور کے اوقات کار کے دوران جلد از جلد انکوائری کا جواب دیتی ہے تاکہ پروڈکٹ کی تفصیلات اور وزٹ کے حوالے سے آپ کی رہنمائی کی جا سکے۔",
    },
  },
  {
    id: "pricing-policy",
    en: {
      question: "Are the prices shown on the website final?",
      answer:
        "Prices shown online are estimated catalog guide prices. Final pricing, applicable taxes, and any seasonal or bundle promotions are confirmed in person at the showroom.",
    },
    ur: {
      question: "کیا ویب سائٹ پر دکھائی جانے والی قیمتیں حتمی ہیں؟",
      answer:
        "ویب سائٹ پر دی گئی قیمتیں تخمینی رہنمائی کے لیے ہیں۔ حتمی قیمت، لاگو ٹیکس اور موسمی یا بنڈل پروموشنز کی تصدیق شو روم پر ذاتی وزٹ کے دوران کی جاتی ہے۔",
    },
  },
  {
    id: "payment-methods",
    en: {
      question: "What payment methods are accepted at the store?",
      answer:
        "We accept cash and standard in-person card payments at our showroom checkout counter. Payment terms for commercial or multi-unit orders can be discussed directly with showroom management.",
    },
    ur: {
      question: "اسٹور پر ادائیگی کے کون سے طریقے قبول کیے جاتے ہیں؟",
      answer:
        "ہم اپنے شو روم کاؤنٹر پر کیش اور معیاری کارڈ پیمنٹ قبول کرتے ہیں۔ کمرشل یا بڑی خریداری کے لیے ادائیگی کی شرائط پر شو روم انتظامیہ سے براہ راست بات چیت کی جا سکتی ہے۔",
    },
  },
  {
    id: "warranty-coverage",
    en: {
      question: "Do appliances come with official warranty?",
      answer:
        "Yes. Appliances sold through NS Home Appliances carry standard manufacturer warranty coverage. Warranty cards and official documentation are issued at the showroom upon purchase.",
    },
    ur: {
      question: "کیا اپلائنسز کے ساتھ آفیشل وارنٹی ملتی ہے؟",
      answer:
        "جی ہاں، این ایس ہوم اپلائنسز پر فروخت ہونے والی مصنوعات مینوفیکچرر کی آفیشل وارنٹی کے ساتھ آتی ہیں۔ خریداری کے وقت وارنٹی کارڈ اور تمام دستاویزات شو روم پر جاری کیے جاتے ہیں۔",
    },
  },
  {
    id: "delivery-options",
    en: {
      question: "Do you offer delivery services?",
      answer:
        "Local delivery coordination within our service radius can be arranged at the time of showroom purchase. Our team can discuss schedule, handling, and logistics during your visit.",
    },
    ur: {
      question: "کیا ہوم ڈیلیوری کی سہولت دستیاب ہے؟",
      answer:
        "شو روم پر خریداری کے وقت مقامی ڈیلیوری کا انتظام کیا جا سکتا ہے۔ ڈیلیوری کے اوقات اور طریقہ کار کے حوالے سے ہمارے نمائندے آپ کے وزٹ کے دوران تفصیلات فراہم کریں گے۔",
    },
  },
  {
    id: "showroom-location-hours",
    en: {
      question: "Where is the showroom located and what are the opening hours?",
      answer:
        "Please visit our Contact page or call our team for our current showroom address, map directions, and weekly operating hours.",
    },
    ur: {
      question: "شو روم کہاں واقع ہے اور کھلنے کے اوقات کیا ہیں؟",
      answer:
        "شو روم کے موجودہ پتے، لوکیشن میپ اور دکان کے اوقات کے لیے برائے مہربانی ہمارے رابطہ صفحے پر رجوع کریں یا فون پر رابطہ کریں۔",
    },
  },
];
