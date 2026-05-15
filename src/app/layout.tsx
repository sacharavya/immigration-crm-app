import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Big Bang Immigration Consulting Inc.",
  description: "Internal case management system — coming soon.",
  icons: {
    icon: "/Maple_Leaf.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", inter.variable, "font-sans", geist.variable)}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col font-[var(--font-inter)]"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
