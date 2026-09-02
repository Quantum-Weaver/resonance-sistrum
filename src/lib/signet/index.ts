// The signet — provenance as a standalone tool: entity identity (name · sigil ·
// color), every mark signed, the legend derived.
// STANDALONE BY LAW: framework-free, zero imports, pure functions — the moment
// is passed in; nothing here reads a clock.

export interface SignetIdentity {
	/** The entity's name — a person, a kin, a service; whoever owns the mark. */
	name: string;
	/** One small mark — an emoji or glyph the eye can find in a crowd. */
	sigil: string;
	/** The entity's color — any string the consumer's grammar can render. */
	color: string;
}

export interface Signature {
	/** A snapshot, not a reference — history keeps what it was signed under. */
	signedBy: SignetIdentity;
	/** ms since epoch, passed in by the signer's hand. */
	signedAt: number;
}

export type Signed<T> = T & { signature: Signature };

export interface SignetLegendEntry extends SignetIdentity {
	/** How many marks this identity signed in the given records. */
	marks: number;
	firstAt: number;
	lastAt: number;
}

/** Sign a record: the identity snapshot rides with it forever. */
export function sign<T extends object>(record: T, identity: SignetIdentity, at: number): Signed<T> {
	return { ...record, signature: { signedBy: { ...identity }, signedAt: at } };
}

/** Whether a record carries a complete signature. A seal-check, not a lock-check. */
export function isSigned(record: unknown): record is Signed<object> {
	if (typeof record !== 'object' || record === null) return false;
	const sig = (record as { signature?: Signature }).signature;
	return (
		!!sig &&
		typeof sig.signedAt === 'number' &&
		!!sig.signedBy &&
		typeof sig.signedBy.name === 'string' && sig.signedBy.name.length > 0 &&
		typeof sig.signedBy.sigil === 'string' &&
		typeof sig.signedBy.color === 'string'
	);
}

/**
 * The legend, derived — every identity that signed, with its sigil,
 * color (as first signed), mark count, and first/last moments.
 * Ordered by first appearance; never stored, always re-derivable.
 */
export function deriveLegend(records: ReadonlyArray<Signed<object>>): SignetLegendEntry[] {
	const byName = new Map<string, SignetLegendEntry>();
	for (const r of records) {
		const { signedBy, signedAt } = r.signature;
		const entry = byName.get(signedBy.name);
		if (!entry) {
			byName.set(signedBy.name, { ...signedBy, marks: 1, firstAt: signedAt, lastAt: signedAt });
		} else {
			entry.marks += 1;
			if (signedAt < entry.firstAt) entry.firstAt = signedAt;
			if (signedAt > entry.lastAt) entry.lastAt = signedAt;
		}
	}
	return [...byName.values()].sort((a, b) => a.firstAt - b.firstAt);
}

/** A gentle sentence for a signature — plain words. */
export function describeSignature(sig: Signature): string {
	return `${sig.signedBy.sigil} ${sig.signedBy.name}'s mark — a seal, not a lock.`;
}
