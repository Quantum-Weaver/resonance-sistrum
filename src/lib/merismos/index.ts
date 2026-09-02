// the-merismos — THE CONTRIBUTORS: who made it, and the equal division.
//
// μερισμός (merismós) — apportionment, a dividing into parts. Greek joins the
// naming strata beside Khorós, the Epagoge and the Sphragis, and it is chosen
// for the same reason the Sphragis's was: THE NAME IS THE SPECIFICATION. A
// merismos divides one share among the people who made the thing. It does not
// pay anybody, and it does not rank anybody.
//
// THE THIRD AUTHORSHIP WATER. The clavis and the lok give unforgeable
// authorship. They say nothing about WHO GETS WHAT. This water says that, and
// only that.
//
// THE RULING, and it is the whole of this water's arithmetic — KP ⚛, verbatim:
//
//   "there is nothing to do but divide by the number of contributors,
//    regardless of role."
//
// and the document he pointed at with it, `AudHDities/docs/business/
// financial-ecosystem.md`, lines 140–142, verbatim:
//
//   everything left ──▶ THIS ITEM'S CONTRIBUTORS, divided EQUALLY
//                     • the main artisan is ONE OF THEM
//                     • no ranking, no percentage shares
//
// KP'S VISION, VERBATIM, WHICH THIS WATER SERVES:
//   "every musician in a band or an orchestra records their part sovereignly;
//    an engineer finishes the project; and all credentials combine so the
//    Sanctuary system can pay everyone involved no matter how small the role —
//    opt-in always: 'no force or deceptive theft.'"
//
// THE LAWS:
//   · THE DIVISOR IS THE HEADCOUNT, AND THERE IS NO OTHER NUMBER. Every
//     contributor takes the same share. There is no weight, no rank, no
//     percentage, no basis point, and NO DIAL anywhere on this surface — the
//     residual dial and the covenant dial are the platform's, set elsewhere,
//     and this water never sees them.
//   · A ROLE IS RECORDED AND NEVER WEIGHED. `role` is free text so the work
//     is remembered in the maker's own words; nothing here reads it, sorts by
//     it, or lets it move a cent. The main artisan is ONE CONTRIBUTOR AMONG
//     EQUALS and is not a field.
//   · IT IS A DESCRIPTION OF SHARES, NEVER A PROMISE OF MONEY. Nothing here
//     moves a cent, holds a balance, names a payout rail or schedules one.
//     `shares` divides an amount a CONSUMER declares, and hands back integers.
//   · THE SPHRAGIS'S LAW 1: THE LICENCE IS DATA, AND THE CONTRIBUTORS ARE
//     COLUMNS. A merismos is columns — who, role, consent — never prose to be
//     re-argued after the fact.
//   · THE SPHRAGIS'S LAW 4: THE 90/10 STAYS SCHEMA, NOT PROMISE. `combine`
//     takes the house split and the merismos and returns THE PICTURE — the
//     platform's ten, the artist's ninety, and the ninety divided EQUALLY by
//     the contributors. It computes percentages of a whole, never money, and
//     the real arithmetic lives server-side where the money lives.
//   · OPT-IN ALWAYS. A contributor without consent is NAMED, every time, in
//     `validate`, in `consented`, in `shares` and in `combine`. There is no
//     parameter anywhere that suppresses that naming, and no exported path
//     that consents on someone's behalf: `consent` takes the who and the
//     moment, and matches an existing part or calmly refuses.
//   · THE TOTAL ALWAYS EQUALS THE AMOUNT. `shares` uses the largest-remainder
//     method, so the integer cents sum to the declared amount exactly. Not
//     approximately. Proven, across a thousand random amounts.
//   · EVERYTHING IS TOLD. Every refusal is a calm no with a reason on `told`.
//     NOTHING IN THIS WATER THROWS. A legacy document carrying a `points`
//     field from the build before the ruling still parses: the field rides
//     whole, IT IS IGNORED, and it is SAID that it is ignored.
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

/** KP's ⚛ sentence, verbatim, exported so no consumer can claim it was hard
 *  to find. It is not a summary of the arithmetic — it IS the arithmetic. */
export const EQUALLY =
	'there is nothing to do but divide by the number of contributors, regardless of role.';

/** The ruling this water implements, verbatim from `AudHDities/docs/business/
 *  financial-ecosystem.md` lines 140–142. Exported for the same reason. */
export const THE_RULING =
	"everything left ──▶ THIS ITEM'S CONTRIBUTORS, divided EQUALLY · the main artisan is ONE OF THEM · no ranking, no percentage shares";

/** KP's own line on consent, carried verbatim. It rides in every `told` this
 *  water produces. */
export const OPT_IN =
	'Opt-in always: "no force or deceptive theft." Every part here is a share someone said yes to, and a part that has not consented is named rather than assumed.';

/** The other unremovable line. A merismos describes shares; it is not, and
 *  cannot become, a promise that money will arrive. */
export const NEVER_MONEY =
	'This is a description of shares, never a promise of money. Nothing here moves a cent, holds a balance or names a payout; the arithmetic that touches money lives server-side, where the money lives.';

/** Designed in, shipped silent — see the header. */
export const LOGGING = false;

/** WHO — a SNAPSHOT of an entity, never a reference to one. The rule is
 *  `the-signet`'s own and is inherited rather than re-derived: *"a snapshot,
 *  not a reference — history keeps what it was signed under."* A contributor
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

/** ONE CONTRIBUTOR — a person, what they did, and their yes or the absence of
 *  it. THERE IS NO NUMBER ON A PART, and that is the ruling: the only number
 *  in this water is how many parts there are. */
export interface Part {
	who: Who;
	/** FREE TEXT, OPTIONAL, AND NEVER WEIGHED: 'vocals', 'engineer', 'cover',
	 *  'the room'. It is recorded so the work is remembered in the maker's own
	 *  words. Nothing in this water reads it, ranks it, orders by it or lets it
	 *  change one cent — *"regardless of role."* */
	role?: string;
	/** null or absent until this part opted in. Never filled by default. */
	consent?: Consent | null;
	[k: string]: unknown; // ridden whole — a realm's take id, instrument, notes,
	// and a LEGACY `points` from the build before the ruling: carried, ignored, told.
}

/** THE MERISMOS — the contributors, as columns. One list, and nothing else
 *  this water reads. A realm's own keys (a legacy `of`, an item id, a note)
 *  ride whole as terms. */
export interface Merismos {
	parts: Part[];
	[k: string]: unknown; // ridden whole — the realm's own keys ride as terms
}

/** The faults, NAMED. A verdict says which; it never says "invalid".
 *
 *  There are three, and there can only be three, because the arithmetic has
 *  no other way to be wrong: a split with nobody in it, a contributor with no
 *  name, and one person written down twice. A sum that must close is exactly
 *  the fault class the ruling deleted. */
export type Fault = 'empty' | 'unnamed-who' | 'duplicate-who';

/** What `validate` returns: `ok`, the named faults, THE HEADCOUNT (which is
 *  the whole of the arithmetic — it is the divisor), and the parts still
 *  waiting on a yes — told either way, because an unconsented part is not a
 *  fault, it is a fact that must not be quiet. */
export interface Verdict {
	ok: boolean;
	faults: Fault[];
	/** the number of contributors. THE DIVISOR, and the only number here. */
	count: number;
	/** the identity keys of parts with no consent recorded. */
	waiting: string[];
	told: string[];
}

/** One contributor's cents. The `who` and `role` ride along so a caller never
 *  has to re-join by index. */
export interface Share {
	who: Who;
	role?: string;
	cents: number;
	consented: boolean;
}

/** What `shares` returns. `total` is the sum of `parts[].cents` AS COMPUTED,
 *  never as asserted — a caller can check it against `of` themselves. */
export interface Shares {
	ok: boolean;
	/** the amount that was declared, in integer cents. */
	of: number;
	/** the divisor: how many contributors it was divided among. */
	count: number;
	parts: Share[];
	total: number;
	told: string[];
}

/** A house split, honoured BY SHAPE rather than by import. `the-sphragis`'s
 *  `SphragisSplit` assigns straight in — the same two numbers, the same
 *  passenger index.
 *
 *  IT IS NOT A DIAL. The residual dial (0–50% per product) and the covenant
 *  dial (0–50% per vessel) are the platform's, live in the business document
 *  and the residual system, and are NOT this water's — nothing here reads,
 *  writes, defaults or applies either one. */
export interface HouseSplit {
	artist: number;
	platform: number;
	[k: string]: unknown;
}

/** One contributor inside the full picture. Both percentages are
 *  DESCRIPTIONS, and both are the same for every contributor, because that is
 *  what an equal division is. */
export interface CombinedPart {
	who: Who;
	role?: string;
	/** this contributor's share of the ARTIST'S share, as a percent of it —
	 *  100 ÷ headcount, the same for everyone. */
	ofContributors: number;
	/** this contributor's share of THE WHOLE, as a percent — artist ÷
	 *  headcount. A number to read, never a number to pay from. */
	ofWhole: number;
	consented: boolean;
}

/** THE FULL PICTURE — the platform's ten, the artist's ninety, and the
 *  artist's ninety divided EQUALLY among the contributors. DATA. Never
 *  applied to money by this tool, and there is deliberately no verb here that
 *  could apply it. */
export interface Combined {
	ok: boolean;
	house: HouseSplit;
	platform: number;
	artist: number;
	/** the divisor. The main artisan is one of them. */
	count: number;
	parts: CombinedPart[];
	/** the percentages of the whole, added up. It should equal `artist`;
	 *  floating point makes that a near-equality, and it is reported rather
	 *  than rounded into looking exact. */
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

function roleOf(part: Part): string | undefined {
	return typeof part.role === 'string' ? part.role : undefined;
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
 *  THE ORDER OF `parts` IS A TERM AND IS KEPT AS DECLARED. It is not sorted:
 *  a list of contributors is the order the work happened in, and the leftover
 *  cents of an odd amount go to the earlier parts, so sorting here would
 *  silently move a cent from one person to another — exactly the class of
 *  quiet arithmetic this water exists to refuse. Two merismoi that name the
 *  same people in a different order are DIFFERENT DOCUMENTS, and canonicalize
 *  differently, and that is the honest answer.
 *
 *  `told` is EXCLUDED, the way the Sphragis excludes `flagged`: telling is
 *  derived commentary and not a term, so a calm no on a `consent` call cannot
 *  move the split's canonical form. Everything else — including the realm's
 *  own keys, and a legacy `points` this water ignores — is in, sorted at
 *  every depth. Lose-nothing: an ignored field is still carried. */
export function canonical(m: Merismos): string {
	const held: Record<string, unknown> = {};
	for (const key of Object.keys(m ?? {})) {
		if (key === 'told') continue;
		held[key] = (m as unknown as Record<string, unknown>)[key];
	}
	return canonicalValue(held);
}

// ── the laws, checked ────────────────────────────────────────────────

/** VALIDATE — ok, or the fault NAMED. Never a throw, never a bare boolean,
 *  and never a silent repair: what is wrong is said in the realm's own terms
 *  and the merismos comes back exactly as it was declared.
 *
 *  IT REFUSES DUPLICATES AND EMPTIES, AND NOTHING ELSE. There is no sum to
 *  check, because there are no shares to add up. A document from before the
 *  ruling — one carrying `points` on its parts — VALIDATES: the field rides
 *  whole and is ignored, and the telling says so rather than letting a reader
 *  believe a number that no longer means anything. */
export function validate(m: Merismos): Verdict {
	const faults: Fault[] = [];
	const told: string[] = [];
	const parts = partsOf(m);
	const waiting: string[] = [];
	let legacy = 0;

	if (parts.length === 0) {
		faults.push('empty');
		told.push('the merismos has no contributors — an empty split apportions nothing, and is told rather than treated as a whole share for nobody');
	}

	const seen = new Map<string, number>();
	for (let i = 0; i < parts.length; i += 1) {
		const part = parts[i];
		const who = part.who;

		if (!who || typeof who.name !== 'string' || who.name.length === 0) {
			if (!faults.includes('unnamed-who')) faults.push('unnamed-who');
			told.push(`contributor ${i + 1} names nobody — a share belongs to someone, and an unnamed share is how a role goes unpaid`);
		}

		const key = whoKey(who ?? ({ name: '' } as Who));
		const first = seen.get(key);
		if (first !== undefined) {
			if (!faults.includes('duplicate-who')) faults.push('duplicate-who');
			told.push(`${label(who ?? ({ name: '' } as Who))} appears twice — contributors ${first + 1} and ${i + 1}. Two rows for one person is a divisor that is wrong by one and a share that is wrong for everybody; they are told, never merged, because merging would decide something the makers decide`);
		} else {
			seen.set(key, i);
		}

		if ('points' in part) legacy += 1;
		if (!hasConsent(part)) waiting.push(whoKey(who ?? ({ name: '' } as Who)));
	}

	if (legacy > 0) {
		told.push(`${legacy} contributor${legacy === 1 ? ' carries' : 's carry'} a legacy "points" field from before the ruling — it is CARRIED WHOLE and IGNORED. ${EQUALLY} A percentage share is the one thing the ruling forbids, so no number on a part is read here; the field is left where it is rather than deleted, and named rather than left to look meaningful`);
	}

	if (faults.length === 0) told.push(`the merismos holds: ${parts.length} contributor${parts.length === 1 ? '' : 's'}, and the divisor is ${parts.length}. ${THE_RULING}`);
	if (waiting.length > 0) told.push(`${waiting.length} contributor${waiting.length === 1 ? ' has' : 's have'} not opted in yet — ${waiting.join(' · ')}. A split may be arithmetically whole and still not be agreed, and this water will not let the second fact hide behind the first`);
	told.push(EQUALLY);
	told.push(OPT_IN);
	told.push(NEVER_MONEY);

	return { ok: faults.length === 0, faults, count: parts.length, waiting, told };
}

// ── the contributors, listed ─────────────────────────────────────────

/** CONTRIBUTORS — a merismos from a list of people, in the order they are
 *  handed over. There is no second argument that could weigh anybody: this is
 *  the whole of drawing a split now, and it is a LIST rather than an
 *  allocation, because *"there is nothing to do but divide by the number of
 *  contributors, regardless of role."*
 *
 *  `role` is stamped on every part when one is given, and it is recorded and
 *  never weighed. THE MAIN ARTISAN IS ONE OF THEM and is passed in like
 *  anybody else — there is no field here that could mark them out.
 *
 *  A split is drawn WITH NO CONSENT ON ANY PART. Nothing here consents on
 *  anyone's behalf; the yeses arrive through `consent`, one hand at a time. */
export function contributors(whos: readonly Who[], role?: string): Merismos {
	const list = Array.isArray(whos) ? whos : [];
	const parts: Part[] = list.map((who) => ({
		who: { ...who },
		...(typeof role === 'string' ? { role } : {}),
		consent: null,
	}));
	return { parts };
}

// ── the cents ────────────────────────────────────────────────────────

/** SHARES — integer cents per contributor: THE AMOUNT DIVIDED BY THE
 *  HEADCOUNT, with the largest-remainder method so the parts always sum to
 *  exactly the amount declared. Not approximately.
 *
 *  How it works, said plainly so nobody has to trust it: every contributor
 *  takes the same exact entitlement, `amount ÷ n`. Everybody first takes the
 *  FLOOR of that, which leaves between zero and n−1 cents over. Because every
 *  entitlement is identical, every fractional remainder is identical too — so
 *  the largest-remainder rule reduces to its tiebreak, and THE LEFTOVER CENTS
 *  GO ONE EACH TO THE EARLIEST CONTRIBUTORS, in the order the caller listed
 *  them. A dollar in thirds is 34 · 33 · 33, never 33 · 33 · 33 with a cent
 *  that quietly stayed behind, and the same split with the same amount gives
 *  the same cents on every machine, forever.
 *
 *  A negative amount is divided exactly the same way — `Math.floor` carries
 *  it — because a reversal is a real thing a ledger does.
 *
 *  THIS DIVIDES A NUMBER. It does not pay anybody, does not know a currency,
 *  and does not know whether the amount it was handed exists. */
export function shares(m: Merismos, amountCents: number): Shares {
	const told: string[] = [];
	const parts = partsOf(m);
	const verdict = validate(m);

	const blank = (why: string): Shares => {
		told.push(why);
		told.push(EQUALLY);
		told.push(OPT_IN);
		told.push(NEVER_MONEY);
		return {
			ok: false,
			of: typeof amountCents === 'number' && Number.isFinite(amountCents) ? amountCents : 0,
			count: parts.length,
			parts: parts.map((p) => ({ who: p.who, role: roleOf(p), cents: 0, consented: hasConsent(p) })),
			total: 0,
			told,
		};
	};

	if (typeof amountCents !== 'number' || !Number.isFinite(amountCents) || !Number.isInteger(amountCents)) {
		return blank(`the amount ${String(amountCents)} is not a whole number of cents — cents are the smallest unit there is, so there is nothing below them to round into, and this water refuses to invent a fraction of one`);
	}
	if (!verdict.ok) {
		return blank(`the merismos does not hold (${verdict.faults.join(' · ')}) — no cents were apportioned, because dividing an amount by a list that is empty, nameless or doubled is how a rounding error becomes somebody's missing pay`);
	}

	const n = parts.length;
	const base = Math.floor(amountCents / n);
	const leftover = amountCents - base * n; // 0 … n-1, for positive and negative alike
	const cents = parts.map((_p, i) => (i < leftover ? base + 1 : base));

	const out: Share[] = parts.map((p, i) => ({ who: p.who, role: roleOf(p), cents: cents[i], consented: hasConsent(p) }));
	const total = out.reduce((a, s) => a + s.cents, 0);

	told.push(`${amountCents} cents divided EQUALLY among ${n} contributor${n === 1 ? '' : 's'} — ${base} each, and the ${leftover} cent${leftover === 1 ? '' : 's'} that will not divide go one each to the earliest listed. The parts sum to ${total}, which is the amount exactly, and this is the same answer on every machine`);
	told.push('No role was read, no rank was applied, and there is no dial on this water — the residual dial and the covenant dial are the platform\'s and are set elsewhere');
	told.push(EQUALLY);
	if (amountCents < 0) told.push('the amount declared is negative — it was divided exactly as given rather than refused, because a reversal is a real thing a ledger does, and the division stays exact');
	if (verdict.waiting.length > 0) told.push(`${verdict.waiting.length} of these contributor${verdict.waiting.length === 1 ? ' has' : 's have'} not opted in — ${verdict.waiting.join(' · ')}. The cents are computed for the whole split and the unconsented parts are NAMED; whether they are ever sent is not this water's to decide, and consent is not implied by arithmetic`);
	told.push(OPT_IN);
	told.push(NEVER_MONEY);

	return { ok: true, of: amountCents, count: n, parts: out, total, told };
}

// ── the whole picture ────────────────────────────────────────────────

/** COMBINE — the house split and the merismos, as ONE PICTURE: the platform's
 *  ten, the artist's ninety, and the artist's ninety divided EQUALLY among
 *  the contributors.
 *
 *  THE 90/10 STAYS SCHEMA, NOT PROMISE (the Sphragis's law 4). This returns
 *  NUMBERS TO READ. It does not apply them to money, it does not know a
 *  currency, and there is no verb on this surface that could apply it — the
 *  computation that touches money is server-side, where the money lives.
 *
 *  IT HAS NO DIAL. What the residual dial pledges to the pool is taken before
 *  this picture is drawn, by the platform, elsewhere; *"everything left"* is
 *  what arrives here, and everything left is divided equally.
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

	const list = partsOf(m);
	const n = list.length;
	const parts: CombinedPart[] = list.map((p) => ({
		who: p.who,
		role: roleOf(p),
		ofContributors: n > 0 ? 100 / n : 0,
		ofWhole: n > 0 ? artist / n : 0,
		consented: hasConsent(p),
	}));
	const partsOfWhole = parts.reduce((a, p) => a + p.ofWhole, 0);

	told.push(`the platform takes ${platform} of the whole for hosting and licensing; the artist's ${artist} is what this merismos divides, and it divides it among ${n} contributor${n === 1 ? '' : 's'}, equally`);
	told.push(THE_RULING);
	told.push(EQUALLY);
	told.push('no dial lives on this water: the residual dial (0–50% per product) and the covenant dial (0–50% per vessel) are the platform\'s, set elsewhere, and what reaches this division is "everything left" after them');
	if (!verdict.ok) told.push(`the merismos does not hold (${verdict.faults.join(' · ')}) — the picture is drawn from the list as declared and the fault is named beside it, never quietly corrected`);
	if (verdict.waiting.length > 0) told.push(`not every contributor has opted in — ${verdict.waiting.join(' · ')}. A picture of shares is not an agreement to them`);
	told.push('these percentages are a DESCRIPTION. The arithmetic that touches money is computed server-side where the money lives, and collaborator shares reach it through the contributions ledger\'s residual pool — schema elsewhere, and not modelled here');
	told.push(OPT_IN);
	told.push(NEVER_MONEY);

	return { ok: verdict.ok && houseSum === 100, house: { ...house }, platform, artist, count: n, parts, partsOfWhole, told };
}

// ── the yes ──────────────────────────────────────────────────────────

/** CONSENT — one person's own yes, at a moment they declare. It matches an
 *  EXISTING part by identity key and records the yes on that part alone.
 *
 *  It cannot add a contributor, cannot change anybody's share (there is no
 *  share to change — the divisor is the headcount), and cannot consent for
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
		return { ...m, parts: parts.map((p) => ({ ...p })), told: [...(Array.isArray(m.told) ? (m.told as string[]) : []), `${label(who)} is not a contributor on this merismos — nothing was consented, nothing was added, and nothing was thrown. A split gains a person by being redrawn, never by someone saying yes to it`] };
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
	if (partsOf(m).length === 0) told.push('there are no contributors, so there is nobody to have opted in — an empty split is not a consented one');
	else if (waiting.length === 0) told.push(`every contributor opted in — ${given.length} of ${given.length}`);
	else told.push(`${waiting.length} of ${given.length + waiting.length} contributor${waiting.length === 1 ? ' has' : 's have'} not opted in: ${waiting.join(' · ')}`);
	told.push(EQUALLY);
	told.push(OPT_IN);
	told.push(NEVER_MONEY);
	return { all: partsOf(m).length > 0 && waiting.length === 0, given, waiting, told };
}
