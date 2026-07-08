# GreenRep — 2K26 Jumpshot Timing Trainer

## Full Product & Engineering Specification — v1.0

**Working title:** "GreenRep" (placeholder — see §21 Legal & Branding before shipping a name)
**Platform:** Mobile-first web app (PWA), desktop-compatible
**Owner:** Adam
**Executor:** Claude Code (this document is the source of truth — build incrementally per §17)
**Cost constraint:** $0/month to build, host, and run

---

## §0. Read Me First (Instructions for Claude Code)

1. This spec is ordered so you can read §1–§4 for context, then build strictly by the phase plan in §17. **Do not build ahead of the current phase.**
2. The timing engine (§8) is the heart of the product. It must be written as **pure TypeScript functions with zero framework imports**, fully unit-tested before any UI consumes it.
3. Every "magic number" in this document that is marked `TUNABLE` must live in a single `src/engine/constants.ts` file so the owner can tune feel without touching logic.
4. **Engineering invariant #1:** Shot judgment is computed from **input event timestamps**, never from render frames. The meter is a visualization of a timeline; it is not the timeline. If the display drops to 30fps, judgments must remain millisecond-accurate.
5. **Engineering invariant #2:** All animation is delta-time based. Nothing may assume 60Hz. A 120Hz iPhone ProMotion display and a 60Hz Android phone must produce identical meter speeds.
6. **Engineering invariant #3:** No 2K, NBA, or Take-Two assets, logos, meter graphics, fonts, or trademarks anywhere in the product. We replicate _behavior and feel_, never _assets_. See §21.
7. When you reach UI phases, consult your `frontend-design` skill and follow the design brief in §11.
8. When in doubt about scope, cut scope. Live and correct beats complete and imaginary.

---

## §1. Product Overview

### 1.1 The one-liner

A free, phone-browser jumpshot timing trainer that reproduces the _timing behavior_ of the user's actual NBA 2K26 MyPLAYER — their jumpshot animation speed, their attributes, their cap breakers, their badges, their difficulty — so the muscle memory they build on their phone transfers directly to the sticks.

### 1.2 Why this exists

2K shooting is a rhythm-game skill. The green window for a given build is a fixed timing target measured in tens of milliseconds, and the only way to own it is repetition. But reps currently require a console, a TV, and a free evening. Meanwhile everyone's phone is in their pocket on the train, at lunch, between classes.

The key insight: **the shot button in 2K26 is a hold-and-release input.** You hold Square/X and release at the set point. A phone touchscreen can reproduce that exact input contract — press and hold a Shoot button, lift your thumb at the right moment. Same motor pattern, same timing target, different device.

### 1.3 Who it's for

- The user and their MyCAREER friend group (initial users, real builds, real feedback loop)
- Any 2K26 button-shooter who wants reps away from the console
- Later: rhythm shooters (via a touch-gesture tempo mode, §18)

### 1.4 Prior art / competitive landscape

NBA2KLab publishes per-jumpshot timing data and hosts a rhythm-shooting practice tool — but that tool requires pairing a **physical Bluetooth controller** to your phone, and it trains right-stick tempo, not button timing. There is no widely-used, build-aware, **tap-to-shoot** trainer that models attributes, cap breakers, badges, difficulty, court position, and move types. That's the gap this product fills. NBA2KLab's published data is also a candidate _reference source_ for users who subscribe to it (they enter their own numbers — we never scrape or redistribute paid data, see §21).

### 1.5 Non-goals (v1)

- Not a visual clone of 2K's meters or animations (legal + unnecessary)
- Not a game-outcome simulator (no defenders, no physics, no ball flight)
- Not an account system, not multiplayer, not a leaderboard (all future, §18)
- Not a native iOS app yet — but every architecture choice keeps the Capacitor door open (§18.1)

---

## §2. Goals & Success Criteria

| #   | Goal                       | Measurable success criterion                                                                                                                         |
| --- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Timing fidelity            | After calibration, a user who greens consistently in 2K26 practice mode greens ≥70% in-app at the same difficulty within 3 sessions                  |
| G2  | Zero cost                  | $0 hosting bill at 1,000 MAU; no paid services anywhere in the stack                                                                                 |
| G3  | Live fast                  | A deployed public URL exists at the end of Phase 0 (day one)                                                                                         |
| G4  | Phone-native feel          | Full one-thumb operation; interactive in <2s on 4G; installable to home screen                                                                       |
| G5  | Build-true configuration   | A user can express base + releases + blend + release speed + attributes + cap breakers + badges + difficulty and see each one change the timing math |
| G6  | Trust through transparency | Every rep shows signed millisecond error (e.g., "−23ms EARLY") so users can see themselves converge                                                  |

---

## §3. Domain Primer — How 2K26 Shooting Actually Works

This section is the _behavioral target_. Claude Code: treat this as domain documentation, not implementation. (Facts verified against 2K's Courtside Report, NBA 2KW's developer-sourced breakdown, and community testing as of the 2K26 season cycle. 2K patches shooting between seasons — see risk R6.)

### 3.1 The green window

Every jumpshot has an ideal release moment. Releasing inside a narrow window around that moment ("greening") makes the shot. In 2K26 the system is a **pure green window with no RNG**: shot timing profiles from 2K25 were _removed_, and **Green-or-Miss is universal** — on All-Star difficulty and above (and in competitive online modes), only green releases go in. On Pro difficulty and below, non-green "white" releases can still fall at reduced rates.

**Design consequence:** our config screen has a **Difficulty selector** (Rookie → HOF), not a timing-profile selector. Difficulty scales window size and toggles whether whites are possible.

### 3.2 What sizes the green window

Community-confirmed factors, all of which our model must represent:

1. **Shooting attribute** for the shot's zone (Three-Point Shot beyond the arc, Mid-Range Shot inside it, Close Shot near the rim, Free Throw at the line). Higher rating → larger window.
2. **The jumpshot animation itself.** Every base/release combo has its own speed and its own window character. This is why the app is _build-aware_ — a Haliburton-class quick release and a slow lefty fade are different timing targets separated by hundreds of milliseconds.
3. **Release speed setting** (the 25/50/75/100% slider in the jumpshot creator) — compresses or extends the animation.
4. **Shot difficulty/context** — moving shots, stepbacks, fadeaways, contests, and deep range all shrink the window.
5. **Fatigue** — tired players get smaller windows.
6. **Badges** — e.g., Limitless Range (deep-three penalty relief), Catch & Shoot, Green Machine (streak bonus), Deadeye (contest relief).
7. **Meter visibility** — turning the shot meter **off** grants a slightly **larger** green window. (We model this: §7 F8. It's also a natural training progression — learn with the meter, graduate to meter-off.)
8. **Difficulty / mode** — windows scale by difficulty; competitive modes are least forgiving.

### 3.3 Timing anchors: visual cues and the set point

Players time their release to a **visual cue** on their own animation (jump, set point, push, or release of the ball). The in-game "Shot Feedback" setting reports Early/Late/Excellent per shot — our per-rep signed-ms feedback (§7 F6) is the same idea with more precision.

### 3.4 Button shooting vs. rhythm shooting

- **Button shooting:** hold the shot button, release at the ideal moment. → _This is our v1 input contract (press-and-hold → lift)._
- **Rhythm shooting (Pro Stick):** a down-up flick where _push timing_ (when you start the upward flick) and _tempo_ (how long the down→up transition takes, with an ideal tempo band on the order of ~35–60ms) both matter, and stick motion actually drives the animation. → _Future mode via touch gestures (§18.2), explicitly out of scope for v1._

### 3.5 Cap breakers & attributes

MyCAREER attributes are capped by build; **cap breakers** raise individual caps earned through play. Functionally, for timing math, only the **effective current rating** matters. Our build editor therefore stores `baseRating` + `capBreakerBonus` and computes `effectiveRating` — represented explicitly so the config mirrors how users think about their build, even though the engine only consumes the sum.

### 3.6 A concrete timing example

Community tooling for a Haliburton-class release places the ideal release input around ~540–570ms after shot initiation. That gives us our order of magnitude: **full release times live in the ~400–900ms range, and green windows live in the ~20–90ms range** depending on rating, difficulty, and context. Our defaults (§8.4) are seeded to this scale and every one is `TUNABLE`.

---

## §4. Core Design Principle: Calibration Over Cloning

**The honest engineering truth:** 2K does not publish frame data. The internal timing tables for ~hundreds of base/release combinations are proprietary, community measurements are partial and season-dependent, and a phone touchscreen has different input latency than a console controller anyway. Any app that claims out-of-the-box, pixel-perfect, "exact" timing for every possible jumpshot is lying.

**So we do what rhythm games do.** Every serious rhythm game (osu!, Beat Saber, Guitar Hero) ships a latency calibration wizard and per-user offset because _no two device chains have the same lag_. We achieve "exact match" not by cloning 2K's data but by **converging on it per-user**:

1. **Layer 1 — Device latency offset (once per device).** A metronome tap test measures the user's touch-to-timestamp offset on _their_ phone. Stored per device. (§7 F7.1)
2. **Layer 2 — Build timing capture (once per build).** Three methods, any of which set the build's `idealReleaseMs`: direct entry of a known number, a video frame-counting worksheet, or a guided feel-matching convergence. (§7 F7.2)
3. **Layer 3 — Continuous validation.** Signed-ms feedback per rep + a "bias" stat (mean signed error) that surfaces systematic drift. A ±ms nudge control lets users trim timing anytime — like adjusting sights on a rifle. (§7 F6)

This reframe is the difference between a product that _claims_ accuracy and a product that _earns_ it. The user's own greens in 2K26 are the ground truth; the app converges toward that truth and proves it with data.

---

## §5. Personas & User Stories

**P1 — "The Build Owner" (Adam and friends).** Has a specific MyPLAYER (e.g., a 6'8" SF wired for shooting and perimeter D). Knows their base/releases/speed by heart. Wants: reps on the train, proof they're getting more consistent, bragging rights in the group chat.

**P2 — "The Casual Teammate."** Plays 2K but never opens the jumpshot creator menus. Wants: pick something close to their shot in 30 seconds and just tap.

**P3 — "The Lab Rat" (future).** Watches NBA2KLab, knows their release is 577ms, wants to enter that number directly and drill meter-off HOF reps.

### User stories (v1 scope)

- US-1: As a build owner, I create a build profile with my jumpshot config, attributes, cap breakers, badges, and difficulty, so the meter behaves like _my_ player.
- US-2: As any user, I press and hold SHOOT and release at the set point, and get instant green/early/late feedback with exact ms error.
- US-3: As a user on a new phone, I run a 60-second latency calibration so my device's touch lag doesn't poison my timing.
- US-4: As a build owner, I calibrate my build's release timing by feel-matching against my in-game jumper.
- US-5: As a user, I select a court spot and the app applies the right attribute (3PT vs mid vs close) and window penalty for that distance.
- US-6: As a user, I switch move type (catch & shoot → stepback → fadeaway) and the timing target changes accordingly.
- US-7: As a user, I see session and lifetime stats: green %, consistency (σ), bias, streaks, per-spot heat map.
- US-8: As a friend-group member, I import a build from a share code my friend texted me.
- US-9: As an iPhone user, I add the app to my home screen and it opens full-screen and works offline.

---

## §6. User Flows

### 6.1 First launch

```
Open URL
 → Welcome screen (one screen: what this is, "not affiliated with 2K" line)
 → "Create your player" (guided build setup, §7 F2 — skippable via
    "Just let me shoot" which loads the Default Build)
 → Latency calibration prompt (strongly encouraged, skippable, §7 F7.1)
 → Practice screen (the app's home)
```

### 6.2 Core loop (Practice screen)

```
[Build chip: "6'8 SF — 88 3PT"]   [Mode chips: Catch&Shoot | Spot: Top 3]
              ┌─────────────┐
              │    METER    │   ← canvas, fills upward while holding
              └─────────────┘
        ┌──────────────────────┐
        │        SHOOT         │  ← press & HOLD… release at set point
        └──────────────────────┘
 Release → verdict flash ("GREEN" / "−23ms EARLY") → streak/session counters tick
 → meter resets after 400ms → next rep. Zero taps between reps.
```

### 6.3 Build creation flow (F2)

```
Name & archetype → Jumpshot (base, upper 1 & 2, blend %, release speed %,
visual cue) → Attributes (Close/Mid/3PT/FT + per-attribute cap breaker bonus)
→ Badges (shooting badges + tiers) → Difficulty (Rookie…HOF) → Save
→ prompt: "Calibrate this build's timing now?" (F7.2)
```

### 6.4 Calibration flows — see §7 F7.

---

## §7. Functional Requirements by Module

### F1 — Build Manager

- F1.1 CRUD for player builds; unlimited builds; stored locally (persisted Zustand → localStorage).
- F1.2 Active-build selector on the practice screen (chip → bottom sheet).
- F1.3 Duplicate build ("save as") for A/B testing jumpshot tweaks.
- F1.4 Export build → **share code** (base64url of the build JSON, versioned) + Web Share API; Import via paste. No backend.
- F1.5 Full data export/import (all builds + stats) as a JSON file — the user's backup against browser storage eviction (risk R10).
- F1.6 Ships with one **Default Build** (sensible mid-tier: 80 3PT, 75 Mid, 550ms release, All-Star) so the app is usable in 5 seconds.

### F2 — Build Editor (the "user config part")

- F2.1 **Jumpshot config:** free-text base name + upper release 1 & 2 names (labels only — they matter to the _user's_ mental model; the engine consumes calibrated ms, not names); blend slider (0–100 between upper 1 and 2); **release speed** (25/50/75/100% quarter-stops); **visual cue** (Jump / Set Point / Push / Release).
- F2.2 **Attributes:** Close Shot, Mid-Range Shot, Three-Point Shot, Free Throw. Each 25–99, entered as `base` + `capBreaker` with the effective sum displayed prominently. (Interior/perimeter defense etc. deliberately absent — they don't touch the shot meter, per the owner's product definition.)
- F2.3 **Badges (v1 set, each with tier Bronze→Legend or Off):** Limitless Range, Deadeye, Set Shot Specialist, Catch & Shoot, Green Machine. Badge list is data-driven from `constants.ts` so seasons can add/remove badges without code changes. `TUNABLE`.
- F2.4 **Difficulty:** Rookie / Semi-Pro / Pro / All-Star / Superstar / HOF. All-Star+ = Green-or-Miss (mirrors 2K26). Default: All-Star.
- F2.5 **Simulated context toggles** (practice-screen quick settings, not per-build): contest level (Open / Light / Heavy / Smothered), fatigue slider (100%→60%), meter visibility (on/off — off grants the window bonus, F8.4).
- F2.6 Every input change shows a **live-updating "your green window: ~XXms" readout** so users see cause and effect. This is a signature UX moment — the app teaching you your own build.

### F3 — Practice Mode: Catch & Shoot (the MVP loop)

- F3.1 Press-and-hold SHOOT button ≥ 40% of screen width, bottom third, thumb-reachable. `pointerdown` starts the shot timeline; `pointerup` is the judged release.
- F3.2 Canvas meter renders the timeline (§8.6). Meter style selectable (§11.4).
- F3.3 Verdict overlay per rep: judgment tier + signed ms ("GREEN +4ms" / "SLIGHTLY LATE +31ms") + make/miss + running streak.
- F3.4 Auto-rearm ~400ms after verdict; a session is an uninterrupted flow of reps.
- F3.5 Holding past the timeline end (ideal + 300ms `TUNABLE`) = "VERY LATE" dead rep; `pointercancel`/leave = voided rep (not counted).
- F3.6 Optional audio cue mode: a "swish tick" at the ideal moment for ear training (Web Audio, scheduled lookahead; off by default; see R5).

### F4 — Move Timing Module

Different attack types have different animations and tighter windows. v1 models this as **per-move timing profiles** on top of the build's base timing:

| Move type                  | Timing basis                            | Window multiplier (`TUNABLE`) |
| -------------------------- | --------------------------------------- | ----------------------------- |
| Catch & Shoot (standstill) | build `idealReleaseMs`                  | 1.00                          |
| Standing off-dribble       | base × 1.0                              | 0.90                          |
| Moving pull-up             | own calibrated ms (default base × 1.05) | 0.75                          |
| Stepback                   | own calibrated ms (default base × 1.10) | 0.70                          |
| Fadeaway                   | own calibrated ms (default base × 1.20) | 0.65                          |
| Post fade                  | own calibrated ms (default base × 1.25) | 0.60                          |
| Free throw                 | own calibrated ms (default base × 0.95) | 1.30                          |

- F4.1 Move selector chips on the practice screen; switching moves swaps the timing target and shows the move name in the verdict.
- F4.2 Each move's `idealReleaseMs` is independently calibratable (F7.2 works per-move); until calibrated, defaults derive from the base jumper as above.
- F4.3 **Drill: "Mixtape"** — the app calls out a random move each rep (big label + optional voice via Web Speech synthesis); trains reacting to changing timing targets, which is the real in-game skill.
- F4.4 (v1.1) Pre-shot gesture inputs — e.g., swipe left = stepback, then hold-release — to add the motor "move into shot" chain.

### F5 — Court Mode ("where the user stands")

- F5.1 SVG half-court, portrait-oriented, with the classic 14 hot-zone regions (under basket; close L/C/R; mid L/LC/C/RC/R; 3PT corner L/R, wing L/R, top).
- F5.2 Tapping a zone sets the active spot. Spot determines: which attribute feeds the window math (Close/Mid/3PT), a distance modifier, and a **deep-range penalty** beyond ~27ft unless Limitless Range is equipped (`TUNABLE`).
- F5.3 Per-zone lifetime stats color the court as a **green-rate heat map** — the user's personal shot chart, in scouting-report style.
- F5.4 Drills: **Spot Session** (fixed spot), **Around the World** (corner→wing→top→wing→corner, advance on green), **Random Spot** (spot announced each rep).
- F5.5 Free-throw line is a tappable spot that routes to the FT move profile.

### F6 — Feedback & Stats

- F6.1 Per-rep log: `{ts, buildId, mode, moveType, zoneId, deltaMs, judgment, made, contest, fatigue, meterOn}`.
- F6.2 Session summary (on pause/exit): attempts, green %, make %, mean |Δ|, **bias** (mean signed Δ — "you release 12ms early on average"), σ (consistency score), best streak.
- F6.3 Lifetime dashboard: trend of green % across sessions (line), Δ distribution (histogram — users should watch their bell curve tighten), per-move and per-zone splits, court heat map.
- F6.4 The bias stat feeds a one-tap suggestion: "Your average release is −12ms early → nudge timing −10ms?" (applies a trim to the build's offset; user-confirmable, reversible).
- F6.5 Rep log capped at 10,000 entries with oldest-eviction; aggregates are incrementally maintained so stats never require replaying the log.

### F7 — Calibration Suite

**F7.1 Device latency calibration (per device, ~60s).**

- Visual metronome (pulsing ring) + optional audio tick at 100 BPM for 24 beats; user taps in rhythm; first 4 taps discarded; `deviceOffsetMs = median(tapTs − beatTs)`, shown with a jitter estimate.
- Stored per device; re-runnable from Settings; prompted again if the app detects it's running on a new device. Typical result: 30–90ms.
- Judged release = `rawPointerUpTs − shotStartTs − deviceOffsetMs`.

**F7.2 Build timing capture (per build, three methods).**

- **Method A — Direct entry:** type the release time in ms (for users who have community data or their own measurement). Power-user path, 10 seconds.
- **Method B — Video worksheet:** guided flow: record your MyPLAYER shooting in practice freestyle (console capture or phone slo-mo of the screen at 120/240fps), find the first frame of the gather and the frame of the green release flash, enter `fps`, `startFrame`, `releaseFrame` → app computes `ms = (releaseFrame − startFrame) × 1000 / fps`. Most accurate method; include a worked example with screenshots-as-illustrations (original art).
- **Method C — Feel matching (default, no homework):** guided convergence. The app proposes a candidate timing (default 550ms), user shoots 5 reps, then answers "felt FASTER / SLOWER / SAME as my jumper." Binary-search adjustment (±64 → ±32 → ±16 → ±8ms) converges in ~5 rounds. Ends with a 10-rep validation set and a confidence label.
- All methods end at the same place: `build.timing.idealReleaseMs` + `calibrationMeta {method, date, confidence}`.
- **F7.3 Trim control:** ±2ms nudge buttons in practice-screen settings, always available (the "rifle sights" adjustment).

### F8 — Settings

- F8.1 Meter style picker (§11.4); meter visibility toggle (off → window bonus ×1.12 `TUNABLE`, mirroring 2K26's meter-off buff — and framed in UI as the "graduation" training mode).
- F8.2 Sound on/off (default off), haptics on/off (Android `navigator.vibrate` only — **iOS Safari has no vibration API**; feature-detect and hide).
- F8.3 Left/right-hand layout mirror; reduced-motion compliance; colorblind-safe verdict mode (shapes + text never color-only).
- F8.4 Screen Wake Lock during sessions (`navigator.wakeLock`, supported iOS 16.4+; feature-detect).
- F8.5 Danger zone: reset stats, delete build, full export/import (F1.5).

### F9 — PWA Shell

- F9.1 `manifest.webmanifest` (name, icons 192/512/maskable, `display: standalone`, portrait orientation, theme color).
- F9.2 Service worker via `vite-plugin-pwa` (Workbox): precache app shell; app fully usable offline (it's client-only).
- F9.3 Update flow: on new deploy, in-app toast "Update available → Refresh" (registerType `prompt`; never silently swap mid-session).
- F9.4 iOS install nudge: detect Safari-not-installed and show a one-time "Add to Home Screen" instruction sheet (Share → Add to Home Screen). Installing also mitigates Safari's 7-day storage eviction (R10).

### F10 — Onboarding & Help

- F10.1 Three-card welcome explaining: (1) hold & release like the shot button, (2) calibrate once, (3) watch your bell curve tighten.
- F10.2 A "How the math works" page — the §3/§8 model in plain language. Transparency is a feature; 2K players are burned out on opaque mechanics.
- F10.3 Persistent footer line: "Fan-made training tool. Not affiliated with 2K, Take-Two, or the NBA."

---

## §8. The Timing Engine (Deep Specification)

Location: `src/engine/` — pure TypeScript, zero DOM/React imports, 100% unit-testable.

### 8.1 Shot state machine

```
IDLE ──pointerdown──▶ WINDUP ──pointerup──▶ JUDGED ──400ms──▶ IDLE
  ▲                     │
  │                     ├─ pointercancel/leave ──▶ VOID ──▶ IDLE
  │                     └─ t > idealMs + LATE_CUTOFF ──▶ JUDGED("VERY_LATE")
```

### 8.2 Core types (implemented in `engine/types.ts` — full data model in §9)

The engine's single entry point:

```ts
judgeShot(input: {
  holdDurationMs: number;        // rawUp − rawDown − deviceOffsetMs
  build: ResolvedBuildTiming;    // precomputed via resolveBuild()
  context: ShotContext;          // move, zone, contest, fatigue, meterOn
}): ShotVerdict
```

`resolveBuild()` collapses a `PlayerBuild` + context into `{ idealMs, greenWindowMs, whitesAllowed, tierBoundaries }` **once per config change**, so the hot path does no recomputation.

### 8.3 The judgment math

```
Δ = holdDurationMs − idealMs            // signed; negative = early
w = greenWindowMs                        // full width, from 8.4

|Δ| ≤ w/2                       → GREEN            (always a make)
w/2 < |Δ| ≤ w/2 + T1 (35ms)     → SLIGHTLY_EARLY / SLIGHTLY_LATE
w/2 + T1 < |Δ| ≤ w/2 + T2 (80)  → EARLY / LATE
beyond                          → VERY_EARLY / VERY_LATE     (always a miss)
```

`T1`, `T2` `TUNABLE`. Make resolution for non-green tiers: if `!whitesAllowed` (All-Star+) → miss, mirroring 2K26 Green-or-Miss. If whites allowed (Rookie/Semi-Pro/Pro), make probability = table in §10.2. RNG is used **only** for whites on low difficulty — greens are deterministic makes, exactly like 2K26's no-RNG design.

### 8.4 Green window formula

```
greenWindowMs = BASE_WINDOW
              × ratingFactor(effectiveRating)
              × difficultyFactor(difficulty)
              × moveFactor(moveType)
              × zoneFactor(zone, badges)        // incl. deep-3 penalty & Limitless relief
              × contestFactor(contest, badges)  // Deadeye relieves contest penalty
              × fatigueFactor(fatiguePct)
              × meterFactor(meterOn)            // off = ×1.12
              × badgeFlatBonus(badges)          // Green Machine streak logic, etc.
clamped to [MIN_WINDOW (10ms), MAX_WINDOW (140ms)]
```

Seed constants (`constants.ts`, ALL `TUNABLE` — grounded in the ~20–90ms community scale from §3.6):

```ts
BASE_WINDOW = 24;                                  // ms
ratingFactor(r)     = clamp(0.55 + 0.009 * r, 0.75, 1.45);
                       // 70-rated ≈ ×1.18, 99-rated ≈ ×1.44
difficultyFactor    = { Rookie: 2.2, SemiPro: 1.9, Pro: 1.6,
                        AllStar: 1.25, Superstar: 1.0, HOF: 0.8 };
whitesAllowed       = difficulty ∈ {Rookie, SemiPro, Pro};
contestFactor       = { Open: 1.0, Light: 0.8, Heavy: 0.55, Smothered: 0.35 };
fatigueFactor(f)    = 0.7 + 0.3 * f;               // f ∈ [0,1]
meterFactor         = meterOn ? 1.0 : 1.12;
LATE_CUTOFF         = 300;                          // ms past ideal → dead rep
```

Worked example — 88 3PT, All-Star, open catch-and-shoot, top of the key, meter on, fresh:
`24 × 1.342 × 1.25 × 1.0 × 1.0 × 1.0 × 1.0 ≈ 40ms window (±20ms)` — a realistic, learnable target that tightens to ~26ms on HOF. The F2.6 live readout surfaces exactly this number.

### 8.5 Timing resolution: release speed & visual cue

```
idealMs = calibratedBaseMs
        × releaseSpeedScale(pct)   // 100%: 1.00 · 75%: 1.06 · 50%: 1.13 · 25%: 1.21 (TUNABLE)
        + cueOffset(visualCue)     // Release: 0 · Push: −40 · SetPoint: −90 · Jump: −160 (TUNABLE)
        + userTrimMs               // F7.3 nudges
```

Calibration (F7.2) captures at the user's _actual_ settings, so scale/offset only apply when the user changes a setting post-calibration — the app then flags "settings changed since calibration → re-validate."

### 8.6 Meter rendering (view layer, `features/practice/Meter.tsx` + canvas)

- Single `<canvas>` sized via `devicePixelRatio`; one `requestAnimationFrame` loop alive only during WINDUP/JUDGED.
- Position = `f((now − shotStartTs) / (idealMs + LATE_CUTOFF))` — pure function of wall-clock time (**invariant #2**). `now` from `performance.now()`.
- The ideal point is a fixed marked "set point" on the meter; the green band is drawn to scale from `greenWindowMs` (so users literally _see_ their window grow when they raise an attribute — reinforces F2.6). Optional "band-blind" toggle hides the band width for advanced training.
- React state is **not** touched per frame; the loop reads a ref. Verdict updates state once per rep.
- On visibility change (`document.hidden`) mid-windup → void the rep.

### 8.7 Input pipeline

- Pointer Events only (`pointerdown/up/cancel`); track the primary `pointerId`, ignore extra touches.
- Timestamps: `event.timeStamp` (high-resolution, same clock as `performance.now()` in modern browsers); fall back to `performance.now()` at handler entry if a UA misbehaves (feature-check at startup).
- Shoot surface CSS: `touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;` plus `preventDefault()` on `touchstart` to kill scroll/zoom/long-press-menu. `overscroll-behavior: none` on the practice screen.
- Apply `deviceOffsetMs` (F7.1) at judgment, not at capture (raw values logged for future re-analysis).
- Startup self-check: measure rAF cadence for 1s; if ~30fps (iOS Low Power Mode), show a passive banner: "Low Power Mode detected — the meter may look choppy, but timing judgments are unaffected." (True because of invariant #1 — say so; it builds trust.)

### 8.8 Engine test matrix (Vitest — written in Phase 1, before any UI)

- Judgment boundaries: Δ exactly at ±w/2, ±(w/2+T1), ±(w/2+T2) — inclusive/exclusive edges pinned.
- Window formula: golden-value tests for ≥12 build/context combos (including the §8.4 worked example).
- Green-or-Miss: whites impossible at All-Star+; whites probability table honored below.
- Resolution math: release-speed scaling, cue offsets, trim; changed-settings flag.
- Determinism: same inputs → same verdict (RNG injected as a seedable dependency).
- Property test: window monotonically non-decreasing in rating; non-increasing in difficulty/contest.

---

## §9. Data Model (TypeScript, `engine/types.ts`)

```ts
type Difficulty = 'Rookie' | 'SemiPro' | 'Pro' | 'AllStar' | 'Superstar' | 'HOF'
type VisualCue = 'Jump' | 'SetPoint' | 'Push' | 'Release'
type MoveType =
  'CatchShoot' | 'Standing' | 'MovingPullup' | 'Stepback' | 'Fadeaway' | 'PostFade' | 'FreeThrow'
type Contest = 'Open' | 'Light' | 'Heavy' | 'Smothered'
type Judgment =
  'GREEN' | 'SLIGHTLY_EARLY' | 'SLIGHTLY_LATE' | 'EARLY' | 'LATE' | 'VERY_EARLY' | 'VERY_LATE'
type BadgeTier = 'Off' | 'Bronze' | 'Silver' | 'Gold' | 'HallOfFame' | 'Legend'

interface ShootingAttribute {
  base: number // 25–99, the build's cap-constrained value
  capBreaker: number // 0–10 bonus earned in MyCAREER
} // effective = min(99, base + capBreaker)

interface JumpshotConfig {
  baseName: string // label only, e.g. "Base 98"
  upperRelease1: string
  upperRelease2: string
  blendPct: number // 0–100 toward upperRelease2
  releaseSpeedPct: 25 | 50 | 75 | 100
  visualCue: VisualCue
}

interface BuildTiming {
  idealReleaseMs: number // calibrated, at the settings below
  calibratedAtSpeedPct: number
  calibratedAtCue: VisualCue
  userTrimMs: number // F7.3
  perMoveOverrides: Partial<Record<MoveType, number>> // F4.2
  calibration: {
    method: 'direct' | 'video' | 'feel' | 'default'
    date: string
    confidenceLabel: string
  }
}

interface PlayerBuild {
  id: string
  name: string
  heightLabel?: string
  position?: string
  schemaVersion: number // for share-code/data migrations
  gameVersionTag: string // e.g. "2K26-S5" — see risk R6
  jumpshot: JumpshotConfig
  attributes: {
    close: ShootingAttribute
    mid: ShootingAttribute
    three: ShootingAttribute
    freeThrow: ShootingAttribute
  }
  badges: Record<string, BadgeTier> // keys from constants.ts registry
  difficulty: Difficulty
  timing: BuildTiming
  createdAt: string
  updatedAt: string
}

interface ShotContext {
  moveType: MoveType
  zoneId: string | null // null = free shoot
  contest: Contest
  fatiguePct: number // 0.6–1.0
  meterOn: boolean
}

interface ShotVerdict {
  judgment: Judgment
  deltaMs: number // signed
  made: boolean
  greenWindowMs: number
  idealMs: number
}

interface RepRecord extends ShotVerdict {
  id: string
  ts: string
  buildId: string
  moveType: MoveType
  zoneId: string | null
  contest: Contest
  fatiguePct: number
  meterOn: boolean
  rawHoldMs: number
  deviceOffsetMsApplied: number // audit trail
}

interface DeviceProfile {
  deviceOffsetMs: number
  jitterMs: number
  calibratedAt: string
  uaHint: string
}
```

Storage layout (localStorage keys, all JSON, all schema-versioned):
`gr:builds`, `gr:activeBuildId`, `gr:device`, `gr:reps` (ring buffer, cap 10k),
`gr:aggregates` (incremental stats), `gr:settings`.
Share code = `GR1.` + base64url(deflate(JSON of PlayerBuild minus stats)).

---

## §10. Make-Probability Model

### 10.1 Philosophy

Greens are deterministic makes; on All-Star+ everything else misses (2K26 Green-or-Miss). Probability only exists for **whites on Rookie/Semi-Pro/Pro** — kept simple and transparent.

### 10.2 Whites table (`TUNABLE`)

P(make) for non-green tiers when whites are allowed:

| Tier                | Rookie | Semi-Pro | Pro  |
| ------------------- | ------ | -------- | ---- |
| SLIGHTLY early/late | 0.55   | 0.45     | 0.32 |
| EARLY / LATE        | 0.25   | 0.18     | 0.10 |
| VERY early/late     | 0      | 0        | 0    |

Modified by `× (0.6 + 0.4 × rating/99)` and `× contestWhiteFactor` {Open 1.0, Light 0.75, Heavy 0.4, Smothered 0.15}. Clamp to [0, 0.85].

### 10.3 Zone → attribute mapping (F5)

| Zone group                 | Attribute   | Window `zoneFactor`                 |
| -------------------------- | ----------- | ----------------------------------- |
| Under basket / close L-C-R | Close Shot  | 1.05                                |
| Mid L / LC / C / RC / R    | Mid-Range   | 1.00                                |
| 3PT corners / wings / top  | Three-Point | 0.95                                |
| Deep 3 (> ~27ft ring)      | Three-Point | 0.75, or 0.92 with Limitless ≥ Gold |
| Free-throw line            | Free Throw  | 1.30                                |

---

## §11. UI / UX Specification

### 11.1 Design brief (Claude Code: read your `frontend-design` skill before building UI)

- **Subject world:** late-night gym / broadcast scorebug / scouting report — not generic dark-mode SaaS. Draw vernacular from box scores, shot charts, and arena signage.
- **Signature element:** the meter itself. It is the brand. Spend the boldness there; keep everything else quiet and disciplined.
- **Palette:** near-black court tones, one high-signal green reserved _exclusively_ for greens/success (never decoration), one warm accent for streaks/heat. Verdicts are never color-only (shapes + text).
- **Type:** a condensed athletic display face for numbers/verdicts (jersey-number energy) + a clean UI body face. Big numerals — ms deltas are the star stat.
- **Avoid:** the templated AI looks called out in the frontend-design skill; 2K's trade dress (§21).

### 11.2 Layout principles

- One-thumb, portrait-first. SHOOT button in the bottom third, ≥88px tall. All session-critical info visible without scrolling on a 375×667 viewport.
- Practice screen is home. Everything else (builds, stats, court, settings) is one tap away via a compact bottom nav, and one tap back.
- Verdict feedback must be legible mid-motion: 250ms flash + persistent last-rep line.

### 11.3 States to design deliberately

Empty stats ("your bell curve appears after 10 reps"), uncalibrated build banner, settings-changed-since-calibration flag, Low Power Mode banner, offline badge, update-available toast.

### 11.4 Meter styles (all original designs)

v1 ships two: **Vertical Comet** (bottom-up fill, set-point notch, band to scale) and **Ring** (radial sweep). Style picker in Settings; both consume the same timeline function. More styles are pure view-layer additions later.

### 11.5 Accessibility floor

44px minimum targets outside the SHOOT button; visible focus; `prefers-reduced-motion` respected (verdict fades replace flashes); colorblind-safe by construction; screen-reader labels on config controls. The core hold-release interaction is inherently visual-motor; an audio-cue mode (F3.6) is the accessible alternative channel.

---

## §12. Tech Stack & Architecture

### 12.1 The stack (all free)

| Layer       | Choice                         | Why                                                                                                                                                               |
| ----------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Language    | TypeScript (strict)            | The engine math must be type-safe and testable                                                                                                                    |
| Build tool  | Vite 5                         | Instant dev server, tiny output, first-class PWA plugin                                                                                                           |
| UI          | React 18                       | Owner familiarity; huge ecosystem; fine perf when the meter bypasses React (8.6)                                                                                  |
| State       | Zustand + `persist` middleware | Tiny, no boilerplate, localStorage persistence built in                                                                                                           |
| Styling     | Tailwind CSS                   | Fast iteration, small purged output                                                                                                                               |
| Meter       | Canvas 2D + rAF                | Full control of per-frame drawing; no lib needed                                                                                                                  |
| Court       | Inline SVG                     | Crisp at any DPI, tappable regions, trivially styled                                                                                                              |
| Charts      | Recharts (stats screens only)  | Lazy-loaded route; never on the practice screen                                                                                                                   |
| PWA         | vite-plugin-pwa (Workbox)      | Offline + install + update prompt in ~20 lines                                                                                                                    |
| Tests       | Vitest (+ Playwright later)    | Engine coverage first; E2E smoke later                                                                                                                            |
| Lint/format | ESLint + Prettier              | Keep Claude Code output consistent                                                                                                                                |
| Repo/CI     | GitHub + GitHub Actions        | Free; PR checks: typecheck, lint, test, build                                                                                                                     |
| Hosting     | **Cloudflare Pages**           | Free tier with unmetered static bandwidth, global CDN, auto HTTPS, preview deploys per PR. (Vercel/Netlify are fine fallbacks; their free tiers meter bandwidth.) |
| Backend     | **None (v1)**                  | Client-only = $0 forever, offline-capable, zero ops. Supabase free tier earmarked for §18.3                                                                       |

### 12.2 Explicitly rejected

- **Native/Expo now:** Apple developer account costs $99/yr and violates the free constraint; PWA first, Capacitor later (§18.1).
- **Phaser/PixiJS:** a game engine for one meter is a payload tax on a timing-critical page.
- **Any backend in v1:** every feature above works client-side; a server adds cost, latency, and failure modes for nothing.
- **localStorage alternatives via browser storage APIs in artifacts-style sandboxes:** N/A here — this is a real deployed site; `localStorage` is correct and available.

### 12.3 Repository layout

```
/src
  /engine            # PURE TS: types.ts, constants.ts, window.ts,
                     #  judgment.ts, resolve.ts, whites.ts  (no imports from /src elsewhere)
  /store             # zustand slices: builds, device, session, settings, reps
  /features
    /practice        # PracticeScreen, Meter (canvas), ShootButton, VerdictOverlay
    /builds          # list, editor, share-code import/export
    /calibration     # latency wizard, timing methods A/B/C
    /court           # SVG court, zones, drills
    /stats           # dashboard, charts (lazy route)
    /onboarding
  /components        # shared primitives
  /lib               # time.ts (clock helpers), codec.ts (share codes), storage.ts
/tests               # engine unit tests mirror /src/engine
/public              # icons, manifest assets
```

Performance budget: initial JS ≤ 150KB gzipped (charts lazy-loaded); Lighthouse mobile perf ≥ 90; practice screen interactive < 2s on simulated 4G.

---

## §13. Non-Functional Requirements

- **NFR-1 Timing integrity:** judgment error introduced by the app itself (post-calibration) ≤ ±4ms. Verified by an automated harness that fires synthetic pointer events at known offsets.
- **NFR-2 Frame independence:** identical judgments at 30/60/120Hz (invariants #1–2; property-tested).
- **NFR-3 Offline:** all v1 features work with airplane mode on after first load.
- **NFR-4 Privacy:** no accounts, no analytics SDKs, no cookies, no tracking. All data on-device. Free means _free_, not ad-funded.
- **NFR-5 Compatibility:** iOS Safari 16.4+, Android Chrome 110+, desktop evergreen. Feature-detect wake lock, vibration, share API.
- **NFR-6 Durability:** full export/import (F1.5) protects against storage eviction (R10); share codes double as build backups.

---

## §14. Bottlenecks & Risk Register (read before building anything)

| ID  | Risk                                                                                                                                              | Sev | Mitigation                                                                                                                                                                                                                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | **No ground-truth timing data.** 2K's per-animation frame data is proprietary; "exact match" cannot be shipped in a box.                          | ★★★ | The entire §4 architecture: per-device latency offset + per-build capture + continuous bias feedback. Reframe the promise: _converges to_ exact, with data proving it.                                                            |
| R2  | **Touch input latency varies wildly per device** (touch scan rate, browser, screen). An uncalibrated app teaches wrong timing.                    | ★★★ | F7.1 mandatory-feeling onboarding step; per-device profile; jitter estimate shown; judgment uses event timestamps not frames.                                                                                                     |
| R3  | **Training the wrong timing is worse than not training.** If calibration is off by 40ms, the app actively harms the user's in-game shot.          | ★★★ | Validation set at the end of calibration; bias stat + one-tap trim (F6.4); "re-validate" flag whenever settings change; docs are honest about Method C being feel-based.                                                          |
| R4  | **Refresh-rate & throttling traps:** 120Hz ProMotion doubles frame-based speeds; iOS Low Power Mode halves rAF to ~30fps.                         | ★★☆ | Invariants #1–2; startup cadence self-check + banner (8.7); property tests at 30/60/120Hz.                                                                                                                                        |
| R5  | **Audio cue latency** on mobile browsers (esp. iOS) is tens of ms and inconsistent → audio can desync from the visual timeline.                   | ★★☆ | Audio OFF by default; Web Audio lookahead scheduling; separate audio-mode offset if the feature graduates; never judge based on audio.                                                                                            |
| R6  | **2K patches shooting mid-season.** Seasonal updates have historically shifted timing/contest behavior; muscle-memory targets can move under us.  | ★★☆ | `gameVersionTag` on every build; on-launch news note when the owner bumps the "current season" constant; recalibration is a 2-minute Method C run. This is a _feature_ opportunity: "Season 6 dropped — re-validate your jumper." |
| R7  | **IP/trademark exposure** (names, logos, meter trade dress, animation names, scraped databases).                                                  | ★★★ | §21 rules: original name/branding/meters; user-entered animation labels; no bundled proprietary datasets; persistent disclaimer.                                                                                                  |
| R8  | **Config-screen friction.** Hundreds of base/release combos make a full picker impossible to maintain and overwhelming to use.                    | ★★☆ | Labels are free text; the engine consumes calibrated ms (F2.1). No animation database needed for correctness — ever. Community presets are a later, optional layer (§18.3).                                                       |
| R9  | **Scope creep** (court mode + moves + rhythm + charts before the core loop is proven).                                                            | ★★☆ | Hard phase gates (§17); Phase 2 must be _fun and convincing_ before Phase 3 starts.                                                                                                                                               |
| R10 | **Safari storage eviction:** WebKit can wipe script-writable storage for sites unused for ~7 days (non-installed). Users could lose builds/stats. | ★★☆ | Push A2HS install (F9.4), one-tap full export (F1.5), share codes as implicit backups, and a gentle "back up your data" nudge after big sessions.                                                                                 |
| R11 | **The app is judged against feel, not specs.** If the meter stutters once, trust dies.                                                            | ★★☆ | Canvas isolation from React renders; perf budget in CI (Lighthouse); test on a mid-tier Android, not just an iPhone.                                                                                                              |
| R12 | **Free-tier ceilings.**                                                                                                                           | ★☆☆ | Static-only on Cloudflare Pages ≈ effectively unlimited for this scale; build minutes capped but generous; no server to outgrow.                                                                                                  |

---

## §15. Testing Strategy

1. **Engine unit tests first** (8.8) — merged before any UI exists; ≥95% line coverage on `/engine`; golden values pinned.
2. **Synthetic input harness:** Playwright fires pointerdown/up with controlled gaps; asserts verdict Δ within ±4ms across 200 reps (NFR-1) on Chromium + WebKit.
3. **Device matrix (manual, per release):** recent iPhone (120Hz, Safari, installed PWA), older iPhone (60Hz), mid-tier Android Chrome. Checklist: latency wizard result stability (±10ms across runs), no scroll/zoom leaks on the shoot surface, wake lock, offline reload, update toast.
4. **Ground-truth session (the real test):** owner + friends run their calibrated builds side-by-side with 2K26 practice mode and log in-game vs in-app green rates; G1 target (≥70% parity by session 3) is the release gate for v1.0.
5. **Regression:** every `constants.ts` tune ships with updated golden tests — feel changes must be deliberate, never accidental.

---

## §16. Deployment & Operations (all free)

### 16.1 One-time setup (Phase 0)

1. Create GitHub repo `greenrep` (private is fine; Pages works either way).
2. Scaffold: `npm create vite@latest greenrep -- --template react-ts`, add Tailwind, Zustand, vite-plugin-pwa, Vitest, ESLint/Prettier.
3. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → select repo. Build command `npm run build`, output dir `dist`, Node 20. (No environment variables exist in this project — a feature, not an omission.)
4. First push to `main` → live at `https://greenrep.pages.dev` with HTTPS (required for PWA/service worker/wake lock — comes free).
5. Add GitHub Actions workflow: on PR → typecheck, lint, `vitest run`, `vite build`. Cloudflare builds independently on push and creates **preview URLs per PR** for phone-testing branches.

### 16.2 Ongoing flow

`branch → PR → CI green + preview URL tested on a real phone → squash-merge → auto-deploy to production`. Service-worker update prompt (F9.3) rolls users forward safely. Rollback = redeploy previous commit from the Pages dashboard (one click).

### 16.3 Custom domain (optional, later)

The only possible cost in this project is a vanity domain (~$10/yr at cost through Cloudflare Registrar). `*.pages.dev` is free forever and fine for launch.

---

## §17. Incremental Build Plan (phase gates for Claude Code)

> Rule: a phase is DONE when its acceptance criteria pass **on a real phone via the deployed URL**, not just localhost. Do not start phase N+1 before phase N is done.

**Phase 0 — Skeleton on the internet (½ day)**
Scaffold per 16.1; app shell renders "GreenRep" + disclaimer; CI green; live `pages.dev` URL.
✅ _Done when the owner opens the URL on their phone._

**Phase 1 — Engine core (no UI) (1 day)**
`/engine` complete per §8.2–8.5 + §10; `constants.ts` with every `TUNABLE`; full test matrix 8.8 passing in CI.
✅ _Done when coverage ≥95% and golden tests pin the worked example (§8.4)._

**Phase 2 — The loop (2–3 days)**
Practice screen: hold-release ShootButton, Vertical Comet canvas meter, verdict overlay with signed ms, streak counter, Default Build hardcoded, input pipeline 8.7 complete.
✅ _Done when a 50-rep session on a phone feels responsive, nothing scrolls/zooms, and greens are hittable — the "is this fun?" gate._

**Phase 3 — Builds (2 days)**
Build Manager + Editor (F1, F2) incl. attributes/cap breakers/badges/difficulty, live window readout (F2.6), persistence, share codes.
✅ _Done when a friend imports the owner's build from a texted code and sees identical window numbers._

**Phase 4 — Calibration (2–3 days)**
Latency wizard (F7.1), timing Methods A/B/C (F7.2), trim (F7.3), device profile, changed-settings flag.
✅ _Done when two different phones converge to green rates within ~10% of each other on the same build._

**Phase 5 — Stats (2 days)**
Rep log, session summary, dashboard with trend + Δ histogram + bias suggestion (F6). Charts lazy-loaded.
✅ _Done when the histogram visibly tightens across a user's real sessions._

**Phase 6 — Court mode (2 days)**
SVG court, zones, zone→attribute mapping, deep-3/Limitless rule, heat map, three drills (F5).
✅ _Done when Around the World is playable and the heat map populates._

**Phase 7 — Move timing (2 days)**
Move chips, per-move overrides + calibration, Mixtape drill (F4).
✅ _Done when a fadeaway and a catch-and-shoot are distinguishable timing targets calibrated from real play._

**Phase 8 — Ship polish (2 days)**
PWA install flow + offline + update toast (F9), onboarding (F10), settings incl. meter styles + meter-off mode (F8), Ring meter, a11y pass, Lighthouse ≥90, export/import.
✅ _Done when the G1 ground-truth session (§15.4) passes → tag v1.0._

**Phase 9+ — see §18.**

Total honest estimate: ~2–3 weeks of part-time evenings with Claude Code doing the heavy lifting.

---

## §18. Future Roadmap (explicitly out of v1 scope)

### 18.1 Path to iOS

PWA → **Capacitor** wrapper (the web app ships unchanged inside a native shell; add haptics via the Capacitor Haptics plugin, which _does_ work on iOS unlike the web vibration API). The only new costs are Apple's $99/yr developer fee and review compliance — re-check §21 branding before submission. Architecture requirement satisfied today: no server dependencies, all storage local, responsive layout.

### 18.2 Rhythm-shooting touch mode

2K26's stick mechanic (down-up flick; push timing + ~35–60ms tempo band) maps naturally to touch: **swipe-down-hold, then flick up** — measure push timing against the build timeline and tempo as the down→up transition duration. This would leapfrog controller-tethered practice tools. Requires its own calibration and gesture-recognition tuning; do not attempt before v1.0 ships.

### 18.3 Community layer (Supabase free tier)

Opt-in shared preset library of build timings tagged by `gameVersionTag` ("87 people calibrated this base at 552±9ms in S6"), friend-group leaderboards, challenge links. Adds auth + moderation surface — a deliberate, separate decision.

### 18.4 More

Fatigue simulation drills, "cold start" mode (first rep of a session tracked separately — the real clutch stat), Apple Watch haptic metronome, per-friend rivalry cards for the group chat.

---

## §19. Open Decisions for the Product Owner

1. **Name & vibe** — "GreenRep" is a placeholder. Pick something original (see §21; avoid 2K badge names like "Green Machine").
2. Default difficulty for new builds: All-Star (recommended, mirrors online norms) or user's actual mode?
3. Badges in v1 (F2.3 five-badge set) or push all badges to v1.1 and ship attributes-only faster?
4. Court mode: per-spot calibration offsets, or global timing + window penalties only (recommended v1)?
5. Meter default: Vertical Comet or Ring?
6. Public repo (portfolio value — this is a strong résumé project for a data-science grad) vs private?

## §20. Glossary

**Green / greening** — perfect-timing release; guaranteed make in 2K26. **Green window** — the ms span that counts as perfect. **Whites** — non-green makes, possible only on lower difficulties in 2K26. **Base / upper release** — components of a custom jumpshot animation. **Blending** — mixing two upper releases. **Release speed** — creator slider (25–100%) compressing the animation. **Visual cue** — the animation moment a player times against (jump/set point/push/release). **Set point** — top of the shooting pocket. **Cap breaker** — MyCAREER reward raising an attribute cap. **Green-or-Miss** — 2K26 rule: non-green shots miss (All-Star+). **HOF** — Hall of Fame difficulty. **Meter-off bonus** — 2K26 grants a slightly larger window with the shot meter hidden. **A2HS** — Add to Home Screen. **Bias** — mean signed timing error (systematic early/late).

## §21. Legal & Branding Constraints (hard rules)

1. Original name, logo, icons, meter designs, court art, and copy. No "NBA," "2K," "NBA 2K26," or team/player marks in the product name, domain, or app icon. Referring to the game factually in descriptive text ("a training companion for NBA 2K26-style timing") is acceptable; branding with it is not.
2. No assets from the game: no screenshots in the shipped UI, no ripped meter graphics, fonts, sounds, or animation footage.
3. No bundled proprietary datasets (e.g., NBA2KLab's paid timing tables). Users may enter numbers they have rights to access; the app may later host _community-contributed_ measurements under an explicit license (§18.3).
4. Persistent disclaimer (F10.3) on the landing/settings screens.
5. Player-name animation labels (e.g., a base named after a real player in-game) are user-entered free text, never shipped defaults.
6. If/when the App Store path opens (§18.1), re-review all of the above against Apple's guidelines on third-party IP.

---

## Appendix A — Seed data: Default Build

```json
{
  "name": "Default — Wing Shooter",
  "heightLabel": "6'8\"",
  "position": "SF",
  "schemaVersion": 1,
  "gameVersionTag": "2K26-S5",
  "jumpshot": {
    "baseName": "(enter yours)",
    "upperRelease1": "(enter yours)",
    "upperRelease2": "(enter yours)",
    "blendPct": 50,
    "releaseSpeedPct": 100,
    "visualCue": "SetPoint"
  },
  "attributes": {
    "close": { "base": 70, "capBreaker": 0 },
    "mid": { "base": 82, "capBreaker": 0 },
    "three": { "base": 88, "capBreaker": 0 },
    "freeThrow": { "base": 78, "capBreaker": 0 }
  },
  "badges": {
    "Deadeye": "Silver",
    "CatchAndShoot": "Gold",
    "LimitlessRange": "Off",
    "SetShotSpecialist": "Bronze",
    "GreenMachine": "Off"
  },
  "difficulty": "AllStar",
  "timing": {
    "idealReleaseMs": 550,
    "calibratedAtSpeedPct": 100,
    "calibratedAtCue": "SetPoint",
    "userTrimMs": 0,
    "perMoveOverrides": {},
    "calibration": { "method": "default", "date": "", "confidenceLabel": "uncalibrated" }
  }
}
```

## Appendix B — First prompts to run in Claude Code

1. "Read GreenRep-SPEC.md fully. Summarize the phase plan and confirm the three engineering invariants back to me. Then execute Phase 0."
2. After Phase 0 verification: "Execute Phase 1. Engine only, no UI. Show me the golden test for the §8.4 worked example before writing the rest."
3. Thereafter, one phase per session, always ending with the phase's ✅ criteria checked on the deployed preview URL.

_— End of specification —_
