import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CalendarCheck,
  Calculator,
  Compass,
  CreditCard,
  FileCheck,
  Globe,
  GraduationCap,
  Heart,
  HeartHandshake,
  History,
  LogIn,
  Mail,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';

import { dmMono, jakarta } from '@/components/marketing/fonts';
import {
  Eyebrow,
  GradientBlock,
  HeroBand,
  MarketingNav,
  PrimaryLink,
  SectionHead,
  WhiteLink,
} from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'Big Bang Immigration Consulting Inc | Your pathway to Canada',
  description:
    'A regulated Canadian immigration firm (RCIC# R711181) guiding individuals and families through study, work and permanent residence, from Toronto and Kathmandu.',
};

const TILES = [
  {
    href: '/book-an-appointment',
    title: 'Book an Appointment',
    body: 'Schedule an initial consultation or case review meeting with our team.',
    Icon: CalendarCheck,
  },
  {
    href: '/login',
    title: 'Staff Login',
    body: 'Access the staff console to manage cases, clients, and documents.',
    Icon: LogIn,
  },
  {
    href: '/crs-calculator',
    title: 'CRS Calculator',
    body: 'Estimate your Comprehensive Ranking System score for Express Entry.',
    Icon: Calculator,
  },
  {
    href: '/find-a-pathway',
    title: 'Find a Pathway',
    body: 'Discover which immigration program best matches your profile and goals.',
    Icon: Compass,
  },
  {
    href: '/find-your-noc-code',
    title: 'Find your NOC Code',
    body: 'New IRCC rules limit spousal open work permits by occupation. Check if your NOC still qualifies.',
    Icon: Search,
  },
];

const SERVICE_BASE = 'https://bigbangimmigration.com/service-details';
const SERVICES = [
  {
    slug: 'express-entry',
    title: 'Express Entry',
    body: 'The application process for skilled workers who want to settle in Canada permanently.',
    Icon: ArrowRight,
  },
  {
    slug: 'study-permit',
    title: 'Study Permit',
    body: 'Canada has become a world-class education destination for students seeking quality education.',
    Icon: GraduationCap,
  },
  {
    slug: 'work-permit-extension',
    title: 'Work Permit / Extension',
    body: 'A fast-growing economy offering a wide range of job opportunities to people worldwide.',
    Icon: Briefcase,
  },
  {
    slug: 'visitor-visa',
    title: 'Visitor Visa',
    body: 'Canada welcomes more than 15 million visitors each year, for tourism, family and business.',
    Icon: Globe,
  },
  {
    slug: 'provincial-nominee-programs-pnp-',
    title: 'Provincial Nominee Programs',
    body: 'Most provinces and territories can nominate immigrants who fit their local labour needs.',
    Icon: Building2,
  },
  {
    slug: 'sponsorship-family-child-spousal',
    title: 'Family, Child & Spousal Sponsorship',
    body: 'Reunite families in Canada by sponsoring your spouse, partner, children or relatives.',
    Icon: Heart,
  },
  {
    slug: 'parents-and-grandparents-supervisa',
    title: 'Parents & Grandparents Super Visa',
    body: 'Lets parents and grandparents visit their children or grandchildren for up to five years at a time.',
    Icon: Users,
  },
  {
    slug: 'lmia',
    title: 'LMIA',
    body: 'The Labour Market Impact Assessment an employer may need before hiring a foreign worker.',
    Icon: FileCheck,
  },
  {
    slug: 'post-graduate-work-permit',
    title: 'Post-Graduate Work Permit',
    body: 'A one-time permit for international students who graduate from Canadian institutions.',
    Icon: BookOpen,
  },
  {
    slug: 'loan-services-',
    title: 'Education Loan Services',
    body: 'Financing of up to C$65,000 for international students from a Canadian lender.',
    Icon: CreditCard,
  },
  {
    slug: 'citizenship-application',
    title: 'Citizenship Application',
    body: 'Permanent residents who meet the residency requirement can apply to become Canadian citizens.',
    Icon: Sparkles,
  },
  {
    slug: 'permanent-resident-card-application-renewal',
    title: 'PR Card Application & Renewal',
    body: 'For permanent residents whose card has expired or expires within nine months.',
    Icon: CreditCard,
  },
  {
    slug: 'restoration-of-status',
    title: 'Restoration of Status',
    body: 'For visitors, students or workers already in Canada whose temporary status has lapsed.',
    Icon: History,
  },
  {
    slug: 'caregiver-application',
    title: 'Caregiver Applications',
    body: 'Home Child Care Provider and Home Support Worker pilot streams.',
    Icon: HeartHandshake,
  },
  {
    slug: 'humanitarian-compassionate-application',
    title: 'Humanitarian & Compassionate',
    body: 'Permanent residence on H&C grounds for those who would not otherwise qualify.',
    Icon: ShieldCheck,
  },
];

const VALUES = [
  'Integrity',
  'Transparency',
  'Accountability',
  'Fairness',
  'Diversity',
];

const STUDY_STEPS = [
  'Counselling',
  'Documentation',
  'Visa lodgement',
  'Travel documents',
  'Accommodation',
  'Settlement',
];

const TESTIMONIALS = [
  {
    ini: 'AS',
    name: 'Anish Shah',
    type: 'Study permit, then spousal work permit',
    quote:
      'Despite a 5-year gap, my study permit was approved. Today we are happily settled in Canada.',
  },
  {
    ini: 'RB',
    name: 'Rabin Bishwokarma',
    type: 'Status restoration',
    quote:
      'After a refusal, they restored my status and got my new permit right on time for intake.',
  },
  {
    ini: 'PM',
    name: 'Pramod Mainali',
    type: 'Student visa',
    quote:
      'Seamless and stress-free. They genuinely cared and kept us informed at every step.',
  },
];

const STAT_TILES = [
  {
    big: 'Toronto',
    small: 'Head office · 211-2390 Eglinton Ave E',
    bg: 'linear-gradient(180deg,#F1F5FD,#fff)',
  },
  {
    big: 'Kathmandu',
    small: 'Branch office · Nepal',
    bg: 'linear-gradient(180deg,#F6F1FC,#fff)',
  },
  {
    big: 'RCIC',
    small: 'Licensed by CICC · R711181',
    bg: 'linear-gradient(180deg,#FBF3E4,#fff)',
  },
  {
    big: 'Since 2021',
    small: 'Affordable, effective and expeditious solutions',
    bg: 'linear-gradient(180deg,#EEF6FB,#fff)',
  },
];

const MVV = [
  {
    eyebrow: 'OUR MISSION',
    title: 'Efficient, transparent, accountable.',
    body: 'With you from the first question to settlement and beyond.',
    bg: 'linear-gradient(180deg,#F1F5FD,#fff)',
  },
  {
    eyebrow: 'OUR VISION',
    title: "Canada's most trusted immigration firm.",
    body: 'Client satisfaction first, every time.',
    bg: 'linear-gradient(180deg,#F6F1FC,#fff)',
  },
];

export default function HomePage() {
  return (
    <main
      className={`${jakarta.variable} ${dmMono.variable} marketing-radius flex min-h-dvh flex-col overflow-x-hidden bg-white font-[family-name:var(--font-jakarta)] text-[#1B365D] antialiased`}
    >
      <HeroBand deep>
        <MarketingNav
          actions={
            <>
              <Link
                href='/book-an-appointment'
                className='px-3.5 py-2 text-[13px] font-medium text-[#5A6A85] hover:text-[#1B365D]'
              >
                Book appointment
              </Link>
              <Link
                href='/login'
                className='rounded-lg border border-[#D9E2EC] bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1B365D] hover:border-[#3D6FD8]'
              >
                Staff login
              </Link>
            </>
          }
        />
        <header className='relative flex flex-col items-center gap-5 px-6 pb-28 pt-16 text-center text-white sm:pt-20'>
          <div className='flex items-center rounded-xl bg-white/95 px-4 py-2.5 shadow-[0_10px_30px_-18px_rgba(27,54,93,.4)]'>
            <Image
              src='/RCIC.png'
              alt='RCIC - Regulated Canadian Immigration Consultant'
              width={280}
              priority
              unoptimized
              height={100}
              className='h-14 w-auto'
            />
          </div>
          <h1 className='max-w-[820px] text-balance text-[clamp(38px,5.4vw,64px)] font-extrabold leading-[1.04] tracking-[-.03em]'>
            Your pathway to Canada starts here.
          </h1>
          <p className='max-w-[640px] text-[17px] leading-relaxed text-white/90'>
            A regulated Canadian immigration firm guiding individuals and
            families through every step, with clarity, honesty and care.
          </p>
          <div className='mt-1 flex flex-wrap justify-center gap-2.5'>
            <PrimaryLink href='/book-an-appointment'>
              Book a consultation <ArrowRight className='h-4 w-4' />
            </PrimaryLink>
            <WhiteLink href='#tools'>Find your pathway</WhiteLink>
          </div>
          <div className='text-[12.5px] font-medium text-white'>
            Licensed by the College of Immigration and Citizenship Consultants
            (CICC) · RCIC# R711181
          </div>
        </header>
      </HeroBand>

      {/* Quick links, overlapping the hero */}
      <section id='tools' className='relative z-10 -mt-14 px-6 pb-28'>
        <div className='mx-auto grid max-w-[1100px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3'>
          {TILES.map(({ href, title, body, Icon }) => (
            <Link
              key={title}
              href={href}
              className='group flex flex-col gap-3.5 rounded-2xl border border-[#D9E2EC] bg-white p-7 shadow-[0_20px_40px_-32px_rgba(27,54,93,.35)] transition-all hover:border-[#3D6FD8] hover:shadow-[0_24px_48px_-28px_rgba(27,54,93,.45)]'
            >
              <div className='flex items-center justify-between'>
                <div className='flex h-11 w-11 items-center justify-center rounded-xl bg-[#FBF3E4] text-[#C9A227]'>
                  <Icon className='h-5.5 w-5.5' strokeWidth={1.75} />
                </div>
                <ArrowRight className='h-4.5 w-4.5 text-[#B9C9F5] transition-transform group-hover:translate-x-0.5' />
              </div>
              <div className='text-[17px] font-bold'>{title}</div>
              <p className='text-sm leading-relaxed text-[#5A6A85]'>{body}</p>
            </Link>
          ))}
          <GradientBlock className='flex flex-col justify-between gap-3 rounded-2xl p-7'>
            <div className='relative flex flex-col gap-2.5'>
              <span className='self-start rounded-full border border-white/50 bg-white/20 px-2.5 py-1 font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em]'>
                FOR FIRMS
              </span>
              <div className='text-[17px] font-bold'>BBI-CRM alpha program</div>
              <p className='text-[13.5px] leading-relaxed text-white/90'>
                The CRM we built to run this practice, now open to a small group
                of firms.
              </p>
            </div>
            <Link
              href='/immigration-crm-software'
              className='relative self-start rounded-lg bg-white px-3.5 py-2 text-[13px] font-semibold text-[#1B365D]'
            >
              Learn more →
            </Link>
          </GradientBlock>
        </div>
      </section>

      {/* About */}
      <section className='px-6 pb-28'>
        <div className='mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-2'>
          <div className='flex flex-col items-start gap-4'>
            <Eyebrow>ABOUT US</Eyebrow>
            <h2 className='text-balance text-[clamp(28px,3.4vw,40px)] font-extrabold leading-[1.1] tracking-[-.03em]'>
              Licensed, local, and with you for the long run.
            </h2>
            <p className='text-[15.5px] leading-relaxed text-[#5A6A85]'>
              Study, work or permanent residence, a licensed RCIC firm serving
              clients from around the world since 2021.
            </p>
            <div className='flex flex-wrap gap-2.5'>
              <PrimaryLink
                href='https://bigbangimmigration.com/about-us'
                className='px-4.5 py-2.5 text-[13.5px]'
              >
                Learn more
              </PrimaryLink>
              <Link
                href='https://www.youtube-nocookie.com/embed/iDo3mRevQLU'
                className='rounded-lg border border-[#D9E2EC] px-4.5 py-2.5 text-[13.5px] font-semibold text-[#1B365D] hover:border-[#3D6FD8]'
              >
                Watch our story
              </Link>
            </div>
          </div>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {STAT_TILES.map((t) => (
              <div
                key={t.big}
                className='rounded-2xl border border-[#D9E2EC] p-5.5'
                style={{ background: t.bg }}
              >
                <div className='text-[28px] font-extrabold tracking-[-.02em]'>
                  {t.big}
                </div>
                <div className='mt-1 text-[12.5px] text-[#5A6A85]'>
                  {t.small}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission / Vision / Values */}
      <section className='px-6 pb-28'>
        <div className='mx-auto flex max-w-[1100px] flex-col items-center gap-4'>
          <SectionHead
            eyebrow='MISSION · VISION · VALUES'
            title='Why families choose us.'
          />
          <div className='mt-6 grid w-full grid-cols-1 gap-4 md:grid-cols-3'>
            {MVV.map((m) => (
              <div
                key={m.eyebrow}
                className='flex flex-col gap-3 rounded-2xl border border-[#D9E2EC] p-7'
                style={{ background: m.bg }}
              >
                <div className='font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em] text-[#3D6FD8]'>
                  {m.eyebrow}
                </div>
                <div className='text-lg font-bold leading-snug'>{m.title}</div>
                <p className='text-[13.5px] leading-relaxed text-[#5A6A85]'>
                  {m.body}
                </p>
              </div>
            ))}
            <div
              className='flex flex-col gap-3 rounded-2xl border border-[#D9E2EC] p-7'
              style={{ background: 'linear-gradient(180deg,#FBF3E4,#fff)' }}
            >
              <div className='font-[family-name:var(--font-dm-mono)] text-[10px] tracking-[.14em] text-[#3D6FD8]'>
                OUR VALUES
              </div>
              <div className='text-lg font-bold leading-snug'>
                What we bring to every client.
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {VALUES.map((v) => (
                  <span
                    key={v}
                    className='rounded-full border border-[#D9E2EC] bg-white px-2.5 py-1 text-xs font-semibold'
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className='px-6 pb-28'>
        <div className='mx-auto flex max-w-[1100px] flex-col items-center gap-4'>
          <SectionHead eyebrow='POPULAR SERVICES' title='What we do' />
          <div className='mt-6 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4'>
            {SERVICES.map(({ slug, title, body, Icon }) => (
              <Link
                key={slug}
                href={`${SERVICE_BASE}/${slug}`}
                className='flex flex-col gap-3 rounded-[14px] border border-[#D9E2EC] bg-white p-5.5 transition-colors hover:border-[#3D6FD8]'
              >
                <div className='flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#E9F0FC] text-[#3D6FD8]'>
                  <Icon className='h-5 w-5' strokeWidth={1.75} />
                </div>
                <div className='text-[15px] font-bold leading-snug'>
                  {title}
                </div>
                <p className='text-[13px] leading-relaxed text-[#5A6A85]'>
                  {body}
                </p>
              </Link>
            ))}
          </div>
          <Link
            href='https://bigbangimmigration.com/services'
            className='mt-2 rounded-lg border border-[#D9E2EC] px-4.5 py-2.5 text-[13.5px] font-semibold text-[#1B365D] hover:border-[#3D6FD8]'
          >
            Explore all services
          </Link>
        </div>
      </section>

      {/* Study in Canada */}
      <section className='px-6 pb-28'>
        <GradientBlock className='mx-auto grid max-w-[1100px] items-center gap-10 p-8 sm:p-14 lg:grid-cols-2'>
          <div className='relative flex flex-col items-start gap-4'>
            <span className='rounded-full border border-white/50 bg-white/20 px-2.5 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] tracking-[.16em]'>
              STUDY IN CANADA
            </span>
            <h2 className='text-balance text-[clamp(26px,3.2vw,38px)] font-extrabold leading-[1.1] tracking-[-.03em]'>
              Study in Canada, loan included.
            </h2>
            <p className='max-w-[460px] text-[15px] leading-relaxed text-white/90'>
              Counselling to settlement, plus education loans up to $65K from a
              Canadian lender.
            </p>
            <WhiteLink
              href='https://bigbangimmigration.com/study-in-cananda'
              className='px-4.5 py-2.5 text-[13.5px]'
            >
              Learn more →
            </WhiteLink>
          </div>
          <div className='relative grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
            {STUDY_STEPS.map((label, i) => (
              <div
                key={label}
                className='flex items-center gap-2.5 rounded-xl bg-white/95 px-4 py-3.5 text-[#1B365D]'
              >
                <span className='font-[family-name:var(--font-dm-mono)] text-[10.5px] text-[#3D6FD8]'>
                  0{i + 1}
                </span>
                <span className='text-[13.5px] font-semibold'>{label}</span>
              </div>
            ))}
          </div>
        </GradientBlock>
      </section>

      {/* Testimonials */}
      <section className='px-6 pb-28'>
        <div className='mx-auto flex max-w-[1100px] flex-col items-center gap-4'>
          <SectionHead
            eyebrow='CLIENT TESTIMONIALS'
            title='Our happy clients'
          />
          <div className='mt-6 grid w-full grid-cols-1 gap-4 md:grid-cols-3'>
            {TESTIMONIALS.map((t) => (
              <div
                key={t.ini}
                className='flex flex-col gap-3.5 rounded-2xl border border-[#D9E2EC] bg-white p-6.5'
              >
                <div className='text-[13px] tracking-[.1em] text-[#C9A227]'>
                  ★★★★★
                </div>
                <p className='text-sm leading-relaxed text-[#5A6A85]'>
                  {t.quote}
                </p>
                <div className='mt-auto flex items-center gap-2.5'>
                  <div className='flex h-9 w-9 items-center justify-center rounded-full bg-[#E9F0FC] text-xs font-bold text-[#3D6FD8]'>
                    {t.ini}
                  </div>
                  <div>
                    <div className='text-[13.5px] font-bold'>{t.name}</div>
                    <div className='text-[11.5px] text-[#5A6A85]'>{t.type}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact strip */}
      <section className='px-6 pb-24'>
        <div className='mx-auto grid max-w-[1100px] items-center gap-6 rounded-2xl border border-[#D9E2EC] bg-[#F4F6F9] p-9 sm:grid-cols-2 lg:grid-cols-4'>
          <div>
            <div className='text-[22px] font-extrabold tracking-[-.02em]'>
              Contact us
            </div>
            <div className='mt-1 text-[12.5px] text-[#5A6A85]'>
              Head office · Toronto — Branch office · Kathmandu, Nepal (+977
              984-166-0656)
            </div>
          </div>
          <div className='flex items-start gap-3 text-sm leading-relaxed text-[#5A6A85]'>
            <MapPin
              className='mt-0.5 h-4.5 w-4.5 flex-none text-[#C9A227]'
              strokeWidth={1.75}
            />
            <span>
              211-2390 Eglinton Avenue East,
              <br />
              Toronto, ON M1K 2P5
            </span>
          </div>
          <div className='flex items-center gap-3 text-sm text-[#5A6A85]'>
            <Phone
              className='h-4.5 w-4.5 flex-none text-[#C9A227]'
              strokeWidth={1.75}
            />
            <a href='tel:+14163865351' className='hover:text-[#1B365D]'>
              +1 (416) 386-5351
            </a>
          </div>
          <div className='flex items-center gap-3 text-sm text-[#5A6A85]'>
            <Mail
              className='h-4.5 w-4.5 flex-none text-[#C9A227]'
              strokeWidth={1.75}
            />
            <a
              href='mailto:info@bigbangimmigration.com'
              className='hover:text-[#1B365D]'
            >
              info@bigbangimmigration.com
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className='mt-auto border-t border-[#D9E2EC] px-6 py-7'>
        <div className='mx-auto flex max-w-[1100px] flex-col items-center gap-2.5 text-center text-[12.5px] text-[#5A6A85]'>
          <div className='flex flex-wrap justify-center gap-5'>
            <Link href='/privacy-policy' className='hover:text-[#1B365D]'>
              Privacy Policy
            </Link>
            <Link href='/data-usage' className='hover:text-[#1B365D]'>
              Data Usage
            </Link>
            <Link href='/terms' className='hover:text-[#1B365D]'>
              Terms of Use
            </Link>
            <Link
              href='/immigration-crm-software'
              className='hover:text-[#1B365D]'
            >
              BBI-CRM for firms
            </Link>
          </div>
          <div>
            © 2026 Big Bang Immigration Consulting Inc. · Licensed by the
            College of Immigration and Citizenship Consultants (CICC) · RCIC#
            R711181
          </div>
        </div>
      </footer>
    </main>
  );
}
