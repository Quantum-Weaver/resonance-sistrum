// Theme customization
export type TintLevel = 'off' | 'subtle' | 'full';

export interface ThemeConfig {
  mode: 'dark' | 'light' | 'amoled';
  accentColor: string;
  presetName?: string;
  fontSize: 'small' | 'medium' | 'large';
  /** How far the accent bleeds into the background. The reader's choice, not
   *  the app's - added 2026-08-21 at KP's word, "which i like, but others may
   *  not." A config saved before this field existed is merged over the default
   *  and reads as 'subtle', which is what its owner was already seeing. */
  tint: TintLevel;
}

// ── The domain (KP's ⚛ ruling, 2026-08-12: "yes, works, takes, feelings,
// moment-marks, release") ────────────────────────────────────────────────
//
// The nouns are the house's own, not invented here:
//   work   — the-release-model's word. "A release references works, never
//            absorbs them." A release itself lives in resonance-khoros, the
//            music hall; it reaches back to a work by its id.
//   take   — the-recorder's word. One attempt.
//   feeling— the retargeted Echoes shape. KP: "logging how we feel during a
//            moment is the base of all we do."
//   mark   — the-moment-marks' word, for feeling pinned to a POSITION in a
//            take. That water is already built and append-only by law; it
//            lives in a `.marks.json` sidecar, never in this database.
//
// Deliberately NOT used: `Track`. In this house a track is a lane in a
// four-track and a release form, and the Compass's `Track` type is licensed-
// library media (artist/album/genre/coverArt). The boundary is rights: the
// Compass works with sound you already own, Sistrum makes new sound.

// Work — the thing being made.
export interface Work {
  id: string;
  title: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

// Take — one attempt at a work.
// The FILE ON DISK IS THE TRUTH. `the-recorder` owns the takes directory and
// reads each WAV's own header; this row only carries the MEANING around it —
// which work it belongs to, what it was called, what was thought about it.
// A take row may exist with no work: not every attempt belongs to something
// yet, and that is honest rather than untidy.
export interface Take {
  fileName: string;
  workId?: string;
  name?: string;
  note?: string;
  seconds?: number;
  sampleRate?: number;
  channels?: number;
  /**
   * The held place — KP's ⚛ ruling: the collaboration layer does not belong in
   * a recorder, so the recorder holds one json column for it and "the colum
   * will come to life when reeady."
   *
   * It will carry the signed hand that made this take and the GRANT that
   * travels with it, so that many musicians can record their parts sovereignly,
   * an engineer can finish the project, and every credential combines — opt-in
   * always, "no force or deceptive theft," and a work's credit derives from
   * grants rather than from possession of a file.
   *
   * `unknown` on purpose. Nothing here writes it, nothing validates it, and
   * nothing may drop it: whatever a hand puts here rides whole.
   */
  provenance?: unknown;
  createdAt: number;
}

// Feeling — how it felt, at a moment.
// Hangs on a work, on a take, or on NEITHER. A feeling that belongs to
// nothing is still a feeling: KP's own reason for the whole log is
// "how we discover our values and internal core interests, which help us
// align with ourselves" — and that does not require a subject.
// For feeling pinned to a POSITION inside a take, use the-moment-marks.
export interface Feeling {
  id: string;
  workId?: string;
  takeFileName?: string;
  name: string;
  sense: string;
  subcategory: string;
  emoji: string;
  note?: string;
  intensity: number;
  timestamp: number;
  createdAt: number;
}

// Sense — top-level perception category (Seen, Heard, Felt, Thought, etc.)
export interface Sense {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

// Subcategory — fine-grain entry under each Sense
export interface Subcategory {
  id: string;
  senseId: string;
  name: string;
  description: string;
}

// Emoji definition — the sensory lexicon atom (canonical shape lives in emojis.ts)
export type { EmojiDef as EmojiDefinition } from '$lib/data/emojis';
