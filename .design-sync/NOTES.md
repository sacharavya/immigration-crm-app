# design-sync notes

- 2026-09-11: First-time import attempted. User approved full high-fidelity
  sync. No Storybook exists anywhere for this repo (confirmed by user);
  shape = package.
- Design system lives in src/components/ui (shadcn on Base UI primitives)
  plus Tailwind v4 tokens in src/app/globals.css (--navy, --gold, stone
  palette). This is an app repo, not a packaged DS: no dist/, components
  are source TSX. Expect the package-shape converter to build from source.
- Blocked at DesignSync authorization: /design-login needs an interactive
  terminal (session was the VSCode extension). User to run /design-login
  in an interactive Claude Code session, then re-run /design-sync.
- No project created, no projectId pinned yet: target selection never
  settled, so next run correctly starts at project creation.
