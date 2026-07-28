# winna

**A personal hybrid marathon training app** — running + strength + recovery in one plan. winna generates a periodized training plan for your goal race and adapts it around how your body is actually responding (readiness, soreness, pain, training load), so you can chase an endurance goal *without* losing the strength work that keeps your physique.

It's **local-first and single-user**: no account, no backend, no cloud. All your data lives in an on-device SQLite database and never leaves your phone.

Built with **Expo (SDK 57) + React Native + TypeScript**.

---

## What winna does

### The problem it solves
Most run-training apps optimize purely for race times and treat lifting as an afterthought; most lifting apps ignore endurance. winna is built for the hybrid athlete who wants to **train for a race while maintaining strength and physique**, and whose main risk isn't lack of ambition — it's **injury and burnout**. So the plan is periodized like a real training block, but every hard decision is driven by recovery data, and nothing is ever forced on you.

### The four tabs

**Today** — your daily home.
- The session(s) scheduled for today, with a one-tap **Mark done & log**.
- A **1-tap check-in** for sleep, soreness and pain.
- **Dismissible flags** when something looks risky (see *Adaptive coaching* below).
- Race countdown, and optional short mobility suggestions.

**Plan** — your training calendar.
- A week-by-week view of runs, lifts and rest, colour-coded and labelled with the training phase (base → build → peak → taper).
- Tap any session to **edit it inline** (pace, distance, structure, exercises) — everything is an editable default, not a fixed prescription.
- **Reshuffle this week** to resolve conflicts (e.g. a long run next to a heavy leg day) around your fixed rest/race days.
- **Skipped-session handling** — when life happens, choose **Push** (move to your next free day), **Fold in** (add its work to your next matching session) or **Drop** (skip with no make-up). No silent gaps in the plan.

**Log** — your history and check-ins.
- Chronological list of everything you've done.
- **Manual logging** of runs and strength sessions (sets/reps/weight) — manual entry always wins over any future sync.
- Daily **readiness** entries and a persistent **injury history** so recurring niggles are easy to spot.

**Progress** — the dashboard.
- Weekly mileage vs. planned, strength volume, and readiness trend.
- **ACWR** (acute:chronic workload ratio) as a proactive injury-risk gauge.
- Milestones (longest run, fastest pace, logging streak), **shoe mileage** with wear alerts, and **physique tracking** (bodyweight over time) — because physique maintenance is the actual goal, not just running numbers.
- One-tap **JSON backup/export** so your history survives a phone switch.

### The plan engine
- **Periodization** — from your race date and distance, winna lays out base → build → peak → taper phases (taper length scales with distance) and distributes your chosen number of training days across run / lift / rest, keeping heavy leg days away from long runs and speed work.
- **Pace targets** — computed with the Riegel formula from your goal time, then turned into distance-appropriate workouts (easy, long, tempo, threshold, VO2max, race-pace) — each with a short **"why this workout"** rationale so the plan isn't a black box.
- **Heart-rate targets** — if you add your age, winna estimates HR-max (Tanaka) and attaches an HR zone to each run alongside the pace.
- **Strength that fits your gym** — pick **Full gym / Dumbbells / Bodyweight** per race; the default 2×/week hybrid split (lower/upper) changes accordingly, with loads scaled to your bodyweight.
- **Multiple races, chained** — plan several races and **chain** them so each block starts when the last finishes and carries your built-up fitness forward. The countdown and week view always follow your nearest upcoming race.

### Adaptive coaching (rule-based)
winna surfaces **dismissible nudges**, never blocking gates:
- Pain ≥ 3 logged for 2+ days in a row → suggests swapping the next hard session for rest/cross-training.
- A long run and a heavy leg day within 24h → flags the week for reshuffling.
- A training-load spike (ACWR > 1.5) → warns you're in a known injury-risk window.
- Periodic reminder to re-check your HR/pace zones as fitness changes.

### Tailoring (Profile)
Settings → **Profile** captures age, sex, height and bodyweight. Age drives your HR zones; bodyweight scales your default strength loads and seeds physique tracking. All optional — pace-based training works without any of it.

---

## Design principles (enforced throughout)

**No forced flows.** Every suggestion — a workout, a mobility block, a plan adjustment — is something you can accept, edit, dismiss or ignore. Logging and navigation are never gated behind a prompt. Manual entry always wins. Defaults are sensible and visible where they're used, not buried in settings.

---

## Run it

Primary target is your phone via **Expo Go** (a local iOS Simulator needs full Xcode, not just the Command Line Tools):

```bash
npm install
npx expo start
```

Then scan the QR code with Expo Go (iOS/Android).

Run in a browser for quick checks (SQLite works on web thanks to the COOP/COEP + wasm setup in `metro.config.js`):

```bash
npx expo start --web
```

Type-check the project:

```bash
npx tsc --noEmit
```

---

## Architecture

Clean layered structure — data flows `db → repositories → domain → services → screens`:

- `src/db` — SQLite client + versioned migrations (keyed on `PRAGMA user_version`).
- `src/models` — typed entities mirroring the schema.
- `src/repositories` — typed data access, one module per table.
- `src/domain` — pure logic: Riegel pace math, HR zones, plan generator, workout suggestions, adjustment rules, mobility, strength splits, units, dates, progress.
- `src/services` — orchestration (create/edit/chain races, reshuffle, skip handling).
- `src/providers` — `ActivityProvider` interface + Strava/Garmin adapters (scaffolded).
- `src/state` — theme (dark mode), settings/units, and a cross-platform feedback (toast + confirm) context.
- `src/navigation`, `src/screens`, `src/components` — per-tab nested stacks and UI.

The database uses **forward-only migrations from day one** (currently at v3) so the schema can evolve safely.

---

## Not wired yet (deferred by design)

- **Strava / Garmin sync** — adapters implement a shared `ActivityProvider` interface but need API credentials. To enable Strava: register an app, set `STRAVA_CLIENT_ID` in `src/providers/StravaProvider.ts`, and wire OAuth (`expo-auth-session`) + `fetchActivities`. No UI changes required.
- **Weather-aware notes** and **native calendar export** — stubbed.
- **LLM plan-adjustment explanations** — a later phase (send readiness + recent sessions to an API for a natural-language weekly adjustment).

---

## Privacy

Everything is stored locally in on-device SQLite. There is no server, no account, and no analytics — your training and health data stays on your device. The only way data leaves the phone is when *you* export a backup or share it.
