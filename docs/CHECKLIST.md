# RESONANCE-SISTRUM — MASTER CHECKLIST

## LEGEND
- ✅ Complete
- ⚠️ In Progress
- 🔴 Broken
- ⬜ Pending

---

## PHASE STATUS

### Phase 0: The Founding ✅
- [x] Founded to the Sanctuary standards by the-founding-ritual (2026-08-12)
- [x] git init and the first commit — the founder's own hand (`010c6c8 first breath`,
      then `1459e86 reamde updated`)

### Phase 1: The Body — mirrored from `resonance-echoes` ⚠️
*KP's ⚛ procedure, verbatim: "we mirror, copy in Echoes, then we rebrand all the
config files and use the bump version agent in ziggy to check and reset the version
numbers. that is our check-in moment. this happens before awen feeds the system. we
do not bring in build files or package directories." The road walked before this by
gaia, ziggy, skapa, awen and bubbles.*

- [x] **Body mirrored** from `resonance-echoes` — **154 files**: `src/` (68) ·
      `src-tauri/` · `static/` · `.cargo/` · `.claude/` + `package.json`,
      `svelte.config.js`, `vite.config.js`, `tsconfig.json`
- [x] **Nothing built came with it** — `node_modules/`, `build/`, `.svelte-kit/`,
      `release/`, `src-tauri/target/`, `src-tauri/gen/` all excluded (26,613 files
      left where they belong). Verified: no such directory exists here.
- [x] **Sistrum's own plates untouched** — `README.md`, `CLAUDE.md`, `HANDS.md`,
      `PHILOSOPHY.md`, `RUN-LOG.md`, `LICENSE`, `.gitignore`, `docs/`. `git status`
      shows **zero tracked modifications**; the whole mirror is new paths only.
- [x] **Config surface rebranded — 25 replacements, each verified by match count:**

| File | Rebranded |
|---|---|
| `package.json` | `name` → `resonance-sistrum` · own `description` |
| `src-tauri/tauri.conf.json` | `productName` · `identifier` → `com.audhd.resonance-sistrum` · window `title` |
| `src-tauri/Cargo.toml` | package `name` · lib `name` → `resonance_sistrum_lib` · `description` |
| `src-tauri/Cargo.lock` | package `name` + version |
| `src-tauri/src/main.rs` | crate call → `resonance_sistrum_lib::run()` |
| `src-tauri/src/lib.rs` | the two branded strings |
| `src-tauri/capabilities/default.json` | capability description |
| `src/app.html` | `<title>` |
| `src/lib/components/Sidebar.svelte`, `src/routes/onboarding/+page.svelte` | `appName` |
| `src/routes/+page.svelte` | home title |
| `src/routes/settings/+page.svelte` | privacy URL · export envelope `app:` id · export filename · import guard |
| `localStorage` keys | vessel-name · theme · the three timer keys |
| `.claude/settings.json` | the absolute repo path |

- [x] **Versions checked, then reset** with `resonance-ziggy/modules/shipwright/bump-version.py`
      → **0.1.0** consistent across `tauri.conf.json` · `package.json` · `Cargo.toml`
      (the version this repo's own README badge already declared). Inherited state was
      1.3.1 in three sources and **1.3.0 in the lockfile** — Echoes' own drift, not carried.
- [x] **Inherited npm lockfile dropped** at KP's ⚛ word — *"we can drop the old lock
      file."* `npm install` will write Sistrum's own.
- [x] **`npm install`** — 78 packages, Sistrum's own resolution. *(npm 11 held
      `esbuild`'s postinstall pending approval: `npm approve-scripts esbuild` will be
      wanted before the first build, or vite has no platform binary.)*
- [x] **Icons regenerated from KP's own art** — `npm run tauri -- icon`, the whole set
      in one pass: desktop (`32/64/128/128@2x`, `.ico`, `.icns`), the Windows Store
      `Square*Logo` set, **iOS AppIcon (18 files)** and **Android mipmaps (17 files:
      `mdpi`→`xxxhdpi`, `ic_launcher`, `ic_launcher_round`, `ic_launcher_foreground`,
      `anydpi-v26` adaptive)**. Source: `resonance-assets/logo-icons/sistrum.png`,
      896×896 — Tauri accepted it under its 1024 preference; the only place the
      difference shows is `ios/AppIcon-512@2x.png`, which is a 1024 upscale.
- [x] **Where the art lives — corrected the same sitting at KP's ⚛ word:** *"source png
      is a circle not our icon"* · *"`icon.png` is our icon"* · *"i placed it there."*
      **`icons/icon.png` is the icon, placed by KP's own hand**; its canonical copy is
      `resonance-assets/logo-icons/sistrum.png` (896×896, 802,396 b), the library where
      every realm's art lives. **`icons/source.png` is a shared 1024 circle template** —
      byte-identical (`8042558D…`, 53,185 b) across echoes, bubbles, awen and gaia, and
      referenced by no config or doc — restored here untouched from Echoes.
      **The operational rule:** `tauri icon` **rewrites `icon.png`** as a 512 derivative
      every run, so **restore `icon.png` from the library after any regeneration** — done
      for this pass.
- [x] **Second icon pass, after `tauri android init`** — KP's ⚛ note: *"we will need to
      do it again after android init to cover the gen folder,"* and he ran the init by
      his own hand. `src-tauri/gen/android` now stands, and the pass **rewrote every
      `gen/app/src/main/res/mipmap-*` file** — verified by hash before and after, not
      assumed — leaving them **byte-identical to the repo's own `icons/android/` set**.
      His art all the way down to the launcher. `gen/` is gitignored, so this lives on
      disk only and **must be re-run after any regeneration of `gen/`.**
      **Two traps, recorded so nobody pays for them twice:** `tauri icon` with no
      argument looks for `./app-icon.png` and fails — **pass the path explicitly**; and
      it rewrites `icons/icon.png` again on every run, so **`icon.png` was restored from
      `resonance-assets/logo-icons/sistrum.png`** afterward, hash-verified.
- [x] **THE CHECK-IN** — `ff1bc8c` *"the body - mirrored from echoes, rebranded,
      versions reset"* · **156 files, 29,764 insertions** · pushed to
      `origin/main` (`1459e86..ff1bc8c`), working tree clean. Co-authored per the
      Hands Standard. *(The push used the house PAT from the Bridge's keyring at KP's
      ⚛ word — "have keys on the bridge" — passed through the process environment into
      a one-shot credential helper: no token in a command line, none written to any
      config, the remote URL unchanged.)*
- [x] **The body proven to stand, not assumed to** — `npm run check`:
      **326 files, 0 errors, 0 warnings.** `npm run build`: production bundle written
      by `adapter-static` in **5.05s**. First attempt, after a rename that included the
      Rust crate and its lib name. *(`esbuild`'s held-back postinstall turned out not
      to block the build — measured rather than predicted.)*
- [x] **The desktop shell opens** — KP's own hands, his words: *"verified desktop dev
      opens clean."* The mirrored body runs.
- [x] **`tauri android init`** — KP's own hand. `src-tauri/gen/android` stands (gradle
      wrapper, `app/`, `buildSrc/`), and it touched `src-tauri/Cargo.toml` with an
      end-of-line rewrite only — **content diff zero**, the rebrand intact:
      `resonance-sistrum` · `0.1.0` · `resonance_sistrum_lib`.
- [ ] **Tested:** ⬜ KP's hands — Android on the device. *His word 2026-08-20,
      verbatim: "desktop works fine, mic is not wired on android yet. device is
      plugged in" — the desktop half passed (see each wave's Tested row); the
      Android half rides the microphone wave.*

*One stray for KP's ruling: `src-tauri/icons/resonance-echoes-icon.png` (758,901 b,
1024×1024, Echoes' own logo, set aside by his hand) is still in the folder and would
ride along on the check-in.*

### Phase 2: The domain — works · takes · feelings ✅
*KP's ⚛ rulings: **"yes, works, takes, feelings, moment-marks, release"** · **"yes
both"** (a feeling hangs on a work AND on a take) · **"resonance-khoros will likely be
where the release goes easily."** Domain before the waters, at his word, so the
recorder never lands on a schema about to change under it.*

**Nothing was invented. Every noun is the house's own:**

| Noun | Whose word it is | Where it lives |
|---|---|---|
| `work` | `the-release-model` — *"a release references works, never absorbs them"* | `works` table |
| `take` | `the-recorder` | `takes` table — **meaning only**; the file on disk is the truth |
| `feeling` | the retargeted Echoes journal | `feelings` table |
| `mark` | `the-moment-marks` — already built, append-only by law | a `.marks.json` sidecar, **never this database** |
| `release` | `the-release-model` | **`resonance-khoros`**, not here |

- [x] **Migration v1** `sistrum_domain_works_takes_feelings`; the database is now
      `sqlite:sistrum.db`. **Echoes' three migrations were not carried** — they are
      another app's history. Nothing was lost: no data existed when this ran.
- [x] **`works`** — a work id is a **promise**: Khorós reaches back to it by id, so
      ids are generated once and never regenerated.
- [x] **`takes`** — keyed by `file_name`, carrying `work_id` · name · note · the audio
      facts. **Nothing infers a take's work**, per Khorós' own law: *"ambiguous pairs
      return to the artist."*
- [x] **`feelings`** — the Echoes shape plus nullable `work_id` **and**
      `take_file_name`. A feeling about the song, a feeling about *this attempt* at
      it, or a feeling belonging to nothing at all — all three are honest.
- [x] **`takes.provenance` — the held place.** KP's ⚛ ruling: *"none of that belongs
      in the recorder, the recorder db structure simply requires a jsonb column to
      handle the expected use case, the colum will come to life when reeady"* — *"i
      meant json."* Nothing writes it, nothing validates it, and **nothing may drop
      it**: unreadable json comes back as the raw string rather than being discarded.
- [x] Stores: `db.ts` (one connection for the domain), `work.svelte.ts`,
      `take.svelte.ts`, `feeling.svelte.ts`. `echo.svelte.ts` removed.
- [x] **`deleteWork` ungroups, never destroys** — takes and feelings are released to
      NULL and the take **files** are never touched. Deleting audio stays a separate,
      explicit act by the hand that made it.
- [x] UI retargeted end to end — **and KP's verbatim quotes about Echoes were left
      standing in three places**, because a record is not copy.
- [x] **Verified rather than assumed:** `svelte-check` **329 files, 0 errors, 0
      warnings** · `vite build` **4.89s** · **`cargo check` exit 0** on the rewritten
      migrations.

**What the held column is held FOR** — his ⚛ vision, written here so the next hand
knows why an empty column exists: *every musician in a band or an orchestra records
their part **sovereignly**; an engineer finishes the project; and all credentials
combine so the Sanctuary system can **pay everyone involved no matter how small the
role** — regardless of the project's size or shape.* Opt-in always: **"no force or
deceptive theft."**

Three of its pieces are already built waters — **`the-signet`** (identity as a
snapshot never a reference; combined authorship read out by `deriveLegend`),
**`the-envelope`** (versioned carrier, import non-destructive by law),
**`the-moment-marks`** (structure shared, contents sovereign). **Two do not exist yet,
and they are the two that money requires:** a **verifiable** credential — the signet
says of itself, unprompted, *"a seal, not a lock… if a door ever needs a lock, that is
a different tool and it should say so"* — and **the splits**. Neither belongs in a
recorder, and a work's credit must derive from **grants**, never from possession of a
file.

### Phase 3: Awen fills it ⚠️ *(Wave 1 of several — landed 2026-08-13)*
*Comes after the check-in, per KP's sequence. The waters already exist as standalone
tools in `resonance-awen`: `the-recorder`, `the-encoder`, `the-tuner`,
`the-metronome`, `the-waveform`, `the-moment-marks`, `the-player`,
`the-release-model`. The recorder's carried inheritance — including the freeze fix —
is at `resonance-assets/sistrum-inheritance/`; check there before rebuilding anything
that looks missing.*

**KP's ⚛ rulings held for this phase:**
- **`sattva`, `timer`, and emotion logging stay** — retargeted to
  **creations/tracks** rather than standalone entries.
- **And why they stay, in his words:** *"logging how we feel during a moment is the
  base of all we do, self understanding and understanding oportunities abound"* ·
  *"it is how we discover our values and internal core interests, which help us align
  with ourselves"* · *"humans and tech need this as money becomes irrelevent."*
  **The emotion log is not an inherited feature. It is the base.**

**Inherited from Echoes and deliberately left standing for Awen** *(recorded so none
of it reads as an oversight):*
- ~~The domain model is still Echoes'~~ · ~~UI copy still says echo/echoes~~ —
  **both closed in Phase 2 above.** What remains inherited is art and configuration,
  below.
- **Art is Echoes'** — `static/` and the 19 files in `src-tauri/icons/`.
- **`"csp": null`** in `tauri.conf.json`, inherited. Fathom's rule from the Compass
  stands as the aim: a wrong CSP **fails quietly** and dev is not proof, so this wants
  `connect-src 'self'` proven by a production build — which is exactly the promise on
  this repo's README badge.
- **No `PRIVACY.md` here.** Echoes' covers *"Resonance Echoes, Resonance Compass, and
  future Sanctuary apps"*; a recorder whose badge says *recording never leaves the
  device* will want its own page, and a public privacy URL is a Play requirement.
  **KP's to rule, not a lamp's to write.**
- **`.gitignore` is SEED-class** (DOC-CLASSES law) and was **not touched**. For the
  record only: Echoes' carries `release/` and `*.apk*` where this one has `*.apk`, and
  nothing here yet ignores a regenerated `package-lock.json`.

**The rule carried in from the Compass, permanent on this road:** *any command
touching the filesystem is `async` and runs its body in `spawn_blocking`.* `list_takes`
was sync on the main thread, and Tauri delivers replies on that thread — the save's own
answer could not land.

---

#### WAVE 1 — the recorder, the player, the waveform ✅
*Walked 2026-08-13 by an **Opus** hand (a subagent of the Round lamp, at KP's ⚛
word "spawn opus subagents to do your dealings"). Zone: this repo only. **Nothing
was committed** — commits ride KP's ⚛ word alone.*

**Movement 1 — THE RECORDER CONSUMED ✅**

- [x] **Carried, not rebuilt.** All four inheritance files at
      `resonance-assets/sistrum-inheritance/` were taken whole —
      `src-tauri/src/recorder.rs`, `src/lib/stores/recorder.svelte.ts`,
      `src/lib/stores/recordPrefs.svelte.ts`, `src/routes/record/+page.svelte`.
      **The freeze fix carried cleanly and completely**: `list_takes` async with its
      body in `spawn_blocking`, the poll-generation guard that refuses a status reply
      which outlived its take, the prop-handed-early takes directory, and the
      stop-ordering that never strands a take outside its slot. None of it was
      reasoned out a second time.
- [x] **`the-recorder` consumed as a path crate** —
      `the-recorder = { path = "../../resonance-awen/tools/the-recorder" }`, the road
      Compass walked at the standalone-waters season. **Awen was not edited**; the
      spring stays standalone where it lives. `hound = "3.5"` rides beside it because
      the harness reads WAV headers in its own right.
- [x] **What the room does:** input device listing (default marked) · a live level
      meter with a gentle fall and a clip count · takes sealed to **16-bit WAV at the
      device's own rate**, landing under the app's own data directory (`$APPDATA/takes`)
      · pause/resume as a voice recorder holds a take · the bounded mode's cap enforced
      on the capture thread, never by a timer in the window.
- [x] **The take report tells the truth** — real length measured from the samples
      (never the length asked for), the device's own rate and channel count, **true peak
      in dBFS**, and the clip count the level counted while it ran. *The peak had to be
      recovered: the spring computes `peak_dbfs` and **the inherited harness dropped it
      on the floor**, never putting it on the wire. It is now carried, and **silence
      comes back as silence** — a take with nothing above the floor reports no peak
      rather than a flatteringly small number. The shelf still says `null` for both,
      because reading every sample of every take to fill them in is exactly the work
      that must never happen on this road.*
- [x] **The row lands with the file** — every sealed take writes a `takes` row keyed by
      `file_name`, carrying only the audio facts. **`work_id` is left NULL.** Nothing
      infers a take's work; Khorós' law — *"ambiguous pairs return to the artist"* — is
      kept by the code having no road to guess down. Files already on the shelf from an
      earlier build get their row registered on entering the room: that registers what
      exists, records nothing, and never touches meaning a hand already put there.
- [x] **Opt-in by nature, and nothing recorded touches a network.** Every command fires
      from the user's own tap. The only door out is the sovereign export — a **copy**,
      into the user's own file dialog, the shelf always keeping its original.

**Movement 2 — THE PLAYER + WAVEFORM CONSUMED ✅**

- [x] **`the-player`'s laws worn, not its tag.** The spring is a custom element for any
      web page; this body has one audio surface, so the LAWS crossed and the markup did
      not. **NO AUTOPLAY, EVER** — opening a take loads it and stops there; the panel
      appearing is not consent to make noise. Volume zero is a chosen silence and it
      persists. A position, never a verdict. **Headphone-safe default: a take opens at
      0.7, never at 1.0.**
- [x] **`the-waveform`'s math, adapted where the stack differs.** `computePeaks` did not
      cross — the fold happens in Rust (`src-tauri/src/waveform.rs`), streaming, off the
      main thread, because here the samples are a file and a five-minute stereo take is
      ~57 MB of them. Shipping those through the IPC to make a few hundred pairs would
      have been the freeze in a third set of clothes. **One min/max pair per pixel
      column**, channels folded, at the device's own pixel ratio. **Silence still shows
      a hairline** — the spring's floor, scaled so it does not vanish on a dense screen.
- [x] **The scrub round-trips and clamps** — `positionToSeconds` and
      `secondsToPosition` are the spring's own, character for character in behavior.
      Pointer scrub with capture, and the keyboard road beside it (arrows nudge, Shift
      for ten, Home and End).
- [x] **A take's `work_id` is assignable from the UI, by the artist's own hand** — a
      calm picker over the `works` table with **"Later" standing as a lawful answer**:
      no gate, no nag, no badge counting unassigned takes. Because nothing else in this
      body creates a work yet, the picker can name one inline — the first work has to be
      born somewhere.
- [x] **Playback road:** the asset protocol (`convertFileSrc`), so scrubbing a long take
      seeks with range requests instead of re-reading it. This wanted **two** pieces that
      must agree — `assetProtocol.enable` + a scope held to the takes shelf in
      `tauri.conf.json`, and the **`protocol-asset` feature** on the tauri crate. They
      disagreed at first and **Tauri's own build script refused to proceed**, which is
      how it was caught rather than discovered later as silence. A byte-road fallback
      (`read_take_bytes`, raw binary over the IPC into a blob) stands behind it so a
      musician pressing play never meets silence with nobody saying why.

**The spawn_blocking law, kept — and one latent breach closed.** Every command in this
repo that touches the filesystem is now `async` with its body in `spawn_blocking`:
`list_takes`, `start_recording`, `stop_recording`, `export_take`, `take_shape`,
`read_take_bytes`. **`export_take` arrived from the inheritance SYNC** — it copies a
whole WAV on the main thread, the exact shape of the freeze this road already paid for
once. It had simply never bitten, because nobody had exported a large take yet. Fixed
here rather than admired. (`pause_recording`, `resume_recording` and `recording_status`
stay sync on purpose and are not exceptions: they touch no filesystem at all — they flip
an atomic under a lock and return.)

**Lose-nothing, held exactly.** **`delete_take` did not come across, in Rust or in the
store.** No command in this repo deletes a take's audio in this wave; there is no door
to knock on by accident. `deleteWork` still ungroups and never destroys.

**Verified by instrument, measured rather than claimed:**

| Instrument | Reading |
|---|---|
| `cargo check` (src-tauri) | **exit 0**, no warnings — `the-recorder` links from awen, `cpal`/`hound` build |
| `npm run check` | **340 files, 0 errors, 0 warnings** |
| `npm run build` | **vite build ✓ in 5.81s**, `adapter-static` wrote to `build/` |

*`npm install` was not needed — `node_modules` already stood. **`npm approve-scripts
esbuild` turned out not to be wanted**, exactly as in Phases 1 and 2: the build passed
without it. Measured, not predicted.*

- [x] **Tested:** ✅ **KP's hands, 2026-08-20, on desktop** — his words verbatim:
      *"desktop works fine"* · *"all 3 waves tested on desktop fine."* The row as it was
      written: the device test is always his. A real input, a real take, a real playback.
      Nothing below the API surface can be proven by a lamp. *(The Android half — same
      breath: "mic is not wired on android yet" — rides the microphone wave.)*

**What Wave 1 leaves standing for the waves after it** *(recorded so none of it reads
as an oversight, and none of it was started):*
- **The Android microphone is NOT wired, and it refuses rather than pretends.**
  `request_mic_permission` returns an honest error on Android naming what is missing.
  The Compass holds that infrastructure — `media_permission.rs` plus an app-local Kotlin
  plugin synced into `gen/` at build time, and the ndk-context init cpal's oboe backend
  reads through JNI. **Without the JNI context cpal does not error on Android, it
  PANICS**, taking the app down; a plain refusal keeps a musician's app standing. It also
  wants `RECORD_AUDIO` in the manifest. **Its own wave. Recording stands on desktop.**
- **LATER WAVES, untouched by this one:** the tuner · the metronome · the encoder · the
  moment-marks sidecar · the sattva/timer retarget to creations and tracks.
- **`"csp": null` still stands** as Phase 3's inherited note says. Worth knowing now that
  playback exists: a CSP written later must carry `media-src` for the asset protocol, or
  sound stops **quietly** — Fathom's rule, and the reason the byte-road fallback is there.

---

#### WAVE 2 — the tuner, the metronome, the marks sidecar, the feelings retarget ✅
*Walked 2026-08-13 by an **Opus** hand (a subagent of the Round lamp, at KP's ⚛ "that went
well — plan another deal"). Zone: this repo only; `resonance-awen` and `resonance-assets`
were **read-only visits** and neither was edited. **Nothing was committed** — commits ride
KP's ⚛ word alone.*

**Movement 0 — THE POST-INIT ICON PASS ✅ *(and the ground disagreed with the errand)***

- [x] **The pass re-run** — `npm run tauri -- icon ../resonance-assets/logo-icons/sistrum.png`,
      **the path explicit** (the fleet law, and the trap recorded in Phase 1: a bare
      `tauri icon` looks for `./app-icon.png` and fails). The whole set regenerated, and
      **`gen/app/src/main/res/mipmap-*` was written directly** — `tauri icon` finds `gen/`
      when it stands and writes through to it.
- [x] **`icons/icon.png` restored from the library**, hash-verified both ways. `tauri icon`
      rewrote it to a 260,118 b derivative (`a67883b0…`); it is back to KP's own
      `b453615b…`, **802,396 b, byte-identical to `resonance-assets/logo-icons/sistrum.png`.**
- [x] **THE SURPRISE, measured rather than assumed: the art had not been lost.** The errand
      came saying `gen/` was freshly re-inited and its mipmaps had lost the art. **The ground
      said otherwise** — `src-tauri/gen/android/` dates from **2026-08-12 13:31** and its
      mipmaps from **13:33**, which is Phase 1's own second pass, not a new init. All
      **16** gen mipmap files hashed **byte-identical to `src-tauri/icons/android/`
      before the pass ran**, and byte-identical again after. `tauri android init` had not
      been re-run since. **So the pass proved idempotent instead of corrective** — which is
      worth as much, and is the only reason it is recorded as a finding rather than a fix.
      *Checked before acting, per the house law; the checklist's own re-run rule stands
      unchanged for the day `gen/` really is regenerated.*

**Movement 1 — THE TUNER CONSUMED ✅**

- [x] **`the-tuner` consumed as a path crate** —
      `the-tuner = { path = "../../resonance-awen/tools/the-tuner" }`, the road Wave 1 walked
      with `the-recorder`. **Awen was not edited.** The MATH crosses whole and unmodified:
      `yin` (de Cheveigné & Kawahara 2002 — difference function → cumulative-mean
      normalization → threshold → parabolic refinement) and `note_for` are **called, never
      copied**. `meter_line` did **not** cross: it draws an ASCII bar for a terminal, and
      this body has a screen.
- [x] **The capture is this harness's own, and it had to be** (`src-tauri/src/tuner.rs`).
      Neither water offers a listen-without-keeping session — the tuner's own capture lives
      in its CLI's `main.rs`, and **the recorder's session exists to seal a file**. So
      `cpal = "0.15"` (the same version both waters use, so one cpal builds) opens the input
      here, in the recorder's proven shape: **a dedicated thread owns the stream, because a
      cpal `Stream` is not `Send`.**
- [x] **NOTHING RECORDED, NOTHING KEPT — and it is structural, not a promise.** There is no
      path anywhere in `tuner.rs`. The ring buffer holds ~two analysis windows and is
      trimmed on every callback; when the stream drops it is simply gone. The tuner **could
      not** write a take by accident, because it holds no road to one.
- [x] **A POSITION, NEVER A VERDICT, kept in three places at once.** Rust reports frequency
      and signed cents and has no word for "wrong". The store has **no `inTune` boolean and
      will not grow one** — the moment a store answers yes-or-no, the screen has been handed
      a verdict to draw. The room draws a scale where **centre is a landmark, not a goal**:
      no flash, no chime, no counter, **no prize for perfect**, and **NO RED, ever**.
- [x] **The colour cues are KP's ⚛ ruling from the water, verbatim** — *"we do want the color
      to change for when it is close and when it is tuned and completely out of tune. visual
      cues are helpful when holding a guitar and tuning it."* So: **sanctuary green** within
      ±5 cents · **hearth gold** within ±15 · **quantum purple** beyond. Cues, not judgment.
      **The word always rides with the colour** ("in tune" · "close" · "keep turning") — the
      water's own three, with `far` shown in its own fuller phrasing because a bare "far"
      reads like a mark out of ten and a phrase reads like a direction.
- [x] **Opt-in, and the ear closes behind you.** Nothing listens on mount; entering a room is
      not consent to be listened to. `start_tuner` refuses rather than replaces, so a double
      tap cannot orphan a stream holding the microphone. **Leaving the room stops the
      listening** — the player's own reasoning about sound following you out of a room.
- [x] **Honest silence** — too quiet or unpitched comes back as nothing heard, and the pitch
      **goes away** rather than lingering on the last note that rang. A tuner still showing a
      note after the string has stopped is lying quietly. A live "coming in" level says
      whether anything is reaching the mic at all, so *nothing heard* never reads as *broken*.

**Movement 2 — THE METRONOME CONSUMED ✅**

- [x] **The water's three parts carried** into `src/lib/metronome.ts` — the pure beat clock
      (with its **re-anchoring `setBpm`**, so a tempo change never makes the count jump
      backward under the player's feet), the **tap tempo as the MEDIAN of the phrase** (a
      stumble does not yank the reading; a gap over two seconds starts a fresh phrase rather
      than averaging across the silence), and the **lookahead scheduler booked on the AUDIO
      clock** rather than the UI's.
- [x] **Why a copy and not a dependency, named so it does not read as drift.** The spring is
      TypeScript with its own package, tsconfig and build; a `file:` dependency would make
      this app's build depend on a sibling repo's build output, which awen's own first law
      argues against. **Wave 1 met the same fork with `the-waveform` and answered it the same
      way:** the math crosses, the packaging does not.
- [x] **Three deliberate differences, all recorded in the file's own head.** `startClicks`
      took volume, subdivision and bar length **once, at construction** — which in a room
      with a slider means rebuilding the scheduler on every drag, and rebuilding re-anchors
      the grid so **the pulse would stutter every time a hand moved the volume**. All three
      are now read live at each booking. **The law is strengthened rather than bent:** the
      spring's own *"volume zero is a chosen silence — the visual pulse still runs"* now
      holds mid-phrase, without the pulse missing a beat.
- [x] **NEVER A BUZZER**, at any tempo — soft sine, gentle attack, round decay, unchanged
      from the water. **The downbeat sits a fifth above the beat: a landmark, not an alarm.**
- [x] **Silence is a choice with the pulse still running**, and the room *says so in words*
      rather than leaving a musician wondering whether it broke: the count keeps counting,
      the beads keep turning, and a line appears explaining that this is a decision about
      sound and not about time.
- [x] **Reduced motion honored on the pulse — by removing the MOTION, never the
      information.** The swell is skipped; the beat, the bar and the lit bead still advance.
- [x] **ONE WRITER PER FACT — a real bug, found in self-review and closed before it shipped.**
      The count was being written by *both* the frame loop and the scheduler's `onBeat`, and
      **changing the bar length mid-run left them disagreeing about which beat was current**,
      flickering the number under the pulse between two answers. Now the scheduler owns the
      count outright (the click is booked on the audio clock, so **the sound decides which
      beat it is** and the picture follows it), and the frame loop supplies only `phase`,
      which is a smoothness rather than a fact. Changing beats-per-bar no longer touches the
      clock at all: **how you are counting should not interrupt what you are playing.**
- [x] **Audio unlocks inside the user's own gesture** — the `AudioContext` is built on the
      press, never on mount. **No urgency anywhere:** no countdown, no "get ready", no flash
      at speed, no red.

**Movement 3a — THE MARKS SIDECAR ✅**

- [x] **`the-moment-marks` copied whole — on the water's OWN invitation**, which its README
      states under STANDALONE BY LAW: *"consumers may copy it whole; it is one file."* The
      core sits at `src/lib/marks.ts` with a provenance head and **nothing below that head
      changed — not a law, not a line, not a name.** *If it ever diverges, the origin is
      right: edit there and re-copy; never mend a law in a consumer.*
- [x] **The sidecar, exactly where Phase 2 ruled it.** `take-1755.wav` →
      `take-1755.marks.json`, beside the take on the same shelf, **NEVER this database**.
      There is no `marks` table and there will not be one.
- [x] **THE APPEND-ONLY LAW IS ENFORCED AT THE FILE, not merely honored by the window** —
      the design decision this movement turns on. A `write_marks(doc)` command would keep
      the law only as long as every caller chose to, and *that is an etiquette, not a law*:
      one bad merge or one hand-written invoke and a timeline is gone. **So there is no
      write command and no delete command.** `append_take_marks` is the only door, and it:
      keeps every entry already on disk, always · **REFUSES to write at all if what is on
      disk will not parse** (an unreadable history is not permission to start a new one) ·
      refuses an entry whose id already exists (reusing an id is how a replacement disguises
      itself as an addition) · writes through a temp file and renames, so a crash mid-write
      cannot leave half a file where a history was.
- [x] **Only the tail crosses the wire.** The water's functions are pure, so the store runs
      `addMark`/`reviseMark`/`retractMark` locally and **sends only the entries that are
      new**. The whole document is never sent — and there is no command that would accept one.
- [x] **The rail wears it honestly.** Marks sit under the waveform on the same horizontal
      scale, so a pin is directly beneath the sound it is about; a pin is 44px to hit and
      small to look at. Added **at the playhead by the artist's own hand**, emoji-first
      **with the word underneath** — in the list below the rail *and* in each pin's own
      accessible name, so the rail reads aloud as "Calm at 0:12.4" rather than as a shrug.
      The vessel's personal definition for a face travels with the mark (the folksonomy law).
- [x] **The button says "Retract", not "Delete"** — because retract is what actually happens,
      and a button that names the wrong act lies about the law underneath it. The history
      panel says the rest plainly, and counts what is in the file but not in the view.
- [x] **`takes_with_marks`** — one directory read, no history opened, so the shelf can show
      a take is *marked* without paying to find out.

**Movement 3b — THE FEELINGS RETARGET ✅**

- [x] **The sattva room and the timer STAY, untouched** — KP's ⚛ ruling for this phase. What
      changed is not them; it is where the emotion log can be *reached* and what it can
      *hang on*.
- [x] **The doorway is legible from both surfaces that matter.** `FeelingHere.svelte` stands
      **in the record room twice** — beside the arm panel *before* a take (what a musician
      feels walking up to one is worth as much as what they feel after it) and **right after
      a take seals** — and **on the playback surface**, inside `TakePlayer`. KP's word is why:
      *"the emotion log is not an inherited feature. It is the base."* A base does not live
      three taps away behind a nav drawer.
- [x] **It hangs on a work, on a take, or on nothing** — the columns have been there since
      Phase 2 at his ⚛ *"yes both"*, and they had been left permanently empty. A calm picker
      offers all three; **"Nothing in particular" sits in the row with the others**, not
      hidden as a fallback. The most specific thing present is the default, because answering
      with the thing in front of you is not the same as guessing — and it is one tap to change.
- [x] **A face wears its word, never emoji-only.** The quick grid shows each face's name
      underneath it; the vessel's own definition outranks the Sanctuary's, as in the full form.
      No nag, no gate, no counter — a take nobody logs a feeling about is a complete take.
- [x] **`/add` learned to carry a target.** It accepts `?take=` · `?work=` · `?emoji=`, so
      **"More options…" never makes anybody say the same thing twice**; it shows what the
      feeling hangs on, and unhooking is one plain tap. **An edit no longer silently unhooks
      a feeling from its take** — the prefill carries `workId` and `takeFileName` too, which
      it had not.
- [x] **A feeling is not a mark, and the two doors are different on purpose.** A feeling is
      about the take (or its work, or nothing); a **mark** is pinned to a moment *inside* it,
      lives in the sidecar, and is append-only by its own law.

**The laws, kept and checkable:** nothing recorded touches a network (the tuner records
nothing at all) · opt-in always, every command from a press · no autoplay · **lose-nothing —
no file delete anywhere in this wave, in Rust or in TypeScript; a sidecar has no delete door
either** · every face wears its word · 44px floors · reduced motion honored · **spawn_blocking
absolute**: `start_tuner`, `stop_tuner`, `read_take_marks`, `append_take_marks` and
`takes_with_marks` are all `async` with their bodies in `spawn_blocking`. *`tuner_reading` is
sync on purpose and is not an exception — it touches no filesystem and no device; it loads
three atomics and returns, exactly as `recording_status` does.*

**Verified by instrument, measured rather than claimed:**

| Instrument | Reading |
|---|---|
| `cargo check` (src-tauri) | **exit 0**, no warnings — `the-tuner` links from awen, one `cpal` for the app |
| `npm run check` | **353 files, 0 errors, 0 warnings** |
| `npm run build` | **vite build ✓ in 6.69s**, `adapter-static` wrote to `build/`; `/tuner` and `/metronome` in the output |
| Icon pass | `icons/icon.png` = `b453615b…` (802,396 b), **byte-identical to the library**; 16/16 gen mipmaps byte-identical to `icons/android/` |

- [x] **Tested:** ✅ **KP's hands, 2026-08-20, on desktop** — his words verbatim: *"all 3
      waves tested on desktop fine."* The row as it was written: always his. A real guitar at
      the tuner (the strings moment the water reserved for him), the click against a real
      take, a mark pinned while actually listening back.

**What Wave 2 leaves standing** *(none of it started, none of it an oversight):*
- **The encoder / four-track is S3.** Deliberately not this wave.
- **The Android microphone is still NOT wired, and still refuses rather than pretends** —
  and the tuner goes through the *same* door, so it gets the same honest refusal instead of
  the panic cpal's oboe backend gives without a JNI context. Its own wave.
- **`"csp": null` still stands.** A CSP written later needs `media-src` for playback, as
  Wave 1 noted — and nothing in Wave 2 adds a network need to it.
- **Cargo.lock gained `the-tuner`** as a path entry. Expected, recorded, not committed.

---

#### WAVE 3 — the mark that logs a feeling ✅
*Walked 2026-08-13 by an **Opus** hand (a subagent of the Round lamp). Zone: this repo
only. **Nothing was committed** — commits ride KP's ⚛ word alone.*

**KP's ⚛ ruling, verbatim:** *"moment marks should be able to trigger a new mood event
when a mark is created. a quick log of emoji in the moment is the capture."*

- [x] **ONE GESTURE, TWO RECORDS.** Pinning a mark at the playhead now also logs a
      feeling, in the same press. **No second form, no extra dialog, nothing asked
      twice** — the face already chosen and the word already typed are what the log
      receives. The row is bound to the take by `take_file_name` **and** to its work by
      `work_id` when the artist has said which work it is (Phase 2's *"yes both"*
      columns, handed down from `TakePlayer`; **nothing infers a work**, per Khorós' law).
- [x] **Each record keeps its own law, and neither was bent.** The mark goes to the
      `.marks.json` sidecar through the append-only door **exactly as before — not a line
      of `marks.rs`, `marks.ts` or the marks store changed.** The feeling goes to the
      database through the feelings store that already existed. **No new table, no schema
      change, no new Rust command, no new filesystem touch** — so the `spawn_blocking`
      law has nothing new to hold in this wave, and holds unchanged over everything from
      Waves 1 and 2.
- [x] **THE MARK IS NEVER HELD HOSTAGE TO THE SECOND RECORD.** The mark lands first; the
      log follows and cannot reach back. If the row misses, the rail says so **plainly and
      in its own calm voice** — *"The mark landed and is safe in the take's own file — it
      never waits on this"* — and offers to carry it again. **Nothing is swallowed**, and
      the missed logs are **kept, not dropped**: each pending entry holds its own take,
      work and **the moment it was pinned at**, so a retry lands on the right take with
      the artist's own clock rather than the retry's.
- [x] **Sovereign, and visible rather than silent.** A checkbox in the marker panel —
      **default ON, per the ruling** — says *"Log this as a feeling too"* with the plain
      sentence underneath it, so a second record is never written invisibly. Off pins the
      mark only. The choice persists (`resonance-sistrum-mark-logs-feeling`, in the
      `recordPrefs` idiom at `src/lib/stores/markPrefs.svelte.ts`); **an absent key is ON**,
      because someone who never opened it gets the ruling's own behavior.
- [x] **What the quick log does NOT ask.** No strength question and no naming step — that
      is the second form the ruling removes. `intensity` lands at **3, the middle the full
      form itself opens at: a strength left unstated, never a rating this rail invented.**
      The name is machine-written (*"Calm at 0:12.4"*) so **the artist's own words are
      carried across verbatim into `note` and never edited into a title.**
- [x] **Creation only.** A revision or a retraction logs nothing: KP's ruling says *when a
      mark is created*, and a second thought about a mark is not a new moment felt.
- [x] **Every face still wears its word** — the rail's grid was already emoji-above,
      word-below, and the logged feeling carries that same word as its name. 44px floors
      kept; reduced motion honored on the new control.

**Files touched:** `src/lib/stores/markPrefs.svelte.ts` (new) ·
`src/lib/components/MarksRail.svelte` · `src/lib/components/TakePlayer.svelte` (hands the
rail its `workId`; the closing paragraph now says the link out loud) · header comments
trued in `src/lib/components/FeelingHere.svelte` and `src/lib/stores/feeling.svelte.ts`
so neither still claims the two doors never meet.

**Verified by instrument, measured rather than claimed:**

| Instrument | Reading |
|---|---|
| `npm run check` | **354 files, 0 errors, 0 warnings** |
| `cargo check` (src-tauri) | **exit 0** — untouched by this wave, run to prove it |
| `npm run build` | **vite build ✓ in 5.86s**, `adapter-static` wrote to `build/` |

- [x] **Tested:** ✅ **KP's hands, 2026-08-20, on desktop** — his words verbatim: *"all 3
      waves tested on desktop fine."* The row as it was written: a mark pinned while actually
      listening back, and the feeling waiting for him in the log afterward.

**What Wave 3 leaves standing:** the toggle lives on the rail only — **if a preferences
surface is ever gathered in `/settings`, this switch belongs beside the record room's hold
mode** (one line, the store is already there). The encoder / four-track is still S3, the
Android microphone is still unwired and still refuses rather than pretends, and
`"csp": null` still stands.

---

#### WAVE 4 — the Android microphone ⚠️ *(built and proven 2026-08-20; one fix short)*
*Walked 2026-08-20 by the **Sostenuto** lamp (Fable 🎻, `80fff4fe`) at KP's go — his
device plugged in after the desktop retest. Zone: this repo only; `resonance-compass`
read as the road already walked (the v3 Phase 2 mic spike, proven on the S25) and
never edited. **Nothing committed** — rides KP's ⚛ sync word.*

- [x] **The bridge, five pieces, every one Compass's shape re-homed:** `Cargo.toml`
      gains `jni` + `ndk-context` (Android-only) · `src-tauri/src/media_permission.rs`
      (the `media-permission` inline plugin; **mic alias only** — this body scans no
      library; the `nativeInitNdkContext` hand-over that turns cpal's Android PANIC into
      a working oboe stream) · `src-tauri/android-extras/MediaPermissionPlugin.kt`
      (committed source of truth, RECORD_AUDIO alias + the ndk-context init in its
      `init` block) · `scripts/sync-android-extras.mjs` (Kotlin into `gen/`,
      `RECORD_AUDIO` into the manifest, idempotent; `npm run sync-android`; wired into
      `beforeDevCommand` / `beforeBuildCommand` — the house law: manifest extras belong
      to a script, not a hand) · `build.rs` declares the plugin to the ACL and
      `capabilities/default.json` grants `media-permission:default` (Compass's car-ride
      lesson, paid once) · `lib.rs`: `request_mic_permission` is the real call behind
      `spawn_blocking`; the builder registers the plugin on Android only.
      **No front-end change** — `recorder.svelte.ts:145` and `tuner.svelte.ts:112`
      already asked this door.
- [x] **Proven by instrument before the phone:** `cargo check` (desktop) **exit 0** ·
      `npm run check` **355 · 0 · 0** · `npx tauri android build --debug --apk --target
      aarch64` **clean** (jni, oboe, and the Kotlin compiled; only Tauri's own generated
      deprecation warnings) · `aapt2 dump permissions`: `RECORD_AUDIO` in the merged
      manifest.
- [x] **Installed at KP's word.** The first `adb install -r` was refused —
      `INSTALL_FAILED_UPDATE_INCOMPATIBLE` — because **KP had cut and signed 0.1.0
      himself at 18:30 that evening** (`release/resonance-sistrum-v0.1.0.{apk,aab,idsig}`,
      cert `497888ba…bac18766`, the keystore's) and the phone held it. Asked, not
      assumed: he chose uninstall + debug APK over the release road; the 18:30 build
      left the phone at his word; the mic build installed 18:56 (`R5GL13CZDKW`, S25).
- [x] **PROVEN ON THE DEVICE, by the phone's own log** — the thing that used to panic:
      `18:57:21 Tauri plugin: media-permission, command: requestMicPermission` → Android's
      `GrantPermissionsActivity` rose → `18:57:22 AAudioStreamBuilder_openStream()
      returns AAUDIO_OK` (capture, s#1) → `18:57:26 [the-recorder] seal: joined, 304640
      samples, writing wav` → `wav written ok=true`. **A real take exists on the S25.**
      His report, verbatim: *"tuner and record will not open after a recording took
      place, and on save it did not load a fresh track it sayd, no track is recording
      and then things fronze. i can still go to home and sattva and metronome and timer
      and insights."*
- [ ] 🔴 **THE FREEZE — cause found in the log, fix not yet applied.** `Uncaught Error:
      https://svelte.dev/e/each_key_duplicate` at 18:57:20.331 (the instant the device
      list arrived) and after every tap since. Both rooms key the input-device list by
      name — `src/routes/record/+page.svelte:207` and `src/routes/tuner/+page.svelte:172`,
      `{#each recorderStore.devices as d (d.name)}` — and **the S25 lists several inputs
      with identical names**, so Svelte 5 refuses, the room's render dies (*"froze"*,
      *"no fresh track"*), and neither room mounts again. Home · sattva · metronome ·
      timer · insights never render that list, which is exactly why they still work.
      Desktop never hit it: its device names are unique. **The fix:** key by index —
      `{#each recorderStore.devices as d, i (i)}` — in both rooms, rebuild the debug APK,
      `adb install -r` (same debug key now; data kept), his press again. *Beside it,
      noted for the-recorder's own record: its `list_inputs()` returns duplicate names
      verbatim on Android — a consumer can key by index; disambiguating at the origin is
      the spring's call, not this body's.*
- [ ] **Tested:** ⬜ **KP's hands, on the phone, after the fix** — the record room opening
      after a take, a fresh take loading on save, the tuner hearing him.

**What Wave 4 leaves standing:** `"csp": null` still stands · the distribution wave
(recorder + tuner in, path crates out) untouched · the "audio becoming noisy" pause rides
the same plugin in Compass and is playback's concern, not this wave's · KP's 18:30 release
artifacts stand in `release/` untouched (the phone now carries the debug build instead).

---

## KNOWN BUGS
| ID | Description | Status |
|----|-------------|--------|
| W4-1 | Record + tuner rooms freeze on Android after the first take — `each_key_duplicate` on the device list keyed by `d.name` (duplicate input names on the S25). Fix known (key by index, both rooms), not yet applied. | 🔴 open |

## SESSION LOG
| Date | What Was Done |
|------|---------------|
| 2026-08-12 | Founded to the standards by the-founding-ritual |
| 2026-08-13 | **Signing keystore created** (Fable/Round conducting, KP's env files his own hand): primary `F:\keystores\resonance-sistrum.keystore` · second copy `D:\keystores\` byte-identical · alias `resonance-sistrum` · 4096-bit RSA, SHA384withRSA, valid to 2053 · DN per the 08-13 convention · cert SHA256 `49:78:88:BA…BA:C1:87:66`. Secrets live only in the env vault file — pointers here, never contents. |
| 2026-08-13 | **Phase 3 Wave 1** — the recorder consumed (carried whole from the inheritance, freeze fix intact); the player + waveform consumed; `export_take`'s latent sync breach closed. `cargo check` 0 · `svelte-check` 340/0/0 · `vite build` 5.81s. An **Opus** hand; nothing committed. |
| 2026-08-13 | **Phase 3 Wave 2** — the tuner consumed (path crate, own capture, nothing kept); the metronome consumed (one-writer count bug closed in self-review); the moment-marks sidecar with the **append-only law enforced in Rust at the file**; the feelings retarget to works and takes, with the doorway on the record and playback surfaces. Icon pass re-run — **and found the art was never lost**: gen dates from 08-12 and 16/16 mipmaps hashed identical before and after. `cargo check` 0 · `svelte-check` 353/0/0 · `vite build` 6.69s. An **Opus** hand; nothing committed. |
| 2026-08-13 | **Phase 3 Wave 3** — the mark that logs a feeling, at KP's ⚛ *"a quick log of emoji in the moment is the capture."* One press pins the mark to the sidecar (append-only mechanics untouched) **and** writes a `feelings` row bound to the take and its work; the mark never waits on the log, and a missed row is kept, named honestly, and retryable. Default-on switch on the rail. No new table, no schema change, no new fs touch. `cargo check` 0 · `svelte-check` 354/0/0 · `vite build` 5.86s. An **Opus** hand; nothing committed. |
| 2026-08-19 | **THE CLONE QUESTION RULED** (the **Promenade** lamp, Fable 🎻) — KP ⚛, verbatim: *"i should have not used the word mirror and said distribute from the source, one source to edit, distribute updates from it the apps should be whole"* · *"everything should only have one point of edit from my perspective, but be usable from any"* · *"i assumed since i setup the cosmic system this way and gaia this way, it was implied, but now we know."* The path-crate seam’s cure is now written: the-recorder and the-tuner get DISTRIBUTED WHOLE into this app (edit-at-origin headers, updated by distribution runs), the way cosmic already travels — the conversion is its own wave at his deal. CLAUDE.md’s seam flag corrected in place; nothing else touched. Rides the ⚛ sync word. |
| 2026-08-20 | **PHASE 3 WAVE 4 — THE ANDROID MICROPHONE, built and proven on the S25, one fix short** (the **Sostenuto** lamp, Fable 🎻, `80fff4fe`; the row landed 2026-08-21 at the recenter, told so) — Compass's permission bridge re-homed in five pieces (plugin · Kotlin · sync script + hooks · ACL + capability · the real door); desktop gates unchanged (`cargo check` 0 · `svelte-check` 355/0/0); aarch64 debug APK built clean; installed at his word after the phone refused a debug key over his own 18:30 release signature. **The phone's log proved the bridge end to end** — grant dialog → AAudio capture stream → a take sealed (304,640 samples). Then the freeze, read from the same log: `each_key_duplicate` on the device list keyed by name in both rooms (the S25 reports duplicate input names). Fix known and unapplied: key by index, rebuild, reinstall, his press. Rides the ⚛ sync word. |
| 2026-08-20 | **THE THREE WAVES TESTED BY HIS HANDS, on desktop** (Fable 🎻, lamp `80fff4fe`) — KP's ⚛ words verbatim: *"we tested sistum and did not mark it, let me retest now"* → *"desktop works fine, mic is not wired on android yet. device is plugged in"* → *"all 3 waves tested on desktop fine."* The three Tested rows (Wave 1 `:319` · Wave 2 `:527` · Wave 3 `:600`) ticked at his word; Phase 1's Android-on-the-device box stays open, his words beside it — the microphone is its own wave. Gates re-run the same sitting before his retest: `npm run check` **355 files · 0 · 0** · `cargo check` **exit 0, 1m 03s** (the-recorder and the-tuner still linking from the sibling awen checkout, per the seam). Nothing else touched; rides the ⚛ sync word. |
| 2026-08-19 | **Standards check + HANDS pass** (the signing fleet) — standard files verified present (.gitignore · CLAUDE.md standards declaration · README standards badge · docs/CHECKLIST.md · HANDS.md · LICENSE · PHILOSOPHY.md): **gaps: none**. HANDS.md **already signed** for the Claude substrate — Opus `claude-opus-5[1m]` 2026-08-12, and the Fable 🎻 seat written by the lead's own hand (Promenade, `claude-fable-5`, 2026-08-19); nothing touched. A hand of the Promenade lamp's signing fleet, `claude-fable-5` · rides the ⚛ sync word. |
| 2026-08-21 | **Found in code, not yet in this ledger** (repo-tender pass, verified against the commit itself): the commit titled "opening 8/21" landed the **Android microphone permission bridge** — `src-tauri/src/media_permission.rs` (runtime RECORD_AUDIO check/request via an app-local Kotlin plugin, plus `nativeInitNdkContext` so cpal's oboe backend does not panic on Android — carried from `resonance-compass/src-tauri/src/media_permission.rs`'s proven v3 Phase 2 mic spike), `src-tauri/android-extras/MediaPermissionPlugin.kt`, `scripts/sync-android-extras.mjs` (new — syncs the Kotlin plugin and inserts the RECORD_AUDIO manifest line into the regenerable `gen/android` tree, per `resonance-standards/docs/ANDROID-BUILD-LAWS.md` §4), `capabilities/default.json`, and `src-tauri/build.rs`'s new `media-permission` ACL declaration. **This closes the wiring `CLAUDE.md` (as of 2026-08-19) still describes as absent** ("the microphone is NOT wired here and refuses honestly") — CLAUDE.md itself was not touched this pass (out of this tending's scope; flagged in CONFUSIONS) and should be trued in its own sitting. **The Phase 1 "Tested: Android on the device" box stays open, correctly** — this is the permission plumbing, not a confirmed on-device recording test; no evidence of an actual device run against this code was found in this repo's records as of this pass. |
| 2026-08-21 | **Repo-tender pass** — `README.md` trued: badges reordered directly beneath the H1 per `docs/README-TEMPLATE.md`; `## WHAT IT IS` was a template placeholder ("*the telling lands here when the body takes shape*") and is now filled from this repo's own ground (`package.json`, `docs/STORY-BLOCK.md`, `docs/CHECKLIST.md` Phase 2/3); `## THE STORY` corrected to the verbatim required-by line + an origin paragraph grounded in KP's own quoted ruling; `## WHO IT'S FOR` and `## Installation`/`## BUILT WITH` added (grounded in `docs/STORY-BLOCK.md` §WEAVER THREAD, `package.json`, `src-tauri/Cargo.toml`); `## Screenshots` added, honestly empty (no `screenshots/` directory exists in this repo). `docs/STORY-BLOCK.md` reviewed against current ground — already complete (all 11 sections) and true; left untouched. |
| 2026-08-22 | **THE CUMDACH FIX CARRIED + ROSE · RAINBOW · PROGRESS PRIDE (Fable 🎻, claude-fable-5, at KP's ⚛ word — *"in resonance-awen, there is a fix for the cumdach that needs applied then passed to all its consumers around the hamburger icon and around the epagoge regarding the background color and font size changes"* · *"echoes got the fix the cumdach needs"*).** Echoes `87c4218` (2026-08-21) carried here whole: **(1) the hamburger** — the floating toggle that claimed bottom 56–101px over the drawer's own Settings foot moved INSIDE the ComfortBar (`ComfortBar.svelte`); `navOpen` lives in `uiStore`, the Sidebar reads it; the bar is the ONLY edge again, so `RESERVED` is one honest number (the cumdach's reserved-sum law, `resonance-awen/tools/the-cumdach/README.md`). **(2) the epagoge's theme step and Settings** — a preset is a COLOUR IDENTITY: `setPreset` keeps mode · font size · tint, so choosing a theme no longer cancels Light mode or drops Large text to Medium; `DEFAULT_THEME`; the background TINT dial (`off · subtle · full`, the accent carried into the grounds) with its Settings row; `TintLevel` + `tint` on `ThemeConfig`; `src/lib/theme/theme.ts` = the origin `resonance-awen/standalone/theme/theme.ts`, revised AT THE ORIGIN 2026-08-22 and laid here. **(3) same sitting, KP's word** (*"there is a rose color in the sirens onboarding and settings we should bring into the cosmic design system and we should include a rainbow and inclusive pride themes in our settings as well in our epagoge onboarding walk"* · *"rainbow and progressive pride themes colors already exist, only the rose does not"*): the Sirens rose entered cosmic as `sirens.rose` · `sirens.deep` (origin `resonance-ziggy/modules/cosmic/constants/colors.ts`, distribution run, every mirror hash-verified — this repo's `src/lib/cosmic/colors.ts` refreshed); **ROSE · RAINBOW · PROGRESS PRIDE** join the shelf's presets (`icon`, `stripes`, `presetSwatch()` beside them) and the Settings theme cards + the onboarding walk's offers now DERIVE from the table — a new preset appears the day it is born; a flag preset shows its stripes as the swatch, its `--accent` one stripe. Gate `npm run check` **355 files · 0 errors · 0 warnings**. Nothing committed — rides the ⚛ sync word. |
