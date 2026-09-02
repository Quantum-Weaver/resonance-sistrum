// the-lok — THE LOCK the key fits in. `the-clavis` is the key.
//
// A LOK IS A GATE, NEVER A CIPHER. Nothing is encrypted here and nothing is
// decrypted here; there is no verb on this surface that could do either, and
// no parameter that would turn one on. A lok answers exactly one question —
// *does this key turn* — and what stands behind it was never hidden. That is
// the pair's founding ruling, said in the module as `NO_SECRECY` so no
// consumer can claim it was only in a README.
//
// THE PAIR. the-signet's own README predicted these two, of itself: *"a seal,
// not a lock — the signet carries provenance, not cryptography, and makes no
// tamper-proof claim. If a door ever needs a lock, that is a different tool
// and it should say so."* This is the lock, and this is it saying so.
//
// THE THREE LAWS:
//
//   · NEVER IMPLEMENT THE PRIMITIVE — DECLARE A HOST SURFACE. This module
//     verifies nothing itself. `LokHost` names the machine that does;
//     `src/hosts/webcrypto.ts` is the reference host (the browser's own
//     Ed25519), `src/hosts/node.ts` a second on a different mechanism. the-now
//     and the-colophon are the precedent.
//
//   · EVERY NO IS A TOLD NO. A closed door never throws and never returns a
//     bare false: it names *why* in one of a small, fixed set of words —
//     `digest mismatch` · `signature invalid` · `malformed` — and adds a
//     plain sentence beside it. A refusal with no reason is how a person
//     ends up guessing, and guessing about a lock is worse than no lock.
//
//   · A LOK NAMES ITS KEYS AND NOTHING ELSE. `lock()` takes a list of public
//     keys that may open it. It holds no identities, no roles, no
//     permissions, no revocation registry and no clock. Who those keys belong
//     to is the credential's own word, carried by the signet's snapshot rule.
//
// THE RECIPE, RESTATED. The canonical form below is the-clavis's, word for
// word, and the-sphragis's before it. It is restated rather than imported
// because tools in this spring never import each other — a key and a lock
// must be cut to the same drawing, and the pair's proofs check that they
// still are.
//
// STANDALONE BY LAW: framework-free, zero dependencies, zero imports of any
// sibling tool. No clock, no disk, no network, no logging.

/** The alg, and the only one this lok knows. Anything else is malformed. */
export const ALG = 'Ed25519' as const;

/** THE LINE, exported so it cannot be lost. It is in every told refusal. */
export const NO_SECRECY =
	'A lok is a gate, not a cipher. Nothing here is encrypted and nothing here is decrypted — there is no verb on this surface that could. A lok answers one question, does this key turn, and what stands behind it was never hidden.';

/** Likewise: what a closed door does NOT mean. */
export const NO_REVOCATION =
	'This lok has no revocation registry. A key on its list opens it until the list changes, and a key that was compromised yesterday still turns today. Revocation is a register somebody must keep, and this water keeps none — it is named here rather than implied.';

/**
 * The signet's identity shape, RESTATED rather than imported — tools in this
 * spring never import each other. It rides in a credential by the signet's
 * snapshot rule, so it is the entity as it was at claiming.
 */
export interface SignetEntity {
	name: string;
	sigil: string;
	color: string;
}

/**
 * THE CREDENTIAL, as this lok reads it — the-clavis's shape restated. Every
 * binary field is base64url, unpadded.
 */
export interface Credential {
	alg: typeof ALG;
	publicKey: string;
	digest: string;
	signature: string;
	who: SignetEntity;
	when: number;
}

/**
 * THE HOST SURFACE — declared, never implemented.
 *
 * Two verbs, and this module supplies neither. Note what is NOT here: no
 * decrypt, no unwrap, no derive, no unseal. The surface itself cannot do
 * secrecy, which is a stronger promise than a sentence about it.
 */
export interface LokHost {
	/** Ed25519. Raw 32-byte key, raw 64-byte signature, the signed bytes. */
	verify(publicKey: Uint8Array, signature: Uint8Array, bytes: Uint8Array): Promise<boolean>;
	/** SHA-256 over the given bytes. 32 bytes out. */
	digest(bytes: Uint8Array): Promise<Uint8Array>;
}

/** Why a door stayed shut. A small, fixed set — never a free-text excuse. */
export type Why = 'digest mismatch' | 'signature invalid' | 'malformed' | 'key not admitted';

/** The door opened, and by whose word. */
export interface Opened {
	open: true;
	/** the entity as it was at claiming — the signet's snapshot, not a lookup. */
	who: SignetEntity;
	publicKey: string;
	when: number;
	told: string;
}

/** The door stayed shut, and the reason is named. */
export interface Shut {
	open: false;
	why: Why;
	told: string;
}

export type Opening = Opened | Shut;

// ── base64url ────────────────────────────────────────────────────────
// Decoding only — a lok reads credentials, it never writes them. Told, never
// thrown: bad text decodes to null and the door says `malformed`.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** base64url → bytes, or NULL if the text is not base64url. Never throws. */
export function fromBase64url(text: string): Uint8Array | null {
	if (typeof text !== 'string') return null;
	const n = text.length;
	if (n % 4 === 1) return null;
	const bytes = new Uint8Array(Math.floor((n * 3) / 4));
	let held = 0;
	let bits = 0;
	let at = 0;
	for (let i = 0; i < n; i += 1) {
		const v = B64.indexOf(text[i]!);
		if (v < 0) return null;
		held = (held << 6) | v;
		bits += 6;
		if (bits >= 8) {
			bits -= 8;
			bytes[at] = (held >> bits) & 255;
			at += 1;
		}
	}
	return bytes.subarray(0, at);
}

/** Bytes → base64url, unpadded — used only to compare a digest to a claim. */
function toBase64url(bytes: Uint8Array): string {
	let out = '';
	for (let i = 0; i < bytes.length; i += 3) {
		const a = bytes[i]!;
		const b = i + 1 < bytes.length ? bytes[i + 1]! : -1;
		const c = i + 2 < bytes.length ? bytes[i + 2]! : -1;
		out += B64[a >> 2]!;
		out += B64[((a & 3) << 4) | (b < 0 ? 0 : b >> 4)]!;
		if (b < 0) break;
		out += B64[((b & 15) << 2) | (c < 0 ? 0 : c >> 6)]!;
		if (c < 0) break;
		out += B64[c & 63]!;
	}
	return out;
}

// ── the canonical form ───────────────────────────────────────────────
// THE CLAVIS'S RECIPE, RESTATED WORD FOR WORD. The key and the lock are cut
// to one drawing; neither imports the other, and the pair's proofs check that
// the two cuts still agree.

function canonicalValue(value: unknown): string {
	if (value === null || value === undefined) return 'null';
	if (Array.isArray(value)) return `[${value.map(canonicalValue).join(',')}]`;
	if (typeof value === 'object') {
		const held = value as Record<string, unknown>;
		const keys = Object.keys(held).sort();
		return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalValue(held[k])}`).join(',')}}`;
	}
	if (typeof value === 'string') return JSON.stringify(value);
	if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'null';
	if (typeof value === 'boolean') return value ? 'true' : 'false';
	return 'null';
}

/**
 * THE CANONICAL FORM — the exact string the signature was taken over.
 * `signature` is excluded, because a signature cannot be taken over itself.
 */
export function canonical(credential: Partial<Credential>): string {
	const held: Record<string, unknown> = {};
	for (const key of Object.keys(credential)) {
		if (key === 'signature') continue;
		held[key] = (credential as Record<string, unknown>)[key];
	}
	return canonicalValue(held);
}

/** The canonical form as the bytes the host is handed. UTF-8, by law. */
export function canonicalBytes(credential: Partial<Credential>): Uint8Array {
	return new TextEncoder().encode(canonical(credential));
}

// ── reading the credential ───────────────────────────────────────────

/**
 * Is this the SHAPE of a credential? Nothing here is proved by this — a
 * well-formed credential with a worthless signature passes it, which is why
 * `verify` runs this first and then does the real work.
 */
export function isCredential(value: unknown): value is Credential {
	if (typeof value !== 'object' || value === null) return false;
	const c = value as Record<string, unknown>;
	return (
		c['alg'] === ALG &&
		typeof c['publicKey'] === 'string' && fromBase64url(c['publicKey'] as string)?.length === 32 &&
		typeof c['digest'] === 'string' && fromBase64url(c['digest'] as string)?.length === 32 &&
		typeof c['signature'] === 'string' && fromBase64url(c['signature'] as string)?.length === 64 &&
		typeof c['when'] === 'number' && Number.isFinite(c['when']) &&
		typeof c['who'] === 'object' && c['who'] !== null &&
		typeof (c['who'] as Record<string, unknown>)['name'] === 'string' &&
		typeof (c['who'] as Record<string, unknown>)['sigil'] === 'string' &&
		typeof (c['who'] as Record<string, unknown>)['color'] === 'string'
	);
}

function shut(why: Why, told: string): Shut {
	return { open: false, why, told: `${told} ${NO_SECRECY}` };
}

// ── the one question ─────────────────────────────────────────────────

/**
 * VERIFY — does this key turn, for these bytes?
 *
 * Three gates, in this order, and each names its own no:
 *
 *   1. MALFORMED — the credential is not the shape of a credential, or its
 *      base64url does not decode, or its alg is not Ed25519. Asked before
 *      anything is handed to a host, so a host is never given rubbish.
 *   2. DIGEST MISMATCH — the artefact's bytes are not the bytes this
 *      credential was claimed over. Checked BEFORE the signature, because
 *      "these are different bytes" is a more useful sentence to a person than
 *      "the signature is invalid", and both are true when it happens.
 *   3. SIGNATURE INVALID — the bytes match, and the key still does not turn:
 *      a foreign key, a re-labelled `who`, a moved `when`, a forged
 *      signature. All one answer, deliberately — telling a caller WHICH of
 *      those it was is telling an attacker how close they got.
 *
 * A host that throws is a shut door, not a crash: the throw is caught and
 * answered as `signature invalid`, because a lock that fails open is not a
 * lock.
 *
 * Nothing is decrypted anywhere in this function. There is nothing here to
 * decrypt.
 */
export async function verify(
	host: LokHost,
	credential: unknown,
	bytes: Uint8Array
): Promise<Opening> {
	if (!isCredential(credential)) {
		return shut('malformed', 'This is not the shape of a credential — a field is missing, mistyped, or not base64url of the right length, or the alg is not Ed25519. Nothing was handed to the host.');
	}
	const key = fromBase64url(credential.publicKey);
	const sig = fromBase64url(credential.signature);
	if (key === null || sig === null || key.length !== 32 || sig.length !== 64) {
		return shut('malformed', 'The key or the signature is not base64url of the right length. Nothing was handed to the host.');
	}

	let mine: string;
	try {
		mine = toBase64url(await host.digest(bytes));
	} catch {
		return shut('malformed', 'The host could not digest these bytes, so there is nothing to compare. The door stays shut, because a lock that fails open is not a lock.');
	}
	if (mine !== credential.digest) {
		return shut('digest mismatch', 'These are not the bytes this credential was claimed over — the artefact changed, or the wrong artefact was brought to the door. The signature was not even asked about.');
	}

	let turned = false;
	try {
		turned = await host.verify(key, sig, canonicalBytes(credential));
	} catch {
		turned = false;
	}
	if (!turned) {
		return shut('signature invalid', 'The bytes match, and the key does not turn. A foreign key, a re-labelled entity, a moved moment or a forged signature all answer here, and deliberately so — naming which one would tell a forger how close they got.');
	}

	return {
		open: true,
		who: { ...credential.who },
		publicKey: credential.publicKey,
		when: credential.when,
		told: `${credential.who.sigil} ${credential.who.name}'s key turns for these bytes. ${NO_SECRECY}`,
	};
}

// ── the fitted door ──────────────────────────────────────────────────

/** What a lok is made of: a machine, a name, and a list of keys. */
export interface LokRules {
	/** the machine that verifies. A lok carries its own, so a door is one thing. */
	host: LokHost;
	/** what this door is, in plain words. Never used in a decision. */
	name: string;
	/** the public keys, base64url, that may open it. Empty is a real answer. */
	opensFor: readonly string[];
}

/** A fitted door: it knows its machine and it knows its keys. Frozen. */
export interface Lok {
	readonly name: string;
	readonly host: LokHost;
	/** sorted and de-duplicated at locking, so two identical loks are identical. */
	readonly opensFor: readonly string[];
	/** told at locking — including, honestly, when the list is empty. */
	readonly told: readonly string[];
}

/**
 * LOCK — name which public keys may open this door.
 *
 * It holds keys and nothing else: no identities, no roles, no expiry, no
 * revocation register. A key on the list opens the door until the list
 * changes, and that limit is told at locking rather than discovered later.
 *
 * An empty list is not an error. It is a door that opens for nobody, which is
 * a thing a person might genuinely want, and it says so out loud.
 */
export function lock(rules: LokRules): Lok {
	const told: string[] = [];
	const seen = new Set<string>();
	for (const key of rules.opensFor) {
		if (typeof key !== 'string' || fromBase64url(key)?.length !== 32) {
			told.push(`a key that is not 32 base64url bytes was left off this lok's list — told, never quietly kept: ${String(key).slice(0, 16)}…`);
			continue;
		}
		seen.add(key);
	}
	const opensFor = [...seen].sort();
	if (opensFor.length === 0) {
		told.push('this lok opens for NOBODY — its list is empty. That is an answer, not an error, and it will refuse every credential with `key not admitted`.');
	} else {
		told.push(`this lok opens for ${opensFor.length} key${opensFor.length === 1 ? '' : 's'}, named by their public halves and nothing else — no identity, no role, no expiry.`);
	}
	told.push(NO_REVOCATION);
	told.push(NO_SECRECY);
	return Object.freeze({
		name: rules.name,
		host: rules.host,
		opensFor: Object.freeze(opensFor),
		told: Object.freeze(told),
	});
}

/**
 * TRY OPEN — the same three gates, and one more before them: is this key on
 * this door's list at all?
 *
 * Admission is checked FIRST, and it is a cheap string comparison, so a key
 * that was never admitted never reaches the host — a door does not do
 * cryptography for strangers.
 *
 * `key not admitted` is a fourth `why`, and it exists only here: `verify`
 * asks whether a key turns, which is a question about the credential;
 * `tryOpen` asks whether THIS door opens, which is a question about the door.
 * Told apart on purpose — a valid credential refused by a list is a very
 * different fact from a bad signature, and collapsing the two would hide it.
 */
export async function tryOpen(
	lok: Lok,
	credential: unknown,
	bytes: Uint8Array
): Promise<Opening> {
	if (!isCredential(credential)) {
		return shut('malformed', `This is not the shape of a credential, so ${lok.name} has nothing to check it against.`);
	}
	if (!lok.opensFor.includes(credential.publicKey)) {
		return shut('key not admitted', `${lok.name} does not open for this key. The credential may be perfectly good — this door was simply never told to admit it, and no cryptography was done for a stranger.`);
	}
	return verify(lok.host, credential, bytes);
}

/** A gentle sentence for an opening — plain words, either way. */
export function describeOpening(opening: Opening): string {
	return opening.open
		? `open — ${opening.who.sigil} ${opening.who.name}, at ${opening.when}.`
		: `shut — ${opening.why}.`;
}
