// THE HOSTS — the browser's own Ed25519, wrapped and nothing more.
//
// THE COLUMN COMES TO LIFE (2026-09-02), at KP's ⚛ ruling on `takes.provenance`.
//
// Why this file is the app's and not a mirror. `the-clavis` and `the-lok` each
// ship a reference host under `src/hosts/webcrypto.ts` beside a hand-written
// `src/host-surface.d.ts` that declares `crypto`, `CryptoKey` and
// `TextEncoder` AT GLOBAL SCOPE — because those waters carry zero dependencies
// and pull in no lib. This app already has `lib.DOM`; those declarations would
// collide with it, and the reference `generateKey` line does not typecheck
// against the DOM's own overloads. So the host is written here, line for line
// the same hand-off, typed against the DOM. That is not a departure from the
// waters — it is what they ask for. `the-clavis`'s own law, verbatim:
//
//   NO_KEY_STORAGE — "Key storage is the HOST'S business. This water holds
//   nothing between calls — no keyring, no file, no database. Where an
//   entity's key lives and how it is protected is a question this tool does
//   not answer and will not pretend to."
//
// So this app answers it, and says so out loud: the keys live in THIS DEVICE'S
// IndexedDB (`src/lib/keyring/store.ts`), as CryptoKey objects, and the
// private half is generated NON-EXTRACTABLE — the `false` on the generate line
// below is load-bearing. For an asymmetric pair WebCrypto applies that flag to
// the PRIVATE half only, so the public half still exports (a credential needs
// it) and the private half cannot be exported at all. The machine itself
// refuses even if a later hand asks. NOTHING LEAVES THE DEVICE.
//
// There is no arithmetic in this file: no curve, no field, no constant-time
// anything. A spring tool — or an app — hand-rolling those would be the most
// dangerous thing in this house.

import type { ClavisHost, KeyHandle, KeyPair } from '$lib/clavis';
import type { LokHost } from '$lib/lok';

/** The claiming host — generate · sign · digest, and nothing else. */
export const clavisHost: ClavisHost = {
	async generate(): Promise<KeyPair> {
		//                                                    ↓ the private half, non-extractable
		const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, false, [
			'sign',
			'verify'
		])) as CryptoKeyPair;
		const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey));
		return { publicKey: pair.publicKey, privateKey: pair.privateKey, publicKeyBytes: raw };
	},

	async sign(privateKey: KeyHandle, bytes: Uint8Array): Promise<Uint8Array> {
		return new Uint8Array(
			await crypto.subtle.sign({ name: 'Ed25519' }, privateKey as CryptoKey, bytes)
		);
	},

	async digest(bytes: Uint8Array): Promise<Uint8Array> {
		return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
	}
};

/** The verifying host — verify · digest, and DELIBERATELY no third verb. */
export const lokHost: LokHost = {
	async verify(publicKey: Uint8Array, signature: Uint8Array, bytes: Uint8Array): Promise<boolean> {
		const key = await crypto.subtle.importKey('raw', publicKey, { name: 'Ed25519' }, false, [
			'verify'
		]);
		return crypto.subtle.verify({ name: 'Ed25519' }, key, signature, bytes);
	},

	async digest(bytes: Uint8Array): Promise<Uint8Array> {
		return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
	}
};

/**
 * Whether this machine can do Ed25519 at all. Told, never assumed: an older
 * WebView answers no, and a take then seals with its signet alone rather than
 * failing. Nothing here throws.
 */
export async function ed25519Available(): Promise<boolean> {
	try {
		const pair = (await crypto.subtle.generateKey({ name: 'Ed25519' }, false, [
			'sign',
			'verify'
		])) as CryptoKeyPair;
		return !!pair && !!pair.privateKey;
	} catch {
		return false;
	}
}
