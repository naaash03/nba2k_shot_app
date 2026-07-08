# GreenRep — Jumpshot Timing Trainer

A free, phone-first PWA that trains NBA 2K26-style jumpshot **button timing** — hold SHOOT,
release at your set point — tuned to _your_ build (jumpshot, attributes, cap breakers, badges,
difficulty) through per-device and per-build calibration.

> Fan-made training tool. Not affiliated with 2K, Take-Two, or the NBA.

**Live app:** https://naaash03.github.io/nba2k_shot_app/

**Source of truth:** [GreenRep-SPEC.md](./GreenRep-SPEC.md) — the full product & engineering
spec. Development proceeds strictly by its §17 phase plan.

## Status

- ✅ Phase 0 — app shell deployed via GitHub Pages
- ✅ Phase 1 — timing engine (`src/engine/`, pure TS, 100% test coverage)
- ✅ Phase 2 — practice loop (hold-release SHOOT, canvas meter, verdicts)
- ✅ Phase 3 — build manager + editor + share codes
- ✅ Phase 4 — calibration suite (latency wizard, timing methods A/B/C, trim)
- ✅ Phase 5 — stats (histogram, trend, bias suggestion)
- ✅ Phase 6 — court mode (zones, heat map, drills)
- ✅ Phase 7 — move timing (chips, per-move calibration, Mixtape)
- ✅ Phase 8 — polish (onboarding, settings, Ring meter, backup)
- ⏳ v1.0 tag — pending the ground-truth session (spec §15.4): green rates in-app vs in-game

## Development

```bash
npm install
npm run dev        # local dev server
npm run test       # engine unit tests (Vitest)
npm run coverage   # tests + coverage gate (engine ≥95% lines)
npm run typecheck  # tsc, strict
npm run lint       # oxlint
npm run build      # production build to dist/
```

## Deployment

Every push to `main` runs CI (typecheck, lint, tests + coverage, build) and deploys `dist/`
to **GitHub Pages** via `.github/workflows/ci.yml`.

If the very first deploy fails with a Pages error: repo **Settings → Pages → Source →
"GitHub Actions"**, then re-run the workflow. (The workflow tries to enable this
automatically.)

Moving to Cloudflare Pages later only requires changing `base` in `vite.config.ts` to `/`.

## Engineering invariants (spec §0)

1. Shot judgment is computed from **input event timestamps**, never render frames.
2. All animation is **delta-time based** — nothing assumes 60Hz.
3. **No 2K / NBA / Take-Two assets or trademarks** anywhere in the product.
