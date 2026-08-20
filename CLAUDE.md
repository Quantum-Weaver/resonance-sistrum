# CLAUDE.md — resonance-sistrum

**Stack:** Svelte 5 · Tauri v2 · Rust · SQLite · COSMIC design tokens

**Authors:** see [HANDS.md](HANDS.md) — the voices are named there, each
in their own words, per the Hands Standard.

*SEED-class: planted once from the [Sanctuary
Standards](https://github.com/Quantum-Weaver/resonance-standards), this repo's
own from then on, and no agent overwrites it (DOC-CLASSES law). Trued 2026-08-14
at KP's ⚛ word (the lean doors plan, chamber desk); the struck text — two
founding placeholders, honest on 08-12 and three waves stale by 08-14 — lives in
this repo's git history.*

---

Enter by **`docs/CHECKLIST.md`** — the newest rows ARE the current state. One
pass, one scoped duty; zero errors before commit; the checklist updates in the
same sitting as the work it records.

## Ground rules

- **Any command touching the filesystem is `async` and runs its body in
  `spawn_blocking`. No exceptions.** Carried in from the Compass, permanent on
  this road. Its provenance is a freeze, not a preference: `list_takes` was sync
  on the main thread, and Tauri delivers replies on that thread — the save's own
  answer could not land. Wave 1 (2026-08-13) closed a second, latent instance:
  `export_take` arrived from the inheritance SYNC, copying a whole WAV on the
  main thread. The three commands that stay sync are not exceptions — they touch
  no filesystem at all.
- **`takes.provenance` — the held place** (2026-08-12). KP's ⚛ ruling: *"none of
  that belongs in the recorder, the recorder db structure simply requires a jsonb
  column to handle the expected use case, the colum will come to life when
  reeady"* — *"i meant json."* Nothing writes it, nothing validates it, and
  **nothing may drop it**: unreadable json comes back as the raw string rather
  than being discarded.
- **Nothing infers a take's work** (2026-08-12), per Khorós' own law: *"ambiguous
  pairs return to the artist."* A work id is a promise — Khorós reaches back to
  it by id, so ids are generated once and never regenerated.
- **A moment-mark logs a mood, in the same press.** KP's ⚛ ruling 2026-08-13,
  verbatim: *"moment marks should be able to trigger a new mood event when a mark
  is created. a quick log of emoji in the moment is the capture."* Wave 3 built
  it so the mark lands first and is **never held hostage** to the second record:
  a missed log is kept with its own take, work and pinned moment, and retried
  against the artist's own clock. No cap on how many a song carries.
- **The path-dependency seam — RULED 2026-08-19, KP ⚛, his words verbatim:**
  *"i should have not used the word mirror and said distribute from the source,
  one source to edit, distribute updates from it the apps should be whole"* ·
  *"everything should only have one point of edit from my perspective, but be
  usable from any."* `src-tauri/Cargo.toml` reaches out of this repo twice by
  relative path (`the-recorder` and `the-tuner` at `../../resonance-awen/tools/`),
  so **a lone clone does not build** — and the cure is now written: the two
  waters get **distributed whole into this app** (edit-at-origin headers, updated
  by distribution runs, never hand-edited here), the way cosmic already travels.
  The conversion is its own wave at his deal; until it runs, the sibling awen
  checkout stands beside this repo to build. Compass walked the same road first;
  the seam is the family's, not this repo's invention.

## Structure

The forge's map: `docs/blueprints/pbp.ai.json` — regenerate, never hand-draw a
tree here.

## Tools

Own commands: 6 npm scripts — `dev` · `build` · `preview` · `check` ·
`check:watch` · `tauri`. No `tools/` folder here, by design. House tools and
this repo's registration state: the `house-tools` skill — cosmic-registered
08-12, and **not yet taught to the archivist's roster**, which is the one flag
that cannot be fixed after the fact. Signing and versions: `release-road`. The
Android side: `android-tauri` — the microphone is NOT wired here and refuses
honestly, because without the JNI context cpal does not error on Android, it
PANICS.


## Standards

This repo follows the
[Sanctuary Standards](https://github.com/Quantum-Weaver/resonance-standards).
`.gitignore`, this file, and `docs/CHECKLIST.md` are **SEED-class** --
planted once from the standards and this repo's own from then on. No
agent overwrites them (DOC-CLASSES law).

*(Section landed 2026-08-19 at KP's word: "standards section should be in
claude md files.")*


## The forge and the link tender

*(Landed 2026-08-19 at KP's word: each CLAUDE.md carries how THIS realm uses
them. tend.py is the one button — it sets UTF-8 once and never commits.)*

- **Blueprint forge** — one forge, every realm, no local copies (KP ⚛
  2026-08-03). Regenerate this realm's structure map (lands whole at
  `docs/blueprints/` + one journal line; structure is DISCOVERED, never
  declared — never hand-draw a tree):

      python c:/_superposition/resonance-ziggy/tend.py forge run --root c:/_superposition/resonance-sistrum

- **Link tender** — every markdown pointer in this realm, both house shapes,
  resolved three ways; every mend ledgered at
  `resonance-ziggy/modules/link-tender/MENDS.md`. **Dry first, always**, and
  read the report before mending:

      python c:/_superposition/resonance-ziggy/tend.py links dry --root c:/_superposition/resonance-sistrum
      python c:/_superposition/resonance-ziggy/tend.py links mend --root c:/_superposition/resonance-sistrum

  Its laws hold here as everywhere: homes are never entered, history is
  reported never rewritten, a pointer it may not verify is never "fixed,"
  and mimirs-well is sealed absolutely.
