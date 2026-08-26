import { browser } from '$app/environment';
import { invoke } from '@tauri-apps/api/core';
import {
	addMark,
	newDoc,
	readMarks,
	retractMark,
	reviseMark,
	type Mark,
	type MarkChanges,
	type MarkInput,
	type MarksDoc
} from '$lib/marks';

// Marks live in a `.marks.json` sidecar beside the take's WAV, never in this app's database.
// Only the NEW tail entries are sent to Rust — `append_take_marks` appends and refuses; the whole document is never sent.

/** The hand that makes the marks here. The water's law 4 — "only your own" —
 *  is about ownership across shared documents; on this device there is one
 *  vessel, and their chosen name is the one the whole app already knows. An
 *  unnamed vessel marks unattributed, which the water handles as its own
 *  first-class case (`sameHand(undefined, undefined)` is true). */
function theHand(): string | undefined {
	if (!browser) return undefined;
	const name = localStorage.getItem('resonance-sistrum-vessel-name');
	return name && name.trim() ? name.trim() : undefined;
}

let fileName = $state<string | null>(null);
let doc = $state<MarksDoc>(newDoc());
let loading = $state(false);
let saving = $state(false);
let error = $state<string | null>(null);
/** Which takes on the shelf carry a sidecar at all — one directory read, no
 *  histories opened to find out. */
let marked = $state<string[]>([]);

/** The current view: each surviving chain's latest state, sorted by moment.
 *  DERIVED on every read, exactly as the water requires — this is a function
 *  and not a cached array on purpose. */
function view(): Mark[] {
	return readMarks(doc);
}

/** The media record for the take being marked. The local path is deliberately
 *  absent: the water's law 3 says the path is a courtesy and never identity,
 *  and Rust drops it even if it were sent. */
function mediaFor(takeName: string, seconds: number | undefined) {
	return {
		kind: 'audio' as const,
		title: takeName.replace(/\.wav$/, ''),
		...(seconds !== undefined && seconds > 0 ? { duration: seconds } : {})
	};
}

// Stale-reply guard: a read is a round trip, and take A's history must not land under take B's name.
let openGen = 0;

/** Open a take's history. An absent sidecar is not an error — a take nobody
 *  has marked simply has no marks. */
async function open(takeFileName: string) {
	if (!browser) return;
	const gen = ++openGen;
	fileName = takeFileName;
	doc = newDoc();
	loading = true;
	error = null;
	try {
		const incoming = await invoke<MarksDoc>('read_take_marks', { fileName: takeFileName });
		if (gen !== openGen) return; // this reply outlived the take that asked
		doc = incoming;
	} catch (e) {
		if (gen !== openGen) return;
		error = e instanceof Error ? e.message : String(e);
		// A history that will not parse is never replaced with an empty one.
		doc = newDoc();
	} finally {
		if (gen === openGen) loading = false;
	}
}

function close() {
	openGen++; // whatever is still in flight must not land
	fileName = null;
	doc = newDoc();
	error = null;
}

/**
 * Send the entries a pure water function just produced. Only the tail — the
 * marks that were not already in the document — crosses the wire.
 */
async function appendTail(next: MarksDoc, seconds: number | undefined): Promise<boolean> {
	const name = fileName;
	if (!name) return false;
	const gen = openGen;
	const entries = next.marks.slice(doc.marks.length);
	if (entries.length === 0) return false;
	saving = true;
	error = null;
	try {
		const landed = await invoke<MarksDoc>('append_take_marks', {
			fileName: name,
			media: mediaFor(name, seconds),
			entries
		});
		// The marks already landed on disk; if the room moved on, leave the other take's document alone.
		if (gen !== openGen) return true;
		doc = landed;
		if (!marked.includes(name)) marked = [...marked, name];
		return true;
	} catch (e) {
		if (gen !== openGen) return false;
		error = e instanceof Error ? e.message : String(e);
		return false;
	} finally {
		if (gen === openGen) saving = false;
	}
}

/** Pin a mark at a moment. Emoji-first — the water requires the emoji and so
 *  does this door; words are optional and sovereign. */
async function add(input: MarkInput, seconds?: number): Promise<boolean> {
	try {
		const next = addMark(doc, { ...input, by: theHand() });
		return await appendTail(next, seconds);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	}
}

/** An edit REVISES — a new entry that supersedes, with the old one still in
 *  the history where it belongs. */
async function revise(id: string, changes: MarkChanges, seconds?: number): Promise<boolean> {
	try {
		const next = reviseMark(doc, id, changes, theHand());
		return await appendTail(next, seconds);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	}
}

/** A removal RETRACTS — the mark leaves the view, never the history. Nothing
 *  in this app deletes a mark, exactly as nothing in it deletes a take. */
async function retract(id: string, seconds?: number): Promise<boolean> {
	try {
		const next = retractMark(doc, id, theHand());
		return await appendTail(next, seconds);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	}
}

/** Which takes carry marks. Cheap enough to call when the shelf loads. */
async function loadMarked() {
	if (!browser) return;
	try {
		marked = await invoke<string[]>('takes_with_marks');
	} catch {
	}
}

function clearError() {
	error = null;
}

export const marksStore = {
	get fileName() {
		return fileName;
	},
	/** The honest history, whole — every entry ever appended, in arrival
	 *  order. Shown only where a hand asks to see it. */
	get history() {
		return doc.marks;
	},
	get loading() {
		return loading;
	},
	get saving() {
		return saving;
	},
	get error() {
		return error;
	},
	get marked() {
		return marked;
	},
	/** How many entries the history holds, including revisions and
	 *  retractions. Not the same number as the view, and that difference is
	 *  the point of the law. */
	get historyCount() {
		return doc.marks.length;
	},
	view,
	open,
	close,
	add,
	revise,
	retract,
	loadMarked,
	clearError,
	hasMarks(takeFileName: string) {
		return marked.includes(takeFileName);
	}
};
