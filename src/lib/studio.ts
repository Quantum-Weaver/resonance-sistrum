// studio.ts — the studio's arithmetic, pure. No DOM, no clock, no disk, no
// Web Audio: numbers in, numbers out, so every rule the room lives by can be
// proven in a node script (`.journals/proofs/`) without a window.
//
// THE STUDIO (2026-09-02, a Fable hand dealt by Caesura 🎻), at KP's ⚛ word,
// spelling kept: "sistrum will now need a multi tract studio for mixing and
// layering recorded tracks." The plan is `docs/THE-STUDIO-PLAN.md`.

// ── The session document (the plan's §4.1) ──────────────────────────────────
//
// A `<name>.session.json` sidecar on the takes shelf. A track POINTS at a
// take by file name — nothing copied, and the take is the truth for its own
// length and rate. The on-disk shape is snake_case, the marks' own habit.

export const SESSION_FORMAT = 'sistrum-session' as const;
export const SESSION_VERSION = 1 as const;

export interface SessionTrack {
	/** Stable within the session — a lane keeps its identity across edits. */
	id: string;
	/** The take on the shelf, by file name. Never a path. */
	take: string;
	/** 0..2, the encoder's own range; 1 is unity. */
	gain: number;
	mute: boolean;
	solo: boolean;
	/** Where the take starts on the mix's clock, in whole milliseconds. Never below zero — the encoder offsets forward only. */
	offset_ms: number;
	/** -1 (left) .. 1 (right). */
	pan: number;
}

export interface SessionDoc {
	format: typeof SESSION_FORMAT;
	version: typeof SESSION_VERSION;
	name: string;
	tracks: SessionTrack[];
	/** ISO timestamps. */
	created_at: string;
	updated_at: string;
}

export function newSession(name: string, at: string = new Date().toISOString()): SessionDoc {
	return {
		format: SESSION_FORMAT,
		version: SESSION_VERSION,
		name,
		tracks: [],
		created_at: at,
		updated_at: at
	};
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** A track with every field held to its lawful range. */
export function normalizeTrack(t: SessionTrack): SessionTrack {
	return {
		id: t.id,
		take: t.take,
		gain: clamp(Number.isFinite(t.gain) ? t.gain : 1, 0, 2),
		mute: Boolean(t.mute),
		solo: Boolean(t.solo),
		offset_ms: Math.max(0, Math.round(Number.isFinite(t.offset_ms) ? t.offset_ms : 0)),
		pan: clamp(Number.isFinite(t.pan) ? t.pan : 0, -1, 1)
	};
}

/**
 * Validate a document read from disk, with honest errors. Unknown keys are
 * dropped from the tracks (the shape is the contract); nothing is invented.
 */
export function parseSession(raw: unknown): SessionDoc {
	const d = raw as Partial<SessionDoc> | null;
	if (!d || typeof d !== 'object') throw new Error('a session document is an object');
	if (d.format !== SESSION_FORMAT)
		throw new Error(`not a sistrum-session document (format: ${String(d.format)})`);
	if (d.version !== SESSION_VERSION)
		throw new Error(`unknown session version ${String(d.version)} — this reader speaks version 1`);
	if (typeof d.name !== 'string' || !d.name) throw new Error('a session carries a name');
	if (!Array.isArray(d.tracks)) throw new Error('tracks must be an array');
	const tracks = d.tracks.map((t, i) => {
		const tr = t as Partial<SessionTrack>;
		if (typeof tr.id !== 'string' || !tr.id) throw new Error(`track ${i}: every track carries a stable id`);
		if (typeof tr.take !== 'string' || !tr.take) throw new Error(`track ${i}: a track points at a take`);
		if (/[\\/]|\.\./.test(tr.take)) throw new Error(`track ${i}: take names never carry paths`);
		return normalizeTrack({
			id: tr.id,
			take: tr.take,
			gain: typeof tr.gain === 'number' ? tr.gain : 1,
			mute: Boolean(tr.mute),
			solo: Boolean(tr.solo),
			offset_ms: typeof tr.offset_ms === 'number' ? tr.offset_ms : 0,
			pan: typeof tr.pan === 'number' ? tr.pan : 0
		});
	});
	return {
		format: SESSION_FORMAT,
		version: SESSION_VERSION,
		name: d.name,
		tracks,
		created_at: typeof d.created_at === 'string' ? d.created_at : new Date(0).toISOString(),
		updated_at: typeof d.updated_at === 'string' ? d.updated_at : new Date(0).toISOString()
	};
}

/** Canonical JSON — keys sorted at every depth — so two documents that mean the same compare equal as text. */
export function canonicalJson(value: unknown): string {
	const sort = (v: unknown): unknown => {
		if (Array.isArray(v)) return v.map(sort);
		if (v && typeof v === 'object') {
			const out: Record<string, unknown> = {};
			for (const k of Object.keys(v as object).sort()) out[k] = sort((v as Record<string, unknown>)[k]);
			return out;
		}
		return v;
	};
	return JSON.stringify(sort(value));
}

// ── Hearing the mix (the plan's §4.5) ───────────────────────────────────────

/**
 * Where one lane goes on the context's clock when the mix is at `position`
 * seconds and the lane starts at `offsetSecs` and runs `durationSecs`.
 *
 *   · the lane has not started yet → start it LATER on the clock, from its top;
 *   · the mix is inside the lane    → start it NOW, from partway in;
 *   · the lane is already over      → nothing to schedule.
 *
 * `now` is the AudioContext's currentTime at the moment of pressing play.
 * Returned times are absolute on that same clock; `bufferOffset` is seconds
 * into the lane's own buffer.
 */
export function scheduleLane(
	now: number,
	position: number,
	offsetSecs: number,
	durationSecs: number
): { when: number; bufferOffset: number } | null {
	if (!(durationSecs > 0)) return null;
	const p = Math.max(0, position);
	const o = Math.max(0, offsetSecs);
	if (p < o) return { when: now + (o - p), bufferOffset: 0 };
	if (p < o + durationSecs) return { when: now, bufferOffset: p - o };
	return null;
}

/** The mix's own length: the far edge of its farthest lane. */
export function mixLength(lanes: { offsetSecs: number; durationSecs: number }[]): number {
	let end = 0;
	for (const l of lanes) end = Math.max(end, Math.max(0, l.offsetSecs) + Math.max(0, l.durationSecs));
	return end;
}

/**
 * What a lane's gain node should carry, mute and solo applied. Solo is a
 * room-wide fact: when ANY lane is soloed, every lane that is not soloed
 * falls silent. Mute wins over solo on the same lane.
 */
export function effectiveGain(lane: { gain: number; mute: boolean; solo: boolean }, anySolo: boolean): number {
	if (lane.mute) return 0;
	if (anySolo && !lane.solo) return 0;
	return clamp(lane.gain, 0, 2);
}

/** The mix position at a moment on the clock, given when play began. */
export function positionAt(now: number, startedAt: number, startPosition: number): number {
	return Math.max(0, startPosition + (now - startedAt));
}

// ── The bounce (the plan's §4.2) ────────────────────────────────────────────

/** The layer shape `mixdown` takes across the boundary. */
export interface MixLayer {
	file_name: string;
	offset_secs: number;
	volume: number;
	pan: number;
	fade_in: number;
	fade_out: number;
}

/**
 * Session tracks → encoder layers. Muted lanes are left out entirely, and
 * when any lane is soloed only the soloed lanes go — the bounce hears what
 * the room hears. Nothing is normalized; the encoder sums and the writer
 * clamps, its own contract.
 */
export function sessionToLayers(tracks: SessionTrack[]): MixLayer[] {
	const anySolo = tracks.some((t) => t.solo);
	return tracks
		.filter((t) => effectiveGain(t, anySolo) > 0)
		.map((t) => ({
			file_name: t.take,
			offset_secs: Math.max(0, t.offset_ms) / 1000,
			volume: clamp(t.gain, 0, 2),
			pan: clamp(t.pan, -1, 1),
			fade_in: 0,
			fade_out: 0
		}));
}
