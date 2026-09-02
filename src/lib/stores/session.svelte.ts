import { browser } from '$app/environment';
import { invoke } from '@tauri-apps/api/core';
import { generateId } from '$lib/stores/db';
import {
	newSession,
	normalizeTrack,
	parseSession,
	type SessionDoc,
	type SessionTrack
} from '$lib/studio';

// The session lives in a `<name>.session.json` sidecar ON THE TAKES SHELF (the plan's §4.1) — the marks' own road, nothing in this database.
// A track POINTS at a take; removing a lane leaves the take exactly where it is.

let doc = $state<SessionDoc | null>(null);
let sessions = $state<string[]>([]);
let loading = $state(false);
let saving = $state(false);
let dirty = $state(false);
let error = $state<string | null>(null);

// Stale-reply guard: session A's document must never land under session B's name.
let openGen = 0;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

async function list() {
	if (!browser) return;
	try {
		sessions = await invoke<string[]>('list_sessions');
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
}

/** Open a session by name. An absent one is CREATED in memory and lands on disk at the first save — a new session is a name, nothing more. */
async function open(name: string) {
	if (!browser) return;
	const gen = ++openGen;
	loading = true;
	error = null;
	try {
		const raw = await invoke<unknown | null>('read_session', { name });
		if (gen !== openGen) return;
		doc = raw == null ? newSession(name) : parseSession(raw);
		dirty = raw == null;
	} catch (e) {
		if (gen !== openGen) return;
		error = e instanceof Error ? e.message : String(e);
		// A session that will not parse is never replaced with an empty one.
		doc = null;
	} finally {
		if (gen === openGen) loading = false;
	}
}

function close() {
	openGen++;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = null;
	doc = null;
	dirty = false;
	error = null;
}

/** Write the document as it stands. Through Rust's temp-and-rename door. */
async function save(): Promise<boolean> {
	const d = doc;
	if (!browser || !d) return false;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = null;
	const gen = openGen;
	saving = true;
	error = null;
	try {
		const stamped: SessionDoc = { ...d, updated_at: new Date().toISOString() };
		const stored = await invoke<string>('write_session', { name: d.name, doc: stamped });
		if (gen !== openGen) return true;
		doc = { ...stamped, name: stored };
		dirty = false;
		if (!sessions.includes(stored)) sessions = [...sessions, stored].sort();
		return true;
	} catch (e) {
		if (gen !== openGen) return false;
		error = e instanceof Error ? e.message : String(e);
		return false;
	} finally {
		if (gen === openGen) saving = false;
	}
}

// Every edit lands on disk a breath later — the session is working state, and a musician should not lose a lane to a closed window.
function touch() {
	dirty = true;
	if (saveTimer) clearTimeout(saveTimer);
	saveTimer = setTimeout(() => void save(), 600);
}

function addTrack(take: string, offsetMs = 0): SessionTrack | null {
	if (!doc) return null;
	const track = normalizeTrack({
		id: generateId(),
		take,
		gain: 1,
		mute: false,
		solo: false,
		offset_ms: offsetMs,
		pan: 0
	});
	doc = { ...doc, tracks: [...doc.tracks, track] };
	touch();
	return track;
}

function updateTrack(id: string, patch: Partial<Omit<SessionTrack, 'id' | 'take'>>) {
	if (!doc) return;
	doc = {
		...doc,
		tracks: doc.tracks.map((t) => (t.id === id ? normalizeTrack({ ...t, ...patch }) : t))
	};
	touch();
}

/** Takes the lane out of the session. The take stays on the shelf, always. */
function removeTrack(id: string) {
	if (!doc) return;
	doc = { ...doc, tracks: doc.tracks.filter((t) => t.id !== id) };
	touch();
}

function clearError() {
	error = null;
}

export const sessionStore = {
	get doc() {
		return doc;
	},
	get name() {
		return doc?.name ?? null;
	},
	get tracks() {
		return doc?.tracks ?? [];
	},
	get sessions() {
		return sessions;
	},
	get loading() {
		return loading;
	},
	get saving() {
		return saving;
	},
	get dirty() {
		return dirty;
	},
	get error() {
		return error;
	},
	get anySolo() {
		return (doc?.tracks ?? []).some((t) => t.solo);
	},
	list,
	open,
	close,
	save,
	addTrack,
	updateTrack,
	removeTrack,
	clearError,
	byId(id: string) {
		return doc?.tracks.find((t) => t.id === id);
	}
};
