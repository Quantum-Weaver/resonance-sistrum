// PROOF — two buffers cut and joined with an equal-power crossfade, and the
// join measured for continuity.
//
// `node .journals/proofs/splice-two-takes.mjs` from the repo root. Prints one
// TRUE or FALSE per claim and exits non-zero on any FALSE.

import {
	affordableSplice,
	crossfadeJoin,
	equalPowerFade,
	msToSamples,
	splice,
	spliceLength
} from '../../src/lib/splice.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};

const RATE = 44100;

let seed = 913202609;
function rand() {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return (seed / 0x7fffffff) * 2 - 1;
}

const tone = (n, hz, amp) => {
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * i) / RATE);
	return out;
};
const flat = (n, value) => {
	const out = new Float32Array(n);
	out.fill(value);
	return out;
};
const noise = (n, amp) => {
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) out[i] = amp * rand();
	return out;
};
const maxStep = (a, from = 1, to = a.length) => {
	let worst = 0;
	for (let i = Math.max(1, from); i < to; i++) worst = Math.max(worst, Math.abs(a[i] - a[i - 1]));
	return worst;
};
const rmsOf = (a, from, to) => {
	let sum = 0;
	for (let i = from; i < to; i++) sum += a[i] * a[i];
	return Math.sqrt(sum / (to - from));
};

// ── The fade itself ─────────────────────────────────────────────────────────

{
	const n = 512;
	const fade = equalPowerFade(n);
	let worst = 0;
	for (let i = 0; i < n; i++) worst = Math.max(worst, Math.abs(fade.out[i] ** 2 + fade.in[i] ** 2 - 1));
	claim('the two gains hold equal power at every sample', worst < 1e-6, `worst ${worst.toExponential(1)}`);

	let symmetric = true;
	for (let i = 0; i < n; i++) {
		if (Math.abs(fade.out[i] - fade.in[n - 1 - i]) > 1e-6) symmetric = false;
	}
	claim('the fade is the mirror of itself', symmetric);
	claim('the outgoing side starts near one and ends near zero', fade.out[0] > 0.999 && fade.out[n - 1] < 0.002);
	claim('a fade of no samples is empty', equalPowerFade(0).out.length === 0);
}

// ── The sample count, the head and the tail ─────────────────────────────────

{
	const a = tone(RATE, 220, 0.4);
	const b = tone(RATE, 330, 0.4);
	const aCut = Math.round(RATE * 0.6);
	const bCut = Math.round(RATE * 0.25);
	const fade = msToSamples(20, RATE);
	const done = splice(a, aCut, b, bCut, fade);

	claim(
		'the joined length is this take up to its cut plus what is left of the other',
		done.samples.length === spliceLength(aCut, b.length, bCut),
		`${done.samples.length} samples`
	);
	claim('the crossfade asked for is the crossfade used', done.crossfade === fade, `${done.crossfade} samples`);
	claim('the join begins at the cut', done.joinAt === aCut);

	let head = true;
	for (let i = 0; i < aCut; i++) if (done.samples[i] !== a[i]) head = false;
	claim('everything before the cut is this take, sample for sample', head);

	let tail = true;
	for (let i = bCut + fade; i < b.length; i++) {
		if (done.samples[aCut + i - bCut] !== b[i]) tail = false;
	}
	claim('everything after the join is the other take, sample for sample', tail);

	const echoA = Float32Array.from(a);
	const echoB = Float32Array.from(b);
	splice(a, aCut, b, bCut, fade);
	let untouched = true;
	for (let i = 0; untouched && i < a.length; i++) if (a[i] !== echoA[i] || b[i] !== echoB[i]) untouched = false;
	claim('neither take is written', untouched);
}

// ── Continuity at the join ──────────────────────────────────────────────────
//
// Two takes at opposite polarity: a hard cut steps by the whole of both, and
// the crossfade takes that step away.

{
	const a = flat(RATE, 0.5);
	const b = flat(RATE, -0.5);
	const cut = Math.round(RATE * 0.5);

	const hard = splice(a, cut, b, cut, 0);
	const hardStep = maxStep(hard.samples);
	claim('a cut with no crossfade steps by the whole of both', Math.abs(hardStep - 1) < 1e-6, `${hardStep.toFixed(3)}`);

	const soft = splice(a, cut, b, cut, msToSamples(20, RATE));
	const softStep = maxStep(soft.samples);
	claim(
		'a 20 ms equal-power crossfade takes the step away',
		softStep < hardStep / 100,
		`${hardStep.toFixed(3)} → ${softStep.toExponential(2)}`
	);

	// The same shape on real sound: two tones taken where they disagree most.
	const t1 = tone(RATE, 200, 0.5);
	const t2 = tone(RATE, 317, 0.5);
	let toneCut = cut;
	for (let c = cut; c < cut + 400; c++) {
		if (Math.abs(t2[c] - t1[c - 1]) > Math.abs(t2[toneCut] - t1[toneCut - 1])) toneCut = c;
	}
	const hardTone = splice(t1, toneCut, t2, toneCut, 0);
	const softTone = splice(t1, toneCut, t2, toneCut, msToSamples(20, RATE));
	const own = Math.max(maxStep(t1), maxStep(t2));
	claim(
		'a tone spliced hard steps past what either tone does on its own',
		maxStep(hardTone.samples) > own * 2,
		`${maxStep(hardTone.samples).toFixed(3)} against ${own.toFixed(3)}`
	);
	claim(
		'the crossfaded join never steps past what the tones do on their own',
		maxStep(softTone.samples) <= own * 1.5,
		`${maxStep(softTone.samples).toFixed(4)} against ${own.toFixed(4)}`
	);
}

// ── The power through the join ──────────────────────────────────────────────
//
// Two unrelated takes at the same level: equal power is what keeps the join
// from dipping or swelling.

{
	const a = noise(RATE, 0.3);
	const b = noise(RATE, 0.3);
	const cut = Math.round(RATE * 0.5);
	const fade = msToSamples(100, RATE);
	const done = splice(a, cut, b, cut, fade);

	const level = rmsOf(done.samples, 0, cut - fade);
	let worstDb = 0;
	const win = Math.round(fade / 8);
	for (let p = cut; p + win <= cut + fade; p += win) {
		const here = rmsOf(done.samples, p, p + win);
		worstDb = Math.max(worstDb, Math.abs(20 * Math.log10(here / level)));
	}
	claim('the level through the join holds within 1 dB', worstDb <= 1, `worst ${worstDb.toFixed(2)} dB`);
}

// ── What a splice can afford ────────────────────────────────────────────────

{
	const a = tone(1000, 100, 0.4);
	const b = tone(1000, 100, 0.4);
	claim('a crossfade is never longer than the tail it has', affordableSplice(1000, 950, 1000, 0, 400) === 50);
	claim('a crossfade is never longer than the head it has', affordableSplice(1000, 0, 1000, 970, 400) === 30);
	const done = splice(a, 950, b, 0, 400);
	claim('the splice reports the crossfade it could afford', done.crossfade === 50, `${done.crossfade} samples`);
	claim('a splice at the very top of a take is the other take alone', splice(a, 0, b, 0, 0).samples.length === b.length);
}

// ── End to start ────────────────────────────────────────────────────────────

{
	const a = tone(2000, 100, 0.3);
	const b = tone(3000, 100, 0.3);
	const done = crossfadeJoin(a, b, 500);
	claim('joining the end of one to the start of another is a splice at the end', done.samples.length === 2000 - 500 + 3000, `${done.samples.length} samples`);
	claim('the join begins where the first take gave way', done.joinAt === 1500);
	const short = crossfadeJoin(tone(100, 100, 0.3), b, 500);
	claim('a crossfade longer than the takes is held to what they have', short.crossfade === 100, `${short.crossfade} samples`);
}

process.exit(failed ? 1 : 0);
