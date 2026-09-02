// the-clavis — THE KEY. A keypair per entity, a credential per artefact.
//
// WHAT THIS IS FOR, said once and plainly: **it is signing, not secrecy.** A
// take is not secret. Its AUTHORSHIP must be unforgeable. Nothing in this
// module hides anything from anyone, and there is no verb on this surface
// that could.
//
// THE PAIR. `the-clavis` is the key; `the-lok` is the lock it fits. They were
// predicted by the-signet's own README, which said of itself: *"a seal, not a
// lock — the signet carries provenance, not cryptography, and makes no
// tamper-proof claim. If a door ever needs a lock, that is a different tool
// and it should say so."* This is that different tool, and it says so.
//
// THE THREE LAWS:
//
//   · NEVER IMPLEMENT THE PRIMITIVE — DECLARE A HOST SURFACE. This module
//     computes no hash and no signature. `ClavisHost` names the machine that
//     does; `src/hosts/webcrypto.ts` is the reference host (the browser's own
//     Ed25519, `crypto.subtle`), `src/hosts/node.ts` a second on a different
//     mechanism. A hand-rolled curve in a spring tool would be the most
//     dangerous thing in this house. the-now and the-colophon are the
//     precedent: declare the surface, wrap the platform, own neither.
//
//   · THE PRIVATE KEY NEVER LEAVES THE HOST. It is never logged, never
//     serialized, never canonicalized, and it never enters a Credential.
//     `serializePublic` exists; there is deliberately no private counterpart
//     anywhere on this surface. The reference host generates it
//     NON-EXTRACTABLE, so the machine itself refuses to hand it out.
//
//   · STORAGE IS THE HOST'S BUSINESS. This water holds no keyring, no file,
//     no database and no memory between calls. Where an entity's key lives,
//     how long, and under what protection is a question this tool does not
//     answer and will not pretend to.
//
// WHAT IS SIGNED. Not the artefact's bytes alone — the CANONICAL FORM of the
// credential, which carries the artefact's digest, the public key, the
// entity's snapshot and the moment. That is deliberate: signing the bytes
// alone would leave `who` and `when` re-labellable by anyone holding a copy,
// and authorship would be forgeable after all. `canonical()` is the exact
// string the signature is taken over, and it excludes only the signature
// itself, because a signature cannot be taken over itself (the-sphragis's
// `Seal.over`, promoted from string equality to cryptography).
//
// STANDALONE BY LAW: framework-free, zero dependencies, zero imports of any
// sibling tool. No clock — the moment is passed in (the-now is the water that
// answers *when*). No disk, no network, no logging: nothing here writes a
// line anywhere.

/** The alg, and the only one. A credential that names another is malformed. */
export const ALG = 'Ed25519' as const;

/** Said in the module so no consumer can claim it was buried in a README. */
export const NEVER_LOGGED =
	'The private key is never logged, never serialized, never canonicalized, and never enters a credential. There is no export path for it on this surface — `serializePublic` has no private counterpart, and the reference host generates the private half NON-EXTRACTABLE so the machine itself refuses.';

/** Likewise: this tool is not a keyring and does not want to be. */
export const NO_KEY_STORAGE =
	'Key storage is the HOST\'S business. This water holds nothing between calls — no keyring, no file, no database. Where an entity\'s key lives and how it is protected is a question this tool does not answer and will not pretend to.';

/** Likewise: signing, not secrecy. */
export const NO_SECRECY =
	'This is signing, not secrecy. Nothing here is encrypted and nothing here is decrypted. A credential proves who made a thing; it hides nothing from anyone.';

/**
 * The signet's identity shape, RESTATED rather than imported — tools in this
 * spring never import each other. Field for field this is `SignetIdentity`
 * from `the-signet`, and it travels by the signet's own snapshot rule: what
 * rides in a credential is a COPY taken at claiming, so an entity may change
 * its colour tomorrow and history keeps the colour it signed under.
 */
export interface SignetEntity {
	/** The entity's name — a person, a kin, a service; whoever owns the mark. */
	name: string;
	/** One small mark — an emoji or glyph the eye can find in a crowd. */
	sigil: string;
	/** The entity's colour — any string the consumer's grammar can render. */
	color: string;
}

/**
 * OPAQUE. The host's own handle on a key. This module never looks inside one,
 * never compares two, and never writes one down.
 */
export type KeyHandle = unknown;

/**
 * A keypair as this water sees it: two opaque handles and the PUBLIC half's
 * raw bytes. There is no `privateKeyBytes` field and there never will be —
 * a shape that could hold the private half is a shape that will one day
 * serialize it.
 */
export interface KeyPair {
	/** opaque — the host's handle on the public half. */
	publicKey: KeyHandle;
	/** opaque — the host's handle on the private half. Never read here. */
	privateKey: KeyHandle;
	/** the raw 32 bytes of the PUBLIC half, and only ever the public half. */
	publicKeyBytes: Uint8Array;
}

/**
 * THE HOST SURFACE — declared, never implemented.
 *
 * Three verbs, and this module supplies none of them. Anything that can do
 * these three is a host: a browser's WebCrypto, Node's, a hardware token, a
 * remote signer behind a wire. The tool does not care, which is the point.
 */
export interface ClavisHost {
	/** A fresh Ed25519 pair. The private half SHOULD be non-extractable. */
	generate(): Promise<KeyPair>;
	/** Ed25519 over the given bytes with the given private handle. 64 bytes out. */
	sign(privateKey: KeyHandle, bytes: Uint8Array): Promise<Uint8Array>;
	/** SHA-256 over the given bytes. 32 bytes out. */
	digest(bytes: Uint8Array): Promise<Uint8Array>;
}

/**
 * THE CREDENTIAL — one artefact, claimed by one entity, at one moment.
 * Every binary field is base64url (unpadded), because a credential travels
 * through JSON, URLs and log lines alike and padding does not survive all
 * three.
 */
export interface Credential {
	alg: typeof ALG;
	/** the public half, raw 32 bytes, base64url. The private half is absent by law. */
	publicKey: string;
	/** SHA-256 of the artefact's bytes, base64url. What binds this to that. */
	digest: string;
	/** Ed25519 over `canonical(credential)`, base64url. Absent from that form. */
	signature: string;
	/** the signet's snapshot rule — a copy taken at claiming, never a reference. */
	who: SignetEntity;
	/** ms since epoch, passed in by the claimant's hand. This water has no clock. */
	when: number;
}

/** The public half alone, for handing to a door. Carries nothing private. */
export interface PublicHalf {
	alg: typeof ALG;
	publicKey: string;
	who: SignetEntity;
}

// ── base64url ────────────────────────────────────────────────────────
// Unpadded, hand-rolled over bytes so no host global (atob/Buffer) is
// assumed. Told, never thrown: bad input parses to null.

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/** Bytes → base64url, unpadded. */
export function toBase64url(bytes: Uint8Array): string {
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

// ── the canonical form ───────────────────────────────────────────────
// Sorted at every depth, so key insertion order cannot change a byte —
// the-sphragis's own recipe, and it is restated here rather than imported
// because tools in this spring never import each other. THE LOK RESTATES IT
// AGAIN, word for word: a key and a lock must be cut to the same drawing,
// and the pair's proofs check that they are.

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
	return 'null'; // functions, symbols — a credential holds none of them
}

/**
 * THE CANONICAL FORM — the exact string the signature is taken over.
 *
 * `signature` is EXCLUDED, because a signature cannot be taken over itself.
 * Everything else is in, sorted at every depth, so two credentials of the
 * same claim canonicalize byte-identically and a re-labelled `who` or `when`
 * produces a different string and therefore a signature that does not verify.
 *
 * A partial credential canonicalizes fine: this is a pure reading of the
 * fields that stand.
 */
export function canonical(credential: Partial<Credential>): string {
	const held: Record<string, unknown> = {};
	for (const key of Object.keys(credential)) {
		if (key === 'signature') continue;
		held[key] = (credential as Record<string, unknown>)[key];
	}
	return canonicalValue(held);
}

/** The canonical form as the bytes a host actually signs. UTF-8, by law. */
export function canonicalBytes(credential: Partial<Credential>): Uint8Array {
	return new TextEncoder().encode(canonical(credential));
}

// ── claiming ─────────────────────────────────────────────────────────

/**
 * CLAIM — one artefact, one entity, one moment, one credential.
 *
 * The host digests the bytes and signs the canonical form. Nothing is
 * computed here and nothing is stored here. `who` is SNAPSHOTTED at this
 * line — the signet's rule — so history keeps the identity it was claimed
 * under. `when` is passed in, because this water has no clock.
 *
 * The private handle is used exactly once, on the line below, and is never
 * read, never copied and never returned.
 */
export async function claim(
	host: ClavisHost,
	keys: KeyPair,
	bytes: Uint8Array,
	who: SignetEntity,
	when: number
): Promise<Credential> {
	const digest = toBase64url(await host.digest(bytes));
	const unsigned: Omit<Credential, 'signature'> = {
		alg: ALG,
		publicKey: toBase64url(keys.publicKeyBytes),
		digest,
		who: { name: who.name, sigil: who.sigil, color: who.color },
		when,
	};
	const signature = toBase64url(await host.sign(keys.privateKey, canonicalBytes(unsigned)));
	return { ...unsigned, signature };
}

// ── the public half ──────────────────────────────────────────────────

/** Pull the public half out of a credential. Carries nothing private. */
export function publicHalf(credential: Credential): PublicHalf {
	return {
		alg: credential.alg,
		publicKey: credential.publicKey,
		who: { ...credential.who },
	};
}

/**
 * SERIALIZE THE PUBLIC HALF — and only ever the public half.
 *
 * There is no `serializePrivate`, no `exportKeyPair`, no options object with
 * an `includePrivate` flag. The absence is the law: a private key that can be
 * serialized is a private key that will be.
 *
 * The text is the canonical form, so the round trip is byte-exact.
 */
export function serializePublic(half: PublicHalf): string {
	return canonical(half as unknown as Partial<Credential>);
}

/** Parse a serialized public half, or NULL if it is not one. Never throws. */
export function parsePublic(text: string): PublicHalf | null {
	let held: unknown;
	try {
		held = JSON.parse(text);
	} catch {
		return null;
	}
	if (typeof held !== 'object' || held === null) return null;
	const h = held as Record<string, unknown>;
	if (h['alg'] !== ALG) return null;
	if (typeof h['publicKey'] !== 'string' || fromBase64url(h['publicKey'] as string) === null) return null;
	const who = h['who'];
	if (typeof who !== 'object' || who === null) return null;
	const w = who as Record<string, unknown>;
	if (typeof w['name'] !== 'string' || typeof w['sigil'] !== 'string' || typeof w['color'] !== 'string') {
		return null;
	}
	return {
		alg: ALG,
		publicKey: h['publicKey'] as string,
		who: { name: w['name'] as string, sigil: w['sigil'] as string, color: w['color'] as string },
	};
}

// ── reading a credential ─────────────────────────────────────────────

/**
 * Is this a well-formed credential? A SHAPE check, not a proof — whether the
 * signature is good is `the-lok`'s question, and this water never answers it.
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

/** A gentle sentence for a credential — plain words, nothing secret in it. */
export function describeCredential(credential: Credential): string {
	return `${credential.who.sigil} ${credential.who.name} claims this artefact — ${ALG}, key ${credential.publicKey.slice(0, 8)}…, at ${credential.when}. A key, not a curtain: this proves authorship and hides nothing.`;
}
