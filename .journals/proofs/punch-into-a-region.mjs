// PROOF — a take punched into the region between an in and an out point, and
// the sample counts checked.
//
// `node .journals/proofs/punch-into-a-region.mjs` from the repo root. Prints one
// TRUE or FALSE per claim and exits non-zero on any FALSE.

import { affordablePunch, msToSamples, punchIn, punchLength, secsToSamples } from '../../src/lib/splice.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};

const RATE = 44100;

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
const maxStep = (a) => {
	let worst = 0;
	for (let i = 1; i < a.length; i++) worst = Math.max(worst, Math.abs(a[i] - a[i - 1]));
	return worst;
};

// ── The arithmetic of the count ─────────────────────────────────────────────

{
	claim(
		'a punch is the host, less the region it gave up, plus the take that went in',
		punchLength(1000, 200, 600, 400) === 1000,
		`${punchLength(1000, 200, 600, 400)} samples`
	);
	claim(
		'a punch that exactly fills its region leaves the count unchanged',
		punchLength(44100, 10000, 20000, 10000) === 44100
	);
	claim(
		'a shorter take shortens the host by what it is short',
		punchLength(44100, 10000, 20000, 8000) === 42100,
		`${punchLength(44100, 10000, 20000, 8000)} samples`
	);
	claim(
		'a longer take lengthens the host by what it is long',
		punchLength(44100, 10000, 20000, 13000) === 47100,
		`${punchLength(44100, 10000, 20000, 13000)} samples`
	);
	claim('the count never depends on the crossfade', punchLength(1000, 100, 500, 400) === 1000);
}

// ── The punch on real samples ───────────────────────────────────────────────

{
	const host = tone(RATE * 2, 220, 0.4);
	const inAt = secsToSamples(0.5, RATE);
	const outAt = secsToSamples(1.2, RATE);
	const insert = tone(outAt - inAt, 440, 0.4);
	const fade = msToSamples(20, RATE);

	const done = punchIn(host, insert, inAt, outAt, fade);

	claim(
		'a punch that fills its region keeps the take at its own length',
		done.samples.length === host.length,
		`${done.samples.length} of ${host.length}`
	);
	claim('the punched material begins at the in point', done.punchAt === inAt);
	claim('the host resumes at the out point', done.resumeAt === outAt, `${done.resumeAt}`);
	claim('the crossfade asked for is the crossfade used', done.crossfade === fade, `${done.crossfade} samples`);

	let head = true;
	for (let i = 0; i < inAt; i++) if (done.samples[i] !== host[i]) head = false;
	claim('everything before the in point is the host, sample for sample', head);

	let tail = true;
	for (let i = outAt; i < host.length; i++) if (done.samples[i] !== host[i]) tail = false;
	claim('everything after the out point is the host, sample for sample', tail);

	let body = true;
	for (let i = fade; i < insert.length - fade; i++) {
		if (done.samples[inAt + i] !== insert[i]) body = false;
	}
	claim('the punched take rides whole between its two joins', body);

	const echoHost = Float32Array.from(host);
	const echoInsert = Float32Array.from(insert);
	punchIn(host, insert, inAt, outAt, fade);
	let untouched = true;
	for (let i = 0; untouched && i < host.length; i++) if (host[i] !== echoHost[i]) untouched = false;
	for (let i = 0; untouched && i < insert.length; i++) if (insert[i] !== echoInsert[i]) untouched = false;
	claim('neither the host nor the punched take is written', untouched);
}

// ── A take that does not fill its region ────────────────────────────────────

{
	const host = tone(RATE, 220, 0.4);
	const inAt = 10000;
	const outAt = 20000;
	const shortInsert = tone(6000, 440, 0.4);
	const longInsert = tone(14000, 440, 0.4);
	const fade = 512;

	const shortDone = punchIn(host, shortInsert, inAt, outAt, fade);
	claim(
		'a short punch pulls the take in by the difference',
		shortDone.samples.length === host.length - 4000,
		`${shortDone.samples.length} of ${host.length}`
	);
	claim('the host still resumes right after the punch', shortDone.resumeAt === inAt + 6000);

	const longDone = punchIn(host, longInsert, inAt, outAt, fade);
	claim(
		'a long punch pushes the take out by the difference',
		longDone.samples.length === host.length + 4000,
		`${longDone.samples.length} of ${host.length}`
	);

	let tail = true;
	for (let i = outAt; i < host.length; i++) {
		if (longDone.samples[inAt + 14000 + (i - outAt)] !== host[i]) tail = false;
	}
	claim('the host after the out point follows the long punch whole', tail);
}

// ── Continuity at both ends ─────────────────────────────────────────────────

{
	const host = flat(RATE, 0.5);
	const insert = flat(10000, -0.5);
	const inAt = 10000;
	const outAt = 20000;

	const hard = punchIn(host, insert, inAt, outAt, 0);
	claim('a punch with no crossfade steps at both ends', Math.abs(maxStep(hard.samples) - 1) < 1e-6, `${maxStep(hard.samples).toFixed(3)}`);

	const soft = punchIn(host, insert, inAt, outAt, msToSamples(20, RATE));
	claim(
		'a 20 ms crossfade at each end takes both steps away',
		maxStep(soft.samples) < 0.01,
		`${maxStep(hard.samples).toFixed(3)} → ${maxStep(soft.samples).toExponential(2)}`
	);

	let atIn = 0;
	let atOut = 0;
	for (let i = inAt - 2; i < inAt + msToSamples(20, RATE) + 2; i++) atIn = Math.max(atIn, Math.abs(soft.samples[i] - soft.samples[i - 1]));
	for (let i = outAt - msToSamples(20, RATE) - 2; i < outAt + 2; i++) atOut = Math.max(atOut, Math.abs(soft.samples[i] - soft.samples[i - 1]));
	claim('the in join is smooth', atIn < 0.01, `${atIn.toExponential(2)}`);
	claim('the out join is smooth', atOut < 0.01, `${atOut.toExponential(2)}`);
}

// ── What a punch can afford ─────────────────────────────────────────────────

{
	claim('a crossfade is never longer than half the take going in', affordablePunch(1000, 0, 10000, 900) === 500);
	claim('a crossfade is never longer than half the region', affordablePunch(100000, 0, 1000, 900) === 500);
	const host = tone(4000, 100, 0.3);
	const insert = tone(600, 200, 0.3);
	const done = punchIn(host, insert, 1000, 2000, 5000);
	claim('the punch reports the crossfade it could afford', done.crossfade === 300, `${done.crossfade} samples`);
	claim('the count still holds with a clamped crossfade', done.samples.length === punchLength(4000, 1000, 2000, 600), `${done.samples.length} samples`);
}

process.exit(failed ? 1 : 0);
