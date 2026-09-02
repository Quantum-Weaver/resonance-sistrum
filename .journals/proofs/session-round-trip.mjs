// PROOF — the session document survives the road to disk and back, identical.
//
// THE STUDIO, 2026-09-02. `node .journals/proofs/session-round-trip.mjs` from the
// repo root. Prints one TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// The window's own module is imported (Node 24 strips the types); the file is
// written and read back the way Rust's `write_session` lands it (pretty JSON),
// then parsed by `parseSession` — the reader every open walks through.

import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { canonicalJson, newSession, normalizeTrack, parseSession } from '../../src/lib/studio.ts';

let failed = false;
const claim = (name, ok) => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}`);
	if (!ok) failed = true;
};

const dir = mkdtempSync(join(tmpdir(), 'sistrum-session-proof-'));
try {
	const at = '2026-09-02T00:00:00.000Z';
	const doc = newSession('proof', at);
	doc.tracks.push(
		normalizeTrack({ id: 't1', take: 'guitar.wav', gain: 1, mute: false, solo: false, offset_ms: 0, pan: -0.25 }),
		normalizeTrack({ id: 't2', take: 'voice.wav', gain: 0.8, mute: false, solo: true, offset_ms: 1250, pan: 0.5 }),
		normalizeTrack({ id: 't3', take: 'shaker.wav', gain: 1.5, mute: true, solo: false, offset_ms: 40, pan: 0 })
	);

	// The road: pretty JSON to a `.session.json` on disk (Rust's shape), read back, parsed.
	const path = join(dir, 'proof.session.json');
	writeFileSync(path, JSON.stringify(doc, null, 2));
	const back = parseSession(JSON.parse(readFileSync(path, 'utf8')));

	claim('written and read back: canonical JSON identical', canonicalJson(back) === canonicalJson(doc));
	claim('three tracks, in order, by id', back.tracks.map((t) => t.id).join(',') === 't1,t2,t3');
	claim('every field survives (gain, mute, solo, offset_ms, pan, take)',
		back.tracks[1].take === 'voice.wav' && back.tracks[1].gain === 0.8 && back.tracks[1].solo === true &&
		back.tracks[1].offset_ms === 1250 && back.tracks[1].pan === 0.5 && back.tracks[2].mute === true);

	// Rust's serde_json writes keys SORTED (its Map is a BTreeMap) — a document coming back
	// with a different key order must still read as the same document.
	const sorted = JSON.parse(canonicalJson(doc));
	claim('key order on disk does not matter', canonicalJson(parseSession(sorted)) === canonicalJson(doc));

	// Lawful ranges hold on the way in: a negative offset and a gain past 2 are clamped, not kept.
	const wild = parseSession({ ...doc, tracks: [{ id: 'w', take: 'x.wav', gain: 9, mute: 0, solo: 1, offset_ms: -500, pan: 3 }] });
	claim('out-of-range fields are clamped on read (gain 2, offset 0, pan 1)',
		wild.tracks[0].gain === 2 && wild.tracks[0].offset_ms === 0 && wild.tracks[0].pan === 1 && wild.tracks[0].solo === true);

	// Refusals are refusals: a path in a take name, a foreign format, a missing id.
	const refuses = (raw) => { try { parseSession(raw); return false; } catch { return true; } };
	claim('a take name carrying a path is refused', refuses({ ...doc, tracks: [{ id: 'p', take: '../x.wav' }] }));
	claim('a foreign format is refused', refuses({ ...doc, format: 'moment-marks' }));
	claim('a track without an id is refused', refuses({ ...doc, tracks: [{ take: 'x.wav' }] }));
} finally {
	rmSync(dir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
