import type { Metadata } from "next";
import { Anton, Bodoni_Moda, Geist, Instrument_Serif, Fraunces, Newsreader, Sora } from "next/font/google";
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
  title: "NS Home Appliances — Digital Showroom",
  description: "A product-led digital showroom for NS Home Appliances.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${geist.variable} ${sora.variable} ${anton.variable} ${bodoniModa.variable} ${newsreader.variable} ${instrumentSerif.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
