import Image from "next/image";
import Link from "next/link";

// THE shared footer for every public page. Audience-neutral columns so the
// same component serves the home page, the CRM landing, booking, tools,
// and legal pages.
export function MarketingFooter() {
  return (
    <footer className="mt-auto px-6 pb-8 pt-24">
      <div className="mx-auto grid max-w-[1120px] gap-10 border-b border-[#D9E2EC] pb-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3.5">
          <Image
            src="/logo.png"
            alt="Big Bang Immigration Consulting Inc"
            width={220}
            height={70}
            unoptimized
            className="h-9 w-auto self-start"
          />
          <p className="max-w-[320px] text-[13px] leading-relaxed text-[#5A6A85]">
            A regulated Canadian immigration firm. 211-2390 Eglinton Avenue
            East, Toronto, ON M1K 2P5 · +1 (416) 386-5351 ·
            info@bigbangimmigration.com
          </p>
        </div>
        <div className="flex flex-col gap-2.5 text-[13px]">
          <div className="font-bold text-[#1B365D]">Explore</div>
          <Link href="/#services" className="text-[#5A6A85] hover:text-[#1B365D]">
            Services
          </Link>
          <Link href="/book-an-appointment" className="text-[#5A6A85] hover:text-[#1B365D]">
            Book an appointment
          </Link>
          <Link href="/crs-calculator" className="text-[#5A6A85] hover:text-[#1B365D]">
            CRS Calculator
          </Link>
          <Link href="/find-your-noc-code" className="text-[#5A6A85] hover:text-[#1B365D]">
            Find your NOC Code
          </Link>
        </div>
        <div className="flex flex-col gap-2.5 text-[13px]">
          <div className="font-bold text-[#1B365D]">Firm</div>
          <a href="https://bigbangimmigration.com/about-us" className="text-[#5A6A85] hover:text-[#1B365D]">
            About us
          </a>
          <Link href="/immigration-crm-software" className="text-[#5A6A85] hover:text-[#1B365D]">
            BBI-CRM for firms
          </Link>
          <Link href="/login" className="text-[#5A6A85] hover:text-[#1B365D]">
            Staff login
          </Link>
        </div>
        <div className="flex flex-col gap-2.5 text-[13px]">
          <div className="font-bold text-[#1B365D]">Legal</div>
          <Link href="/privacy-policy" className="text-[#5A6A85] hover:text-[#1B365D]">
            Privacy Policy
          </Link>
          <Link href="/data-usage" className="text-[#5A6A85] hover:text-[#1B365D]">
            Data Usage
          </Link>
          <Link href="/terms" className="text-[#5A6A85] hover:text-[#1B365D]">
            Terms of Use
          </Link>
        </div>
      </div>
      <div className="mx-auto flex max-w-[1120px] flex-wrap justify-between gap-3 pt-5 text-xs text-[#5A6A85]">
        <span>© 2026 Big Bang Immigration Consulting Inc.</span>
        <span>
          Licensed by the College of Immigration and Citizenship Consultants
          (CICC) · RCIC# R711181
        </span>
      </div>
    </footer>
  );
}
