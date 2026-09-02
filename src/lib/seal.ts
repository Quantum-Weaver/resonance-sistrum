import { invoke } from '@tauri-apps/api/core';
import { verify, type Opening } from '$lib/lok';
import { lokHost } from '$lib/keyring/hosts';
import { identityStore } from '$lib/stores/identity.svelte';
import { sealProvenance, type SignetSnapshot } from '$lib/provenance';

// THE SEAL — every take that is sealed is signed, and every take that is
// opened is verified. THE COLUMN COMES TO LIFE (2026-09-02).
//
// The bytes are the take's own file, read over the road the mix and the
// player already use — `read_take_bytes`, raw binary, never base64, and
// shelf-guarded in Rust. The digest and the signature are the artefact's, not
// a row's: change one sample and the lok says `digest mismatch` in those
// words.
//
// A SEAL IS NEVER BLOCKED ON A KEY. No identity → the take seals with no
// provenance of its own beyond what the studio put there. An identity with no
// key → `signet` alone, and the room says the take is signed but not signable.
// A key that will not turn → the same, and the reason is told. The file is
// always safe first; the row is the thing that may fail.

/** The take's own bytes, as the mix and the player read them. */
export async function takeBytes(fileName: string): Promise<Uint8Array> {
	const held = await invoke<ArrayBuffer | Uint8Array | number[]>('read_take_bytes', { fileName });
	if (held instanceof Uint8Array) return held;
	if (held instanceof ArrayBuffer) return new Uint8Array(held);
	return new Uint8Array(held);
}

/** What a seal did, told plainly enough to put on a screen. */
export interface Sealed {
	provenance: Record<string, unknown> | undefined;
	signet: SignetSnapshot | null;
	signed: boolean;
	told: string;
}

/**
 * SEAL — the signed hand written BESIDE whatever the caller already built
 * (the studio's `studio` note, most often). Never throws: a seal that cannot
 * be taken returns the base document unchanged and says why.
 */
export async function sealTake(
	fileName: string,
	base: unknown,
	extra: { merismos?: unknown } = {}
): Promise<Sealed> {
	const signet = identityStore.snapshot();
	if (!signet) {
		const doc =
			base != null || extra.merismos !== undefined
				? sealProvenance(base, { merismos: extra.merismos })
				: undefined;
		return {
			provenance: doc,
			signet: null,
			signed: false,
			told: 'No signet on this device, so this take carries no hand. Settings → Who you are here.'
		};
	}
	if (!identityStore.hasKey) {
		return {
			provenance: sealProvenance(base, { signet, merismos: extra.merismos }),
			signet,
			signed: false,
			told: `Sealed as ${signet.sigil} ${signet.name} — a seal, not a lock. There is no key on this device, so nothing signed it.`
		};
	}
	try {
		const bytes = await takeBytes(fileName);
		const credential = await identityStore.claimBytes(bytes, Date.now());
		if (!credential) {
			return {
				provenance: sealProvenance(base, { signet, merismos: extra.merismos }),
				signet,
				signed: false,
				told: `Sealed as ${signet.sigil} ${signet.name}, unsigned — the key did not answer. The take itself is safe.`
			};
		}
		return {
			provenance: sealProvenance(base, { signet, clavis: credential, merismos: extra.merismos }),
			signet,
			signed: true,
			told: `Signed by ${signet.sigil} ${signet.name} — key ${credential.publicKey.slice(0, 8)}…, over this take's own bytes.`
		};
	} catch (e) {
		return {
			provenance: sealProvenance(base, { signet, merismos: extra.merismos }),
			signet,
			signed: false,
			told: `Sealed as ${signet.sigil} ${signet.name}, unsigned — the take's bytes would not open to be claimed (${e instanceof Error ? e.message : String(e)}). The take itself is safe.`
		};
	}
}

/**
 * OPEN — does this credential turn for this take's bytes? `verify`, not
 * `tryOpen`: this is a question about the credential, not about a door, and
 * this app admits no list of keys. A lok is a gate, never a cipher — nothing
 * here decrypts anything, because nothing here was ever hidden.
 */
export async function openCredential(fileName: string, credential: unknown): Promise<Opening> {
	const bytes = await takeBytes(fileName);
	return verify(lokHost, credential, bytes);
}
