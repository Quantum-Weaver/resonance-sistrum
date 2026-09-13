# 2026-09-13 · repair and splice on a lane

Plan items 3.31 and 3.32 (`../resonance-chamber/desk/THE-FINAL-FEATURES-PLAN.md`, §4).
Both read NONE before this sitting; nothing of either stood in the repo.

## What is now

**`src/lib/repair.ts`** — pure arithmetic over `Float32Array`, no DOM and no Web
Audio. `learnNoiseProfile` takes the mean magnitude spectrum of a selected span
(radix-2 FFT, periodic Hann, quarter hop). `reduceNoise` subtracts that profile
per bin with a strength and a floor, overlap-added and divided by the
accumulated window power; where coverage is short of steady, the repair is faded
in against the input. `detectClicks` / `deClick` find runs whose second
difference stands above a running local level and redraw them by cubic Hermite
from their neighbours. `detectBreaths` / `deBreath` find runs that are quieter
than speech, louder than silence, above a zero-crossing rate and within reach of
a phrase, and bring them down by a dip the caller sets, ramped at each edge.
`applyInRegion` runs any of them over one span and ramps it back into the whole.
`applyChain` replays a list of steps from the take's own samples and reports
what each touched. Nothing writes its input.

**`src/lib/splice.ts`** — `equalPowerFade` (cos/sin, squares summing to one),
`splice`, `crossfadeJoin`, `punchIn`, and the count arithmetic `spliceLength`,
`punchLength`, `affordableSplice`, `affordablePunch`. A splice runs this take to
its cut, then the other from its own, joined by the crossfade. A punch replaces
the region between an in and an out point with a whole take, crossfaded at both
ends. Crossfades are held to what the buffers afford and the used length is
reported.

**`src/lib/wav.ts`** — `encodeWav` writes 16-bit PCM WAV bytes from channels;
`bytesToBase64` chunks them for the IPC.

**`src/lib/stores/repair.svelte.ts`** — the chain per lane and take. A step is
applied to the lane's decoded samples and heard at once; `undo`, `dropAt` and
`clear` drop steps and replay from the pristine buffer. `keep` writes what the
lane is playing as a new take.

**`src/lib/stores/splice.svelte.ts`** — `spliceLane` and `punchLane`. Both read
the buffer the lane is playing, so a repair already on the lane carries into the
cut, and both land a new take.

**`src/lib/stores/mix.svelte.ts`** — a lane now keeps `pristine` beside
`buffer`. New: `decodeTake`, `laneBuffer`, `laneSource`, `setLaneBuffer`,
`newBuffer`, `contextRate`. `setLaneBuffer` reschedules the lane on the same
clock when the mix is playing.

**`src/lib/components/LaneRepair.svelte`** — the rack: learn from the selection,
strength and floor, de-click sensitivity and widest click, de-breath dip,
ceiling and noisiness, the step list with an undo on each, and "Keep as a take".
The selection is the lane's own trim in and out points; a checkbox chooses the
whole lane instead.

**`src/lib/components/LaneSplice.svelte`** — the bench: the take to join, the cut
on each side, the crossfade in ms, and the punch's in, out and crossfade with
arm, keep and discard.

**`src/routes/studio/+page.svelte`** — both components on every lane.
`landMade` registers a made take, seals it, and adds it as a new lane at the same
offset. `armPunch` seeks the mix to the lane's in point, plays, and starts the
recorder; `keepPunch` stops the recorder and punches the capture in; `keepRepair`
lands the take and clears the lane's chain.

**`src-tauri/src/studio.rs`** — `write_take_wav(name, wav_base64)` and
`from_base64`. The header is read back with hound before anything is written;
the file lands through a temp file and a rename onto the first free name.
Registered in `src-tauri/src/lib.rs`.

## Gates

- `npm run check` — 379 files, 0 errors, 0 warnings.
- `cargo check --lib` — finished, no errors.
- `cargo test --lib studio::` — 2 passed, 1 ignored.

## Proofs

| proof | TRUE | FALSE |
|---|---|---|
| `.journals/proofs/repair-a-noisy-take.mjs` | 18 | 0 |
| `.journals/proofs/splice-two-takes.mjs` | 22 | 0 |
| `.journals/proofs/punch-into-a-region.mjs` | 25 | 0 |
| `.journals/proofs/wav-bytes-round-trip.mjs` | 14 | 0 |
| `.journals/proofs/mixdown-two-takes.mjs` | 8 | 0 |
| `.journals/proofs/offsets-to-schedule.mjs` | 16 | 0 |
| `.journals/proofs/provenance-round-trip.mjs` | 10 | 0 |
| `.journals/proofs/session-round-trip.mjs` | 8 | 0 |
| `.journals/proofs/splits-from-lanes.mjs` | 16 | 0 |

Measured in the repair proof: the noise floor falls 17.1 dB with the tone under
it kept within 0.07 dB; the click error falls 43.0 dB with 12 of 12 found and
none found in a clean tone; the breath falls 18.0 dB against a dip set to
−18 dB with the phrase unchanged.

## What is not here

3.33 (mastering: LUFS, true peak, a limiter) and 3.34 (chapterized container and
encode-out) stand as they were. The repair chain lives in memory for the sitting;
it is not written into the `.session.json` document, and the session format is
unchanged at version 1.
