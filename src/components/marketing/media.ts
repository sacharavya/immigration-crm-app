// THE list of photography slots on the public pages.
//
// Every slot ships with a labelled placeholder in /public/images. To use a
// real photo: drop the file into /public/images and point `src` at it. That
// is the only edit needed — nothing else imports these paths.
//
// Keep `alt` accurate when you swap the file; it is what screen readers and
// search engines read, and a stale alt is worse than none. `credit` renders
// as a small caption where the licence asks for attribution (Pexels does not
// require it, so leave it undefined unless you want the byline).

export type MediaSlot = {
  src: string;
  alt: string;
  /** Optional photographer byline, rendered as a caption when present. */
  credit?: string;
  /** Focal point for object-cover crops. Defaults to centre. */
  position?: string;
};

export const MEDIA = {
  // Consumer hero, and the "For applicants" menu card. Pexels photo 25696388
  // (pexels.com/photo/25696388); the Pexels licence allows commercial use
  // with no attribution required.
  //
  // Cropped to a wide band on the hero, so the position favours the skyline
  // and waterfront rather than centring on empty sky.
  heroConsulting: {
    src: "/images/hero-consulting.jpg",
    alt: "The Toronto skyline and CN Tower at dusk",
    position: "50% 58%",
  },

  // About section on the consulting page.
  aboutTeam: {
    src: "/images/about-team.svg",
    alt: "A licensed consultant meeting clients at the Toronto office",
  },

  // Behind the dark pathways band. Chosen dark: it sits under a navy scrim,
  // so a bright photo will wash out rather than read as an image.
  pathwaysBackdrop: {
    src: "/images/pathways-backdrop.svg",
    alt: "",
    position: "50% 55%",
  },

  // Behind the dark security band on the product page.
  // Pexels photo 36713445 (pexels.com/photo/36713445). The Pexels licence
  // allows commercial use with no attribution required.
  //
  // The frame is a dark office exterior with one lit room centre-right. The
  // section is far wider than the photo's 16:9, so object-cover scales it to
  // the full width and only the vertical crop is adjustable — hence the
  // position below, which lands the lit room on the text band.
  securityBackdrop: {
    src: "/images/security-backdrop.jpg",
    alt: "",
    position: "50% 42%",
  },

  // Real product screenshot, not a placeholder — the platform menu should
  // show the actual thing. Re-export it when the dashboard UI changes.
  productShot: {
    src: "/dashboard-preview.png",
    alt: "The CaseBind dashboard",
    position: "0% 0%",
  },
} as const satisfies Record<string, MediaSlot>;
