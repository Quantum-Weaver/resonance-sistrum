// PROOF — true peak is the peak of the reconstructed signal, not of the
// samples: a signal whose crests fall between two samples reads higher than its
// sample peak, by exactly as much as the arithmetic says it should.
//
// `node .journals/proofs/true-peak-over-samples.mjs` from the repo root. Prints
// one TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// THE CASE: a sine at a quarter of the sample rate, started a quarter-turn in.
// Every sample lands on ±A/√2 — 3.0103 dB under the wave's own peak — while the
// wave itself reaches A between them. Sample peak says −3.01 dBFS; the sound a
// converter makes says 0 dBTP. Nothing but oversampling can tell them apart.

import {
	OVERSAMPLE,
	polyphaseBank,
	samplePeak,
	toDb,
	truePeakDbtp,
	truePeakEnvelope
} from '../../src/lib/master.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= tol;

const RATE = 48000;

/** A sine, faded in and out over a raised cosine so the buffer's ends are not
 *  themselves a transient the reconstruction would ring on. */
function sine(secs, freq, amp, phase, rate = RATE) {
	const n = Math.round(secs * rate);
	const fade = Math.min(2000, Math.floor(n / 4));
	const x = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		let w = 1;
		if (i < fade) w = 0.5 - 0.5 * Math.cos((Math.PI * i) / fade);
		if (i >= n - fade) w = 0.5 - 0.5 * Math.cos((Math.PI * (n - 1 - i)) / fade);
		x[i] = w * amp * Math.sin((2 * Math.PI * freq * i) / rate + phase);
	}
	return x;
}

// ── The interpolator ────────────────────────────────────────────────────────

const bank = polyphaseBank();
claim(`the bank oversamples ${OVERSAMPLE}× with ${bank.phases.length * bank.phases[0].length} taps`,
	bank.factor === 4 && bank.phases.length === 4 && bank.phases[0].length === 12,
	`${bank.phases.length} phases of ${bank.phases[0].length}`);

let worstSum = 0;
for (const phase of bank.phases) {
	let sum = 0;
	for (const t of phase) sum += t;
	worstSum = Math.max(worstSum, Math.abs(sum - 1));
}
claim('every phase passes a steady level unchanged — each sums to one', worstSum < 1e-12,
	`worst ${worstSum.toExponential(2)}`);

// ── The case: sample peak under true peak ───────────────────────────────────

const between = sine(1, RATE / 4, 1.0, Math.PI / 4);
const sp = toDb(samplePeak([between]));
const tp = truePeakDbtp([between]);
claim('every sample of the quarter-rate sine lands 3.01 dB under the wave', near(sp, -3.0103, 0.02),
	`sample peak ${sp.toFixed(4)} dBFS`);
claim('the true peak reads the wave itself, 0 dBTP', near(tp, 0, 0.05),
	`${tp.toFixed(4)} dBTP`);
claim('so the true peak stands 3.01 dB over the sample peak', near(tp - sp, 3.0103, 0.06),
	`${(tp - sp).toFixed(4)} dB apart`);

// The same wave at half scale: the gap is a property of where the samples fall,
// not of the level.
const quiet = sine(1, RATE / 4, 0.5, Math.PI / 4);
claim('at half scale the same gap stands', near(truePeakDbtp([quiet]) - toDb(samplePeak([quiet])), 3.0103, 0.06),
	`${(truePeakDbtp([quiet]) - toDb(samplePeak([quiet]))).toFixed(4)} dB apart`);

// A sample peak that is already the true peak: the sine sits on its own crests.
const onCrest = sine(1, RATE / 4, 1.0, Math.PI / 2);
claim('a sine whose samples land ON its crests reads no higher than its samples',
	near(truePeakDbtp([onCrest]) - toDb(samplePeak([onCrest])), 0, 0.05),
	`${(truePeakDbtp([onCrest]) - toDb(samplePeak([onCrest]))).toFixed(4)} dB apart`);

// Low frequencies crest close enough to a sample that the two agree.
const low = sine(1, 1000, 0.5, 0.3);
claim('a 1 kHz sine at −6 dBFS reads the same either way', near(truePeakDbtp([low]), -6.0206, 0.05),
	`sample ${toDb(samplePeak([low])).toFixed(4)} true ${truePeakDbtp([low]).toFixed(4)}`);

// ── The floor the measurement rests on ──────────────────────────────────────

claim('true peak is never under sample peak, across a spread of frequencies and phases',
	[[19000, 0.7], [12000, 1.1], [7350, 2.4], [3000, 0.0], [15000, 1.9]].every(([f, p]) => {
		const x = sine(0.25, f, 0.9, p);
		return truePeakDbtp([x]) >= toDb(samplePeak([x])) - 1e-9;
	}));

const at441 = sine(1, 44100 / 4, 1.0, Math.PI / 4, 44100);
claim('the same case at 44.1 kHz reads the same', near(truePeakDbtp([at441]), 0, 0.05),
	`${truePeakDbtp([at441]).toFixed(4)} dBTP`);

claim('silence has no peak at all', truePeakDbtp([new Float32Array(4800)]) === -Infinity);

// The skip: the interpolator only runs where the reconstruction could reach the
// floor it was given. The envelope must still be exact where it matters.
const mixed = new Float32Array(RATE);
mixed.set(sine(0.5, RATE / 4, 1.0, Math.PI / 4).subarray(0, RATE / 2), 0);
for (let i = RATE / 2; i < RATE; i++) mixed[i] = 0.001 * Math.sin((2 * Math.PI * 12000 * i) / RATE);
const env = truePeakEnvelope([mixed], samplePeak([mixed]));
let top = 0;
for (const v of env) top = Math.max(top, v);
claim('the skipped stretches never hide a peak — the envelope tops out where the loud part is',
	near(toDb(top), truePeakDbtp([mixed]), 1e-6), `${toDb(top).toFixed(4)} dBTP`);

// ── Nothing is written ──────────────────────────────────────────────────────

const input = sine(0.2, RATE / 4, 1.0, Math.PI / 4);
const copy = Float32Array.from(input);
truePeakDbtp([input]);
truePeakEnvelope([input], 0.5);
claim('measuring never writes the samples it was given', input.every((v, i) => v === copy[i]));

process.exit(failed ? 1 : 0);
