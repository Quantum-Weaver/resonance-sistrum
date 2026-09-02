import { browser } from '$app/environment';
import type { SignetIdentity } from '$lib/signet';
import type { Credential, KeyPair } from '$lib/clavis';
import { claim, serializePublic, toBase64url } from '$lib/clavis';
import { clavisHost, ed25519Available } from '$lib/keyring/hosts';
import {
	forgetKeyring,
	IDENTITY_KEY,
	KEYPAIR_KEY,
	readKeyring,
	writeKeyring,
	type StoredKeyPair
} from '$lib/keyring/store';

// WHO YOU ARE HERE — the entity and its key, THE COLUMN COMES TO LIFE
// (2026-09-02).
//
// Two things live here and they are told apart on purpose:
//
//   · THE SIGNET — name · sigil · color. A SEAL, NOT A LOCK: it carries
//     provenance and makes no tamper-proof claim. It rides into a take's
//     provenance as a SNAPSHOT (the signet's own rule) — change your color
//     tomorrow and every take you already sealed keeps the color it was
//     sealed under.
//   · THE CLAVIS KEYPAIR — generated ONCE, through the WebCrypto host, with
//     the private half NON-EXTRACTABLE, and held as CryptoKey objects in this
//     device's IndexedDB. Nothing leaves the device. The private half cannot
//     be exported, so it cannot be backed up and it cannot be moved to
//     another phone; that is the cost of a key the machine itself refuses to
//     hand out, and it is said in the room rather than discovered later.
//
// A take never waits on a key. If there is no key, a seal carries the signet
// alone and the room says so.

let identity = $state<SignetIdentity | null>(null);
let keys = $state<KeyPair | null>(null);
let publicKey = $state<string | null>(null);
let loaded = $state(false);
let busy = $state(false);
let error = $state<string | null>(null);
/** Whether this machine's WebCrypto names Ed25519 at all. Told, never assumed. */
let ed25519 = $state<boolean | null>(null);

async function load() {
	if (!browser || loaded) return;
	try {
		const who = await readKeyring<SignetIdentity>(IDENTITY_KEY);
		const pair = await readKeyring<StoredKeyPair>(KEYPAIR_KEY);
		identity = who ?? null;
		if (pair && pair.publicKey && pair.privateKey && pair.publicKeyBytes) {
			keys = {
				publicKey: pair.publicKey,
				privateKey: pair.privateKey,
				publicKeyBytes: new Uint8Array(pair.publicKeyBytes)
			};
			publicKey = toBase64url(new Uint8Array(pair.publicKeyBytes));
		}
		error = null;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	} finally {
		loaded = true;
	}
	if (ed25519 === null) ed25519 = await ed25519Available();
}

/** The identity, kept. Editing it never touches the key, and never rewrites history. */
async function saveIdentity(next: SignetIdentity) {
	const clean: SignetIdentity = {
		name: next.name.trim(),
		sigil: next.sigil.trim(),
		color: next.color.trim()
	};
	if (!clean.name) {
		error = 'A signet needs a name — an unnamed hand is how a role goes uncredited.';
		return false;
	}
	busy = true;
	try {
		await writeKeyring(IDENTITY_KEY, clean);
		identity = clean;
		error = null;
		return true;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	} finally {
		busy = false;
	}
}

/**
 * THE KEY, MADE ONCE. A second call over an existing key REFUSES — a new key
 * would silently orphan every take already sealed under the old one, and this
 * app will not do that quietly.
 */
async function generateKey() {
	if (keys) {
		error = 'A key already stands on this device. Making a second one would orphan every take sealed under the first, so it is refused rather than done quietly.';
		return false;
	}
	busy = true;
	try {
		const pair = await clavisHost.generate();
		await writeKeyring(KEYPAIR_KEY, {
			publicKey: pair.publicKey,
			privateKey: pair.privateKey,
			publicKeyBytes: pair.publicKeyBytes
		} satisfies StoredKeyPair);
		keys = pair;
		publicKey = toBase64url(pair.publicKeyBytes);
		error = null;
		return true;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	} finally {
		busy = false;
	}
}

/** The public half, and ONLY the public half. There is no private counterpart. */
function publicHalfText(): string | null {
	if (!identity || !publicKey) return null;
	return serializePublic({ alg: 'Ed25519', publicKey, who: { ...identity } });
}

/**
 * CLAIM — this hand, over these bytes, at this moment. Returns null when
 * there is no identity or no key: a seal is never blocked on one.
 */
async function claimBytes(bytes: Uint8Array, when: number): Promise<Credential | null> {
	if (!identity || !keys) return null;
	try {
		return await claim(clavisHost, keys, bytes, { ...identity }, when);
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return null;
	}
}

/** The identity as it stands, snapshotted for a document. Never a reference. */
function snapshot(): SignetIdentity | null {
	return identity ? { ...identity } : null;
}

/** The merismos `who` for this device's holder — keyed by the public half. */
function asWho(): { id?: string; name: string; sigil?: string; color?: string } | null {
	if (!identity) return null;
	return {
		...(publicKey ? { id: publicKey } : {}),
		name: identity.name,
		sigil: identity.sigil,
		color: identity.color
	};
}

/**
 * FORGET — the identity and the key, deleted from this device. The private
 * half is non-extractable and has no copy anywhere, so this ends it. Takes
 * already sealed stay verifiable (their credentials carry the public half);
 * nothing new can ever be sealed as that key again.
 */
async function forget() {
	busy = true;
	try {
		await forgetKeyring();
		identity = null;
		keys = null;
		publicKey = null;
		error = null;
	} finally {
		busy = false;
	}
}

export const identityStore = {
	get identity() {
		return identity;
	},
	get publicKey() {
		return publicKey;
	},
	get hasKey() {
		return keys !== null;
	},
	get loaded() {
		return loaded;
	},
	get busy() {
		return busy;
	},
	get error() {
		return error;
	},
	get ed25519() {
		return ed25519;
	},
	load,
	saveIdentity,
	generateKey,
	publicHalfText,
	claimBytes,
	snapshot,
	asWho,
	forget
};
