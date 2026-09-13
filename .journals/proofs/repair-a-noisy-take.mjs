// PROOF — noise reduction, de-click and de-breath measured on a synthetic take.
//
// `node .journals/proofs/repair-a-noisy-take.mjs` from the repo root. Prints one
// TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// The signal is built here: a tone with a silent head of room noise, injected
// clicks, and breath-shaped bursts between phrases. Each repair is applied and
// the reduction is measured against the clean signal it was built from.

import {
	applyChain,
	dbfs,
	deBreath,
	deClick,
	detectBreaths,
	detectClicks,
	learnNoiseProfile,
	reduceNoise,
	rms
} from '../../src/lib/repair.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};

const RATE = 44100;

// A repeatable pseudo-random source, so the measurements are the same every run.
let seed = 20260913;
function rand() {
	seed = (seed * 1103515245 + 12345) & 0x7fffffff;
	return (seed / 0x7fffffff) * 2 - 1;
}

const tone = (n, hz, amp, from = 0) => {
	const out = new Float32Array(n);
	for (let i = 0; i < n; i++) out[i] = amp * Math.sin((2 * Math.PI * hz * (i + from)) / RATE);
	return out;
};

// ── 1 · Noise reduction from a learned profile ──────────────────────────────
//
// Two seconds: a half-second of noise alone, then a tone with the same noise on
// it. The profile is learned from the silent head and subtracted from the whole.

{
	const n = RATE * 2;
	const head = Math.floor(RATE * 0.5);
	const clean = new Float32Array(n);
	for (let i = head; i < n; i++) clean[i] = 0.3 * Math.sin((2 * Math.PI * 440 * i) / RATE);

	const noisy = new Float32Array(n);
	for (let i = 0; i < n; i++) noisy[i] = clean[i] + 0.02 * rand();
	const echo = Float32Array.from(noisy);

	const profile = learnNoiseProfile(noisy, RATE, { start: 0, end: head });
	claim('a profile is learned from the silent head', profile.frames > 0, `${profile.frames} frames`);

	const done = reduceNoise(noisy, profile, { amount: 2, floor: 0.02 });

	const beforeDb = dbfs(rms(noisy, 0, head));
	const afterDb = dbfs(rms(done, 0, head));
	const drop = beforeDb - afterDb;
	claim('the noise floor falls by at least 10 dB', drop >= 10, `${drop.toFixed(1)} dB`);

	const toneStart = head + 4096;
	const toneBefore = dbfs(rms(noisy, toneStart, n - 4096));
	const toneAfter = dbfs(rms(done, toneStart, n - 4096));
	const lost = Math.abs(toneBefore - toneAfter);
	claim('the tone under the noise is kept within 1 dB', lost <= 1, `${lost.toFixed(2)} dB`);

	// Error against the clean signal, over the tone: the repair moved it closer.
	const err = (a, b, from, to) => {
		let sum = 0;
		for (let i = from; i < to; i++) sum += (a[i] - b[i]) ** 2;
		return Math.sqrt(sum / (to - from));
	};
	const errBefore = err(noisy, clean, toneStart, n - 4096);
	const errAfter = err(done, clean, toneStart, n - 4096);
	claim(
		'the distance from the clean tone shrinks',
		errAfter < errBefore,
		`${errBefore.toExponential(2)} → ${errAfter.toExponential(2)}`
	);

	// Nothing written: the input array is the same as it went in.
	let untouched = noisy.length === echo.length;
	for (let i = 0; untouched && i < n; i++) if (noisy[i] !== echo[i]) untouched = false;
	claim('the take a repair reads is never written', untouched);
}

// ── 2 · De-click ────────────────────────────────────────────────────────────
//
// A clean tone with twelve impulses driven into it. Each is found and redrawn.

{
	const n = RATE;
	const clean = tone(n, 220, 0.4);
	const clicked = Float32Array.from(clean);
	const at = [];
	for (let k = 0; k < 12; k++) {
		const i = 2000 + k * 3000;
		at.push(i);
		clicked[i] += clicked[i] > 0 ? 0.55 : -0.55;
	}

	const found = detectClicks(clicked, { sensitivity: 6 });
	claim('every injected click is found', found.length === 12, `${found.length} of 12`);

	const mendedAll = found.every((r) => at.some((i) => i >= r.start - 4 && i <= r.end + 4));
	claim('every found run sits on an injected click', mendedAll);

	const { samples: mended } = deClick(clicked, { sensitivity: 6 });
	const err = (a) => {
		let worst = 0;
		for (const i of at) worst = Math.max(worst, Math.abs(a[i] - clean[i]));
		return worst;
	};
	const before = err(clicked);
	const after = err(mended);
	const drop = 20 * Math.log10(before / Math.max(after, 1e-9));
	claim('the click error falls by at least 20 dB', drop >= 20, `${drop.toFixed(1)} dB`);

	const quiet = detectClicks(clean, { sensitivity: 6 });
	claim('a clean tone carries no clicks', quiet.length === 0, `${quiet.length} found`);
}

// ── 3 · De-breath ───────────────────────────────────────────────────────────
//
// Three phrases with a breath-shaped burst between them: quieter than the
// phrase, louder than the silence, and broadband.

{
	const phraseMs = 700;
	const breathMs = 220;
	const gapMs = 120;
	const seg = (ms) => Math.round((ms / 1000) * RATE);
	const parts = [];
	const breathSpans = [];
	let at = 0;
	const push = (arr) => {
		parts.push(arr);
		at += arr.length;
	};
	const silence = (ms) => new Float32Array(seg(ms));

	for (let k = 0; k < 3; k++) {
		push(tone(seg(phraseMs), 180, 0.35, at));
		push(silence(gapMs));
		const breath = new Float32Array(seg(breathMs));
		// A broadband burst at about −36 dBFS, shaped in and out like a breath.
		for (let i = 0; i < breath.length; i++) {
			const t = i / breath.length;
			const shape = Math.sin(Math.PI * t);
			breath[i] = 0.02 * shape * rand();
		}
		breathSpans.push({ start: at, end: at + breath.length });
		push(breath);
		push(silence(gapMs));
	}

	const n = parts.reduce((s, p) => s + p.length, 0);
	const signal = new Float32Array(n);
	let p = 0;
	for (const part of parts) {
		signal.set(part, p);
		p += part.length;
	}

	const found = detectBreaths(signal, RATE);
	claim('every breath is found', found.length === breathSpans.length, `${found.length} of ${breathSpans.length}`);

	const onTarget = found.every((r) =>
		breathSpans.some((b) => r.start >= b.start - seg(30) && r.end <= b.end + seg(30))
	);
	claim('every found run sits on a breath and not on a phrase', onTarget);

	const dipDb = -18;
	const { samples: dipped } = deBreath(signal, RATE, { dipDb });
	const before = dbfs(rms(signal, breathSpans[1].start + seg(40), breathSpans[1].end - seg(40)));
	const after = dbfs(rms(dipped, breathSpans[1].start + seg(40), breathSpans[1].end - seg(40)));
	const drop = before - after;
	claim(
		`the breath falls by the dip that was set (${dipDb} dB)`,
		Math.abs(drop + dipDb) <= 1.5,
		`${drop.toFixed(1)} dB`
	);

	const phraseBefore = dbfs(rms(signal, seg(100), seg(600)));
	const phraseAfter = dbfs(rms(dipped, seg(100), seg(600)));
	claim(
		'the phrase is left alone',
		Math.abs(phraseBefore - phraseAfter) < 0.01,
		`${Math.abs(phraseBefore - phraseAfter).toExponential(1)} dB`
	);
}

// ── 4 · The chain, and the undo ─────────────────────────────────────────────
//
// A chain replays from the take's own samples, so dropping a step and calling
// again returns exactly what that shorter chain gives.

{
	const n = RATE;
	const clean = tone(n, 330, 0.3);
	const dirty = Float32Array.from(clean);
	for (let i = 0; i < n; i++) dirty[i] += 0.015 * rand();
	for (let k = 0; k < 5; k++) dirty[5000 + k * 7000] += 0.6;

	const profile = learnNoiseProfile(dirty, RATE, { start: 0, end: 4096 });
	const steps = [
		{ kind: 'declick', sensitivity: 6, maxWidth: 64 },
		{ kind: 'noise', amount: 2, floor: 0.02 }
	];

	const both = applyChain(dirty, RATE, steps, profile);
	claim('the chain reports one line per step', both.reports.length === 2);
	claim('de-click reports what it mended', both.reports[0].touched === 5, `${both.reports[0].touched} mended`);

	const one = applyChain(dirty, RATE, steps.slice(0, 1), profile);
	const undone = applyChain(dirty, RATE, steps.slice(0, steps.length - 1), profile);
	let same = undone.samples.length === one.samples.length;
	let differs = undone.samples.length !== both.samples.length;
	for (let i = 0; same && i < one.samples.length; i++) {
		if (Math.abs(one.samples[i] - undone.samples[i]) > 0) same = false;
		if (!differs && Math.abs(both.samples[i] - undone.samples[i]) > 0) differs = true;
	}
	claim('an undo replays the shorter chain exactly', same);
	claim('an undo leaves the two-step result behind', differs);

	let untouched = true;
	const echo = Float32Array.from(dirty);
	applyChain(dirty, RATE, steps, profile);
	for (let i = 0; untouched && i < n; i++) if (dirty[i] !== echo[i]) untouched = false;
	claim('the take a chain is replayed from is never written', untouched);

	const none = applyChain(dirty, RATE, [], profile);
	let identical = none.samples.length === dirty.length;
	for (let i = 0; identical && i < n; i++) if (none.samples[i] !== dirty[i]) identical = false;
	claim('an empty chain is the take itself', identical);
}

process.exit(failed ? 1 : 0);
