// splice.ts — the cut, the equal-power join and the punch, as pure arithmetic
// over Float32Array. No DOM, no Web Audio, no disk, so the whole of it is
// provable in a node script (`.journals/proofs/`).
//
// Nothing here writes its inputs: a splice and a punch each return a new array,
// and the takes they were made from stay exactly as they are.

/** The two gains of an equal-power crossfade of `n` samples. */
export interface FadePair {
	/** The outgoing side, 1 → 0. */
	out: Float32Array;
	/** The incoming side, 0 → 1. */
	in: Float32Array;
}

/**
 * A cosine/sine pair whose squares sum to one at every sample — the join holds
 * its power when the two sides are unrelated sound.
 */
export function equalPowerFade(n: number): FadePair {
	const count = Math.max(0, Math.floor(n));
	const out = new Float32Array(count);
	const inc = new Float32Array(count);
	for (let i = 0; i < count; i++) {
		const t = ((i + 0.5) / count) * (Math.PI / 2);
		out[i] = Math.cos(t);
		inc[i] = Math.sin(t);
	}
	return { out, in: inc };
}

/** Milliseconds as a whole count of samples, never below zero. */
export function msToSamples(ms: number, sampleRate: number): number {
	if (!(sampleRate > 0) || !Number.isFinite(ms)) return 0;
	return Math.max(0, Math.round((ms / 1000) * sampleRate));
}

/** Seconds as a whole count of samples, never below zero. */
export function secsToSamples(secs: number, sampleRate: number): number {
	if (!(sampleRate > 0) || !Number.isFinite(secs)) return 0;
	return Math.max(0, Math.round(secs * sampleRate));
}

/**
 * The crossfade a splice can actually afford: never more than the tail of `a`
 * after its cut, nor the head of `b` after its own.
 */
export function affordableSplice(
	aLength: number,
	aCut: number,
	bLength: number,
	bCut: number,
	wanted: number
): number {
	return Math.max(0, Math.min(Math.floor(wanted), aLength - aCut, bLength - bCut));
}

/** The sample count a splice lands on, whatever crossfade it uses. */
export function spliceLength(aCut: number, bLength: number, bCut: number): number {
	return Math.max(0, aCut) + Math.max(0, bLength - bCut);
}

/** What a splice did, for the room to say and for a proof to read. */
export interface SpliceReport {
	samples: Float32Array;
	/** The crossfade actually used, in samples. */
	crossfade: number;
	/** Where the join begins in the result. */
	joinAt: number;
}

/**
 * Cut `a` at `aCut`, cut `b` at `bCut`, and join them with an equal-power
 * crossfade of `crossfade` samples — a's tail from its cut fading out against
 * b's head from its own fading in. The crossfade is held to what the two
 * buffers can afford and the used length is reported.
 */
export function splice(
	a: Float32Array,
	aCut: number,
	b: Float32Array,
	bCut: number,
	crossfade: number
): SpliceReport {
	const cutA = Math.max(0, Math.min(a.length, Math.floor(aCut)));
	const cutB = Math.max(0, Math.min(b.length, Math.floor(bCut)));
	const n = affordableSplice(a.length, cutA, b.length, cutB, crossfade);
	const out = new Float32Array(spliceLength(cutA, b.length, cutB));

	for (let i = 0; i < cutA; i++) out[i] = a[i];
	const fade = equalPowerFade(n);
	for (let i = 0; i < n; i++) out[cutA + i] = a[cutA + i] * fade.out[i] + b[cutB + i] * fade.in[i];
	for (let i = cutB + n; i < b.length; i++) out[cutA + n + (i - cutB - n)] = b[i];

	return { samples: out, crossfade: n, joinAt: cutA };
}

/** Join the end of `a` to the start of `b` with an equal-power crossfade. */
export function crossfadeJoin(a: Float32Array, b: Float32Array, crossfade: number): SpliceReport {
	const n = Math.max(0, Math.min(Math.floor(crossfade), a.length, b.length));
	return splice(a, a.length - n, b, 0, n);
}

/**
 * The crossfade a punch can afford at each end: never more than half the take
 * being punched in, nor half the region it replaces.
 */
export function affordablePunch(
	insertLength: number,
	inSample: number,
	outSample: number,
	wanted: number
): number {
	const region = Math.max(0, outSample - inSample);
	return Math.max(0, Math.min(Math.floor(wanted), Math.floor(insertLength / 2), Math.floor(region / 2)));
}

/**
 * The sample count a punch lands on: the host's own length, less the region it
 * gave up, plus the take that went in. A punch that exactly fills its region
 * leaves the count unchanged.
 */
export function punchLength(
	hostLength: number,
	inSample: number,
	outSample: number,
	insertLength: number
): number {
	const a = Math.max(0, Math.min(hostLength, inSample));
	const b = Math.max(a, Math.min(hostLength, outSample));
	return a + insertLength + (hostLength - b);
}

/** What a punch did, for the room to say and for a proof to read. */
export interface PunchReport {
	samples: Float32Array;
	/** The crossfade actually used at each end, in samples. */
	crossfade: number;
	/** Where the punched material begins and resumes in the result. */
	punchAt: number;
	resumeAt: number;
}

/**
 * Replace the region between `inSample` and `outSample` in `host` with the whole
 * of `insert`, crossfaded at both ends: the host fades out into the take at the
 * in point and the take fades back into the host at the out point.
 */
export function punchIn(
	host: Float32Array,
	insert: Float32Array,
	inSample: number,
	outSample: number,
	crossfade: number
): PunchReport {
	const a = Math.max(0, Math.min(host.length, Math.floor(inSample)));
	const b = Math.max(a, Math.min(host.length, Math.floor(outSample)));
	const n = affordablePunch(insert.length, a, b, crossfade);
	const out = new Float32Array(punchLength(host.length, a, b, insert.length));
	const fade = equalPowerFade(n);

	for (let i = 0; i < a; i++) out[i] = host[i];

	// The in point: the host's own samples from a, against the take's head.
	for (let i = 0; i < n; i++) {
		const hostSample = a + i < host.length ? host[a + i] : 0;
		out[a + i] = hostSample * fade.out[i] + insert[i] * fade.in[i];
	}

	for (let i = n; i < insert.length - n; i++) out[a + i] = insert[i];

	// The out point: the take's tail against the host's samples returning at b.
	for (let i = 0; i < n; i++) {
		const back = b - n + i;
		const hostSample = back >= 0 && back < host.length ? host[back] : 0;
		out[a + insert.length - n + i] = insert[insert.length - n + i] * fade.out[i] + hostSample * fade.in[i];
	}

	for (let i = b; i < host.length; i++) out[a + insert.length + (i - b)] = host[i];

	return { samples: out, crossfade: n, punchAt: a, resumeAt: a + insert.length };
}
