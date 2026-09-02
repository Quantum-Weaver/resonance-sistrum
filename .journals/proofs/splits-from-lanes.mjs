// PROOF — the splits the studio proposes from the lanes it is holding.
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
// The room's own two functions are walked: `proposeParts` (this repo's, pure,
// no imports) and `even` (`the-merismos`, mirrored byte-faithfully in
// src/lib/merismos). Node 24 strips the types; nothing is mocked.

import { partKey, proposeParts } from '../../src/lib/provenance.ts';
import { consent, consented, even, validate } from '../../src/lib/merismos/index.ts';

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
claim('three lanes with two identities plus a sealer give THREE parts', proposed.length === 3);
claim(
	'they are, in lane order, the two who played and then the engineer',
	proposed.map((p) => p.who.name).join(' · ') === 'KP · The Second Chair · The Engineer'
);
claim(
	'the two who played are parts; the sealer who did not play is the engineer',
	proposed.map((p) => p.role).join(',') === 'part,part,engineer'
);
claim(
	'each part is keyed by its PUBLIC KEY, not its name — two people may share a name, none share a key',
	proposed.every((p) => partKey(p.who).startsWith('id:'))
);

// The points come from the water, and the roles are put back on afterwards.
const drawn = even(proposed.map((p) => p.who));
drawn.parts = drawn.parts.map((p, i) => ({ ...p, role: proposed[i].role }));

const verdict = validate(drawn);
claim('the proposed split sums to EXACTLY 10000 basis points', verdict.sum === 10000);
claim('and it holds — no faults named', verdict.ok && verdict.faults.length === 0);
claim(
	"the remainder goes WHOLE to the first part the lanes listed — 3334 · 3333 · 3333, never a scattered cent",
	drawn.parts.map((p) => p.points).join(',') === '3334,3333,3333'
);

// OPT-IN ALWAYS. A proposal is not a fact.
claim(
	'a freshly drawn split has consented to NOTHING — every part waits',
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
	'a sealer who also played is one part, not two — never counted twice',
	alsoPlayed.length === 2 && alsoPlayed.map((p) => p.role).join(',') === 'part,part'
);

process.exit(failed ? 1 : 0);
