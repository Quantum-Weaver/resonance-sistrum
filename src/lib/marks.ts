// Copied whole from resonance-awen/tools/the-moment-marks/src/index.ts — edit at the origin, never here.

// Moment marks are APPEND-ONLY: an edit revises, a removal retracts, and the current view is DERIVED on every read, never stored.
// Marks pin to the TIMELINE, not the file — the path is a local pointer, never identity.

export interface MediaRef {
	/** what kind of timeline these marks pin to */
	kind?: 'audio' | 'video';
	/** a human name for the media — travels on share */
	title?: string;
	/** seconds, fractional — a courtesy check, never identity */
	duration?: number;
	/** optional consumer-provided hash of the media — identity when present */
	contentHash?: string;
	/** local pointer, a courtesy — NEVER travels on share */
	path?: string;
}

export interface Mark {
	/** stable id — the mark's identity across revisions and merges */
	id: string;
	/** seconds into the timeline — the moment */
	at: number;
	/** the reaction — structure, shared */
	emoji: string;
	/** the marker's own meaning for that emoji — sovereign */
	definition?: string;
	/** optional words — sovereign */
	note?: string;
	/** the marker's chosen name or sigil — structure */
	by?: string;
	/** ISO timestamp of the marking itself */
	madeAt: string;
	/** id of the mark this one revises (append-only edit) */
	revises?: string;
	/** id of the mark this one retracts (append-only removal) */
	retracts?: string;
}

export interface MarksDoc {
	format: 'moment-marks';
	version: 1;
	media: MediaRef;
	/** append-only, arrival order — the honest history */
	marks: Mark[];
}

/** Fields a hand supplies when making a mark. */
export interface MarkInput {
	at: number;
	emoji: string;
	definition?: string;
	note?: string;
	by?: string;
}

/** Fields a revision may change. Ownership cannot change hands. */
export interface MarkChanges {
	at?: number;
	emoji?: string;
	definition?: string;
	note?: string;
}

const newId = (): string => {
	const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
	if (c?.randomUUID) return c.randomUUID();
	// fallback: time + counter — unique enough for a marks file
	fallbackCounter += 1;
	return `mk-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
};
let fallbackCounter = 0;

const sameHand = (a?: string, b?: string): boolean =>
	(a ?? '') === (b ?? '');

/** A fresh, empty marks document for one piece of media. */
export function newDoc(media: MediaRef = {}): MarksDoc {
	return { format: 'moment-marks', version: 1, media: { ...media }, marks: [] };
}

/** Append a mark. Returns a new doc; the given doc is untouched. */
export function addMark(doc: MarksDoc, input: MarkInput, madeAt?: string): MarksDoc {
	if (!(input.at >= 0)) throw new Error(`a moment is seconds into the timeline — got ${input.at}`);
	if (!input.emoji) throw new Error('a mark is emoji-first — the emoji is required');
	const mark: Mark = {
		id: newId(),
		at: input.at,
		emoji: input.emoji,
		...(input.definition !== undefined ? { definition: input.definition } : {}),
		...(input.note !== undefined ? { note: input.note } : {}),
		...(input.by !== undefined ? { by: input.by } : {}),
		madeAt: madeAt ?? new Date().toISOString(),
	};
	return { ...doc, marks: [...doc.marks, mark] };
}

/**
 * Find the latest surviving state of a mark chain, or undefined.
 * A retraction anywhere in history ends the chain, whatever the
 * arrival order; among revisions the latest madeAt wins (id breaks
 * ties) — so a merged document reads the same from either side.
 */
function resolveChain(doc: MarksDoc, rootId: string): Mark | undefined {
	let current: Mark | undefined = doc.marks.find((m) => m.id === rootId && !m.revises && !m.retracts);
	if (!current) return undefined;
	for (const m of doc.marks) {
		if (m.retracts && chainRoot(doc, m.retracts) === rootId) return undefined;
		if (m.revises && chainRoot(doc, m.revises) === rootId) {
			if (m.madeAt > current.madeAt || (m.madeAt === current.madeAt && m.id > current.id) || current.id === rootId)
				current = m;
		}
	}
	return current;
}

/** Walk revises-links back to the chain's root id. */
function chainRoot(doc: MarksDoc, id: string): string {
	let cur = doc.marks.find((m) => m.id === id);
	while (cur?.revises) {
		const prev = doc.marks.find((m) => m.id === cur!.revises);
		if (!prev) break;
		cur = prev;
	}
	return cur?.id ?? id;
}

/**
 * Append a revision to a mark. Only the hand that made the mark may
 * revise it (law 4); the revision carries the merged fields and the
 * root keeps its identity in the derived view.
 */
export function reviseMark(doc: MarksDoc, id: string, changes: MarkChanges, by?: string, madeAt?: string): MarksDoc {
	const root = chainRoot(doc, id);
	const current = resolveChain(doc, root);
	if (!current) throw new Error(`no living mark ${id} — retracted marks stay retracted, and history is append-only`);
	const owner = doc.marks.find((m) => m.id === root);
	if (!sameHand(owner?.by, by)) throw new Error(`only the hand that made a mark may revise it (mark is ${owner?.by ? `by '${owner.by}'` : 'unattributed'})`);
	if (changes.at !== undefined && !(changes.at >= 0)) throw new Error(`a moment is seconds into the timeline — got ${changes.at}`);
	const revision: Mark = {
		id: newId(),
		at: changes.at ?? current.at,
		emoji: changes.emoji ?? current.emoji,
		...((changes.definition ?? current.definition) !== undefined ? { definition: changes.definition ?? current.definition } : {}),
		...((changes.note ?? current.note) !== undefined ? { note: changes.note ?? current.note } : {}),
		...(owner?.by !== undefined ? { by: owner.by } : {}),
		madeAt: madeAt ?? new Date().toISOString(),
		revises: current.id,
	};
	return { ...doc, marks: [...doc.marks, revision] };
}

/**
 * Append a retraction. Only the hand that made the mark may retract
 * it (law 4). The retraction echoes the moment and emoji so the raw
 * history reads honestly; the derived view drops the chain.
 */
export function retractMark(doc: MarksDoc, id: string, by?: string, madeAt?: string): MarksDoc {
	const root = chainRoot(doc, id);
	const current = resolveChain(doc, root);
	if (!current) throw new Error(`no living mark ${id} — nothing to retract`);
	const owner = doc.marks.find((m) => m.id === root);
	if (!sameHand(owner?.by, by)) throw new Error(`only the hand that made a mark may retract it (mark is ${owner?.by ? `by '${owner.by}'` : 'unattributed'})`);
	const retraction: Mark = {
		id: newId(),
		at: current.at,
		emoji: current.emoji,
		...(owner?.by !== undefined ? { by: owner.by } : {}),
		madeAt: madeAt ?? new Date().toISOString(),
		retracts: current.id,
	};
	return { ...doc, marks: [...doc.marks, retraction] };
}

/**
 * The current view — DERIVED, never stored. Each surviving chain's
 * latest state, wearing its root id (stable identity for consumers),
 * sorted by moment.
 */
export function readMarks(doc: MarksDoc): Mark[] {
	const roots = doc.marks.filter((m) => !m.revises && !m.retracts);
	const view: Mark[] = [];
	for (const r of roots) {
		const current = resolveChain(doc, r.id);
		if (current) view.push({ ...current, id: r.id });
	}
	return view.sort((a, b) => a.at - b.at || a.madeAt.localeCompare(b.madeAt));
}

/**
 * A copy shaped for other eyes (law 3). Moments, emoji, and chosen
 * names travel; definitions and notes stay home unless keepContents
 * is explicitly true; the local path never travels.
 */
export function shareDoc(doc: MarksDoc, opts: { keepContents?: boolean } = {}): MarksDoc {
	const media: MediaRef = { ...doc.media };
	delete media.path;
	const marks = doc.marks.map((m) => {
		const out: Mark = { ...m };
		if (!opts.keepContents) {
			delete out.definition;
			delete out.note;
		}
		return out;
	});
	return { format: 'moment-marks', version: 1, media, marks };
}

/**
 * Non-destructive union — the collaboration door. Marks merge by id
 * (nothing overwritten, nothing lost); media identity is checked by
 * contentHash when both sides carry one, honestly refused on
 * mismatch. Idempotent; the derived view is order-independent.
 */
export function mergeDocs(a: MarksDoc, b: MarksDoc): MarksDoc {
	if (a.media.contentHash && b.media.contentHash && a.media.contentHash !== b.media.contentHash)
		throw new Error('these marks pin to different media (contentHash differs) — merging would confuse two timelines');
	const seen = new Set(a.marks.map((m) => m.id));
	const marks = [...a.marks, ...b.marks.filter((m) => !seen.has(m.id))];
	return { format: 'moment-marks', version: 1, media: { ...b.media, ...a.media }, marks };
}

/** Parse and validate a marks document, with honest errors. */
export function parseDoc(json: string): MarksDoc {
	let raw: unknown;
	try {
		raw = JSON.parse(json);
	} catch (e) {
		throw new Error(`not JSON: ${(e as Error).message}`);
	}
	const d = raw as MarksDoc;
	if (d?.format !== 'moment-marks') throw new Error(`not a moment-marks document (format: ${String(d?.format)})`);
	if (d.version !== 1) throw new Error(`unknown version ${String(d.version)} — this reader speaks version 1`);
	if (!Array.isArray(d.marks)) throw new Error('marks must be an array');
	for (const m of d.marks) {
		if (typeof m.id !== 'string' || !m.id) throw new Error('every mark carries a stable id');
		if (typeof m.at !== 'number' || !(m.at >= 0)) throw new Error(`mark ${m.id}: a moment is seconds into the timeline`);
		if (typeof m.emoji !== 'string' || !m.emoji) throw new Error(`mark ${m.id}: a mark is emoji-first`);
		if (typeof m.madeAt !== 'string') throw new Error(`mark ${m.id}: madeAt missing`);
	}
	return d;
}

/** '1:23.5' | '83.5' | '1:02:03' → seconds. */
export function parseTime(text: string): number {
	const parts = text.split(':').map((p) => p.trim());
	if (parts.some((p) => p === '' || Number.isNaN(Number(p)))) throw new Error(`cannot read '${text}' as a moment — try seconds (83.5) or m:ss (1:23.5)`);
	const nums = parts.map(Number);
	const seconds = nums.reduce((acc, n) => acc * 60 + n, 0);
	if (!(seconds >= 0)) throw new Error(`a moment is seconds into the timeline — got ${seconds}`);
	return seconds;
}

/** seconds → 'm:ss.s' (hours appear only when the timeline needs them). */
export function fmtTime(seconds: number): string {
	const sign = seconds < 0 ? '-' : '';
	const s = Math.abs(seconds);
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const rest = s % 60;
	const restText = (Math.round(rest * 10) / 10).toFixed(1).padStart(4, '0');
	return h > 0 ? `${sign}${h}:${String(m).padStart(2, '0')}:${restText}` : `${sign}${m}:${restText}`;
}
