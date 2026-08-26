import Database from '@tauri-apps/plugin-sql';
import { browser } from '$app/environment';

// One connection for the whole app — works, takes and feelings share this handle.

// Plain module state: runes only exist in `.svelte.ts` files.
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

// Work ids are permanent — resonance-khoros references a work by this id.
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
