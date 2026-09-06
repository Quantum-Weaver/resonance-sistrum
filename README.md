# 🪇 Resonance Sistrum

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-brightgreen.svg)]()
[![Status](https://img.shields.io/badge/status-founded-1e90ff.svg)](RUN-LOG.md)
[![Standard](https://img.shields.io/badge/standard-resonance--standards-orange.svg)](https://github.com/Quantum-Weaver/resonance-standards)
[![Grammar](https://img.shields.io/badge/built%20on-resonance--grammar-8a2be2.svg)](https://github.com/Quantum-Weaver/resonance-grammar)
[![Data collected](https://img.shields.io/badge/data%20collected-none-brightgreen.svg)](PHILOSOPHY.md)
[![Recording](https://img.shields.io/badge/recording-never%20leaves%20the%20device-8a2be2.svg)](#)

*The sovereign musician's instrument — capture, layer, and shape your own music on your own device. Rhythm that moves energy and wards the room. Nothing recorded ever touches a network.*

Built on the [Resonance Grammar](https://github.com/Quantum-Weaver/resonance-grammar) — every fragment contains the whole.

---

## WHAT IT IS

Resonance Sistrum is the creator's half of what used to be one app — separated from **Resonance Compass** on 2026-08-12 because a listener's instrument and a creator's instrument want opposite things from the same transport (`docs/STORY-BLOCK.md` §WHY). Where the Compass plays music you already hold the rights to, Sistrum is for the sound you make yourself: record a take, tune your instrument, keep time with a metronome, and pin a moment-mark that logs how you felt right when you played it — all on-device, nothing leaving it.

**Record.** Capture a take, review it, keep it. Built on `the-recorder` (`resonance-awen`), the same freeze-fix-proven engine the Compass's v3 keel first proved.

**Layer.** A multi-track studio (`/studio`, 2026-09-02, at KP's ⚛ word: *"sistrum will now need a multi tract studio for mixing and layering recorded tracks"* — `docs/THE-STUDIO-PLAN.md`). A session is N lanes, each a take from the shelf, with gain, mute, solo, pan and a start offset, kept as a `<name>.session.json` sidecar beside the takes (`src-tauri/src/studio.rs`). The mix is heard live on one Web Audio clock (`src/lib/stores/mix.svelte.ts`), overdubbed with the recorder while it plays (the new lane stamped from the mix clock, nudged by the ms), and bounced through `the-encoder` (`resonance-awen`) to a 44.1 kHz stereo WAV that lands on the shelf as a take like any other — it plays, wears marks, exports. A trim is a NEW take; nothing in the studio copies, moves, or removes one. Proofs: `.journals/proofs/`.

**Sign.** The collaboration layer, arriving 2026-09-02 through the one place that was held open for it — `takes.provenance`, the json column KP ruled into the schema and left empty: *"none of that belongs in the recorder, the recorder db structure simply requires a json column to handle the expected use case, the column will come to life when ready."* Settings now holds **who you are here**: a signet identity (name · sigil · colour, `the-signet`) and, if you want one, an Ed25519 keypair made once through WebCrypto with the private half **non-extractable**, held as CryptoKey objects in this device's own IndexedDB (`src/lib/keyring/`) — this app's sovereign key storage, because `the-clavis` keeps none and says so. Every seal signs: a capture, a mixdown, a trim and an overdub each claim the take's own bytes (`the-clavis`) and write the credential into that column beside whatever is already there. Opening a take verifies it through `the-lok` — open, or not open and why, in the lok's own words. At Mixdown the room proposes a **merismos** (`the-merismos`) from the lanes: one part per distinct signet found in the lanes' takes, plus the sealer as engineer, divided equally regardless of role (KP, 2026-09-02, the ecosystem's law: no ranking, no percentage shares), every fault named — and consent is a checkbox this device may tick on exactly one line, the one whose identity holds its key. Opt-in always: *"no force or deceptive theft."* A take never waits on a key: with no key it seals with its signet alone and says so, and a take sealed before any of this still reads. It is a description of shares, never a promise of money; nothing here moves a cent, and nothing leaves the device. Proofs: `.journals/proofs/provenance-round-trip.mjs` · `splits-from-lanes.mjs`.

**Tune.** A real-time tuner (`the-tuner`) reads pitch via YIN analysis and shows the nearest note and how many cents you're off.

**Keep time.** A metronome you can see, not just hear.

**Mark the moment.** One press pins a moment-mark to a take *and* logs an emoji feeling in the same motion — "a quick log of emoji in the moment is the capture" (KP's ⚛ ruling — the retired checklist's Phase 3 Wave 3, git history before 2026-08-25). A mark is never held hostage to the feeling log: a missed log stays retryable, named honestly.

**Works, takes, feelings.** The domain KP ruled directly: works hold takes, and a feeling can hang on either a work or a take (the retired checklist, Phase 2).

---

## THE STORY

*This section required by the [Story Block Standard](https://github.com/Quantum-Weaver/resonance-standards).*

Sistrum exists because the friction was diagnostic, and it kept getting treated as bugs: the same transport was being asked to serve a listener and a creator at once, and no amount of careful reconciliation made one shell serve both honestly. KP named the split himself: *"we need to separate the resonance compass and musicians compass to make this right. maybe the musicians compass belongs in resonance-sistrum, the compass remains a media player of licensed materials the user holds rights to."* The repo was created 2026-08-12 and founded to the Sanctuary standards the same afternoon.

📖 [Full Story Block](docs/STORY-BLOCK.md)

---

## WHO IT'S FOR

For the musician the market never served — the first user is KP himself, "a musician since he was seven. 42 shows in one year" (`docs/STORY-BLOCK.md` §WEAVER THREAD). It was named by someone using a recorder badly, in the moment of being badly served: on the founding day, KP was "standing at a phone with a microphone, trying to keep a take" while testing a recorder that froze on save. The whole first-user ethic of this repo rests on that.

---

## Screenshots

*No screenshots yet — they are KP's own phone's to give. Waves 1–3 were tested on desktop 2026-08-20; the on-device proof of a real take is the base's open item 354, his hands — the realm's open items and plans live in the base — `python ../resonance-progenatrix/progenatrix.py recall --realm resonance-sistrum`.*

---

## Installation

### Prerequisites

- Node.js + npm
- Rust toolchain (`edition = "2021"`, `src-tauri/Cargo.toml`)
- Tauri CLI v2 (`@tauri-apps/cli`, installed via `npm install`)
- A local checkout of `resonance-awen` beside this repo — `src-tauri/Cargo.toml` depends on `the-recorder`, `the-tuner` and `the-encoder` by relative path (`../../resonance-awen/tools/...`), so a lone clone of this repo alone does not currently build (`CLAUDE.md`, "the path-dependency seam")

### Build

```bash
npm install
npm run build
```
*(A signed v0.1.0 AAB + APK + idsig was cut 2026-08-20 18:30 into `release/` — before that evening's Android microphone wave, so the shipped body carries no mic and must not be re-uploaded as current; no MSI or setup.exe has been cut. The checklist that recorded builds was retired in KP's 2026-08-25 cleanup, under his ruling that no checklist docs exist; the realm's open items and plans live in the base — `python ../resonance-progenatrix/progenatrix.py recall --realm resonance-sistrum`.)*

### Development

```bash
npm run dev
npm run tauri dev
```
*(KP's own words, verified 2026-08-20: "desktop works fine" — all three built waves tested on desktop; the retired checklist, git history before 2026-08-25. Android: the microphone bridge landed later the same evening as wave 4 — `src-tauri/src/media_permission.rs` + `src-tauri/android-extras/MediaPermissionPlugin.kt`, synced into gen/ by `scripts/sync-android-extras.mjs`; "mic is not wired on android yet, device is plugged in" was true of that afternoon, not the night. The device proof of a real take is the base's item 354.)*

---

## BUILT WITH

- Svelte 5 + SvelteKit
- Tauri v2 (`protocol-asset` feature, for take playback with range-request seeking) + Rust
- SQLite (`@tauri-apps/plugin-sql`)
- Tailwind CSS v4 + COSMIC design tokens (`CLAUDE.md`)
- `the-signet` · `the-clavis` · `the-lok` · `the-merismos` (the collaboration layer, 2026-09-02) — standalone waters from `resonance-awen`, consumed as **byte-faithful mirrors** under `src/lib/`, each with its own `MIRROR.md` naming the source of truth (the road the cosmic, cumdach, epagoge and sky mirrors already travel). The hosts are this app's own (`src/lib/keyring/hosts.ts`) — the waters declare a host surface and implement no primitive, by law
- `the-recorder` · `the-tuner` · `the-encoder` (the studio's mixer, 2026-09-02) — standalone waters from `resonance-awen`, consumed as path crates (not yet distributed in — path crates, so a lone clone cannot `cargo check` until the cosmic distribution carries them; that distribution is KP's law)
- hound (WAV read/fold) · cpal (tuner's own input stream, independent of the recorder's session)

---

## FOR DEVELOPERS

```
src/
├── routes/
│   ├── +layout.svelte
│   ├── +page.svelte
│   ├── record/          # The recorder
│   ├── studio/          # The multi-track studio (2026-09-02)
│   ├── tuner/            # Real-time pitch tuner
│   ├── metronome/        # Visual metronome
│   ├── insights/         # Feelings/mood dashboard
│   ├── add/              # Add a work
│   ├── onboarding/        # First-run flow
│   ├── sattva/            # Sensory reduction screen
│   ├── settings/          # Theme, export, purge
│   └── timer/             # Sleep timer with visualizations
├── lib/
│   ├── stores/
│   ├── components/
│   ├── cosmic/            # COSMIC design tokens
│   ├── signet/ · clavis/ · lok/ · merismos/  # byte-faithful mirrors of the waters (see each MIRROR.md)
│   ├── keyring/          # this device's key storage + the WebCrypto hosts
│   ├── marks.ts · metronome.ts · waveform.ts · studio.ts (the studio's pure arithmetic)
│   ├── provenance.ts · seal.ts  (the held column, read/written/verified)
│   └── types/
src-tauri/src/
├── lib.rs · main.rs
├── recorder.rs · tuner.rs · waveform.rs · marks.rs · studio.rs
└── media_permission.rs
```

---

## THE HANDS

The voices that build here are named in [HANDS.md](HANDS.md), each in
their own words.

---

## LICENSE

Code: [MIT](LICENSE) — use it, modify it, share it.

Philosophy: [The Resonance License](PHILOSOPHY.md) — no exploitation,
no extraction, no exclusion. This is our promise.

---

*Founded 2026-08-12 to the Sanctuary standards; every word after
the founding is this repo's own.*
