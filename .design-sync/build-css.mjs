// Compiles the app's Tailwind v4 stylesheet (src/app/globals.css) into one
// static CSS file for design-sync. Tailwind scans the repo from cwd, so the
// authored previews in .design-sync/previews/ contribute their classes too.
// Run from the repo root: node .design-sync/build-css.mjs
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

mkdirSync(".design-sync/.cache", { recursive: true });
execFileSync(".ds-sync/node_modules/.bin/tailwindcss",
  ["-i", ".design-sync/tailwind-entry.css", "-o", ".design-sync/.cache/tailwind.css"],
  { stdio: "inherit" });
writeFileSync(".design-sync/.cache/ds.css",
  readFileSync(".design-sync/fonts.css", "utf8") + "\n" +
  readFileSync(".design-sync/.cache/tailwind.css", "utf8"));
console.error("wrote .design-sync/.cache/ds.css");
