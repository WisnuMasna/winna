# winna

A personal, **local-first** hybrid marathon training app — running + strength + recovery — that generates and adapts a periodized plan driven by readiness/pain tracking. Single-user, no backend, all data in on-device SQLite.

Built with Expo (SDK 57) + React Native + TypeScript.

## Run it

Primary target is your phone via **Expo Go** (a local iOS Simulator needs full Xcode, not just Command Line Tools):

```bash
npm install
npx expo start
```

Scan the QR with Expo Go (iOS/Android).

Run in a browser (handy for quick checks — SQLite works on web via the COOP/COEP + wasm setup in `metro.config.js`):

```bash
npx expo start --web
```

Type-check:

```bash
npx tsc --noEmit
```

## What's here (this build)

- **Today** — today's sessions, 1-tap readiness check-in, dismissible adjustment flags, race countdown, optional mobility.
- **Plan** — week/calendar view, phase indicator, inline editing, "Reshuffle this week", skipped-session handling (push/fold/drop, each explained), Race & Plan setup.
- **Races** (Plan → Races) — add multiple races; **chain** one after another so each block starts when the last finishes and carries fitness forward. Per-race **equipment** choice: full gym / dumbbells / bodyweight.
- **Log** — chronological history, manual session + strength logging, readiness, injury history.
- **Progress** — weekly mileage vs plan, strength volume, ACWR training-load, milestones, shoe mileage, physique tracking, backup export.
- **Profile** (Settings → Profile) — age, sex, height, bodyweight. Age drives estimated HR-max (Tanaka) → HR zones shown on run sessions; bodyweight scales the default strength loads. All optional; regenerate the plan to apply changes to existing sessions.

### Architecture

- `src/db` — SQLite client + versioned migrations (keyed on `PRAGMA user_version`).
- `src/models` — typed entities mirroring the schema.
- `src/repositories` — typed data access per table.
- `src/domain` — pace math (Riegel), plan generator, workout suggestions, adjustment rules, mobility, units, dates, progress.
- `src/providers` — `ActivityProvider` interface + Strava/Garmin adapters (scaffolded).
- `src/screens`, `src/components`, `src/state`, `src/navigation` — UI.

## Not wired yet (deferred by design)

- **Strava / Garmin sync** — adapters implement a shared interface but need API credentials. To enable Strava: register an app, set `STRAVA_CLIENT_ID` in `src/providers/StravaProvider.ts`, and wire OAuth (expo-auth-session) + `fetchActivities`. No UI changes required.
- **Weather-aware notes** and **native calendar export** — stubbed.
- **LLM plan-adjustment explanations** — later phase.

## UX principles (enforced throughout)

No forced flows. Every suggestion is editable or dismissible; logging/navigation is never gated on a prompt; manual entry always wins; defaults are sensible and visible where they're used.
