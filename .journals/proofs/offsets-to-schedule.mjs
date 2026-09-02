// PROOF — layer offsets become schedule times on one clock, by arithmetic alone.
//
// THE STUDIO, 2026-09-02. `node .journals/proofs/offsets-to-schedule.mjs` from the
// repo root. Prints one TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// `scheduleLane(now, position, offset, duration)` is what the mix store calls
// for every lane at play, seek, and restart. Three cases and their edges,
// then the mix's length and the solo/mute law it hears by.

import { effectiveGain, mixLength, positionAt, scheduleLane } from '../../src/lib/studio.ts';

let failed = false;
const claim = (name, ok) => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}`);
	if (!ok) failed = true;
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

const now = 100; // the AudioContext's currentTime at the press

// Case 1 — the lane has not started yet: start LATER on the clock, from its top.
let s = scheduleLane(now, 0, 2.5, 10);
claim('mix at 0, lane at 2.5s → starts at now+2.5, from buffer 0', s && near(s.when, 102.5) && s.bufferOffset === 0);

// Case 2 — the mix is inside the lane: start NOW, partway into the buffer.
s = scheduleLane(now, 4, 2.5, 10);
claim('mix at 4, lane at 2.5s → starts now, from buffer 1.5', s && near(s.when, 100) && near(s.bufferOffset, 1.5));

// Case 3 — the lane is already over: nothing to schedule.
s = scheduleLane(now, 13, 2.5, 10);
claim('mix at 13, lane 2.5s+10s long → nothing scheduled', s === null);

// Edges.
s = scheduleLane(now, 2.5, 2.5, 10);
claim('mix exactly at the lane\'s start → starts now from buffer 0', s && near(s.when, 100) && s.bufferOffset === 0);
s = scheduleLane(now, 12.5, 2.5, 10);
claim('mix exactly at the lane\'s end → nothing scheduled', s === null);
s = scheduleLane(now, 0, 0, 0);
claim('a lane with no duration is never scheduled', s === null);
s = scheduleLane(now, -3, -1, 5);
claim('negative position and offset both clamp to 0 → starts now from 0', s && near(s.when, 100) && s.bufferOffset === 0);

// Milliseconds in the session → seconds on the clock: the store divides by 1000.
s = scheduleLane(now, 0, 1250 / 1000, 3);
claim('offset_ms 1250 → starts at now+1.25', s && near(s.when, 101.25));

// The mix's length is the far edge of its farthest lane.
claim('mixLength: lanes (0,2.0) and (1.0,1.5) → 2.5', near(mixLength([{ offsetSecs: 0, durationSecs: 2 }, { offsetSecs: 1, durationSecs: 1.5 }]), 2.5));
claim('mixLength of no lanes is 0', mixLength([]) === 0);

// The clock: where the mix is now, given when play began and where it began from.
claim('positionAt: began at 100 from 4s, now 107.5 → 11.5', near(positionAt(107.5, 100, 4), 11.5));

// The solo/mute law the graph and the bounce both hear by.
claim('no solo anywhere: gain is the lane\'s own', effectiveGain({ gain: 0.8, mute: false, solo: false }, false) === 0.8);
claim('mute silences, whatever solo says', effectiveGain({ gain: 1, mute: true, solo: true }, true) === 0);
claim('another lane soloed: an un-soloed lane is silent', effectiveGain({ gain: 1, mute: false, solo: false }, true) === 0);
claim('a soloed lane keeps its gain', effectiveGain({ gain: 1.5, mute: false, solo: true }, true) === 1.5);
claim('gain past 2 is held at 2', effectiveGain({ gain: 7, mute: false, solo: false }, false) === 2);

process.exit(failed ? 1 : 0);
