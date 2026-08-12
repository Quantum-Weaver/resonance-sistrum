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
- [ ] **Tested:** ⬜ KP's hands — Android on the device

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

### Phase 3: Awen fills it ⬜
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

## KNOWN BUGS
| ID | Description | Status |
|----|-------------|--------|

## SESSION LOG
| Date | What Was Done |
|------|---------------|
| 2026-08-12 | Founded to the standards by the-founding-ritual |
