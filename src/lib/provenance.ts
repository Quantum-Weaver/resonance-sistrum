// provenance.ts — what rides in `takes.provenance`, read and written PURELY.
// No DOM, no clock, no disk, no crypto: values in, values out, so every rule
// the column lives by can be proven in a node script (`.journals/proofs/`)
// without a window.
//
// THE COLUMN COMES TO LIFE (2026-09-02), at KP's ⚛ ruling, verbatim:
//
//   "none of that belongs in the recorder, the recorder db structure simply
//    requires a json column to handle the expected use case, the column will
//    come to life when ready"
//
// So the collaboration layer arrives THROUGH the held column and is never
// designed into the recorder. `src-tauri/src/lib.rs` still says the column's
// law and this file still obeys it: nothing validates the document, and
// NOTHING MAY DROP IT — whatever a hand put there rides whole, including
// json this reader cannot parse, which comes back as the raw string.
//
// The document, as the app writes it:
//
//   { studio?:   { kind: 'mixdown' | 'trim' | 'overdub', … }   // where the sound came from
//     signet?:   { name, sigil, color }                        // WHO, as a snapshot
//     clavis?:   Credential                                    // the signed hand
//     merismos?: Merismos }                                    // who gets what
//
// and any other key a hand ever puts beside them, carried untouched.
//
// ZERO IMPORTS, the spring's own habit: the signet's identity, the clavis's
// credential and the merismos's `who` are honoured BY SHAPE, restated
// structurally, so a value from any of the three assigns straight in and this
// file can be read by a node script with no resolver help.

/** `the-signet`'s SignetIdentity, restated. It rides by the snapshot rule. */
export interface SignetSnapshot {
	name: string;
	sigil: string;
	color: string;
}

/** `the-merismos`'s `Who`, restated. `id` is the better key where a realm has one.
 *  The index signature is the water's own — a realm's extra keys ride whole —
 *  and it is what lets a value from here assign straight into a `Part`. */
export interface ProposedWho {
	id?: string;
	name: string;
	sigil?: string;
	color?: string;
	[k: string]: unknown;
}

/** One proposed line of a split: a person and what they did. Points come from `even`. */
export interface ProposedPart {
	who: ProposedWho;
	role: string;
}

/** What a provenance document says, read honestly. */
export interface ProvenanceRead {
	/** false only when the column is null — a take that was never signed. */
	present: boolean;
	/** the json did not parse; `raw` is the exact string, kept whole. */
	unreadable: boolean;
	raw?: string;
	studio?: unknown;
	signet?: SignetSnapshot;
	clavis?: unknown;
	merismos?: unknown;
	/** every other key the document carried, untouched and in its own order. */
	other: Record<string, unknown>;
}

/**
 * THE STORE'S READ PATH — a `takes.provenance` cell, as it comes back from
 * SQLite. It lives here rather than inside the store so a node proof can walk
 * the very road the app walks.
 *
 * Unreadable json comes back as THE RAW STRING rather than dropped or nulled:
 * a parse failure is not permission to discard. That is `takes.provenance`'s
 * own law from the day the column was held — "nothing validates it, and
 * nothing may drop it."
 */
export function parseProvenanceColumn(raw: unknown): unknown {
	if (raw == null) return undefined;
	if (typeof raw !== 'string') return raw;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

/** THE STORE'S WRITE PATH — the text the column holds, or null for nothing. */
export function provenanceColumnText(value: unknown): string | null {
	return value != null ? JSON.stringify(value) : null;
}

/** A shape check on an identity snapshot. Never a proof of anything. */
export function isSignetSnapshot(value: unknown): value is SignetSnapshot {
	if (typeof value !== 'object' || value === null) return false;
	const s = value as Record<string, unknown>;
	return (
		typeof s.name === 'string' &&
		s.name.length > 0 &&
		typeof s.sigil === 'string' &&
		typeof s.color === 'string'
	);
}

/**
 * READ — a provenance value as it comes back from the store.
 *
 * `takeStore` already hands unreadable json back as the RAW STRING rather
 * than dropping or nulling it ("a parse failure is not permission to
 * discard"). This reader keeps that promise: a string comes back as
 * `{ unreadable: true, raw }`, and the room shows the string.
 */
export function readProvenance(value: unknown): ProvenanceRead {
	if (value == null) return { present: false, unreadable: false, other: {} };
	if (typeof value === 'string') {
		return { present: true, unreadable: true, raw: value, other: {} };
	}
	if (typeof value !== 'object') {
		return { present: true, unreadable: true, raw: String(value), other: {} };
	}
	const doc = value as Record<string, unknown>;
	const other: Record<string, unknown> = {};
	for (const key of Object.keys(doc)) {
		if (key === 'studio' || key === 'signet' || key === 'clavis' || key === 'merismos') continue;
		other[key] = doc[key];
	}
	return {
		present: true,
		unreadable: false,
		studio: doc.studio,
		signet: isSignetSnapshot(doc.signet) ? (doc.signet as SignetSnapshot) : undefined,
		clavis: doc.clavis,
		merismos: doc.merismos,
		other
	};
}

/**
 * SEAL — put the signed hand (and, at a mixdown, the split) BESIDE what is
 * already in the document. Nothing is replaced and nothing is dropped: the
 * studio's own note rides on untouched, and so does every key this app has
 * never heard of.
 *
 * A base that is an unreadable string is kept under `kept_raw` rather than
 * thrown away — the column's law is that nothing may drop it, and that law
 * does not pause because a document was malformed.
 *
 * An absent piece is ABSENT, never a null: a take sealed with no key carries
 * `signet` and no `clavis`, which is the honest reading of "this hand was
 * here and this device had no key."
 */
export function sealProvenance(
	base: unknown,
	added: { signet?: SignetSnapshot; clavis?: unknown; merismos?: unknown }
): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	if (typeof base === 'string') out.kept_raw = base;
	else if (base && typeof base === 'object') Object.assign(out, base as Record<string, unknown>);
	if (added.signet !== undefined) out.signet = added.signet;
	if (added.clavis !== undefined) out.clavis = added.clavis;
	if (added.merismos !== undefined) out.merismos = added.merismos;
	return out;
}

/**
 * THE IDENTITY KEY — `the-merismos`'s `whoKey`, restated word for word so
 * this file imports nothing. A public key is the better identity than a name,
 * because two people may honestly share a name and no two share a key.
 */
export function partKey(who: ProposedWho | undefined): string {
	if (who && typeof who.id === 'string' && who.id.length > 0) return `id:${who.id}`;
	if (who && typeof who.name === 'string' && who.name.length > 0) return `name:${who.name}`;
	return 'unnamed:';
}

/**
 * WHO IS IN THESE LANES — one entry per distinct identity found in the lanes'
 * takes' provenance, ORDERED BY FIRST APPEARANCE (the signet's own legend
 * order, and the order `even` hands its remainder along).
 *
 * A lane's identity is its `signet` snapshot; its `id`, where the take also
 * carries a credential, is that credential's public key. A lane with no
 * provenance at all names nobody and is simply not a part — a proposal never
 * invents a person.
 */
export function identitiesFrom(docs: readonly unknown[]): ProposedWho[] {
	const seen = new Set<string>();
	const out: ProposedWho[] = [];
	for (const doc of docs) {
		const read = readProvenance(doc);
		if (!read.signet) continue;
		const cred = read.clavis as { publicKey?: unknown } | undefined;
		const id =
			cred && typeof cred === 'object' && typeof cred.publicKey === 'string'
				? cred.publicKey
				: undefined;
		const who: ProposedWho = {
			...(id ? { id } : {}),
			name: read.signet.name,
			sigil: read.signet.sigil,
			color: read.signet.color
		};
		const key = partKey(who);
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(who);
	}
	return out;
}

/**
 * PROPOSE THE PARTS — one per distinct identity in the lanes, plus the sealer
 * as the engineer if they are not already a part. KP's vision, which this
 * serves: *"every musician in a band or an orchestra records their part
 * sovereignly; an engineer finishes the project."*
 *
 * A PROPOSAL IS NOT A FACT. Nothing here consents to anything: the points come
 * from `the-merismos`'s `even()` and every part starts with `consent: null`,
 * and the room ticks one line only — the identity that holds this device's
 * key. Opt-in always: "no force or deceptive theft."
 *
 * The order is the order `even` hands its remainder along: the lanes' own
 * first-appearance order, the sealer last unless they already played.
 */
export function proposeParts(
	laneProvenances: readonly unknown[],
	sealer: ProposedWho | null,
	roles: { lane?: string; engineer?: string } = {}
): ProposedPart[] {
	const laneRole = roles.lane ?? 'part';
	const engineerRole = roles.engineer ?? 'engineer';
	const whos = identitiesFrom(laneProvenances);
	const parts: ProposedPart[] = whos.map((who) => ({ who, role: laneRole }));
	if (sealer && sealer.name) {
		const key = partKey(sealer);
		if (!parts.some((p) => partKey(p.who) === key)) parts.push({ who: sealer, role: engineerRole });
	}
	return parts;
}
