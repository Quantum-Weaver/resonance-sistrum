# 2026-09-02 · The studio built

*A Fable hand (`claude-fable-5-1`) dealt by Caesura 🎻, at KP's ⚛ word, verbatim, spelling kept: **"sistrum will now need a multi tract studio for mixing and layering recorded tracks."** He was asleep; the brief was `docs/THE-STUDIO-PLAN.md` whole, its §4 choices already made. Nothing committed, nothing signed, no `.env`, no base row, no build for the phone. `resonance-awen` read and depended on, never edited.*

## What was built, in the plan's order

1. **The encoder crossed.** `the-encoder` is a path crate beside the recorder (`src-tauri/Cargo.toml`). `src-tauri/src/studio.rs` holds `mixdown`: shelf-guarded names in (`take_path_guarded`, the recorder's own guard reused), a layer list (offset · volume · pan · fades), the body in `spawn_blocking`, one 44.1 kHz stereo 16-bit WAV out on the takes shelf. The pure heart, `bounce_to`, is free of tauri so it can be proven without a window.
2. **The session on disk.** `<name>.session.json` beside the takes — the marks' road (`read_session` · `write_session` · `list_sessions`, temp-and-rename). The document's shape and its reader are pure (`src/lib/studio.ts`: `newSession` · `parseSession` · `canonicalJson`); the store (`src/lib/stores/session.svelte.ts`) autosaves a breath after each edit.
3. **The room.** `src/routes/studio/+page.svelte`, a `Studio` door in the sidebar with its own icon. N lanes; each a `Waveform` (the component reused as-is, per instance) and a marks rail; gain · mute · solo · pan · offset in ms with ±10/±100 nudges; "Add a take from the shelf"; "Take out of session" (the take stays); "Mixdown to a take".
4. **Hearing the mix.** `src/lib/stores/mix.svelte.ts`: one `AudioContext`, one `AudioBufferSourceNode` per lane fed by `read_take_bytes` and `decodeAudioData`, gain and pan nodes per lane, a master gain. Offsets scheduled on the context clock by `scheduleLane` (three cases: not yet · inside · over). Play, pause, stop, scrub the whole mix; mute/solo/gain/pan land on the nodes live without rescheduling; only a moved offset or a newly decoded lane restarts the sources.
5. **Overdub.** The mix plays, the existing recorder session starts (one at a time, as now), and the lane's offset is `mixStore.position` at the moment `start_recording` returned. A capped overdub seals itself into a lane. The nudge is the latency answer, per §4.4.
6. **Mixdown as a take.** The bounce is registered in `takes` with a `studio` provenance (`kind: mixdown`, the session, its layers) and opened in the existing `TakePlayer` — marks sidecar, "Export a copy", the doors that already stand. A bounce never lands on an existing name: `mix.wav` → `mix-2.wav`.
7. **Trim.** "Cut to a new take" per lane through `trim_take` → `decode_window`. The cut joins the session as a new lane where the selection sat; the original lane and take are untouched.

## What held

- `npm run check` — **362 FILES 0 ERRORS 0 WARNINGS**.
- `npm run build` — **✓ built in 10.92s**, site written to `build`.
- `cargo check` (desktop, src-tauri) — **Finished `dev` profile in 18.09s**, exit 0, rodio 0.20 + symphonia 0.5.5 pulled clean.
- `.journals/proofs/session-round-trip.mjs` — 8/8 TRUE: written and read back canonical-identical; key order on disk irrelevant (serde_json sorts); out-of-range clamped; paths, foreign formats and id-less tracks refused.
- `.journals/proofs/offsets-to-schedule.mjs` — 16/16 TRUE: the three schedule cases and their edges, `mixLength`, `positionAt`, the solo/mute law.
- `.journals/proofs/mixdown-two-takes.mjs` — 8/8 TRUE: two synthetic WAVs generated in the proof (48 kHz mono 2.0 s · 44.1 kHz stereo 1.5 s) at offsets 0 and 1.0 s, bounced through `studio.rs::bounce_to` by its ignored test door — **110,250 frames = 2.5 s exactly** at 44.1 kHz stereo 16-bit, not silent, the second take audible past the first's end.
- `cargo test --lib free_name` — ok.

## What did not hold, or was not done

- **No aarch64 `cargo check`.** The plan's movement 1 named it; the dealing said desktop only and no `tauri android`. The encoder's README says "phones included" and it remains unproven here.
- **No sound reached an ear.** Movements 3, 5 and 6 end at his hands; every claim above is a gate or a proof, none is a listening. The Web Audio graph, the overdub through speakers, the S25 — all his.
- **The overdub stamp is honest about what it is:** the mix position when `start_recording` resolved (the stream open), not the first captured sample. The room says so and offers the nudge. The measured loop is still §4.4's later.
- **The held column now has a writer.** `takes.provenance` carries a `studio` key on bounces, trims and overdubs. `lib.rs`'s comment said nothing in the repo writes it; that sentence was made true again by telling it — the studio's note sits beside, never in place of, the signed hand and grant the column is held for. A recorded take still carries none. If KP wants the column left untouched until the credential exists, the three `provenance:` writes in `+page.svelte` are the whole of it.
- **A mark in the studio does not log a feeling.** `LaneMarks.svelte` is a smaller rail — pins, jump, pin-here — because the record room's `marksStore` holds one document and the studio shows N. The one-press-two-records coupling stays in the record room.
- **Memory is the encoder's shape and the graph's:** every lane decoded whole, in Rust for the bounce and in the window for the mix. The bounce remains the phone's fallback (§4.5); nothing here measured it.
- **The session document is rewritten in place** (temp-and-rename), not append-only like marks — it is the musician's own working state, and each write is their edit. Taking a lane out of a session never touches the take.

**Rides uncommitted:** everything above, the README's studio paragraph, RUN-LOG's two lines, STORY-BLOCK §WHEN's two entries, this journal. **Waits on KP:** his hands on the desktop room; his ears on the mix; the phone.
