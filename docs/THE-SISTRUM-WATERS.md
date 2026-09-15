# THE SISTRUM WATERS — what the studio's road needs from the spring, drawn waters-first

*Drawn 2026-09-14 by an app-hand at KP's ⚛ word: "similarly please with ardan, sceal, sistrum, nemeton, khoros and
grammar let us discover, if any stand alone waters needing imagined to be built to support these things." Read from
this body whole, the spring's standing waters, and the features plan's rows for sistrum. Nothing here is run. Every
water's name is KP's to give; each is described here by what it does.*

## The charter, as it stands

KP's sentence for this realm, verbatim (`../resonance-chamber/desk/THE-FINAL-FEATURES-PLAN.md:574`): *"this should
become our own version of "reaper.fm"/"ableton" but with the focus on recording and editing and producing first, and
also then streaming through khoros.audhdities on a subdomain system, next phase would be to enable different types of
plugins utilized in music and sound production."* The rows the plan gives sistrum: 3.31 repair, 3.32 splice and
crossfade and punch-in, 3.33 mastering to spec, 3.34 the chapterized container and encode-out (`:297`); 4.20 live
streaming out to khoros, after 0.19 (`:647`); 5.9 the plugin road, after 0.21 (`:653`); 0.21, the plugin format,
KP's word (`:630`); a door to prometheus, from 0.8's ruling (`:670`); and Part Two's audiobook rows — character
voices, the assembly of 55 chapters, splice and punch-in and repair, mastering and the container and encode
(`:499-508`).

## The one law that shapes the split

A water is pure: numbers and words in, numbers and words out, no DOM, no clock, no disk, no network, no randomness,
laws as data, proofs beside it. The microphone, the speakers, the AudioContext, the canvas, the shelf and the socket
are the consumer's dress. KP, the same day, on why the split exists at all: *"this is why awen exists, because stand
alone tools exist needed in multiple places."* (`../resonance-chamber/desk/THE-FINAL-FEATURES-PLAN.md:710`)

## What stands

**The takes.** One take at a time, sealed to 16-bit PCM WAV at the device's own rate, on the shelf the asset protocol
serves (`src-tauri/src/recorder.rs`, `the-recorder` as a path crate, `src-tauri/Cargo.toml:45`).

**The studio.** A session is N lanes, each a take with gain, mute, solo, pan and a start offset in whole milliseconds
(`src/lib/studio.ts:20-33`), kept as a `<name>.session.json` sidecar (`src-tauri/src/studio.rs:412-451`). The mix is
heard on one Web Audio clock, a source, gain and pan node per lane (`src/lib/stores/mix.svelte.ts:46-68, 212`), the
bytes crossing once through `read_take_bytes` and decoded in the window (`:90-95`). Overdub records while the mix
plays. Mixdown goes through `the-encoder` (`src-tauri/src/studio.rs:35, 101-142`) to 44.1 kHz stereo WAV.

**Repair.** Noise reduction against a learned profile, de-click by transient detection, de-breath by quiet broadband
runs, each a step in a replayable chain — pure arithmetic over `Float32Array`, no DOM and no Web Audio
(`src/lib/repair.ts:147-521`). Proofs `.journals/proofs/repair-a-noisy-take.mjs`.

**Splice.** The equal-power crossfade pair, the cut, the join and the punch — pure (`src/lib/splice.ts:20-149`).
Proofs `.journals/proofs/splice-two-takes.mjs` · `punch-into-a-region.mjs`.

**Master.** Integrated, momentary and short-term loudness per ITU-R BS.1770-4 with both gates, true peak by the
standard's 4× reconstruction through a Kaiser-windowed sinc polyphase bank, and a look-ahead limiter to a ceiling in
dBTP — pure (`src/lib/master.ts:47-626`). Proofs `.journals/proofs/loudness-to-spec.mjs` · `true-peak-over-samples.mjs`
· `limit-to-a-ceiling.mjs`.

**The container.** A WAV that carries its own chapters as a `cue ` chunk and a `LIST`/`adtl` chunk of `labl` entries,
both after the data chunk, plus the ffmetadata and WebVTT sidecar texts — pure, zero imports
(`src/lib/container.ts:26-230`), on the WAV bytes `src/lib/wav.ts:15` writes. Proofs
`.journals/proofs/chapters-in-a-wav.mjs` · `wav-bytes-round-trip.mjs`.

**The seal.** A signet identity and an optional Ed25519 keypair held non-extractable in this device's IndexedDB
(`src/lib/keyring/store.ts`, `hosts.ts`), every seal claiming the take's bytes and writing into `takes.provenance`
(`src/lib/provenance.ts` · `seal.ts`), verified on open, and a merismos proposed at Mixdown.

**No network of any kind.** The only two addresses in the body are the two links the settings room opens
(`src/routes/settings/+page.svelte:11-12`).

**The base's board for this realm**, read 2026-09-14: 3 open items — 621 (0.21), 622 (4.20), 623 (5.9) — and 1 open
plan, 82, THE STUDIO, `docs/THE-STUDIO-PLAN.md`, drawn and never run.

## The waters that already serve

Thirteen, on the two roads the spring travels into an app.

| the water | what it does here | address |
|---|---|---|
| `the-recorder` | the take: device listing, level meter, the seal to 16-bit WAV at the device's rate | path crate, `src-tauri/Cargo.toml:45`; `src-tauri/src/recorder.rs` |
| `the-tuner` | YIN pitch and the nearest note in signed cents | path crate, `:46`; `src-tauri/src/tuner.rs` |
| `the-encoder` | the mixer: decode, window, mix layers by offset, volume, pan and linear fades, write WAV | path crate, `:47`; `src-tauri/src/studio.rs:35` |
| `the-signet` | who you are here: name, sigil, colour | byte-faithful mirror, `src/lib/signet/` + `MIRROR.md` |
| `the-clavis` | the claim over a take's own bytes | mirror, `src/lib/clavis/` |
| `the-lok` | open, or not open and why | mirror, `src/lib/lok/` |
| `the-merismos` | the parts proposed from the lanes' signets, divided equally | mirror, `src/lib/merismos/` |
| `the-cumdach` | the menu wrapper's measure | mirror, `src/lib/cumdach/` |
| `the-epagoge` | the onboarding's induction | mirror, `src/lib/epagoge/` |
| `the-sky` | the sky facts | mirror, `src/lib/sky/` |
| `the-moment-marks` | the append-only mark on a timeline, revised and retracted, never erased | copied body, header trimmed, no `MIRROR.md`, `src/lib/marks.ts` |
| `the-metronome` | the pure beat clock and the tap tempo; the click on the audio clock | a copy that has diverged: sistrum's tap tempo returns `count`, adds `setBeatsPerBar`, `setSubdivision` and `setVolume`, and lacks the spring's re-anchor line; no `MIRROR.md`, `src/lib/metronome.ts` |
| `the-waveform` | the scrub mapping and the plain-canvas draw; `computePeaks` left behind, the fold being Rust here | partial copy, no `MIRROR.md`, `src/lib/waveform.ts`; the fold at `src-tauri/src/waveform.rs:51` |

The COSMIC tokens under `src/lib/cosmic/` are a mirror too, but of `../resonance-ziggy/modules/cosmic/`
(`src/lib/cosmic/MIRROR.md`), not of the spring; they are the design system, not a water.

**Standing in the spring, wanted by this road, not consumed here** — crossings, not births: `the-eist` (the ring
buffer, the latency told as a number, take marks on a frame-counted timeline; the features plan reads narration
monitoring as `sistrum, the-eist | STANDS` at `:502`, and no `the-eist` appears in `src-tauri/Cargo.toml`) ·
`the-awenydd` (trim, mute, a gate and a one-pole high-pass on the live voice) · `the-modulator` (the knob rack for
character voices) · `the-equalizer` (10-band parametric, Audio EQ Cookbook biquads) · `the-sruth` (the stream's
server half) · `the-envelope` (the versioned envelope, non-destructive merge, deliver and openFrom through a declared
host) · `the-release-model` (single, EP, album, beats, tracks).

## The waters to imagine

Ten. W1 to W4 are already written here, pure and proven, and have never been carried to the spring; what they want is
a README, their proofs re-homed, and a `MIRROR.md` on the copy that stays. W5 to W10 do not exist anywhere.

| # | what it does | in | out | what stands already | shared with | mark |
|---|---|---|---|---|---|---|
| W1 | **The repair rack.** Learns a noise profile from a silent span and subtracts it by spectral gate; finds clicks by transient detection and fills them by cubic interpolation; finds breaths as quiet broadband runs between phrases and dips them; each a step in a chain replayed from the source samples, with a report per step. | channels of samples, a rate, a region, step parameters | new channels, never the input; a report per step | `src/lib/repair.ts:147-521` whole, 525 lines, zero imports; proof `.journals/proofs/repair-a-noisy-take.mjs` | sceal (a take's sound on the cut room's timeline; it decodes takes whole already, `../resonance-sceal/src/lib/peaks.ts:1-5`), meetings (recording on the host's device, 4.25), Part Two's audiobook | medium — a carry, not a build |
| W2 | **The splice bench.** The equal-power crossfade pair whose squares sum to one; the cut at a boundary and the join of another take at its own; the punch over a region with the fade at both ends; the affordable length when either side is short; the resulting length arithmetic. | two sample arrays, cut points, a crossfade in ms and a rate | one new array and a report of what was affordable | `src/lib/splice.ts:20-149`, 182 lines, zero imports; proofs `splice-two-takes.mjs` · `punch-into-a-region.mjs` | sceal (`cuts.ts` holds a cut's gain and mute today, no crossfade), meetings, Part Two | small |
| W3 | **The loudness, the true peak and the limiter.** K-weighting coefficients at any rate, 400 ms blocks at 75% overlap, the −70 LUFS absolute and −10 LU relative gates, momentary and short-term maxima; true peak by 4× polyphase reconstruction; a look-ahead limiter to a ceiling in dBTP with the before and after in both figures. | channels, a rate, a target in LUFS, a ceiling in dBTP | a loudness report; a new buffer and its report | `src/lib/master.ts:47-626`, 656 lines, zero imports; proofs `loudness-to-spec.mjs` · `true-peak-over-samples.mjs` · `limit-to-a-ceiling.mjs` | sceal (the film row's stereo mix with dialogue normalization, `THE-FINAL-FEATURES-PLAN.md:528`), khoros (a publish's loudness), meetings | medium — a carry |
| W4 | **The chapterized container.** Chapters normalized, deduped by position and ordered; the `cue ` chunk and the `LIST`/`adtl` chunk written after the data chunk so a reader that knows neither still opens the sound; the container read back; the same chapters as ffmetadata and as WebVTT for the containers that carry none. | WAV bytes, chapter marks, a length | WAV bytes with the two chunks appended; two texts; a read-back | `src/lib/container.ts:26-230` + `src/lib/wav.ts:15-54`; proofs `chapters-in-a-wav.mjs` · `wav-bytes-round-trip.mjs` | sceal (it writes VTT already, `../resonance-sceal/src/lib/captions.ts`), khoros (a release's chapters), Part Two's audiobook | small — a carry |
| W5 | **The musical grid.** A tempo map as data — points of bpm and meter along a timeline — and the conversion both ways between a position in milliseconds and a position in bars, beats and ticks; the grid lines a window would draw between two positions; the nearest grid point at a named division, with the snap as a law and not a feeling. | a tempo map; a position in either unit; a division | the other unit; the grid points in a span; the snapped position | `the-metronome`'s beat clock and tap tempo at ONE tempo (`../resonance-awen/tools/the-metronome/src/index.ts:28, 85`); sistrum's offsets are whole milliseconds only (`src/lib/studio.ts:30`) | ardan (`the-conductor` sequences on a millisecond clock), theophany (beats), khoros | medium |
| W6 | **The insert chain and its automation.** A lane's inserts as ordered data — an id, its parameters, bypass, wet and dry — and an automation lane as points in time with a shape between them; resolved to the exact parameter values at a position, with the chain's order and every bypass named in the answer. | a rack document; automation lanes; a position | the resolved parameters; the order; what is engaged | `the-kampyle`'s `bezierAt` for the shape between two points (`../resonance-awen/tools/the-kampyle/src/index.ts:108`); `the-encoder`'s linear fades (`LayerSpec`, `the-encoder/src/lib.rs:44-51`); the equal-power pair in W2 | sceal (a cut's gain over time), ardan, khoros | medium — 5.9's precondition |
| W7 | **The plugin rack's pure half.** A plugin described as data: its identifier, its parameter tree with ranges, defaults and flags, its audio port layout, and its own latency in samples. From that and a block of automation events, the block plan: which plugin receives which buffers, in what order, with how much delay compensated on the lanes that bypass it, and the parameter events sorted to sample offsets inside the block. The binary is never opened here. | plugin descriptions; a rack; a block size and rate; events | a block plan: routing, order, delay compensation, events at sample offsets | nothing — `clap` appears nowhere in `src/`, `src-tauri/src/` or `../resonance-awen/tools/` (one false match in `the-emoji-collector/emojis.gen.ts`) | nothing today; sceal or meetings if either ever hosts an effect | large; 5.9's own plan |
| W8 | **The broadcaster's half of the stream.** The mirror of `the-sruth`'s ingest, standing on the sending side: when a chunk becomes a segment at a named cadence, the ordinal and the exact name the ingest expects, the queue of what is unsent and in what order after the road drops, the refusal when a chunk would duplicate one already born, and the honest delay derived on this side too. | a stream spec; chunks as length, mime and ordinal; the road's answers | the next segment's name and ordinal; the unsent queue in order; a refusal; the delay as a number | `the-sruth` whole, but it is the SERVER's half — `open`, `ingest`, `close`, `renderHouse`, `renderPlaylist` (`the-sruth/src/index.ts:241, 304, 338, 365, 461`), `segmentPath` (`:212`), `honestDelay` (`:233`); nothing on the sending side | sceal (4.21), khoros (5.11), meetings (4.25) | medium — after 0.19, for 4.20 |
| W9 | **The carry's envelope and its reconciliation.** A creation's working state as a manifest — the session document and the names and digests of the files it points at — against a keeping's listing of what it already holds: the plan of what goes up, what comes down, what is already the same, and what two devices changed at once, named as a divergence with both sides kept and neither chosen. | a local manifest; a remote listing; each side's version | a carry plan: up, down, unchanged, diverged | `the-envelope` seals a versioned envelope with counts outside and merges non-destructively, and `deliver`/`openFrom` run through a declared host surface — but that host is a file dialog, and nothing in the water knows a remote listing or a two-device divergence (`../resonance-awen/tools/the-envelope/README.md`); `the-signet` names the hand, `the-clavis` and `the-lok` seal and verify the bytes | cruthu, sceal, ardan, kendram, scribe — every app 0.8 gave a door (`THE-FINAL-FEATURES-PLAN.md:670`) | large |
| W10 | **The alignment of a pass against what was played.** Two sample arrays — the mix as it went out, the capture as it came back — and a search window: the offset in samples that lines them up, by cross-correlation over a normalized window, with a confidence and a refusal when the answer is not one peak. Also the arithmetic of a compensated lane: an offset, a plugin's own latency, and the rate, to one number of frames. | two sample arrays; a search window; a rate | an offset in samples; a confidence, or a refusal; a compensated offset in frames | nothing — the overdub stamps the moment the stream opened and the person nudges by the ms (`README.md`; `docs/THE-STUDIO-PLAN.md` §4.4); the tap-test calibration "stands as its own future seed" (`../resonance-awen/tools/the-recorder/README.md:46-48`) | meetings (4.25), sceal, theophany | small |

**The door's second verb, offer.** The publish of a mixdown to the Bazaar or the Stage is the offer-as-data water
khoros's discovery names first (`../resonance-khoros/docs/THE-KHOROS-WATERS.md`, its W1); the release model, the
sphragis and the merismos already stand in the spring; nothing of it is sistrum's alone.

## What is deliberately not a water

- **The microphone and its permission** — `src-tauri/src/media_permission.rs`, `src-tauri/android-extras/MediaPermissionPlugin.kt`.
- **The Web Audio graph** — the AudioContext, the source, gain and pan nodes, the scheduling on the context's own
  clock, and the `OfflineAudioContext` render (`src/lib/stores/mix.svelte.ts:46-68, 212, 397`). The waters hand
  numbers; the graph is the dress.
- **Encode-out** — `MediaRecorder.isTypeSupported` and the census of what this WebView carries
  (`src/lib/encode.ts:61, 82, 103`). What a device already holds is the device's answer, not a law.
- **The canvas and the pointer** — `drawWaveform` and the scrub (`src/lib/waveform.ts:40`).
- **The shelf** — the guarded paths, the sidecars, the base (`src-tauri/src/studio.rs:119, 269, 356, 412`).
- **The keyring** — the non-extractable CryptoKey and this device's IndexedDB (`src/lib/keyring/`). The waters declare
  a host surface and implement no primitive; the hosts are this app's own.
- **The socket, the sign-in and the door's window** — whatever carries W8's segments and W9's envelope.
- **The `.clap` binary's loading, its host callbacks, its threads and its GUI window** — W7 is the description and the
  plan; opening a binary is the app's, and native.
- **The live meter's needle** — `the-recorder` already tells peak and clip count honestly on the take report; a decay
  constant in the window is dress.
- **`the-modulator`'s crossing.** Rejected as a birth: the rack already stands in the spring and its door is a
  `BaseAudioContext` (`../resonance-awen/tools/the-modulator/src/index.ts:227`), which is exactly what this app holds
  twice over, live and offline. Its character presets are data (`:187`). The crossing is a mirror and an insert point
  in the lane's graph, not a new water — Part Two's `character voices | the-modulator, in the spring, in no app | PART`
  (`THE-FINAL-FEATURES-PLAN.md:503`) closes by consumption.
- **Sample-rate conversion.** Rejected: `decodeAudioData` resamples to the context's rate on the way in, and
  `the-encoder` speaks one contract out, 44.1 kHz stereo (`the-encoder/src/lib.rs:40-41`).

## The order

| step | what | mark |
|---|---|---|
| 1 | W2 and W4 to the spring — the smallest carries, the arithmetic already proven here, proofs travelling with them | small |
| 2 | W1 and W3 to the spring, sistrum on byte-faithful mirrors with a `MIRROR.md` each, proofs green in both | medium |
| 3 | W10 — it closes plan 82's §4.4 and replaces a nudge with a number | small |
| 4 | W5 — the grid the "reaper.fm"/"ableton" sentence asks for and nothing in the house has | medium |
| 5 | W6 — the insert chain and its automation, standing before any plugin | medium |
| 6 | W8 — after 0.19; 4.20 is then assembly on `the-sruth`'s far side | medium |
| 7 | W9 — after the door's shape; six apps wait on the same water | large |
| 8 | W7 — after 0.21; 5.9's own plan is drawn on it | large |

Steps 1 to 5 need no khoros, no plugin format and no network: each is written, proven and mirrored on its own.

## Walls, named

- **MP3 and AAC.** No encoder ships here and no browser recorder writes MP3; the panel says so in those words and
  offers WAV and Opus (`README.md`; `src/lib/encode.ts`). A native encoder is a build choice, not a breach — the
  sentence "no ffmpeg, no native codec dependency, nothing leaving the device" in this README was written by lamps,
  and carries no word of KP's (`THE-FINAL-FEATURES-PLAN.md:688-691`).
- **WebM and Ogg chapters** need a muxer this app does not have; they leave beside the file as text
  (`src/lib/container.ts:1-12`).
- **`the-equalizer` cannot ride the live mix.** It is a rodio `Source` wrapper on the Rust side
  (`../resonance-awen/tools/the-equalizer/src/lib.rs:131`); the mix is Web Audio in the window. Crossing it means a
  second body or an offline pass, not an import.
- **Fifty-five chapters as lanes** is untested at length: the live mix decodes every lane whole into the window
  (`src/lib/stores/mix.svelte.ts:90-95`). Memory and length, not arithmetic.
- **A lone clone does not build.** `the-recorder`, `the-tuner` and `the-encoder` are path crates
  (`src-tauri/Cargo.toml:45-47`); the distribution that would carry them is KP's law.
- **Plan 82 waits KP's ears** — nothing of the studio has been heard through a speaker (handoff 30, 2026-09-02).
- **0.21 was ruled 2026-09-15.** The plugin format is a build choice, drawn in 5.9's own plan; W7 is free to be drawn.
- **0.19 is KP's word.** `khoros.audhdities.com` and what serves it; W8 is shaped by the answer.

## Provenance

`resonance-sistrum/README.md` · `docs/THE-STUDIO-PLAN.md` · `src/lib/repair.ts` · `splice.ts` · `master.ts` ·
`container.ts` · `wav.ts` · `studio.ts` · `encode.ts` · `waveform.ts` · `metronome.ts` · `marks.ts` ·
`src/lib/stores/mix.svelte.ts` · `src/lib/keyring/` · `src/lib/*/MIRROR.md` · `src-tauri/src/studio.rs` ·
`recorder.rs` · `waveform.rs` · `src-tauri/Cargo.toml` · `.journals/proofs/` · `.journals/realm/2026-09-13-opus-repair.md`
· `2026-09-13-opus-master.md` · `../resonance-awen/README.md` and `tools/the-recorder`, `the-tuner`, `the-encoder`,
`the-equalizer`, `the-metronome`, `the-waveform`, `the-modulator`, `the-eist`, `the-awenydd`, `the-sruth`,
`the-envelope`, `the-kampyle`, `the-moment-marks` · `../resonance-sceal/src/lib/peaks.ts` · `cuts.ts` · `captions.ts` ·
`../resonance-chamber/desk/THE-FINAL-FEATURES-PLAN.md` §12 and §15 · the base, `recall --realm resonance-sistrum`,
2026-09-14.
