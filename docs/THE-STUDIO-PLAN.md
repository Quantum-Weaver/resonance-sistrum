# THE STUDIO — a multi-track room for resonance-sistrum, as the ground stands 2026-09-01

*Drawn 2026-09-01 by a hand dealt by Caesura 🎻 (Fable, `claude-fable-5-1`), at KP's ⚛ word,
verbatim, spelling kept: **"sistrum will now need a multi tract studio for mixing and layering
recorded tracks."** A read-only survey of this body and its waters in `resonance-awen`; nothing
built, nothing committed, nothing signed. **A PLAN — nothing below runs until his word.** Its
header is never a state source: every state named here carries the address it was read from —
a file and line, a RUN-LOG line, a base recall. Everything rides uncommitted for his ⚛ sync word.*

---

## If you read only this

The body records one take at a time and plays one take at a time, and it cannot mix. The mixer
already exists in the house — `the-encoder` — and this body does not depend on it yet. A studio
is six movements; three end at his hands, and the seven sentences in §4 are his before the first runs.

## 1 · The ground as it stands

**A take.** One at a time: `RecorderState.session` is a single `Option` (`src-tauri/src/recorder.rs:40`);
a second start is refused — "already recording — stop or discard the running take first"
(`recorder.rs:169, 217`). Sealed as 16-bit PCM WAV at the device's own rate and channels
(`resonance-awen/tools/the-recorder/src/lib.rs`, `seal_wav`; `start_session` reads
`default_input_config`, lib.rs:276–300); the samples sit in RAM as `Vec<i16>` until the seal
(lib.rs:261–263). Files land at `$APPDATA/takes/<name>.wav` (`takes_dir`, recorder.rs:120–128; the
save path, :356), the one shelf the asset protocol serves (`src-tauri/tauri.conf.json:24–27`). Pause,
resume, a cap kept on the capture thread (recorder.rs:236–262). The input is chosen BY NAME:
`resolve_device` takes a hint and returns the first case-insensitive substring match (the-recorder
lib.rs:107–122); the room passes an index resolved to a name at the moment of asking
(`src/routes/record/+page.svelte:27–30`), so two inputs under one name still resolve to the first
(`.journals/realm/2026-09-01-w4-1-and-the-debug-apk.md`).

**Playback.** One `HTMLAudioElement` (`src/lib/stores/playback.svelte.ts:10, 52`) fed by
`convertFileSrc` (:107) with the `read_take_bytes` fallback (:119; `src-tauri/src/waveform.rs:139–155`).
One take open at a time (:15); play, pause, seek, a 0..1 volume (:139–181). **It cannot mix, cannot
offset, cannot play two takes at once** — no second element, no `AudioContext` in the store. Nothing
gates it during a take (the room closes it only on panel close and unmount, `+page.svelte:115, 133`),
but no room offers play-while-recording and the devices' duplex behaviour is untested. `the-player`
in awen is a one-`src` element (`resonance-awen/tools/the-player/README.md`); only its pattern crossed
(`waveform.rs:3–6`). The body's only Web Audio is the metronome's click (`src-tauri/src/lib.rs:19–20`).

**The encoder.** `resonance-awen/tools/the-encoder/src/lib.rs`: `decode_window` (:65), `mix_layers`
(:151), `write_wav` (:134); a `LayerSpec` is path · `offset_secs` · volume 0..2 · pan · linear fades
(:44–51). It sums without normalization, clamps at the writer, offsets forward only, decodes each
layer whole into memory, and speaks one contract: **44.1 kHz stereo 16-bit WAV out** (:40–41),
whatever the takes' rate. It is **not a dependency of this body** — `src-tauri/Cargo.toml` names
`the-recorder` and `the-tuner` only; no `the_encoder` symbol stands under `src-tauri/src`. It pulls
`rodio 0.20` with symphonia (`the-encoder/Cargo.toml`); its README says "phones included" — unproven here.

**The waveform and the marks.** The fold is Rust, per take file: `take_shape` streams one WAV into
min/max columns (`waveform.rs:49–129`); the window draws (`src/lib/waveform.ts`;
`src/lib/components/Waveform.svelte`, props `fileName · progress · duration · onscrub`). A per-track
waveform is one `take_shape` per lane — possible today, never drawn twice on one screen. Marks are a
`<stem>.marks.json` sidecar beside each WAV (`src-tauri/src/marks.rs:48–58`), append-only through
`append_take_marks` (:157), no delete — per-track by construction if a track is a take.

**The record room** (`src/routes/record/+page.svelte`): Record · name · input select · hold /
never-held-with-maximum · the Bluetooth note, which promises "can be aligned later" with no alignment
anywhere in the body · FeelingHere; live: elapsed, device, peak, clipped, Pause/Resume, Save (:267–272);
the shelf, each take opening `src/lib/components/TakePlayer.svelte` — waveform, play, scrub, marks rail,
feeling, work, note, "Export a copy" (`export_take`, recorder.rs:484). The domain is works · takes ·
feelings, migration v1 (`src-tauri/src/lib.rs`); no session, no track.

**The lineage.** The four-track was drawn once, in the Compass: "four tracks, overdub against playback
(sync offset from Phase 2's calibration), per-track gain/pan/mute/arm, bounce via the Phase 1 engine,
export stems + mixdown" — exit gate "built by KP's hands, overdubbed, bounced, exported — on the phone"
(`resonance-compass/docs/V3-BUILD-SEQUENCE.md:76–82`); it left for this house with the recorder
(`resonance-compass/src-tauri/src/lib.rs:765–771`). The calibration it leans on was never built
(`the-recorder/README.md`: "stands as its own future seed"). The base: 0 open items · 0 open plans
(`progenatrix.py recall --realm resonance-sistrum`, 2026-09-01); the phone's proof, RUN-LOG 2026-08-20 18:5x.

## 2 · What a studio needs on this device

- **A session** of N tracks, each a take from the shelf, with gain · mute · solo · offset (pan is
  free; the encoder has it). Nothing copied: a track points at a take.
- **Hearing the mix** — N takes at once, offset and gained, on one clock. Not in the body.
- **Overdub** — a new take recorded while the mix plays, its start stamped against the mix's clock.
  Latency compensation stands as a QUESTION (§4.4), never a promise.
- **A mixdown** to one file through `the-encoder`, landing on the takes shelf so it plays, wears
  marks, and exports like any take. Stems are the takes themselves.
- **A waveform per track** (`take_shape` per lane) and **marks per track** (the sidecars, untouched).
  Lose-nothing: a mixdown never replaces a take; nothing is deleted.

## 3 · The movements, in order

1. **The encoder crosses** — S — `the-encoder` as a path crate beside the recorder in
   `src-tauri/Cargo.toml`; one `mixdown` command taking shelf-guarded files (`take_path_guarded`) and
   a layer list, in `spawn_blocking`, out to the shelf; `cargo check` for desktop and the aarch64
   target. Ends at **a lamp** (gates green, a two-take bounce on disk).
2. **The session on disk** — S — the session document and its store (per track: take, gain, mute,
   solo, offset, pan), read back whole; waits on §4.1. Ends at **a lamp**.
3. **The studio room** — M — `src/routes/studio/+page.svelte` and a sidebar door: N lanes, each a
   `Waveform` and its marks, gain/mute/solo/offset, "add a track from the shelf", "Mixdown". No sound
   of its own yet — review is the bounced file in the existing player. Ends at **his hands** (desktop).
4. **Hearing the mix live** — M/L — waits on §4.5. Ends at **his word** on the road.
5. **Overdub** — L — record while the mix plays (one recorder session, as now); the new track's
   offset stamped from the mix clock; a manual nudge per lane; the latency loop only if §4.4 says so;
   the name-matched input (§1) an index across the boundary, or not. Ends at **his hands** — desktop, then the S25.
6. **Mixdown as a take** — S — the bounced file registered in `takes`, named, with its own sidecar;
   export through the door that exists. Ends at **his hands**.

*Deferred unless §4.3 says otherwise:* trim/split — `decode_window` can cut a window; a trim would be
a NEW take, the original kept.

## 4 · The rulings only KP can give

1. **Where the session lives** — a `.session.json` sidecar on the takes shelf (marks' road: a file
   beside the sound) or a `sessions`/`tracks` migration v2 in this body's SQLite. "Never this
   database" was marks' own ruling; a session is a new noun.
2. **The mixdown's format** — the encoder's contract is 44.1 kHz stereo 16-bit WAV; takes seal at
   the device's rate (48 kHz on the desk's C920, the-recorder README; the S25's rate unrecorded).
   Keep the contract, or resample to the session's rate? Anything but WAV is a new water.
3. **Trim/split in v1** — yes, or deferred.
4. **The Android latency question** — ship v1 overdub with a manual nudge only, or wait on a
   measured loop (his tap-test calibration, never built); Bluetooth asks it louder.
5. **Hearing the mix** — (a) a Web Audio graph in the window fed by `read_take_bytes` (~57 MB a
   five-minute take, `waveform.rs:11–13`), (b) a Rust output stream, a new water, or (c) the bounce only.
6. **Desktop-first** — the room on the desk before the phone, or both at once.
7. **Four or N** — the Tascam spirit's four lanes, or as many as the shelf holds.
