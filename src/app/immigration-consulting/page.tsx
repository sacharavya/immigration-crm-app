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

import { ContactForm } from '../_contact/contact-form';
import { SiteNav } from '@/components/marketing/shell';
import { MarketingFooter } from '@/components/marketing/footer';
import { dmMono, instrumentSerif, jakarta } from '@/components/marketing/fonts';
import {
  BleedPanel,
  DarkSection,
  Display,
  Eyebrow,
  FocusList,
  GradientBlock,
  HeroBand,
  PrimaryLink,
  SectionHead,
  WhiteLink,
} from '@/components/marketing/ui';

export const metadata: Metadata = {
  title: 'genzdatalabs Immigration Consulting Inc | Your pathway to Canada',
  description:
    'A regulated Canadian immigration firm (RCIC# R7111111) guiding individuals and families through study, work and permanent residence, from Toronto and Kathmandu.',
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

const SERVICE_BASE = 'https://genzdatalabs.com/service-details';
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
  },
  {
    big: 'Kathmandu',
    small: 'Branch office · Nepal',
  },
  {
    big: 'RCIC',
    small: 'Licensed by CICC · R7111111',
  },
  {
    big: 'Since 2021',
    small: 'Affordable, effective and expeditious solutions',
  },
];

const MVV = [
  {
    eyebrow: 'OUR MISSION',
    title: 'Efficient, transparent, accountable.',
    body: 'With you from the first question to settlement and beyond.',
  },
  {
    eyebrow: 'OUR VISION',
    title: "Canada's most trusted immigration firm.",
    body: 'Client satisfaction first, every time.',
  },
];

const PATHWAYS = SERVICES.slice(0, 7).map((s) => ({
  label: s.title,
  href: `${SERVICE_BASE}/${s.slug}`,
}));

export default function HomePage() {
  return (
    <main
      className={`${jakarta.variable} ${dmMono.variable} ${instrumentSerif.variable} marketing-radius flex min-h-dvh flex-col overflow-x-clip bg-[var(--paper)] font-[family-name:var(--font-jakarta)] text-[var(--ink)] antialiased`}
    >
      <SiteNav />
      <HeroBand deep>
        <header className='relative px-6 pb-12 pt-20 text-[var(--ink)] sm:pt-24'>
          <div className='mx-auto grid w-full max-w-[1180px] items-end gap-10 lg:grid-cols-[1.35fr_1fr]'>
            <Display as='h1' className='text-[clamp(52px,8.4vw,116px)]'>
              Your pathway to
              <br />
              Canada{' '}
              <em className='font-normal italic text-[var(--ink-muted)]'>
                starts here.
              </em>
            </Display>
            <div className='flex flex-col items-start gap-6 lg:pb-3'>
              <p className='max-w-[420px] text-[16px] leading-relaxed text-[var(--ink-muted)]'>
                A regulated Canadian immigration firm guiding individuals and
                families through every step, with clarity, honesty and care.
              </p>
              <div className='flex flex-wrap gap-2.5'>
                <PrimaryLink href='/book-an-appointment'>
                  Book a consultation <ArrowRight className='h-4 w-4' />
                </PrimaryLink>
                <WhiteLink href='#tools'>Find your pathway</WhiteLink>
              </div>
            </div>
          </div>

          {/* Credential strip: the regulator line is the proof point, so it
              sits on its own rule rather than floating under the buttons. */}
          <div className='mx-auto mt-16 flex w-full max-w-[1180px] flex-wrap items-center gap-x-6 gap-y-4 border-t border-[var(--rule)] pt-6'>
            <Image
              src='/RCIC.png'
              alt='RCIC - Regulated Canadian Immigration Consultant'
              width={280}
              priority
              unoptimized
              height={100}
              className='h-10 w-auto'
            />
            <span className='font-[family-name:var(--font-dm-mono)] text-[11px] uppercase leading-relaxed tracking-[.14em] text-[var(--ink-faint)]'>
              Licensed by the College of Immigration and Citizenship
              Consultants (CICC) · RCIC# R7111111
            </span>
          </div>
        </header>
      </HeroBand>

      {/* Quick links, overlapping the hero */}
      <section id='tools' className='relative z-10 px-6 pb-28 pt-16'>
        <div className='mx-auto grid max-w-[1180px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
          {TILES.map(({ href, title, body, Icon }) => (
            <Link
              key={title}
              href={href}
              className='group flex flex-col gap-3.5 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--paper-raised)] p-7 transition-colors hover:border-[var(--ink)]/30'
            >
              <div className='flex items-center justify-between'>
                <div className='flex h-10 w-10 items-center justify-center rounded-[var(--radius)] border border-[var(--rule)] text-[var(--ink)]'>
                  <Icon className='h-5.5 w-5.5' strokeWidth={1.75} />
                </div>
                <ArrowRight className='h-4 w-4 text-[var(--ink-faint)] transition-transform group-hover:translate-x-0.5' />
              </div>
              <div className='text-[16px] font-bold'>{title}</div>
              <p className='text-[13.5px] leading-relaxed text-[var(--ink-muted)]'>{body}</p>
            </Link>
          ))}
          <GradientBlock className='flex flex-col justify-between gap-3 p-7'>
            <div className='relative flex flex-col gap-2.5'>
              <span className='self-start font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[.18em] text-white/50'>
                FOR FIRMS
              </span>
              <div className='font-[family-name:var(--font-display)] text-[26px] leading-[1.05] tracking-[-0.02em]'>
                BBI-CRM alpha program
              </div>
              <p className='text-[13.5px] leading-relaxed text-white/90'>
                The CRM we built to run this practice, now open to a small group
                of firms.
              </p>
            </div>
            <Link
              href='/'
              className='relative self-start rounded-[var(--radius)] bg-[var(--paper-raised)] px-3.5 py-2 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--gold)]'
            >
              Learn more →
            </Link>
          </GradientBlock>
        </div>
      </section>

      {/* Pathways — the one section that carries the page. A hard cut to
          dark, then nothing but names set large. */}
      <DarkSection className='py-28'>
        <div className='grid items-start gap-12 lg:grid-cols-[minmax(0,260px)_1fr]'>
          <div className='flex flex-col gap-5 lg:sticky lg:top-28'>
            <span className='font-[family-name:var(--font-dm-mono)] text-[10.5px] uppercase tracking-[.18em] text-white/45'>
              What clients come to us for
            </span>
            <p className='max-w-[26ch] text-[14px] leading-relaxed text-white/60'>
              Seven programs cover most of the files we run. Point at one to
              read it, click to see how it works.
            </p>
            <Link
              href='https://genzdatalabs.com/services'
              className='self-start rounded-[var(--radius)] border border-white/25 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-[var(--ink)]'
            >
              Explore all services
            </Link>
          </div>
          <FocusList items={PATHWAYS} activeIndex={0} className='lg:pl-6' />
        </div>
      </DarkSection>

      {/* About */}
      <section id='about' className='scroll-mt-24 px-6 pb-28'>
        <div className='mx-auto grid max-w-[1100px] items-center gap-10 lg:grid-cols-2'>
          <div className='flex flex-col items-start gap-4'>
            <Eyebrow>ABOUT US</Eyebrow>
            <Display className='text-balance text-[clamp(30px,3.8vw,48px)]'>
              Licensed, local, and with you for the long run.
            </Display>
            <p className='text-[15.5px] leading-relaxed text-[var(--ink-muted)]'>
              Study, work or permanent residence, a licensed RCIC firm serving
              clients from around the world since 2021.
            </p>
            <div className='flex flex-wrap gap-2.5'>
              <PrimaryLink
                href='/about-us'
                className='px-4.5 py-2.5 text-[13.5px]'
              >
                Learn more
              </PrimaryLink>
              <Link
                href='https://www.youtube-nocookie.com/embed/iDo3mRevQLU'
                className='rounded-lg border border-[var(--rule)] px-4.5 py-2.5 text-[13.5px] font-semibold text-[var(--ink)] hover:border-[var(--ink)]'
              >
                Watch our story
              </Link>
            </div>
          </div>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
            {STAT_TILES.map((t) => (
              <div
                key={t.big}
                className='rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--paper-raised)] p-6'
              >
                <Display className='text-[32px]'>{t.big}</Display>
                <div className='mt-1 text-[12.5px] text-[var(--ink-muted)]'>
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
                className='flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--paper-raised)] p-7'
              >
                <div className='font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[.18em] text-[var(--ink-muted)]'>
                  {m.eyebrow}
                </div>
                <Display className='text-[22px]'>{m.title}</Display>
                <p className='text-[13.5px] leading-relaxed text-[var(--ink-muted)]'>
                  {m.body}
                </p>
              </div>
            ))}
            <div
              className='flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--rule)] bg-[var(--paper-raised)] p-7'
            >
              <div className='font-[family-name:var(--font-dm-mono)] text-[10px] uppercase tracking-[.18em] text-[var(--ink-muted)]'>
                OUR VALUES
              </div>
              <div className='text-lg font-bold leading-snug'>
                What we bring to every client.
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {VALUES.map((v) => (
                  <span
                    key={v}
                    className='rounded-full border border-[var(--rule)] bg-[var(--paper-raised)] px-2.5 py-1 text-xs font-semibold'
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services — a ruled index rather than a field of boxes. At this
          count, cards fragment the page; rows let the names carry it. */}
      <section id='services' className='scroll-mt-24 px-6 pb-28'>
        <div className='mx-auto flex max-w-[1180px] flex-col gap-10'>
          <div className='flex flex-wrap items-end justify-between gap-6'>
            <SectionHead eyebrow='POPULAR SERVICES' title='What we do' />
            <Link
              href='https://genzdatalabs.com/services'
              className='rounded-[var(--radius)] border border-[var(--rule)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:border-[var(--ink)]'
            >
              Explore all services
            </Link>
          </div>

          <div className='border-t border-[var(--rule)]'>
            {SERVICES.map(({ slug, title, body }, i) => (
              <Link
                key={slug}
                href={`${SERVICE_BASE}/${slug}`}
                className='group grid grid-cols-[auto_1fr] items-baseline gap-x-6 gap-y-1 border-b border-[var(--rule)] py-5 transition-colors hover:bg-[var(--paper-raised)] sm:grid-cols-[auto_minmax(0,22rem)_1fr_auto] sm:px-3'
              >
                <span className='font-[family-name:var(--font-dm-mono)] text-[11px] tabular-nums text-[var(--ink-faint)]'>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Display className='text-[clamp(20px,2.1vw,27px)]'>
                  {title}
                </Display>
                <p className='col-start-2 text-[13px] leading-relaxed text-[var(--ink-muted)] sm:col-start-3'>
                  {body}
                </p>
                <ArrowRight className='col-start-2 mt-1 h-4 w-4 text-[var(--ink-faint)] transition-transform group-hover:translate-x-1 sm:col-start-4 sm:mt-0' />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Study in Canada */}
      <section id='study' className='scroll-mt-24 px-6 pb-28'>
        <GradientBlock className='mx-auto grid max-w-[1100px] items-center gap-10 p-8 sm:p-14 lg:grid-cols-2'>
          <div className='relative flex flex-col items-start gap-4'>
            <span className='rounded-full border border-white/50 bg-white/20 px-2.5 py-1.5 font-[family-name:var(--font-dm-mono)] text-[10.5px] tracking-[.16em]'>
              STUDY IN CANADA
            </span>
            <Display className='text-balance text-[clamp(28px,3.6vw,44px)]'>
              Study in Canada, loan included.
            </Display>
            <p className='max-w-[460px] text-[15px] leading-relaxed text-white/90'>
              Counselling to settlement, plus education loans up to $65K from a
              Canadian lender.
            </p>
            <WhiteLink
              href='https://genzdatalabs.com/study-in-cananda'
              className='px-4.5 py-2.5 text-[13.5px]'
            >
              Learn more →
            </WhiteLink>
          </div>
          <div className='relative grid grid-cols-1 gap-2.5 sm:grid-cols-2'>
            {STUDY_STEPS.map((label, i) => (
              <div
                key={label}
                className='flex items-center gap-2.5 rounded-xl bg-white/95 px-4 py-3.5 text-[var(--ink)]'
              >
                <span className='font-[family-name:var(--font-dm-mono)] text-[10.5px] text-[var(--ink)]'>
                  0{i + 1}
                </span>
                <span className='text-[13.5px] font-semibold'>{label}</span>
              </div>
            ))}
          </div>
        </GradientBlock>
      </section>

      {/* Audiences */}
      <section className='px-6 pb-28'>
        <div className='mx-auto grid max-w-[1180px] gap-4 lg:grid-cols-2'>
          <BleedPanel
            eyebrow='For individuals & families'
            title='One consultant, start to landing.'
            body='A regulated consultant owns your file from the first call through to the decision — no handoffs, no call centre.'
            action={
              <Link
                href='/book-an-appointment'
                className='rounded-[var(--radius)] border border-white/25 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-white hover:text-[var(--ink)]'
              >
                Book a consultation
              </Link>
            }
          >
            <div className='flex flex-col gap-px bg-white/10'>
              {[
                ['Retainer signed', 'Mar 04'],
                ['Documents collected', 'Apr 18'],
                ['Forms reviewed', 'Apr 26'],
                ['Submitted to IRCC', 'May 02'],
                ['Biometrics completed', 'Jun 11'],
                ['Passport requested', 'Aug 27'],
              ].map(([step, when]) => (
                <div
                  key={step}
                  className='flex items-center justify-between gap-6 bg-[var(--slab)] px-5 py-3.5'
                >
                  <span className='text-[13px] font-medium text-white/85'>
                    {step}
                  </span>
                  <span className='font-[family-name:var(--font-dm-mono)] text-[11px] tracking-[.1em] text-[var(--gold)]'>
                    {when}
                  </span>
                </div>
              ))}
            </div>
          </BleedPanel>

          <BleedPanel
            eyebrow='For firms'
            title='The software we run this practice on.'
            body='Cases, IRCC forms, submission packages, compliance and billing — built inside a CICC-regulated firm, now open to a small alpha group.'
            action={
              <Link
                href='/'
                className='rounded-[var(--radius)] bg-[var(--gold)] px-4 py-2.5 text-[13px] font-semibold text-[var(--ink)] transition-colors hover:bg-white'
              >
                See the CRM
              </Link>
            }
          >
            <Image
              src='/dashboard-preview.png'
              alt='genzdatalabs Immigration CRM dashboard'
              width={2778}
              height={1706}
              unoptimized
              className='block h-auto w-full'
            />
          </BleedPanel>
        </div>
      </section>

      {/* Testimonials */}
      <section id='testimonials' className='scroll-mt-24 px-6 pb-28'>
        <div className='mx-auto flex max-w-[1100px] flex-col items-center gap-4'>
          <SectionHead
            eyebrow='CLIENT TESTIMONIALS'
            title='Our happy clients'
          />
          <div className='mt-6 grid w-full grid-cols-1 gap-4 md:grid-cols-3'>
            {TESTIMONIALS.map((t) => (
              <div
                key={t.ini}
                className='flex flex-col gap-3.5 rounded-2xl border border-[var(--rule)] bg-[var(--paper-raised)] p-6.5'
              >
                <div className='text-[13px] tracking-[.1em] text-[var(--gold)]'>
                  ★★★★★
                </div>
                <p className='text-sm leading-relaxed text-[var(--ink-muted)]'>
                  {t.quote}
                </p>
                <div className='mt-auto flex items-center gap-2.5'>
                  <div className='flex h-9 w-9 items-center justify-center rounded-full bg-[var(--paper)] text-xs font-bold text-[var(--ink)]'>
                    {t.ini}
                  </div>
                  <div>
                    <div className='text-[13.5px] font-bold'>{t.name}</div>
                    <div className='text-[11.5px] text-[var(--ink-muted)]'>{t.type}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact form */}
      <section id='contact' className='scroll-mt-24 px-6 pb-16'>
        <div className='mx-auto flex max-w-3xl flex-col items-center gap-4 text-center'>
          <Eyebrow>GET IN TOUCH</Eyebrow>
          <Display className='text-balance text-[clamp(30px,3.8vw,48px)]'>
            Tell us about your case
          </Display>
          <p className='max-w-xl text-base text-[var(--ink-muted)]'>
            Send us a message and a member of our team will get back to you,
            typically within one business day.
          </p>
        </div>
        <div className='mx-auto mt-8 max-w-3xl'>
          <ContactForm />
        </div>
      </section>

      {/* Contact strip */}
      <section className='scroll-mt-24 px-6 pb-24'>
        <div className='mx-auto grid max-w-[1100px] items-center gap-6 rounded-2xl border border-[var(--rule)] bg-[var(--paper)] p-9 sm:grid-cols-2 lg:grid-cols-4'>
          <div>
            <Display className='text-[26px]'>
              Contact us
            </Display>
            <div className='mt-1 text-[12.5px] text-[var(--ink-muted)]'>
              Head office · Toronto — Branch office · Kathmandu, Nepal (+977
              984-166-0656)
            </div>
          </div>
          <div className='flex items-start gap-3 text-sm leading-relaxed text-[var(--ink-muted)]'>
            <MapPin
              className='mt-0.5 h-4.5 w-4.5 flex-none text-[var(--gold)]'
              strokeWidth={1.75}
            />
            <span>
              211-2390 Eglinton Avenue East,
              <br />
              Toronto, ON M1K 2P5
            </span>
          </div>
          <div className='flex items-center gap-3 text-sm text-[var(--ink-muted)]'>
            <Phone
              className='h-4.5 w-4.5 flex-none text-[var(--gold)]'
              strokeWidth={1.75}
            />
            <a href='tel:+14163865351' className='hover:text-[var(--ink)]'>
              +1 (416) 386-5351
            </a>
          </div>
          <div className='flex items-center gap-3 text-sm text-[var(--ink-muted)]'>
            <Mail
              className='h-4.5 w-4.5 flex-none text-[var(--gold)]'
              strokeWidth={1.75}
            />
            <a
              href='mailto:info@genzdatalabs.com'
              className='hover:text-[var(--ink)]'
            >
              info@genzdatalabs.com
            </a>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
