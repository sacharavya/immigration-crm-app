import { DM_Mono, Fraunces } from "next/font/google";

// Marketing visual system fonts (public pages only). Body text is Inter,
// which the root layout already provides as --font-inter.

// Display face for headlines and the logo wordmark, per the brand sheet.
export const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-dm-mono",
});
