// PROOF — the look-ahead limiter never lets the reconstructed signal past the
// ceiling the person set, and the master step lands on the target loudness.
//
// `node .journals/proofs/limit-to-a-ceiling.mjs` from the repo root. Prints one
// TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// THE GUARANTEE, in the arithmetic: the gain a sample is given is the average,
// over a window of the look-ahead, of the smallest gain wanted anywhere within
// a look-ahead of THAT sample. At a peak, every term of the average already
// saw the peak, so every term is at or under what the peak allows — and so is
// their mean. The measurement afterwards is the same 4× reconstruction the
// meter uses, so this is checked, not asserted.

import {
	DEFAULT_CEILING_DBTP,
	limit,
	master,
	measure,
	samplePeak,
	toDb,
	truePeakDbtp
} from '../../src/lib/master.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};
const near = (a, b, tol) => Number.isFinite(a) && Math.abs(a - b) <= tol;

const RATE = 48000;

/** Six seconds of bursts: quiet, then three loud stabs with hard attacks, over
 *  a low tone and a near-Nyquist partial so the crests fall between samples. */
function burst(secs = 6, loud = 1.9) {
	const n = Math.round(secs * RATE);
	const x = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		const t = i / RATE;
		const stab = Math.floor(t * 2) % 2 === 1;
		const level = stab ? loud : 0.12;
		x[i] =
			level *
			(0.62 * Math.sin(2 * Math.PI * 220 * t) +
				0.3 * Math.sin(2 * Math.PI * (RATE / 4) * t + Math.PI / 4) +
				0.08 * Math.sin(2 * Math.PI * 3100 * t + 1.1));
	}
	return x;
}

const loud = burst();
const stereo = [loud, Float32Array.from(loud, (v, i) => v * (i % 3 === 0 ? 0.9 : 1))];

claim('the burst runs well over full scale before anything is done to it',
	toDb(samplePeak(stereo)) > 3 && truePeakDbtp(stereo) > 3,
	`sample ${toDb(samplePeak(stereo)).toFixed(3)} dBFS, true ${truePeakDbtp(stereo).toFixed(3)} dBTP`);

// ── The ceiling holds, wherever it is set ───────────────────────────────────

for (const ceiling of [-0.1, -1, -2, -3, -6]) {
	const held = limit(stereo, RATE, { ceilingDbtp: ceiling });
	const measured = truePeakDbtp(held.channels);
	claim(`a ceiling of ${ceiling} dBTP holds over the whole burst`, measured <= ceiling + 1e-6,
		`${measured.toFixed(4)} dBTP, ${held.gainReductionDb.toFixed(2)} dB held back`);
}

// ── What it does and does not touch ─────────────────────────────────────────

const held = limit(stereo, RATE, { ceilingDbtp: DEFAULT_CEILING_DBTP });
claim(`the default ceiling is ${DEFAULT_CEILING_DBTP} dBTP`, DEFAULT_CEILING_DBTP === -1);
claim('the limiter returns as many frames as it was given',
	held.channels.length === 2 && held.channels[0].length === loud.length,
	`${held.channels[0].length} frames`);

const copy = Float32Array.from(loud);
claim('the limiter never writes the samples it was given', loud.every((v, i) => v === copy[i]));

// A signal already under the ceiling comes back untouched, sample for sample.
const gentle = Float32Array.from(loud, (v) => v * 0.2);
const untouched = limit([gentle], RATE, { ceilingDbtp: -1 });
claim('a signal already under the ceiling is returned exactly as it came',
	untouched.gainReductionDb === 0 && untouched.channels[0].every((v, i) => v === gentle[i]),
	`${untouched.gainReductionDb.toFixed(3)} dB held back, ${untouched.truePeakDbtp.toFixed(3)} dBTP`);

// The quiet stretches between the stabs must come back at their own level: a
// limiter is not a fader.
const quietAt = Math.round(0.25 * RATE);
claim('the quiet stretches keep their own level — only the stabs are held back',
	near(held.channels[0][quietAt] / stereo[0][quietAt], 1, 0.02),
	`${(held.channels[0][quietAt] / stereo[0][quietAt]).toFixed(4)}× at 0.25 s`);

// The gain is already down when the stab arrives — the look-ahead's whole point.
const stabAt = Math.round(0.5 * RATE);
const beforeStab = held.channels[0][stabAt - 200] / stereo[0][stabAt - 200];
claim('the gain is already moving before the stab lands, not after it', beforeStab < 0.999,
	`${beforeStab.toFixed(4)}× four milliseconds before`);

// ── Inter-sample crests, which sample peak alone would miss ─────────────────

const isp = new Float32Array(RATE);
for (let i = 0; i < isp.length; i++) isp[i] = 0.98 * Math.sin((2 * Math.PI * (RATE / 4) * i) / RATE + Math.PI / 4);
claim('a signal whose sample peak is under the ceiling but whose true peak is over is caught',
	toDb(samplePeak([isp])) < -1 && truePeakDbtp([isp]) > -1,
	`sample ${toDb(samplePeak([isp])).toFixed(3)} dBFS, true ${truePeakDbtp([isp]).toFixed(3)} dBTP`);
const ispHeld = limit([isp], RATE, { ceilingDbtp: -1 });
claim('and it is brought under the ceiling all the same', ispHeld.truePeakDbtp <= -1 + 1e-6,
	`${ispHeld.truePeakDbtp.toFixed(4)} dBTP`);

// ── The master step ─────────────────────────────────────────────────────────

for (const target of [-14, -16, -23]) {
	const done = master(stereo, RATE, { targetLufs: target, ceilingDbtp: -1 });
	const after = done.report.after;
	claim(`mastering to ${target} LUFS lands on the target and under the ceiling`,
		near(after.integratedLufs, target, 0.5) && after.truePeakDbtp <= -1 + 1e-6,
		`${after.integratedLufs.toFixed(3)} LUFS, ${after.truePeakDbtp.toFixed(4)} dBTP, ${done.report.gainDb.toFixed(2)} dB of gain`);
}

// A source with a wide crest — a quiet body with sharp transients over it —
// needs the limiter once it is gained to the target.
const spiky = (transient) => {
	const x = new Float32Array(RATE * 6);
	for (let i = 0; i < x.length; i++) {
		const t = i / RATE;
		x[i] = 0.04 * Math.sin(2 * Math.PI * 180 * t) + 0.02 * Math.sin(2 * Math.PI * 900 * t + 0.8);
		const into = i % Math.round(RATE * 0.4);
		if (into < 64) x[i] += transient * Math.exp(-into / 12) * Math.sin((2 * Math.PI * (RATE / 4) * i) / RATE + Math.PI / 4);
	}
	return x;
};

const mild = spiky(0.2);
const mildDone = master([mild, mild], RATE, { targetLufs: -14, ceilingDbtp: -1 });
claim('a mix that needs the limiter at the target still reaches the target',
	mildDone.report.gainReductionDb > 0 &&
		mildDone.report.after.truePeakDbtp <= -1 + 1e-6 &&
		near(mildDone.report.after.integratedLufs, -14, 0.5),
	`${mildDone.report.after.integratedLufs.toFixed(3)} LUFS, ${mildDone.report.after.truePeakDbtp.toFixed(4)} dBTP, ${mildDone.report.gainReductionDb.toFixed(2)} dB held back`);

const sharp = spiky(0.55);
const sharpDone = master([sharp, sharp], RATE, { targetLufs: -14, ceilingDbtp: -1 });
claim('a mix whose crests are far wider still comes back under the ceiling',
	sharpDone.report.gainReductionDb > 0 && sharpDone.report.after.truePeakDbtp <= -1 + 1e-6,
	`${sharpDone.report.after.truePeakDbtp.toFixed(4)} dBTP, ${sharpDone.report.gainReductionDb.toFixed(2)} dB held back`);
claim('and the loudness that deep limiting costs is reported, not hidden — the reading falls short of the target',
	sharpDone.report.after.integratedLufs < -14,
	`asked ${sharpDone.report.targetLufs}, landed ${sharpDone.report.after.integratedLufs.toFixed(3)} LUFS after ${sharpDone.report.gainDb.toFixed(2)} dB of gain`);
claim('without the limiter that same gain would have run over the ceiling',
	sharpDone.report.before.truePeakDbtp + sharpDone.report.gainDb > -1,
	`${(sharpDone.report.before.truePeakDbtp + sharpDone.report.gainDb).toFixed(3)} dBTP if nothing had held it`);

const quietSource = Float32Array.from(loud, (v) => v * 0.02);
const lifted = master([quietSource, quietSource], RATE, { targetLufs: -16, ceilingDbtp: -1 });
claim('a quiet mix is lifted to the target, not left where it was',
	near(lifted.report.after.integratedLufs, -16, 0.2) && lifted.report.gainDb > 0,
	`${lifted.report.before.integratedLufs.toFixed(2)} to ${lifted.report.after.integratedLufs.toFixed(2)} LUFS, +${lifted.report.gainDb.toFixed(2)} dB`);

const before = measure(stereo, RATE);
const sourceCopy = Float32Array.from(stereo[0]);
const done = master(stereo, RATE, { targetLufs: -16 });
claim('mastering never writes the mix it was given', stereo[0].every((v, i) => v === sourceCopy[i]));
claim('and the buffer that comes back is a different one',
	done.channels[0] !== stereo[0] && done.channels[0].length === stereo[0].length);
claim('the report carries the reading from before as well as after',
	near(done.report.before.integratedLufs, before.integratedLufs, 1e-9) &&
		near(done.report.before.truePeakDbtp, before.truePeakDbtp, 1e-9),
	`before ${done.report.before.integratedLufs.toFixed(3)} LUFS / ${done.report.before.truePeakDbtp.toFixed(3)} dBTP`);

claim('silence masters to silence and says nothing was gained',
	master([new Float32Array(RATE)], RATE).report.gainDb === 0);

process.exit(failed ? 1 : 0);
