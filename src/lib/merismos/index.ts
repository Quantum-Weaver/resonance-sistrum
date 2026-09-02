// the-merismos — THE SPLITS: who gets what, as data.
//
// μερισμός (merismós) — apportionment, a dividing into parts. Greek joins the
// naming strata beside Khorós, the Epagoge and the Sphragis, and it is chosen
// for the same reason the Sphragis's was: THE NAME IS THE SPECIFICATION. A
// merismos divides one share into named parts. It does not pay anybody.
//
// THE THIRD AUTHORSHIP WATER. The clavis and the lok give unforgeable
// authorship. They say nothing about WHO GETS WHAT. This water says that, and
// only that.
//
// KP'S VISION, VERBATIM, WHICH THIS WATER SERVES:
//   "every musician in a band or an orchestra records their part sovereignly;
//    an engineer finishes the project; and all credentials combine so the
//    Sanctuary system can pay everyone involved no matter how small the role —
//    opt-in always: 'no force or deceptive theft.'"
//
// THE LAWS:
//   · IT IS A DESCRIPTION OF SHARES, NEVER A PROMISE OF MONEY. Nothing here
//     moves a cent, holds a balance, names a payout rail or schedules one.
//     `shares` divides an amount a CONSUMER declares, and hands back integers.
//   · THE SPHRAGIS'S LAW 1: THE LICENCE IS DATA, AND THE COLLABORATOR SPLITS
//     ARE COLUMNS. A merismos is columns — parts, roles, points — never prose
//     to be re-argued after the fact.
//   · THE SPHRAGIS'S LAW 4: THE 90/10 STAYS SCHEMA, NOT PROMISE. `combine`
//     takes the house split and the merismos and returns THE PICTURE — the
//     platform's ten, the artist's ninety, and the artist's ninety divided by
//     the parts. It computes percentages of a whole, never money, and the real
//     arithmetic lives server-side where the money lives. The residual pool
//     carries collaborator shares through the contributions ledger, forever,
//     and that ledger is elsewhere and is not modelled here.
//   · OPT-IN ALWAYS. A part without consent is NAMED, every time, in
//     `validate`, in `consented`, in `shares` and in `combine`. There is no
//     parameter anywhere that suppresses that naming, and no exported path
//     that consents on someone's behalf: `consent` takes the who and the
//     moment, and matches an existing part or calmly refuses.
//   · POINTS ARE BASIS POINTS AND MUST SUM TO EXACTLY 10000. A merismos that
//     does not is TOLD in plain words and LEFT EXACTLY AS DECLARED — a silent
//     correction is how a promise gets back in. The one place a remainder is
//     ever handed out is `even`, and it is handed out DETERMINISTICALLY and
//     said out loud.
//   · THE TOTAL ALWAYS EQUALS THE AMOUNT. `shares` uses the largest-remainder
//     method, so the integer cents sum to the declared amount exactly. Not
//     approximately. Proven, across random amounts.
//   · EVERYTHING IS TOLD. Every refusal is a calm no with a reason on `told`.
//     NOTHING IN THIS WATER THROWS.
//
// STANDALONE BY LAW, as the Sphragis is: zero imports, framework-free, pure
// functions. No DOM, no disk, no network, NO CLOCK — every moment is DECLARED
// by the consumer. It imports no sibling tool and never will; `the-signet`'s
// identity and `the-sphragis`'s split are honoured BY SHAPE, written out
// structurally, so a value from either assigns straight in.
//
// Logging designed in, shipped silent: nothing here writes a line.

/** THE WORKING NAME, in ONE constant and ONE folder, so a rename is one edit
 *  and one `git mv`. KP named the need, not the word; μερισμός is this hand's
 *  reading of it and REMAINS HIS TO KEEP OR CHANGE. Nothing else in this
 *  water spells the name, and no exported behaviour depends on it. */
export const TOOL_NAME = 'the-merismos';

/** KP's own line, carried verbatim and exported so no consumer can claim it
 *  was hard to find. It rides in every `told` this water produces. */
export const OPT_IN =
	'Opt-in always: "no force or deceptive theft." Every part here is a share someone said yes to, and a part that has not consented is named rather than assumed.';

/** The other unremovable line. A merismos describes shares; it is not, and
 *  cannot become, a promise that money will arrive. */
export const NEVER_MONEY =
	'This is a description of shares, never a promise of money. Nothing here moves a cent, holds a balance or names a payout; the arithmetic that touches money lives server-side, where the money lives.';

/** Designed in, shipped silent — see the header. */
export const LOGGING = false;

/** BASIS POINTS. Ten thousand of them, and a merismos must sum to exactly
 *  this. Basis points rather than percents because a third of a share is
 *  3333/3334 rather than 33.33…, and integers cannot drift. */
export const TOTAL_POINTS = 10000;

/** WHAT IS BEING DIVIDED. One value today — the artist's share, the 90 the
 *  Sphragis's law 4 leaves after the platform's 10. Typed as the literal so
 *  the compiler itself refuses another value: this water has no business
 *  apportioning the platform's ten, and a field that could say so would be a
 *  door somebody eventually walks through. */
export type Of = 'artist-share';

/** The only value `Of` takes, exported to be written rather than remembered. */
export const OF: Of = 'artist-share';

/** WHO — a SNAPSHOT of an entity, never a reference to one. The rule is
 *  `the-signet`'s own and is inherited rather than re-derived: *"a snapshot,
 *  not a reference — history keeps what it was signed under."* A collaborator
 *  who later changes their name, sigil or colour does not retroactively change
 *  who a split was agreed with.
 *
 *  Honoured BY SHAPE: a `SignetIdentity` (name · sigil · color) assigns
 *  straight in. `id` is optional and, where a realm has one, it is the better
 *  key — two people may honestly share a name. */
export interface Who {
	/** the realm's own id, where it has one. The identity key when present. */
	id?: string;
	/** the signet's own field, and the fallback key. */
	name: string;
	/** the signet's own field. One small mark the eye can find in a crowd. */
	sigil?: string;
	/** the signet's own field. Any string the consumer's grammar can render. */
	color?: string;
	[k: string]: unknown; // ridden whole — a realm's profile id, handle, wallet address
}

/** A YES, with the moment it was given. `at` is DECLARED — this water has no
 *  clock. Null and absent both mean the same honest thing: not yet. */
export interface Consent {
	at: string;
	/** free text: how the yes was given, in the realm's own words. */
	how?: string;
	[k: string]: unknown;
}

/** ONE PART — one collaborator, one role, one number of basis points, and
 *  their yes or the absence of it. */
export interface Part {
	who: Who;
	/** FREE TEXT, on purpose: 'vocals', 'engineer', 'cover', 'the room'. A
	 *  sealed enum of roles would answer a question that is a band's to
	 *  answer, and would then be expensive to change. */
	role: string;
	/** basis points of `Merismos.of`. Integer, non-negative. */
	points: number;
	/** null or absent until this part opted in. Never filled by default. */
	consent?: Consent | null;
	[k: string]: unknown; // ridden whole — a realm's take id, instrument, notes
}

/** THE MERISMOS — the split, as columns. */
export interface Merismos {
	parts: Part[];
	of: Of;
	[k: string]: unknown; // ridden whole — the realm's own keys ride as terms
}

/** The faults, NAMED. A verdict says which; it never says "invalid". */
export type Fault =
	| 'empty'
	| 'not-artist-share'
	| 'unnamed-who'
	| 'duplicate-who'
	| 'non-integer'
	| 'negative'
	| 'not-ten-thousand';

/** What `validate` returns: `ok`, the named faults, the sum it found, and the
 *  parts still waiting on a yes — told either way, because an unconsented
 *  part is not a fault, it is a fact that must not be quiet. */
export interface Verdict {
	ok: boolean;
	faults: Fault[];
	sum: number;
	/** the identity keys of parts with no consent recorded. */
	waiting: string[];
	told: string[];
}

/** One part's cents. The `who` and `role` ride along so a caller never has to
 *  re-join by index. */
export interface Share {
	who: Who;
	role: string;
	points: number;
	cents: number;
	consented: boolean;
}

/** What `shares` returns. `total` is the sum of `parts[].cents` AS COMPUTED,
 *  never as asserted — a caller can check it against `of` themselves. */
export interface Shares {
	ok: boolean;
	/** the amount that was declared, in integer cents. */
	of: number;
	parts: Share[];
	total: number;
	told: string[];
}

/** A house split, honoured BY SHAPE rather than by import. `the-sphragis`'s
 *  `SphragisSplit` assigns straight in — the same two numbers, the same
 *  passenger index. */
export interface HouseSplit {
	artist: number;
	platform: number;
	[k: string]: unknown;
}

/** One part inside the full picture. Both percentages are DESCRIPTIONS. */
export interface CombinedPart {
	who: Who;
	role: string;
	points: number;
	/** this part's share of the ARTIST'S share, as a percent of that share. */
	ofArtistShare: number;
	/** this part's share of THE WHOLE, as a percent — artist% × points/10000.
	 *  A number to read, never a number to pay from. */
	ofWhole: number;
	consented: boolean;
}

/** THE FULL PICTURE — the platform's ten, the artist's ninety, and the
 *  artist's ninety divided by the parts. DATA. Never applied to money by this
 *  tool, and there is deliberately no verb here that could apply it. */
export interface Combined {
	ok: boolean;
	house: HouseSplit;
	platform: number;
	artist: number;
	of: Of;
	parts: CombinedPart[];
	/** the percentages of the whole, added up. It should equal `artist` when
	 *  the merismos sums to 10000; floating point makes that a near-equality,
	 *  and it is reported rather than rounded into looking exact. */
	partsOfWhole: number;
	told: string[];
}

/** What `consented` returns. A part without consent is NAMED. */
export interface ConsentReport {
	all: boolean;
	given: string[];
	waiting: string[];
	told: string[];
}

// ── who, keyed ───────────────────────────────────────────────────────

/** THE IDENTITY KEY — `id` when a realm has one, the name otherwise. It is
 *  exported because duplicate-detection that a consumer cannot reproduce is
 *  duplicate-detection a consumer must simply trust. */
export function whoKey(who: Who): string {
	if (who && typeof who.id === 'string' && who.id.length > 0) return `id:${who.id}`;
	if (who && typeof who.name === 'string' && who.name.length > 0) return `name:${who.name}`;
	return 'unnamed:';
}

function label(who: Who): string {
	const name = who && typeof who.name === 'string' && who.name.length > 0 ? who.name : '(unnamed)';
	return who && typeof who.id === 'string' && who.id.length > 0 ? `${name} [${who.id}]` : name;
}

function hasConsent(part: Part): boolean {
	const c = part.consent;
	return !!c && typeof c.at === 'string' && c.at.length > 0;
}

function partsOf(m: Merismos): Part[] {
	return m && Array.isArray(m.parts) ? m.parts : [];
}

// ── the canonical form ───────────────────────────────────────────────
// Sorted at every depth, so key insertion order cannot change a byte. The
// same shape the Sphragis uses, written out rather than imported, so the two
// waters' canonical forms nest without either importing the other.

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
	return 'null'; // functions, symbols — a split holds none of them
}

/** THE CANONICAL FORM — stable, sorted at every depth, and the exact string a
 *  content hash over a split should be taken over.
 *
 *  THE ORDER OF `parts` IS A TERM AND IS KEPT AS DECLARED. It is not sorted,
 *  because `even` hands its remainder to the FIRST part: sorting here would
 *  silently move a basis point from one musician to another, which is exactly
 *  the class of quiet arithmetic this water exists to refuse. Two merismoi
 *  that name the same people in a different order are DIFFERENT SPLITS, and
 *  canonicalize differently, and that is the honest answer.
 *
 *  `told` is EXCLUDED, the way the Sphragis excludes `flagged`: telling is
 *  derived commentary and not a term, so a calm no on a `consent` call cannot
 *  move the split's canonical form. Everything else — including the realm's
 *  own keys — is in, sorted at every depth. */
export function canonical(m: Merismos): string {
	const held: Record<string, unknown> = {};
	for (const key of Object.keys(m ?? {})) {
		if (key === 'told') continue;
		held[key] = (m as unknown as Record<string, unknown>)[key];
	}
	return canonicalValue(held);
}

// ── the laws, checked ────────────────────────────────────────────────

/** SUM — the basis points, added. Non-numbers contribute nothing and are
 *  caught by `validate` rather than silently coerced. */
export function sum(m: Merismos): number {
	let total = 0;
	for (const part of partsOf(m)) if (typeof part.points === 'number' && Number.isFinite(part.points)) total += part.points;
	return total;
}

/** VALIDATE — ok, or the fault NAMED. Never a throw, never a bare boolean,
 *  and never a silent repair: what is wrong is said in the realm's own terms
 *  and the merismos comes back exactly as it was declared. */
export function validate(m: Merismos): Verdict {
	const faults: Fault[] = [];
	const told: string[] = [];
	const parts = partsOf(m);
	const total = sum(m);
	const waiting: string[] = [];

	if (parts.length === 0) {
		faults.push('empty');
		told.push('the merismos has no parts — an empty split apportions nothing, and is told rather than treated as a whole share for nobody');
	}

	if (!m || m.of !== OF) {
		faults.push('not-artist-share');
		told.push(`a merismos divides the ${OF} and only that — the platform's share is not this water's to apportion, and "${String(m && m.of)}" is not a thing it can divide`);
	}

	const seen = new Map<string, number>();
	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i];
		const who = part.who;
		const points = part.points;

		if (!who || typeof who.name !== 'string' || who.name.length === 0) {
			if (!faults.includes('unnamed-who')) faults.push('unnamed-who');
			told.push(`part ${i + 1} names nobody — a share belongs to someone, and an unnamed share is how a role goes unpaid`);
		}

		const key = whoKey(who ?? ({ name: '' } as Who));
		const first = seen.get(key);
		if (first !== undefined) {
			if (!faults.includes('duplicate-who')) faults.push('duplicate-who');
			told.push(`${label(who ?? ({ name: '' } as Who))} appears twice — parts ${first + 1} and ${i + 1}. Two rows for one person is how a share gets counted once and paid once; they are told, never merged, because merging would decide something the band decides`);
		} else {
			seen.set(key, i);
		}

		if (typeof points !== 'number' || !Number.isFinite(points)) {
			if (!faults.includes('non-integer')) faults.push('non-integer');
			told.push(`${label(who ?? ({ name: '' } as Who))}'s points are not a finite number — told exactly as given, never guessed at`);
		} else {
			if (!Number.isInteger(points)) {
				if (!faults.includes('non-integer')) faults.push('non-integer');
				told.push(`${label(who)}'s points are ${points}, which is not a whole basis point — points are integers so that no share can drift, and this one is told rather than rounded`);
			}
			if (points < 0) {
				if (!faults.includes('negative')) faults.push('negative');
				told.push(`${label(who)}'s points are ${points} — a negative share is a debt wearing a credit's clothes, and this water will not carry it quietly`);
			}
		}

		if (!hasConsent(part)) waiting.push(whoKey(who ?? ({ name: '' } as Who)));
	}

	if (parts.length > 0 && total !== TOTAL_POINTS) {
		faults.push('not-ten-thousand');
		told.push(`the parts sum to ${total} basis points, not ${TOTAL_POINTS} — told in plain words and LEFT EXACTLY AS DECLARED, because a silent correction is how a promise gets back in`);
	}

	if (faults.length === 0) told.push(`the merismos holds: ${parts.length} part${parts.length === 1 ? '' : 's'}, summing to ${TOTAL_POINTS} basis points of the ${OF}`);
	if (waiting.length > 0) told.push(`${waiting.length} part${waiting.length === 1 ? ' has' : 's have'} not opted in yet — ${waiting.join(' · ')}. A split may be arithmetically whole and still not be agreed, and this water will not let the second fact hide behind the first`);
	told.push(OPT_IN);
	told.push(NEVER_MONEY);

	return { ok: faults.length === 0, faults, sum: total, waiting, told };
}

// ── the even split ───────────────────────────────────────────────────

/** EVEN — the split a band reaches for first: everyone the same.
 *
 *  THE REMAINDER RULE, STATED RATHER THAN HIDDEN: 10000 does not divide by 3,
 *  or by 7, or by most band sizes. The remainder goes, WHOLE, TO THE FIRST
 *  PART — not scattered, not rounded away, not given to whoever the sort
 *  happens to put first. Three people receive 3334 · 3333 · 3333. Seven
 *  receive 1432 · 1428 × 6. The first part is the one the CALLER listed
 *  first, so the caller decides who carries the extra basis point, and the
 *  telling says by how much.
 *
 *  An even split is drawn WITH NO CONSENT ON ANY PART. Nothing here consents
 *  on anyone's behalf; the yeses arrive through `consent`, one hand at a
 *  time. */
export function even(whos: readonly Who[], role: string = 'part'): Merismos {
	const list = Array.isArray(whos) ? whos : [];
	if (list.length === 0) return { parts: [], of: OF };
	const base = Math.floor(TOTAL_POINTS / list.length);
	const remainder = TOTAL_POINTS - base * list.length;
	const parts: Part[] = list.map((who, i) => ({
		who: { ...who },
		role,
		points: i === 0 ? base + remainder : base,
		consent: null,
	}));
	return { parts, of: OF };
}

// ── the cents ────────────────────────────────────────────────────────

/** SHARES — integer cents per part, by the LARGEST-REMAINDER METHOD, so that
 *  the parts always sum to exactly the amount declared. Not approximately.
 *
 *  How it works, said plainly so nobody has to trust it: each part's exact
 *  entitlement is `points × amount ÷ 10000`. Everybody first takes the FLOOR
 *  of that, which always leaves a few cents over. Those leftover cents go one
 *  each to the parts with the largest fractional remainders, largest first. A
 *  TIE GOES TO THE EARLIER PART — the same determinism `even` uses, so the
 *  same merismos and the same amount always produce the same cents, on every
 *  machine, forever.
 *
 *  THIS DIVIDES A NUMBER. It does not pay anybody, does not know a currency,
 *  and does not know whether the amount it was handed exists. */
export function shares(m: Merismos, amountCents: number): Shares {
	const told: string[] = [];
	const parts = partsOf(m);
	const verdict = validate(m);

	const blank = (why: string): Shares => {
		told.push(why);
		told.push(OPT_IN);
		told.push(NEVER_MONEY);
		return {
			ok: false,
			of: typeof amountCents === 'number' && Number.isFinite(amountCents) ? amountCents : 0,
			parts: parts.map((p) => ({ who: p.who, role: p.role, points: typeof p.points === 'number' ? p.points : 0, cents: 0, consented: hasConsent(p) })),
			total: 0,
			told,
		};
	};

	if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
		return blank(`the amount ${String(amountCents)} is not a whole number of cents — cents are the smallest unit there is, so there is nothing below them to round into, and this water refuses to invent a fraction of one`);
	}
	if (!verdict.ok) {
		return blank(`the merismos does not hold (${verdict.faults.join(' · ')}) — no cents were apportioned, because dividing an amount by a split that does not close is how a rounding error becomes somebody's missing pay`);
	}

	const exact = parts.map((p) => p.points * amountCents);
	const base = exact.map((e) => Math.floor(e / TOTAL_POINTS));
	const remainders = exact.map((e, i) => e - base[i] * TOTAL_POINTS);
	let leftover = amountCents - base.reduce((a, b) => a + b, 0);

	const order = remainders
		.map((r, i) => ({ r, i }))
		.sort((a, b) => (b.r - a.r) || (a.i - b.i));

	const cents = [...base];
	for (let k = 0; k < order.length && leftover > 0; k += 1) {
		cents[order[k].i] += 1;
		leftover -= 1;
	}
	// a negative amount leaves a negative leftover; it is taken back the same
	// deterministic way, from the SMALLEST remainders first, so the total still
	// lands exactly on the amount.
	for (let k = order.length - 1; k >= 0 && leftover < 0; k -= 1) {
		cents[order[k].i] -= 1;
		leftover += 1;
	}

	const out: Share[] = parts.map((p, i) => ({ who: p.who, role: p.role, points: p.points, cents: cents[i], consented: hasConsent(p) }));
	const total = out.reduce((a, s) => a + s.cents, 0);

	told.push(`${amountCents} cents apportioned across ${out.length} part${out.length === 1 ? '' : 's'} by the largest-remainder method — the parts sum to ${total}, which is the amount exactly; a tie in the remainders goes to the earlier part, so this is the same answer on every machine`);
	if (amountCents < 0) told.push('the amount declared is negative — it was divided exactly as given rather than refused, because a reversal is a real thing a ledger does, and the leftover was taken back from the smallest remainders first');
	if (verdict.waiting.length > 0) told.push(`${verdict.waiting.length} of these part${verdict.waiting.length === 1 ? ' has' : 's have'} not opted in — ${verdict.waiting.join(' · ')}. The cents are computed for the whole split and the unconsented parts are NAMED; whether they are ever sent is not this water's to decide, and consent is not implied by arithmetic`);
	told.push(OPT_IN);
	told.push(NEVER_MONEY);

	return { ok: true, of: amountCents, parts: out, total, told };
}

// ── the whole picture ────────────────────────────────────────────────

/** COMBINE — the house split and the merismos, as ONE PICTURE: the platform's
 *  ten, the artist's ninety, and the artist's ninety divided by the parts.
 *
 *  THE 90/10 STAYS SCHEMA, NOT PROMISE (the Sphragis's law 4). This returns
 *  NUMBERS TO READ. It does not apply them to money, it does not know a
 *  currency, and there is no verb on this surface that could apply it — the
 *  computation that touches money is server-side, where the money lives, and
 *  the collaborator shares ride into it through the contributions ledger's
 *  residual pool, which is schema elsewhere and is not modelled here.
 *
 *  A house split that does not sum to 100 is TOLD and LEFT AS DECLARED,
 *  exactly as the Sphragis tells it. */
export function combine(house: HouseSplit, m: Merismos): Combined {
	const told: string[] = [];
	const verdict = validate(m);
	const artist = house && typeof house.artist === 'number' && Number.isFinite(house.artist) ? house.artist : 0;
	const platform = house && typeof house.platform === 'number' && Number.isFinite(house.platform) ? house.platform : 0;
	const houseSum = artist + platform;

	if (!house || typeof house.artist !== 'number' || typeof house.platform !== 'number' || !Number.isFinite(house.artist) || !Number.isFinite(house.platform)) {
		told.push('the house split is not two finite numbers — told exactly as given, never guessed at');
	} else if (houseSum !== 100) {
		told.push(`the house split is artist ${house.artist} + platform ${house.platform} = ${houseSum}, not 100 — told in plain words and left exactly as declared, because a silent correction is how a promise gets back in`);
	}

	const parts: CombinedPart[] = partsOf(m).map((p) => {
		const points = typeof p.points === 'number' && Number.isFinite(p.points) ? p.points : 0;
		return {
			who: p.who,
			role: p.role,
			points,
			ofArtistShare: (points / TOTAL_POINTS) * 100,
			ofWhole: (artist * points) / TOTAL_POINTS,
			consented: hasConsent(p),
		};
	});
	const partsOfWhole = parts.reduce((a, p) => a + p.ofWhole, 0);

	told.push(`the platform takes ${platform} of the whole for hosting and licensing; the artist's ${artist} is what this merismos divides, and it divides nothing else`);
	if (!verdict.ok) told.push(`the merismos does not hold (${verdict.faults.join(' · ')}) — the picture is drawn from the numbers as declared and the fault is named beside it, never quietly corrected`);
	if (verdict.waiting.length > 0) told.push(`not every part has opted in — ${verdict.waiting.join(' · ')}. A picture of shares is not an agreement to them`);
	told.push('these percentages are a DESCRIPTION. The arithmetic that touches money is computed server-side where the money lives, and collaborator shares reach it through the contributions ledger\'s residual pool — schema elsewhere, and not modelled here');
	told.push(OPT_IN);
	told.push(NEVER_MONEY);

	return { ok: verdict.ok && houseSum === 100, house: { ...house }, platform, artist, of: OF, parts, partsOfWhole, told };
}

// ── the yes ──────────────────────────────────────────────────────────

/** CONSENT — one person's own yes, at a moment they declare. It matches an
 *  EXISTING part by identity key and records the yes on that part alone.
 *
 *  It cannot add a part, cannot change any points, and cannot consent for
 *  anybody else: asked for someone who is not in the split, the answer is a
 *  CALM NO with the reason told and the merismos comes back unchanged. A yes
 *  already given is not overwritten by a second call — the first moment is
 *  the one that happened, and the second attempt is told.
 *
 *  `when` is DECLARED. This water has no clock, so it cannot stamp a consent
 *  with a time nobody chose. */
export function consent(m: Merismos, who: Who, when: string): Merismos {
	const parts = partsOf(m);
	const key = whoKey(who);
	const index = parts.findIndex((p) => whoKey(p.who) === key);
	if (index < 0) {
		return { ...m, parts: parts.map((p) => ({ ...p })), told: [...(Array.isArray(m.told) ? (m.told as string[]) : []), `${label(who)} is not a part of this merismos — nothing was consented, nothing was added, and nothing was thrown. A split gains a person by being redrawn, never by someone saying yes to it`] };
	}
	if (hasConsent(parts[index])) {
		return { ...m, parts: parts.map((p) => ({ ...p })), told: [...(Array.isArray(m.told) ? (m.told as string[]) : []), `${label(who)} already opted in at ${(parts[index].consent as Consent).at} — the first yes is the one that happened, and this second one changed nothing`] };
	}
	return {
		...m,
		parts: parts.map((p, i) => (i === index ? { ...p, consent: { at: when } } : { ...p })),
	};
}

/** CONSENTED — has everyone opted in, and if not, WHO HASN'T. The waiting are
 *  named. There is no summary that hides them and no flag that suppresses
 *  them: `all` is false and the names are right there beside it. */
export function consented(m: Merismos): ConsentReport {
	const given: string[] = [];
	const waiting: string[] = [];
	for (const part of partsOf(m)) (hasConsent(part) ? given : waiting).push(whoKey(part.who));
	const told: string[] = [];
	if (partsOf(m).length === 0) told.push('there are no parts, so there is nobody to have opted in — an empty split is not a consented one');
	else if (waiting.length === 0) told.push(`every part opted in — ${given.length} of ${given.length}`);
	else told.push(`${waiting.length} of ${given.length + waiting.length} part${waiting.length === 1 ? ' has' : 's have'} not opted in: ${waiting.join(' · ')}`);
	told.push(OPT_IN);
	told.push(NEVER_MONEY);
	return { all: partsOf(m).length > 0 && waiting.length === 0, given, waiting, told };
}
