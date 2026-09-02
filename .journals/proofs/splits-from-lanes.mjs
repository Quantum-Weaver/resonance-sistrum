// PROOF — the contributors the studio proposes from the lanes it is holding.
//
// THE COLUMN COMES TO LIFE, 2026-09-02. `node .journals/proofs/splits-from-lanes.mjs`
// from the repo root. Prints one TRUE or FALSE per claim and exits non-zero on
// any FALSE.
//
// KP's vision, verbatim, which this serves:
//
//   "every musician in a band or an orchestra records their part sovereignly;
//    an engineer finishes the project; and all credentials combine so the
//    Sanctuary system can pay everyone involved no matter how small the role —
//    opt-in always: 'no force or deceptive theft.'"
//
// AND THE RULING, verbatim (KP ⚛, pointing at AudHDities/docs/business/
// financial-ecosystem.md 140–142):
//
//   "there is nothing to do but divide by the number of contributors,
//    regardless of role."
//
//   everything left ──▶ THIS ITEM'S CONTRIBUTORS, divided EQUALLY
//                     • the main artisan is ONE OF THEM
//                     • no ranking, no percentage shares
//
// So the studio proposes A LIST OF PEOPLE and no shares at all. The room's own
// two functions are walked: `proposeParts` (this repo's, pure, no imports) and
// `contributors` (`the-merismos`, mirrored byte-faithfully in
// src/lib/merismos). Node 24 strips the types; nothing is mocked.

import { partKey, proposeParts } from '../../src/lib/provenance.ts';
import { consent, consented, contributors, shares, validate } from '../../src/lib/merismos/index.ts';

let failed = false;
const claim = (name, ok) => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}`);
	if (!ok) failed = true;
};

const cred = (publicKey) => ({
	alg: 'Ed25519',
	publicKey,
	digest: 'd'.repeat(43),
	signature: 's'.repeat(86),
	who: { name: 'x', sigil: 'x', color: 'x' },
	when: 1788350400000
});

// THREE LANES, TWO IDENTITIES: the singer played twice, the horn once. A third
// hand — the engineer at the desk — did not play at all.
const kp = { name: 'KP', sigil: '⚛', color: '#b58cff' };
const horn = { name: 'The Second Chair', sigil: '🎺', color: '#c98a3f' };

const lanes = [
	{ studio: { kind: 'overdub' }, signet: kp, clavis: cred('kpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpk') },
	{ signet: horn, clavis: cred('hnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnh') },
	{ studio: { kind: 'trim', from: 'kp-1.wav' }, signet: kp, clavis: cred('kpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpk') }
];

const sealer = { id: 'engengengengengengengengengengengengengengg', name: 'The Engineer', sigil: '🎛️', color: '#7f8c8d' };

const proposed = proposeParts(lanes, sealer);
claim('three lanes with two identities plus a sealer give THREE contributors', proposed.length === 3);
claim(
	'they are, in lane order, the two who played and then the engineer',
	proposed.map((p) => p.who.name).join(' · ') === 'KP · The Second Chair · The Engineer'
);
claim(
	'the two who played are parts; the sealer who did not play is the engineer — a role recorded, and never weighed',
	proposed.map((p) => p.role).join(',') === 'part,part,engineer'
);
claim(
	'each contributor is keyed by its PUBLIC KEY, not its name — two people may share a name, none share a key',
	proposed.every((p) => partKey(p.who).startsWith('id:'))
);

// The list comes from the water, and the roles are put back on afterwards.
const drawn = contributors(proposed.map((p) => p.who));
drawn.parts = drawn.parts.map((p, i) => ({ ...p, role: proposed[i].role }));

const verdict = validate(drawn);
claim('the proposal holds — no faults named', verdict.ok && verdict.faults.length === 0);
claim('the divisor is the HEADCOUNT, and it is three', verdict.count === 3);
claim(
	'NOT ONE CONTRIBUTOR CARRIES A SHARE — there is no number on a part to rank anybody by',
	drawn.parts.every((p) => !('points' in p)) &&
		JSON.stringify(drawn) ===
			JSON.stringify({
				parts: [
					{ who: { id: 'kpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpk', name: 'KP', sigil: '⚛', color: '#b58cff' }, consent: null, role: 'part' },
					{ who: { id: 'hnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnhnh', name: 'The Second Chair', sigil: '🎺', color: '#c98a3f' }, consent: null, role: 'part' },
					{ who: { id: 'engengengengengengengengengengengengengengg', name: 'The Engineer', sigil: '🎛️', color: '#7f8c8d' }, consent: null, role: 'engineer' }
				]
			})
);

// THE DIVISION, and it is the whole of the arithmetic: 900 cents, three
// contributors, 300 each — the engineer's the same as the singer's.
const paid = shares(drawn, 900);
claim('900 cents across three contributors is 300 · 300 · 300 — divided equally, regardless of role',
	paid.ok && paid.parts.map((p) => p.cents).join(',') === '300,300,300' && paid.total === 900);
claim('and 1000 cents, which will not divide, is 334 · 333 · 333 — exact, never a cent left behind',
	shares(drawn, 1000).parts.map((p) => p.cents).join(',') === '334,333,333' && shares(drawn, 1000).total === 1000);
claim('the roles do not move one cent — swapping every role divides identically',
	shares({ parts: drawn.parts.map((p, i) => ({ ...p, role: ['engineer', 'part', 'part'][i] })) }, 1000)
		.parts.map((p) => p.cents).join(',') === '334,333,333');

// OPT-IN ALWAYS. A proposal is not a fact.
claim(
	'a freshly drawn list has consented to NOTHING — every contributor waits',
	drawn.parts.every((p) => p.consent === null) && consented(drawn).all === false && consented(drawn).waiting.length === 3
);
claim('and the verdict names every one of them, with no way to silence it', verdict.waiting.length === 3);

const kpSaid = consent(drawn, proposed[0].who, '2026-09-02T09:00:00.000Z');
claim(
	'one hand says yes and exactly one line changes',
	kpSaid.parts[0].consent.at === '2026-09-02T09:00:00.000Z' &&
		kpSaid.parts[1].consent === null &&
		kpSaid.parts[2].consent === null
);

const stranger = consent(kpSaid, { id: 'nobody', name: 'Somebody Else' }, '2026-09-02T09:05:00.000Z');
claim(
	'a stranger saying yes is a CALM NO — nobody added, nothing consented, nothing thrown',
	stranger.parts.length === 3 && stranger.parts.every((p, i) => (i === 0 ? !!p.consent : p.consent === null))
);

// A room with no engineer at the desk still proposes the players.
const noSealer = proposeParts(lanes, null);
claim('with no signet at the desk, only the lanes are proposed', noSealer.length === 2);

// And a sealer who DID play is not doubled.
const alsoPlayed = proposeParts(lanes, { id: 'kpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpkpk', name: 'KP', sigil: '⚛' });
claim(
	'a sealer who also played is one contributor, not two — never counted twice, because a doubled name is a wrong divisor for everybody',
	alsoPlayed.length === 2 && alsoPlayed.map((p) => p.role).join(',') === 'part,part'
);

process.exit(failed ? 1 : 0);
