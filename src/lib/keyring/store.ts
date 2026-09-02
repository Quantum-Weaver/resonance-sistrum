// THE KEYRING — this app's own answer to `the-clavis`'s NO_KEY_STORAGE.
//
// THE COLUMN COMES TO LIFE (2026-09-02). The clavis holds nothing between
// calls and says so; where a key lives is the consumer's business, and this
// file IS that business, said plainly:
//
//   · The keypair lives in THIS DEVICE'S IndexedDB, as CryptoKey objects.
//     IndexedDB stores them by structured clone, which is the one road a
//     non-extractable key can travel — it never becomes bytes to do it.
//   · The private half is NON-EXTRACTABLE (see hosts.ts). It cannot be
//     exported, backed up, copied to another device, or read by this code.
//     WARNED PLAINLY, NEVER SOFTENED: if this store is cleared, that key is
//     gone, and takes already sealed under it stay verifiable while nothing
//     new can be sealed as that key again.
//   · Nothing here reaches a network. Nothing here writes a file. The key
//     does not leave the device, and there is no verb on this surface that
//     could send it anywhere.
//   · The purge purges (the house's own ward): `forget()` deletes the whole
//     database, and the settings room's purge calls it.
//
// The identity (name · sigil · color) lives here too, in the same store, so
// one clear takes both and neither can outlive the other by accident.

import { browser } from '$app/environment';

const DB_NAME = 'resonance-sistrum-keyring';
const DB_VERSION = 1;
const STORE = 'me';

export const IDENTITY_KEY = 'identity';
export const KEYPAIR_KEY = 'keypair';

/** What is written under `keypair`. The private half is a handle, never bytes. */
export interface StoredKeyPair {
	publicKey: unknown;
	privateKey: unknown;
	publicKeyBytes: Uint8Array;
}

function open(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION);
		req.onupgradeneeded = () => {
			const db = req.result;
			if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
		};
		req.onsuccess = () => resolve(req.result);
		req.onerror = () => reject(req.error ?? new Error('the keyring would not open'));
	});
}

async function withStore<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
	const db = await open();
	try {
		return await new Promise<T>((resolve, reject) => {
			const tx = db.transaction(STORE, mode);
			const req = run(tx.objectStore(STORE));
			req.onsuccess = () => resolve(req.result as T);
			req.onerror = () => reject(req.error ?? new Error('the keyring refused'));
		});
	} finally {
		db.close();
	}
}

export async function readKeyring<T>(key: string): Promise<T | null> {
	if (!browser || typeof indexedDB === 'undefined') return null;
	const held = await withStore<T | undefined>('readonly', (s) => s.get(key));
	return held ?? null;
}

export async function writeKeyring(key: string, value: unknown): Promise<void> {
	if (!browser || typeof indexedDB === 'undefined') throw new Error('there is no keyring here');
	await withStore<IDBValidKey>('readwrite', (s) => s.put(value as never, key));
}

/**
 * FORGET — the whole database, deleted. Not a curated list of keys: the
 * database, so a field added later cannot survive a purge by omission (the
 * settings room's own habit with localStorage).
 *
 * A deleted non-extractable private key is GONE. There is no copy anywhere,
 * by design, and this function is the only thing in the app that ends one.
 */
export function forgetKeyring(): Promise<void> {
	if (!browser || typeof indexedDB === 'undefined') return Promise.resolve();
	return new Promise((resolve) => {
		const req = indexedDB.deleteDatabase(DB_NAME);
		// Resolved either way: a purge that cannot be confirmed is still a purge
		// attempted, and the caller reloads. Blocked means another tab holds it.
		req.onsuccess = () => resolve();
		req.onerror = () => resolve();
		req.onblocked = () => resolve();
	});
}
