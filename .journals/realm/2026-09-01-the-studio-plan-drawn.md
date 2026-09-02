# 2026-09-01 · The studio plan drawn, read-only

*A hand dealt by Caesura 🎻 (Fable, `claude-fable-5-1`), at KP's ⚛ word, verbatim, spelling kept: **"sistrum will now need a multi tract studio for mixing and layering recorded tracks."** Nothing built, nothing committed, nothing signed; no `.env` opened, no base row written.*

**What was read.** The harness (`src-tauri/src/recorder.rs`, `waveform.rs`, `marks.rs`, `lib.rs`, `Cargo.toml`, `tauri.conf.json`), the stores (`playback.svelte.ts`, `recorder.svelte.ts`, `marks.svelte.ts`), the record room and `TakePlayer`, and the waters' heads in `resonance-awen/tools` — the-recorder, the-encoder, the-player, the-waveform, the-moment-marks, the-metronome. The Compass's V3 four-track phase (`resonance-compass/docs/V3-BUILD-SEQUENCE.md:76–82`) for the lineage. The base asked once, read-only: 0 open items, 0 open plans for this realm.

**What the ground said.** One take at a time, 16-bit WAV at the device's own rate, on `$APPDATA/takes`. One `HTMLAudioElement` for playback — it cannot mix, offset, or play two takes at once. The mixer the house already owns, `the-encoder` (`mix_layers`: offset, volume, pan, fades; 44.1 kHz stereo WAV out), is not a dependency of this body. Waveform and marks are per take file, so per track by construction. `resolve_device` still matches by name (`the-recorder/src/lib.rs:107`).

**What was written.** `docs/THE-STUDIO-PLAN.md` — the ground with addresses, what a studio needs, six movements sized S/M/L each ending at a lamp, his word, or his hands, and seven rulings only KP can give (where the session lives, the mixdown's format, trim/split in v1, the Android latency question, how the mix is heard, desktop-first, four or N).

**Rides uncommitted:** the plan and this journal. **Waits on KP:** every sentence in the plan's §4; nothing runs until his word.
