import { DM_Mono, Plus_Jakarta_Sans } from "next/font/google";

// Marketing visual system fonts (public pages only; the app keeps Inter).
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
