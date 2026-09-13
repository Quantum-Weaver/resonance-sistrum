# 2026-09-13 · mastering to spec, the chapterized container, encode-out

Plan items 3.33 and 3.34 (`../resonance-chamber/desk/THE-FINAL-FEATURES-PLAN.md`,
§4 rung 3; §12's audiobook table read `master, container, encode | 3.33, 3.34 |
NONE`). Verified before building: no match for `lufs`, `bs.1770`, `k-weight`,
`true.?peak`, `dbtp`, `oversampl`, `limiter`, `look.?ahead`, `chapter`, `adtl`,
`cue `, `labl`, `mediarecorder`, `opus`, `isTypeSupported`, `mp3` or `aac` in
`src/` or `src-tauri/src/`. Nothing of either item stood.

## What is now

**`src/lib/master.ts`** — pure arithmetic over `Float32Array`, no DOM, no Web
Audio, no imports. `kWeightingCoefficients(rate)` derives both K-weighting
stages from the analogue prototypes, so any rate is served; at 48 kHz the
derivation lands on BS.1770-4's published tables to fourteen digits.
`measureLoudness` sums K-weighted energy per 100 ms step, builds 400 ms blocks
at 75% overlap from those steps, applies the −70 LUFS absolute gate and then the
−10 LU relative gate drawn from what survived it, and returns the integrated
figure with the momentary and short-term maxima, the block counts and the gate
that was applied. `polyphaseBank` builds a 4× Kaiser-windowed sinc bank, 12 taps
per phase, each phase normalised to unity at DC. `truePeakEnvelope` reconstructs
between the samples, running the interpolator only where a sample within a
kernel's reach exceeds the floor divided by the kernel's ∑|h| — below that the
reconstruction provably cannot reach the floor. `truePeakDbtp` is its maximum.
`limit` gives each sample the average, over a window of the look-ahead, of the
smallest gain wanted anywhere within a look-ahead of that sample, with an
exponential release on the wanted gain; it measures the result and applies a
static trim if the reconstruction still sits over the ceiling. `master` gains to
the target and limits, reporting both readings before and after. Every function
returns new arrays.

**`src/lib/container.ts`** — no imports. `chapterize(wav, marks)` reads the rate
and frame count from the bytes it is handed and appends a `cue ` chunk (24 bytes
per point, sample offset into `data`) and a `LIST`/`adtl` chunk of
null-terminated `labl` entries, then rewrites the RIFF size. Both sit AFTER the
data chunk. `readContainer` walks every chunk and resolves cue points against
labels. `chaptersFfmetadata` and `chaptersVtt` write the sidecars.
`normalizeChapters` sorts, clamps, dedupes by millisecond and drops marks past
the end of the sound.

**`src/lib/encode.ts`** — asks `MediaRecorder.isTypeSupported` for Opus in WebM,
Opus in Ogg, AAC in MP4 and MP3, and reports each as offered or as a wall in its
own words. `encodeSamples` plays the master once through a
`MediaStreamAudioDestinationNode` into a `MediaRecorder`: real time, nothing
heard, abortable. No encoder ships here.

**`src/lib/stores/master.svelte.ts`** — `read` renders the lanes and measures
them; `apply` masters onto a new buffer; `land` writes the chapterized WAV
through `write_take_wav` and, where a container was chosen, the encoded file and
the two sidecars through `write_studio_file`. Target and ceiling persist in
`localStorage`.

**`src/lib/components/Master.svelte`** — the rack: five meters, the target
picker, the ceiling, look-ahead and release, `🎚 Master`, the before/after table,
the chapter list with a "Mark at" button, and `📥 Land` with the container
picker and the sidecar checkbox. The walls are listed by name.

**`src/lib/stores/mix.svelte.ts`** — one new function, `renderMix(tracks)`: the
audible lanes summed through an `OfflineAudioContext` into one stereo buffer at
the rate they decoded at, so a repair or splice already on a lane carries in. The
live graph is untouched.

**`src/lib/studio.ts`** — `SessionDoc` carries `chapters: ChapterMark[]`;
`newSession` starts it empty, `parseSession` reads it and sorts it, and a
session written before chapters existed reads as none. `normalizeChapter` added.
The format is still `sistrum-session` version 1.

**`src/lib/stores/session.svelte.ts`** — `addChapter`, `updateChapter`,
`removeChapter` and a `chapters` getter, all on the same debounced save road the
lanes use.

**`src-tauri/src/studio.rs`** — `write_studio_file(name, extension,
bytes_base64)` lands non-take bytes beside the takes under a guarded extension
(`webm`, `ogg`, `m4a`, `opus`, `txt`, `vtt`), on the first free name, through a
temp file and a rename. Registered in `src-tauri/src/lib.rs`. The chapterized WAV
needs no new door: hound skips unknown chunks and ignores everything after
`data`, which a unit test here proves.

**`src/routes/studio/+page.svelte`** — the rack between Mixdown and the bounce
player, with `landedMaster` (seals the take, notes it, shows it in the player)
and `addChapterHere`. Nothing existing was changed.

## Gates

- `npm run check` — 384 files, 0 errors, 0 warnings.
- `cargo check` — `Finished \`dev\` profile [unoptimized + debuginfo] target(s) in 5.64s`.
- `cargo test` — 4 passed, 0 failed, 1 ignored.
- `npm run build` — built, site written.

## Proofs

| proof | TRUE | FALSE |
|---|---|---|
| `.journals/proofs/loudness-to-spec.mjs` | 20 | 0 |
| `.journals/proofs/true-peak-over-samples.mjs` | 13 | 0 |
| `.journals/proofs/limit-to-a-ceiling.mjs` | 26 | 0 |
| `.journals/proofs/chapters-in-a-wav.mjs` | 29 | 0 |
| `.journals/proofs/mixdown-two-takes.mjs` | 8 | 0 |
| `.journals/proofs/offsets-to-schedule.mjs` | 16 | 0 |
| `.journals/proofs/provenance-round-trip.mjs` | 10 | 0 |
| `.journals/proofs/punch-into-a-region.mjs` | 25 | 0 |
| `.journals/proofs/repair-a-noisy-take.mjs` | 19 | 0 |
| `.journals/proofs/session-round-trip.mjs` | 8 | 0 |
| `.journals/proofs/splice-two-takes.mjs` | 22 | 0 |
| `.journals/proofs/splits-from-lanes.mjs` | 16 | 0 |
| `.journals/proofs/wav-bytes-round-trip.mjs` | 14 | 0 |

Measured: a mono 1 kHz sine at −20 dBFS reads −23.0036 LUFS; a stereo 1 kHz sine
at −23 dBFS reads −22.9933 and at −33 dBFS reads −32.9933; −36/−23/−36 at
10/20/10 s reads −23.0547 with 203 of 397 blocks kept, and the same pattern at
10 s each reads −27.3119 with every block kept, the gate at −37.31. A
quarter-rate sine started a quarter-turn in has a sample peak of −3.0103 dBFS
and a true peak of −0.0009 dBTP, 3.0094 dB apart. The limiter held a burst
peaking at 5.661 dBTP to −0.1000, −1.0000, −2.0000, −3.0000 and −6.0000 dBTP,
with a static trim of 0 at the first two and under 2e-6 dB at the other three. A chapterized 30 s stereo WAV changed
exactly one byte of the plain WAV — its RIFF size — and read back three cue
points at frames 0, 330750 and 926100 with their labels whole.

## Walls, named

- **MP3** — no browser `MediaRecorder` writes it and no encoder ships here.
- **AAC** — offered only where this WebView's own recorder offers `audio/mp4`;
  otherwise a wall for the same reason.
- **Chapters inside WebM or Ogg** — a muxer this app does not have. The encoded
  file takes its chapters beside it as `-chapters.txt` (ffmetadata) and
  `-chapters.vtt` (WebVTT).
- **Encoding is real time** — `MediaRecorder` records a stream, so an encode
  takes as long as the sound does. The panel says so.
- `session-round-trip.mjs` was re-run unchanged at 8 TRUE after `chapters` was
  added to the session shape.
- `repair-a-noisy-take.mjs` read 18 at the start of this sitting and 19 at the
  end; that file was written at 13:56 by the hand verifying repair and splice,
  not here. `repair.ts`, `splice.ts`, `wav.ts` and their stores and components
  were not touched.

## What is not here

No device run. The rack has not been opened on a phone or a desktop window;
`npm run check`, `cargo test` and `npm run build` are the whole of its proof.
`master` gains once and limits once — it does not iterate to recover the
loudness that deep limiting costs, and the report names the shortfall instead.
