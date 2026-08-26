// Theme customization
export type TintLevel = 'off' | 'subtle' | 'full';

export interface ThemeConfig {
  mode: 'dark' | 'light' | 'amoled';
  accentColor: string;
  presetName?: string;
  fontSize: 'small' | 'medium' | 'large';
  /** How far the accent bleeds into the background. A config saved before
   *  this field existed is merged over the default and reads as 'subtle'. */
  tint: TintLevel;
}


// Work — the thing being made.
export interface Work {
  id: string;
  title: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
}

// Take — one attempt at a work. The FILE ON DISK IS THE TRUTH; this row carries only the meaning around it, and may exist with no work.
export interface Take {
  fileName: string;
  workId?: string;
  name?: string;
  note?: string;
  seconds?: number;
  sampleRate?: number;
  channels?: number;
  /**
   * The held place: one json column the collaboration layer will use.
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

// Feeling — hangs on a work, on a take, or on NEITHER. For feeling pinned to a POSITION inside a take, use the-moment-marks.
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
