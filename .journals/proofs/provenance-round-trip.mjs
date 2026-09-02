// PROOF — the held column carries everything, and drops nothing.
//
// THE COLUMN COMES TO LIFE, 2026-09-02. `node .journals/proofs/provenance-round-trip.mjs`
// from the repo root. Prints one TRUE or FALSE per claim and exits non-zero on
// any FALSE.
//
// KP's ⚛ ruling that shaped `takes.provenance`, verbatim:
//
//   "none of that belongs in the recorder, the recorder db structure simply
//    requires a json column to handle the expected use case, the column will
//    come to life when ready"
//
// and the column's own law, from `src-tauri/src/lib.rs`: a TEXT column holding
// JSON — "Nothing validates it, and nothing may drop it — whatever a hand puts
// here rides whole."
//
// The road walked here is the REAL one: `provenanceColumnText` is what
// `takeStore.upsertTake` binds into SQLite, and `parseProvenanceColumn` is what
// `rowToTake` reads back. Node 24 strips the types; nothing is mocked.

import {
	identitiesFrom,
	parseProvenanceColumn,
	provenanceColumnText,
	readProvenance,
	sealProvenance
} from '../../src/lib/provenance.ts';

let failed = false;
const claim = (name, ok) => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}`);
	if (!ok) failed = true;
};

/** The column's whole round trip: a value in, a TEXT cell, a value back. */
const throughColumn = (value) => parseProvenanceColumn(provenanceColumnText(value));

// ── 1. A whole document — studio + signet + clavis + merismos ─────────────
const whole = {
	studio: {
		kind: 'mixdown',
		session: 'the band',
		layers: [
			{ take: 'voice.wav', offset_ms: 0, gain: 1, pan: -0.25, mute: false, solo: false },
			{ take: 'horn.wav', offset_ms: 1250, gain: 0.8, pan: 0.5, mute: false, solo: false }
		],
		made_at: '2026-09-02T09:00:00.000Z'
	},
	signet: { name: 'KP', sigil: '⚛', color: '#b58cff' },
	clavis: {
		alg: 'Ed25519',
		publicKey: 'ljyrEPv1QGqfjF9x3nSPQ0Yb2Kk8sJ1lTn5cVrWzXyA',
		digest: '2vFTh0Kk8sJ1lTn5cVrWzXyAljyrEPv1QGqfjF9x3nQ',
		signature:
			'q7B1ljyrEPv1QGqfjF9x3nSPQ0Yb2Kk8sJ1lTn5cVrWzXyAq7B1ljyrEPv1QGqfjF9x3nSPQ0Yb2Kk8sJ1lTn5cVg',
		who: { name: 'KP', sigil: '⚛', color: '#b58cff' },
		when: 1788350400000
	},
	// DELIBERATELY THE PRE-RULING SHAPE — `of` and `points`, as the 2026-09-02
	// first build wrote them. `takes.provenance` may not drop what a hand put in
	// it, so this proves a legacy document round-trips BYTE-FOR-BYTE. The
	// numbers are carried and never read: the-merismos divides by headcount now
	// ("there is nothing to do but divide by the number of contributors,
	// regardless of role" — KP ⚛), and `validate` says the field was ignored.
	merismos: {
		of: 'artist-share',
		parts: [
			{ who: { id: 'ljyr', name: 'KP', sigil: '⚛' }, role: 'part', points: 5000, consent: { at: '2026-09-02T09:01:00.000Z' } },
			{ who: { id: 'x9qz', name: 'The Second Chair', sigil: '🎺' }, role: 'part', points: 5000, consent: null }
		]
	}
};

const back = throughColumn(whole);
claim(
	'a whole document (studio + signet + clavis + merismos) round-trips unchanged',
	JSON.stringify(back) === JSON.stringify(whole)
);

const readWhole = readProvenance(back);
claim(
	'the reader finds all four pieces, and calls none of them unreadable',
	!readWhole.unreadable &&
		readWhole.present &&
		readWhole.studio !== undefined &&
		readWhole.signet?.name === 'KP' &&
		readWhole.clavis !== undefined &&
		readWhole.merismos !== undefined
);

// ── 2. A LEGACY document — the studio's own `{ studio }`, from before tonight ──
const legacy = {
	studio: { kind: 'trim', from: 'guitar.wav', start_secs: 2.5, end_secs: null, made_at: '2026-09-02T07:50:00.000Z' }
};
const legacyBack = throughColumn(legacy);
const legacyRead = readProvenance(legacyBack);
claim(
	'a legacy { studio } document still reads — no signet, no key, no split, and no complaint',
	!legacyRead.unreadable &&
		legacyRead.present &&
		legacyRead.studio !== undefined &&
		legacyRead.signet === undefined &&
		legacyRead.clavis === undefined &&
		legacyRead.merismos === undefined &&
		JSON.stringify(legacyBack) === JSON.stringify(legacy)
);

// ── 3. UNREADABLE JSON comes back as the raw string, never discarded ──────
const rubbish = '{"studio": {"kind": "mixdown",,,';
const rubbishBack = parseProvenanceColumn(rubbish);
claim('unreadable json returns the RAW STRING, byte for byte', rubbishBack === rubbish);

const rubbishRead = readProvenance(rubbishBack);
claim(
	'the reader names it unreadable and hands back the same string, dropping nothing',
	rubbishRead.present && rubbishRead.unreadable && rubbishRead.raw === rubbish
);

claim('an empty column reads as nothing at all, not as an empty document', parseProvenanceColumn(null) === undefined && readProvenance(undefined).present === false);

// ── 4. The seal writes BESIDE, never over ────────────────────────────────
const sealed = sealProvenance(legacy, {
	signet: { name: 'KP', sigil: '⚛', color: '#b58cff' },
	clavis: whole.clavis
});
claim(
	'sealing a take keeps the studio note untouched and adds the hand beside it',
	JSON.stringify(sealed.studio) === JSON.stringify(legacy.studio) &&
		sealed.signet.name === 'KP' &&
		sealed.clavis === whole.clavis
);

const withStranger = sealProvenance({ studio: legacy.studio, someFutureKey: [1, 2, 3] }, {
	signet: { name: 'KP', sigil: '⚛', color: '#b58cff' }
});
const strangerRead = readProvenance(throughColumn(withStranger));
claim(
	'a key this app has never heard of rides through whole and is shown by name',
	JSON.stringify(strangerRead.other) === JSON.stringify({ someFutureKey: [1, 2, 3] })
);

const overRubbish = sealProvenance(rubbish, { signet: { name: 'KP', sigil: '⚛', color: '#b58cff' } });
claim(
	'sealing over an unreadable document KEEPS the raw string rather than losing it',
	overRubbish.kept_raw === rubbish && overRubbish.signet.name === 'KP'
);

// ── 5. Nothing is invented ───────────────────────────────────────────────
claim(
	'a lane that names nobody contributes no identity — a proposal never invents a person',
	identitiesFrom([undefined, legacy, rubbish]).length === 0
);

process.exit(failed ? 1 : 0);
