// repair.ts — noise reduction, de-click and de-breath as pure arithmetic over
// Float32Array. No DOM, no Web Audio, no disk: samples in, samples out, so the
// whole of it is provable in a node script (`.journals/proofs/`).
//
// A repair never writes its input. Every function returns a new array, which is
// what makes a step undoable: the chain is replayed from the lane's own decoded
// samples, and the take on the shelf is never touched.

/** A half-open span of samples, one channel's own indices. */
export interface Region {
	start: number;
	end: number;
}

export const DEFAULT_FFT = 1024;

const EPS = 1e-12;

/** In-place radix-2 FFT; `re.length` must be a power of two. */
function fft(re: Float64Array, im: Float64Array, inverse = false): void {
	const n = re.length;
	for (let i = 1, j = 0; i < n; i++) {
		let bit = n >> 1;
		for (; j & bit; bit >>= 1) j ^= bit;
		j ^= bit;
		if (i < j) {
			const tr = re[i];
			re[i] = re[j];
			re[j] = tr;
			const ti = im[i];
			im[i] = im[j];
			im[j] = ti;
		}
	}
	for (let len = 2; len <= n; len <<= 1) {
		const ang = ((inverse ? 2 : -2) * Math.PI) / len;
		const wr = Math.cos(ang);
		const wi = Math.sin(ang);
		const half = len >> 1;
		for (let i = 0; i < n; i += len) {
			let cr = 1;
			let ci = 0;
			for (let k = 0; k < half; k++) {
				const ur = re[i + k];
				const ui = im[i + k];
				const xr = re[i + k + half];
				const xi = im[i + k + half];
				const vr = xr * cr - xi * ci;
				const vi = xr * ci + xi * cr;
				re[i + k] = ur + vr;
				im[i + k] = ui + vi;
				re[i + k + half] = ur - vr;
				im[i + k + half] = ui - vi;
				const ncr = cr * wr - ci * wi;
				ci = cr * wi + ci * wr;
				cr = ncr;
			}
		}
	}
	if (inverse) {
		for (let i = 0; i < n; i++) {
			re[i] /= n;
			im[i] /= n;
		}
	}
}

/** A periodic Hann window of `n` points. */
function hann(n: number): Float64Array {
	const w = new Float64Array(n);
	for (let i = 0; i < n; i++) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
	return w;
}

const isPow2 = (n: number) => n >= 2 && (n & (n - 1)) === 0;

/** Root-mean-square over a span; 0 when the span is empty. */
export function rms(samples: Float32Array, start = 0, end = samples.length): number {
	const a = Math.max(0, Math.min(samples.length, Math.floor(start)));
	const b = Math.max(a, Math.min(samples.length, Math.floor(end)));
	if (b <= a) return 0;
	let sum = 0;
	for (let i = a; i < b; i++) sum += samples[i] * samples[i];
	return Math.sqrt(sum / (b - a));
}

/** An amplitude as dBFS; silence reads −Infinity. */
export function dbfs(amplitude: number): number {
	return amplitude > 0 ? 20 * Math.log10(amplitude) : -Infinity;
}

/** A region held inside the array's own bounds, ordered. */
export function clampRegion(region: Region | null | undefined, length: number): Region {
	if (!region) return { start: 0, end: length };
	const start = Math.max(0, Math.min(length, Math.floor(region.start)));
	const end = Math.max(start, Math.min(length, Math.floor(region.end)));
	return { start, end };
}

/**
 * Run `fn` over one span only and write the result into a copy of the whole,
 * ramping `rampSamples` at each edge so the repaired span joins without a step.
 */
export function applyInRegion(
	samples: Float32Array,
	region: Region | null | undefined,
	fn: (slice: Float32Array) => Float32Array,
	rampSamples = 64
): Float32Array {
	const { start, end } = clampRegion(region, samples.length);
	if (end <= start) return Float32Array.from(samples);
	if (start === 0 && end === samples.length) return fn(Float32Array.from(samples));
	const piece = fn(samples.slice(start, end));
	const out = Float32Array.from(samples);
	const span = end - start;
	const ramp = Math.max(0, Math.min(rampSamples, Math.floor(span / 2)));
	for (let i = 0; i < span && i < piece.length; i++) {
		let mix = 1;
		if (ramp > 0) {
			if (i < ramp) mix = (i + 0.5) / ramp;
			else if (i >= span - ramp) mix = (span - i - 0.5) / ramp;
		}
		out[start + i] = samples[start + i] * (1 - mix) + piece[i] * mix;
	}
	return out;
}

// ── Noise reduction ─────────────────────────────────────────────────────────

/** The mean magnitude spectrum of a span the person marked as noise alone. */
export interface NoiseProfile {
	fftSize: number;
	sampleRate: number;
	/** Mean magnitude per bin, 0..fftSize/2 inclusive. */
	magnitude: Float32Array;
	/** How many analysis frames the mean was taken over. */
	frames: number;
	/** The span it was learned from, in samples. */
	learnedFrom: Region;
}

/**
 * Learn a noise profile from a silent region — the mean magnitude per bin over
 * every whole analysis frame inside it. Throws when the region is too short to
 * hold one frame.
 */
export function learnNoiseProfile(
	samples: Float32Array,
	sampleRate: number,
	region?: Region | null,
	fftSize: number = DEFAULT_FFT
): NoiseProfile {
	if (!isPow2(fftSize)) throw new Error('the analysis size is a power of two');
	const span = clampRegion(region, samples.length);
	const length = span.end - span.start;
	if (length < fftSize)
		throw new Error(
			`the selection holds ${length} samples — a noise profile needs at least ${fftSize}`
		);
	const hop = fftSize >> 2;
	const w = hann(fftSize);
	const bins = (fftSize >> 1) + 1;
	const acc = new Float64Array(bins);
	const re = new Float64Array(fftSize);
	const im = new Float64Array(fftSize);
	let frames = 0;
	for (let p = span.start; p + fftSize <= span.end; p += hop) {
		for (let i = 0; i < fftSize; i++) {
			re[i] = samples[p + i] * w[i];
			im[i] = 0;
		}
		fft(re, im);
		for (let k = 0; k < bins; k++) acc[k] += Math.hypot(re[k], im[k]);
		frames++;
	}
	const magnitude = new Float32Array(bins);
	for (let k = 0; k < bins; k++) magnitude[k] = frames > 0 ? acc[k] / frames : 0;
	return { fftSize, sampleRate, magnitude, frames, learnedFrom: span };
}

export interface NoiseOptions {
	/** How many times the learned noise is subtracted. 0..4; 1 is one for one. */
	amount?: number;
	/** The least of the input that survives in any bin, as a fraction. 0..1. */
	floor?: number;
}

/**
 * Spectral subtraction against a learned profile, overlap-added at a quarter
 * hop and divided by the accumulated window power, so a signal the profile does
 * not match comes back as it went in.
 */
export function reduceNoise(
	samples: Float32Array,
	profile: NoiseProfile,
	opts: NoiseOptions = {}
): Float32Array {
	const fftSize = profile.fftSize;
	if (!isPow2(fftSize)) throw new Error('the analysis size is a power of two');
	const amount = Math.max(0, Math.min(4, opts.amount ?? 1));
	const floor = Math.max(0, Math.min(1, opts.floor ?? 0.05));
	const n = samples.length;
	if (n < fftSize || amount === 0) return Float32Array.from(samples);

	const hop = fftSize >> 2;
	const w = hann(fftSize);
	const bins = (fftSize >> 1) + 1;
	const out = new Float64Array(n);
	const norm = new Float64Array(n);
	const re = new Float64Array(fftSize);
	const im = new Float64Array(fftSize);

	for (let p = 0; p + fftSize <= n; p += hop) {
		for (let i = 0; i < fftSize; i++) {
			re[i] = samples[p + i] * w[i];
			im[i] = 0;
		}
		fft(re, im);
		for (let k = 0; k < bins; k++) {
			const mag = Math.hypot(re[k], im[k]);
			const kept = Math.max(mag - amount * profile.magnitude[k], floor * mag);
			const g = mag > EPS ? kept / mag : 1;
			re[k] *= g;
			im[k] *= g;
			const mirror = fftSize - k;
			if (k > 0 && mirror > k && mirror < fftSize) {
				re[mirror] *= g;
				im[mirror] *= g;
			}
		}
		fft(re, im, true);
		for (let i = 0; i < fftSize; i++) {
			out[p + i] += re[i] * w[i];
			norm[p + i] += w[i] * w[i];
		}
	}

	// Where fewer frames overlap — the head and the tail — the window power is
	// short of its steady value, so the repair is faded in against the input
	// rather than divided by a small number.
	let full = 0;
	for (let i = 0; i < n; i++) full = Math.max(full, norm[i]);
	const result = new Float32Array(n);
	for (let i = 0; i < n; i++) {
		if (full <= 1e-9) {
			result[i] = samples[i];
			continue;
		}
		const ratio = Math.min(1, norm[i] / full);
		result[i] = ratio >= 1 ? out[i] / norm[i] : samples[i] * (1 - ratio) + out[i] / full;
	}
	return result;
}

// ── De-click ────────────────────────────────────────────────────────────────

export interface ClickOptions {
	/** How many times the local detection level a sample must reach to count. 2..20. */
	sensitivity?: number;
	/** The widest run of samples treated as one click. */
	maxWidth?: number;
	/** Samples taken in either side of a detected run before it is redrawn. */
	guard?: number;
}

/**
 * Runs of samples whose second difference stands far above the local level —
 * the shape of a click rather than of the sound around it.
 */
export function detectClicks(samples: Float32Array, opts: ClickOptions = {}): Region[] {
	const k = Math.max(2, Math.min(20, opts.sensitivity ?? 6));
	const maxWidth = Math.max(1, Math.floor(opts.maxWidth ?? 64));
	const guard = Math.max(0, Math.floor(opts.guard ?? 2));
	const n = samples.length;
	if (n < 5) return [];

	const d = new Float64Array(n);
	for (let i = 2; i < n; i++) d[i] = samples[i] - 2 * samples[i - 1] + samples[i - 2];

	// The local level is a running mean of |d| over a window wide enough that
	// one click cannot lift it.
	const win = 1024;
	const level = new Float64Array(n);
	let sum = 0;
	for (let i = 0; i < n; i++) {
		sum += Math.abs(d[i]);
		if (i >= win) sum -= Math.abs(d[i - win]);
		level[i] = sum / Math.min(i + 1, win);
	}

	const found: Region[] = [];
	let i = 2;
	while (i < n) {
		if (Math.abs(d[i]) > Math.max(level[i] * k, 1e-6)) {
			let j = i;
			while (j < n && j - i < maxWidth && Math.abs(d[j]) > Math.max(level[j] * (k / 2), 1e-6)) j++;
			const start = Math.max(1, i - 1 - guard);
			const end = Math.min(n - 1, j + guard);
			const last = found[found.length - 1];
			if (last && start <= last.end) last.end = Math.max(last.end, end);
			else found.push({ start, end });
			i = j + 1;
		} else {
			i++;
		}
	}
	return found;
}

/** Cubic-Hermite redraw across one span, from the samples either side of it. */
function interpolateSpan(out: Float32Array, start: number, end: number): void {
	const a = Math.max(0, start - 1);
	const b = Math.min(out.length - 1, end);
	const span = b - a;
	if (span < 2) return;
	const p0 = out[Math.max(0, a - 1)];
	const p1 = out[a];
	const p2 = out[b];
	const p3 = out[Math.min(out.length - 1, b + 1)];
	const m1 = (p2 - p0) / 2;
	const m2 = (p3 - p1) / 2;
	for (let i = a + 1; i < b; i++) {
		const t = (i - a) / span;
		const t2 = t * t;
		const t3 = t2 * t;
		out[i] =
			(2 * t3 - 3 * t2 + 1) * p1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2 + (t3 - t2) * m2;
	}
}

/** Every detected click redrawn from its neighbours. The input is not written. */
export function deClick(
	samples: Float32Array,
	opts: ClickOptions = {}
): { samples: Float32Array; mended: Region[] } {
	const mended = detectClicks(samples, opts);
	const out = Float32Array.from(samples);
	for (const r of mended) interpolateSpan(out, r.start, r.end);
	return { samples: out, mended };
}

// ── De-breath ───────────────────────────────────────────────────────────────

export interface BreathOptions {
	/** Loudest a breath may be, dBFS. */
	ceilingDb?: number;
	/** Quietest a breath may be, dBFS — below this is room silence. */
	floorDb?: number;
	/** A frame at or above this is a phrase, dBFS. */
	speechDb?: number;
	/** Zero crossings per second a breath at least reaches. */
	minZcr?: number;
	/** Shortest a breath runs, milliseconds. */
	minMs?: number;
	/** Longest a breath runs, milliseconds. */
	maxMs?: number;
	/** How far either side a phrase must sit for the run to count as between phrases, milliseconds. */
	reachMs?: number;
	/** The dip the person set, dB. Negative. */
	dipDb?: number;
	/** The dip's own fade at each edge, milliseconds. */
	rampMs?: number;
}

const BREATH_FRAME_MS = 20;
const BREATH_HOP_MS = 10;

/**
 * Low-level broadband runs sitting between phrases — the shape of a breath. A
 * run counts when it is quieter than speech, louder than silence, noisy by its
 * zero-crossing rate, of breath length, and has a phrase within reach.
 */
export function detectBreaths(
	samples: Float32Array,
	sampleRate: number,
	opts: BreathOptions = {}
): Region[] {
	if (!(sampleRate > 0) || samples.length === 0) return [];
	const ceilingDb = opts.ceilingDb ?? -28;
	const floorDb = opts.floorDb ?? -62;
	const speechDb = opts.speechDb ?? -22;
	const minZcr = opts.minZcr ?? 1800;
	const minMs = opts.minMs ?? 60;
	const maxMs = opts.maxMs ?? 900;
	const reachMs = opts.reachMs ?? 1200;

	const frame = Math.max(8, Math.round((BREATH_FRAME_MS / 1000) * sampleRate));
	const hop = Math.max(4, Math.round((BREATH_HOP_MS / 1000) * sampleRate));
	const count = samples.length >= frame ? Math.floor((samples.length - frame) / hop) + 1 : 0;
	if (count === 0) return [];

	const levelDb = new Float64Array(count);
	const zcr = new Float64Array(count);
	for (let f = 0; f < count; f++) {
		const p = f * hop;
		levelDb[f] = dbfs(rms(samples, p, p + frame));
		let crossings = 0;
		for (let i = p + 1; i < p + frame; i++) {
			if (samples[i] >= 0 !== samples[i - 1] >= 0) crossings++;
		}
		zcr[f] = (crossings * sampleRate) / frame;
	}

	const isBreath = (f: number) => levelDb[f] < ceilingDb && levelDb[f] > floorDb && zcr[f] >= minZcr;
	const reachFrames = Math.max(1, Math.round(reachMs / BREATH_HOP_MS));

	const out: Region[] = [];
	let f = 0;
	while (f < count) {
		if (!isBreath(f)) {
			f++;
			continue;
		}
		let g = f;
		while (g < count && isBreath(g)) g++;
		const start = f * hop;
		const end = Math.min(samples.length, (g - 1) * hop + frame);
		const ms = ((end - start) / sampleRate) * 1000;
		let nearPhrase = false;
		for (let k = Math.max(0, f - reachFrames); k < Math.min(count, g + reachFrames); k++) {
			if ((k < f || k >= g) && levelDb[k] >= speechDb) {
				nearPhrase = true;
				break;
			}
		}
		if (ms >= minMs && ms <= maxMs && nearPhrase) out.push({ start, end });
		f = g + 1;
	}
	return out;
}

/**
 * Every detected breath brought down by the dip the person set, faded in and
 * out at each edge. The input is not written.
 */
export function deBreath(
	samples: Float32Array,
	sampleRate: number,
	opts: BreathOptions = {}
): { samples: Float32Array; dipped: Region[] } {
	const dipped = detectBreaths(samples, sampleRate, opts);
	const dipDb = Math.min(0, opts.dipDb ?? -12);
	const gain = Math.pow(10, dipDb / 20);
	const ramp = Math.max(1, Math.round(((opts.rampMs ?? 8) / 1000) * sampleRate));
	const out = Float32Array.from(samples);
	for (const r of dipped) {
		const span = r.end - r.start;
		const edge = Math.min(ramp, Math.floor(span / 2));
		for (let i = 0; i < span; i++) {
			let t = 1;
			if (edge > 0) {
				if (i < edge) t = (i + 0.5) / edge;
				else if (i >= span - edge) t = (span - i - 0.5) / edge;
			}
			out[r.start + i] = samples[r.start + i] * (1 - t + t * gain);
		}
	}
	return { samples: out, dipped };
}

// ── The chain ───────────────────────────────────────────────────────────────

export type RepairStep =
	| { kind: 'noise'; region?: Region | null; amount: number; floor: number }
	| { kind: 'declick'; region?: Region | null; sensitivity: number; maxWidth: number }
	| { kind: 'debreath'; region?: Region | null; dipDb: number; ceilingDb: number; minZcr: number };

/** What one step did, for the room to say and for a proof to read. */
export interface StepReport {
	kind: RepairStep['kind'];
	/** Clicks mended or breaths dipped; noise reports none. */
	touched: number;
}

/**
 * Replay a chain of steps over one channel from its own samples. Nothing is
 * written in place, so dropping a step and calling again is the undo.
 */
export function applyChain(
	samples: Float32Array,
	sampleRate: number,
	steps: RepairStep[],
	profile: NoiseProfile | null
): { samples: Float32Array; reports: StepReport[] } {
	let current = Float32Array.from(samples);
	const reports: StepReport[] = [];
	for (const step of steps) {
		if (step.kind === 'noise') {
			if (profile) {
				current = applyInRegion(current, step.region, (slice) =>
					reduceNoise(slice, profile, { amount: step.amount, floor: step.floor })
				);
			}
			reports.push({ kind: 'noise', touched: 0 });
		} else if (step.kind === 'declick') {
			let mended = 0;
			current = applyInRegion(current, step.region, (slice) => {
				const done = deClick(slice, { sensitivity: step.sensitivity, maxWidth: step.maxWidth });
				mended = done.mended.length;
				return done.samples;
			});
			reports.push({ kind: 'declick', touched: mended });
		} else {
			let dipped = 0;
			current = applyInRegion(current, step.region, (slice) => {
				const done = deBreath(slice, sampleRate, {
					dipDb: step.dipDb,
					ceilingDb: step.ceilingDb,
					minZcr: step.minZcr
				});
				dipped = done.dipped.length;
				return done.samples;
			});
			reports.push({ kind: 'debreath', touched: dipped });
		}
	}
	return { samples: current, reports };
}

/** A step in the room's own words. */
export function stepWord(step: RepairStep): string {
	if (step.kind === 'noise') return `Noise ${step.amount.toFixed(1)}×`;
	if (step.kind === 'declick') return `De-click ${step.sensitivity.toFixed(0)}×`;
	return `De-breath ${step.dipDb.toFixed(0)} dB`;
}
