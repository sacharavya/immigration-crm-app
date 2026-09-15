import { DM_Mono, Instrument_Serif, Plus_Jakarta_Sans } from "next/font/google";

// Marketing visual system fonts (public pages only; the app keeps Inter).

// Display face for headlines. A high-contrast transitional serif is what
// gives the public pages their editorial, professional register — the app
// side stays entirely sans.
export const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-display",
});

export const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
});

export const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: "500",
  variable: "--font-dm-mono",
});
