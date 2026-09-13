// PROOF — integrated loudness is ITU-R BS.1770-4: the filter tables, the
// calibration tone, and both gates.
//
// `node .journals/proofs/loudness-to-spec.mjs` from the repo root. Prints one
// TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// The window's own module is imported (Node 24 strips the types). Every signal
// is named by its own levels and durations and every figure is measured here,
// so each claim can be checked by its own arithmetic.

import {
	ABSOLUTE_GATE_LUFS,
	RELATIVE_GATE_LU,
	kWeightingCoefficients,
	measureLoudness
} from '../../src/lib/master.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= tol;

const RATE = 48000;

/** A 1 kHz sine whose PEAK amplitude is the given dBFS, for `secs` seconds. */
function tone(secs, dbfs, rate = RATE, freq = 1000, from = 0) {
	const n = Math.round(secs * rate);
	const amp = Math.pow(10, dbfs / 20);
	const x = new Float32Array(n);
	for (let i = 0; i < n; i++) x[i] = amp * Math.sin((2 * Math.PI * freq * (from + i)) / rate);
	return x;
}

/** Sections of 1 kHz at given levels, joined on one continuous phase. */
function steps(sections, rate = RATE) {
	const parts = [];
	let at = 0;
	for (const [secs, dbfs] of sections) {
		parts.push(tone(secs, dbfs, rate, 1000, at));
		at += Math.round(secs * rate);
	}
	const x = new Float32Array(at);
	let put = 0;
	for (const p of parts) {
		x.set(p, put);
		put += p.length;
	}
	return x;
}

// ── The filter itself ───────────────────────────────────────────────────────
//
// BS.1770-4 tabulates the two stages at 48 kHz. This module derives them from
// the analogue prototypes so any rate is served; at 48 kHz the derivation must
// land on the published table.

const [pre, rlb] = kWeightingCoefficients(48000);
const TABLE_PRE = { b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285, a1: -1.69065929318241, a2: 0.73248077421585 };
const TABLE_RLB = { b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621 };
const matches = (got, want) =>
	Object.keys(want).every((k) => Math.abs(got[k] - want[k]) < 1e-11);

claim('the pre-filter at 48 kHz is BS.1770-4 Table 1', matches(pre, TABLE_PRE),
	`b0 ${pre.b0.toFixed(14)}`);
claim('the RLB high-pass at 48 kHz is BS.1770-4 Table 2', matches(rlb, TABLE_RLB),
	`a1 ${rlb.a1.toFixed(14)}`);

// ── The calibration tone ────────────────────────────────────────────────────

const monoCal = measureLoudness([tone(20, -20)], RATE);
claim('a mono 1 kHz sine at −20 dBFS reads −23.0 LUFS', near(monoCal.integratedLufs, -23.0, 0.1),
	`${monoCal.integratedLufs.toFixed(4)} LUFS over ${monoCal.blocks} blocks`);

// A stereo 1 kHz sine at −23 dBFS peak carries −26.01 dBFS of mean square per
// channel; two channels sum to −23.00, K-weighting adds 0.70 at 1 kHz and the
// standard's offset takes 0.691 back, so the reading is the level itself.

const t1 = measureLoudness([tone(20, -23), tone(20, -23)], RATE);
claim('a stereo 1 kHz sine at −23 dBFS reads −23.0 LUFS', near(t1.integratedLufs, -23.0, 0.1),
	`${t1.integratedLufs.toFixed(4)} LUFS`);

const t2 = measureLoudness([tone(20, -33), tone(20, -33)], RATE);
claim('a stereo 1 kHz sine at −33 dBFS reads −33.0 LUFS', near(t2.integratedLufs, -33.0, 0.1),
	`${t2.integratedLufs.toFixed(4)} LUFS`);

// ── The relative gate ───────────────────────────────────────────────────────
//
// 10 s at −36, 20 s at −23, 10 s at −36. The ungated mean of the four is
// −25.79 LUFS, so the gate falls at −35.79 and the −36 ends — which read
// −35.99 — sit under it and are dropped. What is left is the −23 section alone.

const s3 = steps([[10, -36], [20, -23], [10, -36]]);
const t3 = measureLoudness([s3, s3], RATE);
claim('−36, −23, −36 reads −23.0 LUFS: the quiet ends fall under the relative gate',
	near(t3.integratedLufs, -23.0, 0.1),
	`${t3.integratedLufs.toFixed(4)} LUFS, ${t3.gatedBlocks} of ${t3.blocks} blocks kept`);
claim('and it is the quiet ends that were dropped — about half the blocks survive',
	t3.gatedBlocks > t3.blocks * 0.4 && t3.gatedBlocks < t3.blocks * 0.6,
	`${t3.gatedBlocks}/${t3.blocks}`);

// The gate is a threshold, not a rule that quiet always goes: at 10 s per
// section the ungated mean is −27.35, the gate falls at −37.35, and the −36
// ends now stand above it and stay in. The reading is the mean of all three.
const s4 = steps([[10, -36], [10, -23], [10, -36]]);
const t4 = measureLoudness([s4, s4], RATE);
claim('−36, −23, −36 at ten seconds each keeps every block — the gate falls at −37.35',
	near(t4.integratedLufs, -27.35, 0.1) && t4.gatedBlocks === t4.blocks,
	`${t4.integratedLufs.toFixed(4)} LUFS, ${t4.gatedBlocks} of ${t4.blocks} blocks kept, gate ${t4.relativeGateLufs.toFixed(2)}`);

claim(`the relative gate sits exactly ${RELATIVE_GATE_LU} LU under the reading when no block is dropped`,
	near(monoCal.relativeGateLufs, monoCal.integratedLufs + RELATIVE_GATE_LU, 0.001) &&
		monoCal.gatedBlocks === monoCal.blocks,
	`gate ${monoCal.relativeGateLufs.toFixed(4)}, reading ${monoCal.integratedLufs.toFixed(4)} LUFS`);

// ── The absolute gate ───────────────────────────────────────────────────────
//
// A −72 dBFS section reads −71.99 LUFS, under the −70 threshold, so it never
// enters the mean — adding one to a file cannot change what the file reads.

const s5 = steps([[10, -72], [10, -36], [10, -23], [10, -36], [10, -72]]);
const t5 = measureLoudness([s5, s5], RATE);
claim('twenty seconds at −72 dBFS change nothing — the absolute gate drops them first',
	near(t5.integratedLufs, t4.integratedLufs, 0.1),
	`${t5.integratedLufs.toFixed(4)} against ${t4.integratedLufs.toFixed(4)} LUFS without them`);

// ── The gates, each on its own ──────────────────────────────────────────────

const quiet = measureLoudness([tone(10, -92)], RATE);
claim(`a tone under ${ABSOLUTE_GATE_LUFS} LUFS passes no block and reads nothing`,
	quiet.integratedLufs === -Infinity && quiet.gatedBlocks === 0,
	`${quiet.blocks} blocks measured, ${quiet.gatedBlocks} gated`);

claim('digital silence reads nothing at all',
	measureLoudness([new Float32Array(RATE * 5)], RATE).integratedLufs === -Infinity);

// Sixty seconds of silence after a tone must not drag the reading down: the
// absolute gate drops every silent block before the mean is taken.
const withSilence = new Float32Array(RATE * 80);
withSilence.set(tone(20, -20), 0);
const gated = measureLoudness([withSilence], RATE);
const ungatedMean = -23.0036 + 10 * Math.log10(20 / 80);
claim('a tone followed by sixty seconds of silence still reads the tone',
	near(gated.integratedLufs, monoCal.integratedLufs, 0.1),
	`${gated.integratedLufs.toFixed(4)} LUFS, not the ${ungatedMean.toFixed(2)} an ungated mean would give`);

// ── The channel sum and the rate ────────────────────────────────────────────

const one = measureLoudness([tone(10, -20)], RATE).integratedLufs;
const two = measureLoudness([tone(10, -20), tone(10, -20)], RATE).integratedLufs;
claim('the same tone in two channels reads 3.01 LU above one channel',
	near(two - one, 10 * Math.log10(2), 0.02), `${(two - one).toFixed(4)} LU`);

const half = measureLoudness([tone(10, -26.02)], RATE).integratedLufs;
claim('halving the amplitude drops the reading by 6.02 LU', near(one - half, 6.02, 0.03),
	`${(one - half).toFixed(4)} LU`);

const at441 = measureLoudness([tone(20, -20, 44100)], 44100);
claim('the same tone reads the same at 44.1 kHz', near(at441.integratedLufs, -23.0, 0.1),
	`${at441.integratedLufs.toFixed(4)} LUFS`);

// ── Momentary, short-term, and the input ────────────────────────────────────

const burst = steps([[5, -40], [1, -14], [5, -40]]);
const bm = measureLoudness([burst], RATE);
claim('a one-second burst lifts the momentary max above the short-term max',
	bm.momentaryMaxLufs > bm.shortTermMaxLufs,
	`M ${bm.momentaryMaxLufs.toFixed(2)} > S ${bm.shortTermMaxLufs.toFixed(2)} LUFS`);
claim('the momentary max of a steady tone is the tone itself',
	near(monoCal.momentaryMaxLufs, -23.0, 0.1) && near(monoCal.shortTermMaxLufs, -23.0, 0.1),
	`M ${monoCal.momentaryMaxLufs.toFixed(3)} S ${monoCal.shortTermMaxLufs.toFixed(3)} LUFS`);

const input = tone(2, -20);
const copy = Float32Array.from(input);
measureLoudness([input], RATE);
claim('measuring never writes the samples it was given', input.every((v, i) => v === copy[i]));

// A buffer shorter than one 400 ms block is not a measurement, and says so.
claim('a buffer shorter than one block reads nothing',
	measureLoudness([tone(0.2, -20)], RATE).integratedLufs === -Infinity);

process.exit(failed ? 1 : 0);
