import Database from '@tauri-apps/plugin-sql';
import { browser } from '$app/environment';

// One connection for the whole instrument. Three stores share this domain
// (works, takes, feelings) and opening a handle per store would open three
// connections onto one file for no reason.
//
// The database is `sistrum.db`. It is NOT the Echoes file: this body was
// mirrored from resonance-echoes, and that app's three migrations belong to
// its history, not ours. They were not carried.

// Plain module state, deliberately: runes only exist in `.svelte.ts` files,
// and each store keeps its own reactive `dbError` for the surfaces to read.
let db: Database | null = null;
let loadError: string | null = null;

export async function getDb(): Promise<Database | null> {
	if (!browser) return null;
	if (db) return db;
	try {
		db = await Database.load('sqlite:sistrum.db');
		loadError = null;
	} catch (e) {
		loadError = e instanceof Error ? e.message : String(e);
		console.error('[db] load failed:', e);
		db = null;
	}
	return db;
}

export function dbLoadError(): string | null {
	return loadError;
}

// Stable ids. Works keep theirs forever — resonance-khoros will reference a
// work by this id when it groups one into a release, so an id is a promise.
export function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	// Fallback for Android WebViews that predate randomUUID
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}
