# design-sync notes

- 2026-09-11: First-time import. User approved the full high-fidelity sync,
  chose to author previews for all 10 components, and OK'd the Playwright
  Chromium install. No Storybook exists anywhere for this repo; shape = package.
- This is an app repo (Next 16, Tailwind v4, shadcn on Base UI primitives), not
  a packaged DS: no dist/, no .d.ts. The converter runs in synth-entry mode.
  `entry` in config points at a deliberately nonexistent path under
  src/components/ui so the converter (a) walks up to the root package.json for
  the package name and (b) falls through to synthesizing from `srcDir`. The
  `[NO_DIST] --entry ... doesn't exist` line on every build is expected.
- Component CSS is Tailwind, so it must be compiled before the converter runs:
  `node .design-sync/build-css.mjs` (= cfg.buildCmd) runs the Tailwind CLI
  staged in .ds-sync/node_modules over src/app/globals.css, prepends
  .design-sync/fonts.css, and writes .design-sync/.cache/ds.css (cfg.cssEntry).
  The Tailwind CLI is installed into .ds-sync at the repo's own tailwindcss
  version. Tailwind scans the repo from cwd, so preview files in
  .design-sync/previews/ contribute their utility classes. Always run buildCmd
  AFTER editing previews and BEFORE package-build.
- Fonts: the app loads Geist (headings, --font-sans) and Inter (body,
  --font-inter) through next/font/google, so there is no @font-face in the
  repo. .design-sync/fonts.css loads both from Google Fonts and defines the two
  variables. Validate reports `[FONT_REMOTE]` for this; expected.
- Synth-entry mode emits stub `.d.ts` bodies (`[key: string]: unknown`), so
  every component's props are hand-written in cfg.dtsPropsFor from the source
  in src/components/ui. Update them when a component's variants change.
- Sub-components (CardHeader, DialogContent, TableRow, FieldLabel, ...) are
  excluded from the component list via cfg.componentSrcMap nulls so the pane
  shows 10 cards instead of 41. They still ship in window.BBI (44 exports) and
  appear in their parent's preview and .prompt.md.
- lucide-react icons are bundled into the previews only; the DS bundle does not
  export icons.

## Known render warns
- `[RENDER_THIN] Dialog: rendered height is 0px` - benign. Base UI Dialog
  renders through a portal with fixed positioning, so the measured root is
  empty; the screenshot shows the open dialog correctly (cardMode single).
- `[FONT_REMOTE]` - by design, see Fonts above.
- `tokens: 1 missing, below threshold` - a Tailwind-internal variable, not a
  brand token.

## Re-sync risks
- cfg.dtsPropsFor is a hand copy of the source prop unions; it goes stale
  silently when variants are added or renamed in src/components/ui.
- cfg.overrides.Dialog.primaryStory names the "Confirm" export of
  .design-sync/previews/Dialog.tsx; renaming that export breaks the card.
- fonts.css depends on Google Fonts being reachable at render time.
- The Tailwind CLI in .ds-sync must match the repo's tailwindcss version; on a
  fresh clone rerun `(cd .ds-sync && npm i @tailwindcss/cli@<repo version>)`
  before buildCmd.
- Compiled CSS contains the utility classes the repo's source and the previews
  use PLUS the safelist in .design-sync/tailwind-entry.css (brand/semantic
  colors and common layout utilities via `@source inline`). A utility outside
  both sets has no style in designs; extend the safelist, keep it small
  (unbounded variant combos pushed the CSS from 137KB to 575KB once).
- 2026-09-11 upload: 56 files + sentinel + _ds_sync.json to project
  b7d8b4c0-4a18-44e7-89fe-7edc3fb43451 via the incremental path (single
  close-out push; no intermediate batches). Nothing to reconcile.
