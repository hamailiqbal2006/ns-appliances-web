import { Suspense } from "react";
import type { Metadata } from "next";
import { Anton, Bodoni_Moda, Geist, Instrument_Serif, Fraunces, Newsreader, Sora } from "next/font/google";
import { WelcomePopup } from "@/components/welcome-popup";
import { getWelcomePopupConfig } from "@/lib/welcome-popup-data";
import { hasRecognizedCustomerCookie } from "@/lib/customer-recognition";
import { getStorefrontOrigin } from "@/lib/product-inquiry.server";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sora",
  display: "swap",
});
const anton = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-cover",
  display: "swap",
});
const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-brand",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "500",
  style: "italic",
  variable: "--font-newsreader",
  display: "swap",
});
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  variable: "--font-instrument",
  display: "swap",
});
const fraunces = Fraunces({
  subsets: ["latin"],
  style: "italic",
  weight: ["400", "500", "600"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(getStorefrontOrigin()),
  title: "NS Home Appliances — Digital Showroom",
  description: "A product-led digital showroom for NS Home Appliances.",
};

async function WelcomePopupContainer() {
  const [welcomePopupConfig, isRecognizedCustomer] = await Promise.all([
    getWelcomePopupConfig(),
    hasRecognizedCustomerCookie(),
  ]);
  return <WelcomePopup config={welcomePopupConfig} isRecognizedCustomer={isRecognizedCustomer} />;
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${sora.variable} ${anton.variable} ${bodoniModa.variable} ${newsreader.variable} ${instrumentSerif.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(typeof window!=='undefined'){var recoveryParams=new URLSearchParams(window.location.hash.slice(1));if(window.location.pathname==='/'&&recoveryParams.get('type')==='recovery'&&recoveryParams.get('access_token')){window.location.replace('/admin/reset-password'+window.location.search+window.location.hash);}else if('scrollRestoration' in window.history){window.history.scrollRestoration='manual';if(window.location.pathname==='/'&&!window.location.hash){window.scrollTo(0,0);}}}`,
          }}
        />
      </head>
      <body suppressHydrationWarning>
        {children}
        <Suspense fallback={null}>
          <WelcomePopupContainer />
        </Suspense>
      </body>
    </html>
  );
}
