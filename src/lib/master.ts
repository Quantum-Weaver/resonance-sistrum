// master.ts — loudness to spec, true peak, and a look-ahead limiter as pure
// arithmetic over Float32Array. No DOM, no Web Audio, no disk: samples in,
// samples out, so the whole of it is provable in a node script
// (`.journals/proofs/`).
//
// Loudness is ITU-R BS.1770-4: K-weighting, 400 ms blocks at 75% overlap, the
// −70 LUFS absolute gate and the −10 LU relative gate. True peak is the
// standard's 4x oversampling, here through a Kaiser-windowed sinc polyphase
// bank derived in code. Nothing here writes its input — every function returns
// new arrays, so a master is a new buffer and the take on the shelf is never
// touched.

/** A direct-form biquad: y = b0·x + b1·x1 + b2·x2 − a1·y1 − a2·y2. */
export interface Biquad {
	b0: number;
	b1: number;
	b2: number;
	a1: number;
	a2: number;
}

/** BS.1770-4's absolute gate, in LUFS. Blocks quieter than this never count. */
export const ABSOLUTE_GATE_LUFS = -70;

/** BS.1770-4's relative gate, in LU below the ungated mean of the loud blocks. */
export const RELATIVE_GATE_LU = -10;

/** The standard's calibration offset, added to every loudness figure. */
const LOUDNESS_OFFSET = -0.691;

/** The momentary window, in seconds — BS.1770-4's own block length. */
export const BLOCK_SECS = 0.4;

/** The short-term window, in seconds — EBU Tech 3341's own. */
export const SHORT_TERM_SECS = 3;

/** 75% overlap: a block every 100 ms. */
export const STEP_SECS = 0.1;

const EPS = 1e-30;

/**
 * The two K-weighting stages at a rate: a high-shelf pre-filter and the RLB
 * high-pass, both derived from the analogue prototypes so any rate is served.
 * At 48 kHz these reproduce BS.1770-4 Tables 1 and 2 to fourteen digits.
 */
export function kWeightingCoefficients(rate: number): [Biquad, Biquad] {
	const fs = Math.max(1, rate);

	const shelfF0 = 1681.974450955533;
	const shelfGain = 3.999843853973347;
	const shelfQ = 0.7071752369554196;
	let k = Math.tan((Math.PI * shelfF0) / fs);
	const vh = Math.pow(10, shelfGain / 20);
	const vb = Math.pow(vh, 0.4996667741545416);
	const denom = 1 + k / shelfQ + k * k;
	const pre: Biquad = {
		b0: (vh + (vb * k) / shelfQ + k * k) / denom,
		b1: (2 * (k * k - vh)) / denom,
		b2: (vh - (vb * k) / shelfQ + k * k) / denom,
		a1: (2 * (k * k - 1)) / denom,
		a2: (1 - k / shelfQ + k * k) / denom
	};

	const hpF0 = 38.13547087602444;
	const hpQ = 0.5003270373238773;
	k = Math.tan((Math.PI * hpF0) / fs);
	const hpDenom = 1 + k / hpQ + k * k;
	const rlb: Biquad = {
		b0: 1,
		b1: -2,
		b2: 1,
		a1: (2 * (k * k - 1)) / hpDenom,
		a2: (1 - k / hpQ + k * k) / hpDenom
	};

	return [pre, rlb];
}

/** One channel K-weighted into a new array. */
export function kWeight(channel: Float32Array, rate: number): Float32Array {
	const [pre, rlb] = kWeightingCoefficients(rate);
	const out = new Float32Array(channel.length);
	let x1 = 0;
	let x2 = 0;
	let y1 = 0;
	let y2 = 0;
	let u1 = 0;
	let u2 = 0;
	let v1 = 0;
	let v2 = 0;
	for (let n = 0; n < channel.length; n++) {
		const x = channel[n];
		const y = pre.b0 * x + pre.b1 * x1 + pre.b2 * x2 - pre.a1 * y1 - pre.a2 * y2;
		x2 = x1;
		x1 = x;
		y2 = y1;
		y1 = y;
		const v = rlb.b0 * y + rlb.b1 * u1 + rlb.b2 * u2 - rlb.a1 * v1 - rlb.a2 * v2;
		u2 = u1;
		u1 = y;
		v2 = v1;
		v1 = v;
		out[n] = v;
	}
	return out;
}

/**
 * BS.1770-4's channel weights: front channels at 1.0, the two surround
 * channels at 1.41; a six-channel layout's LFE (index 3) is left out at 0.
 * Mono and stereo are all 1.0.
 */
export function channelWeights(count: number): number[] {
	const w: number[] = new Array(Math.max(0, count)).fill(1);
	if (count === 5) {
		w[3] = 1.41;
		w[4] = 1.41;
	} else if (count === 6) {
		w[3] = 0;
		w[4] = 1.41;
		w[5] = 1.41;
	}
	return w;
}

/** The K-weighted energy of one channel, summed per 100 ms step. */
function stepEnergies(channel: Float32Array, rate: number, stepSamples: number): Float64Array {
	const [pre, rlb] = kWeightingCoefficients(rate);
	const steps = Math.floor(channel.length / stepSamples);
	const out = new Float64Array(Math.max(0, steps));
	let x1 = 0;
	let x2 = 0;
	let y1 = 0;
	let y2 = 0;
	let u1 = 0;
	let u2 = 0;
	let v1 = 0;
	let v2 = 0;
	for (let s = 0; s < steps; s++) {
		let acc = 0;
		const end = (s + 1) * stepSamples;
		for (let n = s * stepSamples; n < end; n++) {
			const x = channel[n];
			const y = pre.b0 * x + pre.b1 * x1 + pre.b2 * x2 - pre.a1 * y1 - pre.a2 * y2;
			x2 = x1;
			x1 = x;
			y2 = y1;
			y1 = y;
			const v = rlb.b0 * y + rlb.b1 * u1 + rlb.b2 * u2 - rlb.a1 * v1 - rlb.a2 * v2;
			u2 = u1;
			u1 = y;
			v2 = v1;
			v1 = v;
			acc += v * v;
		}
		out[s] = acc;
	}
	return out;
}

/** A block's mean square per channel, from the step energies it spans. */
function blockMeanSquares(
	steps: Float64Array[],
	from: number,
	span: number,
	blockSamples: number
): number[] {
	const out: number[] = [];
	for (const channel of steps) {
		let acc = 0;
		for (let i = from; i < from + span; i++) acc += channel[i];
		out.push(acc / blockSamples);
	}
	return out;
}

/** The weighted sum of a block's mean squares, as a loudness in LUFS. */
function loudnessOf(meanSquares: number[], weights: number[]): number {
	let sum = 0;
	for (let c = 0; c < meanSquares.length; c++) sum += weights[c] * meanSquares[c];
	if (sum <= EPS) return -Infinity;
	return LOUDNESS_OFFSET + 10 * Math.log10(sum);
}

export interface LoudnessReport {
	/** Integrated loudness, LUFS. `-Infinity` when no block passes the gates. */
	integratedLufs: number;
	/** The loudest 400 ms window, LUFS. */
	momentaryMaxLufs: number;
	/** The loudest 3 s window, LUFS. */
	shortTermMaxLufs: number;
	/** How many 400 ms blocks were measured. */
	blocks: number;
	/** How many survived both gates. */
	gatedBlocks: number;
	/** The relative gate that was actually applied, LUFS. */
	relativeGateLufs: number;
}

/**
 * Integrated loudness per BS.1770-4, with the momentary and short-term maxima
 * taken from the same step energies — both come free once the blocks are summed.
 */
export function measureLoudness(channels: Float32Array[], rate: number): LoudnessReport {
	const empty: LoudnessReport = {
		integratedLufs: -Infinity,
		momentaryMaxLufs: -Infinity,
		shortTermMaxLufs: -Infinity,
		blocks: 0,
		gatedBlocks: 0,
		relativeGateLufs: -Infinity
	};
	if (channels.length === 0 || rate <= 0) return empty;

	const stepSamples = Math.max(1, Math.round(rate * STEP_SECS));
	const blockSpan = Math.max(1, Math.round(BLOCK_SECS / STEP_SECS));
	const shortSpan = Math.max(1, Math.round(SHORT_TERM_SECS / STEP_SECS));
	const blockSamples = stepSamples * blockSpan;
	const shortSamples = stepSamples * shortSpan;

	const steps = channels.map((c) => stepEnergies(c, rate, stepSamples));
	const stepCount = steps.length > 0 ? steps[0].length : 0;
	if (stepCount < blockSpan) return empty;

	const weights = channelWeights(channels.length);
	const blockCount = stepCount - blockSpan + 1;

	// Every 400 ms block: its loudness, and its per-channel mean squares kept
	// for the two gated means the standard asks for.
	const blockLoudness = new Float64Array(blockCount);
	const blockSquares: number[][] = [];
	let momentaryMax = -Infinity;
	for (let j = 0; j < blockCount; j++) {
		const ms = blockMeanSquares(steps, j, blockSpan, blockSamples);
		const l = loudnessOf(ms, weights);
		blockLoudness[j] = l;
		blockSquares.push(ms);
		if (l > momentaryMax) momentaryMax = l;
	}

	let shortTermMax = -Infinity;
	if (stepCount >= shortSpan) {
		for (let j = 0; j + shortSpan <= stepCount; j++) {
			const l = loudnessOf(blockMeanSquares(steps, j, shortSpan, shortSamples), weights);
			if (l > shortTermMax) shortTermMax = l;
		}
	}

	// The absolute gate, then the relative gate drawn from what survived it.
	const aboveAbsolute: number[] = [];
	for (let j = 0; j < blockCount; j++) {
		if (blockLoudness[j] > ABSOLUTE_GATE_LUFS) aboveAbsolute.push(j);
	}
	if (aboveAbsolute.length === 0) {
		return {
			...empty,
			blocks: blockCount,
			momentaryMaxLufs: momentaryMax,
			shortTermMaxLufs: shortTermMax
		};
	}

	const meanOver = (indices: number[]): number[] => {
		const mean: number[] = new Array(channels.length).fill(0);
		for (const j of indices) {
			for (let c = 0; c < channels.length; c++) mean[c] += blockSquares[j][c];
		}
		for (let c = 0; c < channels.length; c++) mean[c] /= indices.length;
		return mean;
	};

	const relativeGate = loudnessOf(meanOver(aboveAbsolute), weights) + RELATIVE_GATE_LU;
	const gated = aboveAbsolute.filter((j) => blockLoudness[j] > relativeGate);
	if (gated.length === 0) {
		return {
			integratedLufs: -Infinity,
			momentaryMaxLufs: momentaryMax,
			shortTermMaxLufs: shortTermMax,
			blocks: blockCount,
			gatedBlocks: 0,
			relativeGateLufs: relativeGate
		};
	}

	return {
		integratedLufs: loudnessOf(meanOver(gated), weights),
		momentaryMaxLufs: momentaryMax,
		shortTermMaxLufs: shortTermMax,
		blocks: blockCount,
		gatedBlocks: gated.length,
		relativeGateLufs: relativeGate
	};
}

// ── True peak (BS.1770-4 Annex 2) ───────────────────────────────────────────
//
// The signal is reconstructed at 4x the sample rate and the loudest point of
// the reconstruction is the true peak. The filter is a Kaiser-windowed sinc
// polyphase bank derived here rather than tabulated: 12 taps per phase, 48
// taps at 4x, the size the standard's own table carries.

/** The oversampling factor every true-peak figure in this module is measured at. */
export const OVERSAMPLE = 4;

const KERNEL_HALF = 6;
const KERNEL_BETA = 8;

const sinc = (x: number) => (Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

function bessel0(x: number): number {
	let sum = 1;
	let term = 1;
	for (let i = 1; i < 30; i++) {
		term *= (x / 2 / i) ** 2;
		sum += term;
	}
	return sum;
}

export interface PolyphaseBank {
	factor: number;
	half: number;
	/** One kernel per fractional phase; phase 0 is the sample itself. */
	phases: Float64Array[];
	/** The largest sum of |h| across the phases — the bound on what interpolation can add. */
	l1: number;
}

/** The interpolator bank for a factor, each phase normalised to unity at DC. */
export function polyphaseBank(factor: number = OVERSAMPLE): PolyphaseBank {
	const half = KERNEL_HALF;
	const phases: Float64Array[] = [];
	let l1 = 0;
	for (let p = 0; p < factor; p++) {
		const taps = new Float64Array(2 * half);
		let sum = 0;
		for (let k = 0; k < 2 * half; k++) {
			const t = k - half + 1 - p / factor;
			const r = t / half;
			const w = bessel0(KERNEL_BETA * Math.sqrt(Math.max(0, 1 - r * r))) / bessel0(KERNEL_BETA);
			const v = sinc(t) * w;
			taps[k] = v;
			sum += v;
		}
		let abs = 0;
		for (let k = 0; k < 2 * half; k++) {
			taps[k] /= sum;
			abs += Math.abs(taps[k]);
		}
		if (abs > l1) l1 = abs;
		phases.push(taps);
	}
	return { factor, half, phases, l1 };
}

const BANK = polyphaseBank();

/**
 * The reconstructed magnitude at and just after every sample: `env[n]` is the
 * loudest the signal gets between sample n and sample n+1, across all channels.
 *
 * The interpolator runs only where a sample within a kernel's reach exceeds
 * `floor` divided by the kernel's sum of |h| — below that the reconstruction
 * provably cannot reach `floor`, so the sample magnitude is the answer and the
 * work is skipped.
 */
export function truePeakEnvelope(
	channels: Float32Array[],
	floor: number,
	bank: PolyphaseBank = BANK
): Float32Array {
	const frames = channels.length > 0 ? channels[0].length : 0;
	const env = new Float32Array(frames);
	if (frames === 0) return env;

	for (let n = 0; n < frames; n++) {
		let m = 0;
		for (const c of channels) {
			const v = Math.abs(c[n] ?? 0);
			if (v > m) m = v;
		}
		env[n] = m;
	}

	const threshold = Math.max(0, floor) / Math.max(1e-9, bank.l1);
	const reach = bank.half;
	const sampleMax = Float32Array.from(env);
	for (let n = 0; n < frames; n++) {
		let near = false;
		const from = Math.max(0, n - reach + 1);
		const to = Math.min(frames - 1, n + reach);
		for (let i = from; i <= to; i++) {
			if (sampleMax[i] >= threshold) {
				near = true;
				break;
			}
		}
		if (!near) continue;
		let m = env[n];
		for (let p = 1; p < bank.factor; p++) {
			const taps = bank.phases[p];
			for (const c of channels) {
				let acc = 0;
				for (let k = 0; k < 2 * reach; k++) {
					const i = n + k - reach + 1;
					if (i >= 0 && i < frames) acc += c[i] * taps[k];
				}
				const v = Math.abs(acc);
				if (v > m) m = v;
			}
		}
		env[n] = m;
	}
	return env;
}

/** The loudest sample magnitude across the channels, linear. */
export function samplePeak(channels: Float32Array[]): number {
	let peak = 0;
	for (const c of channels) {
		for (let n = 0; n < c.length; n++) {
			const v = Math.abs(c[n]);
			if (v > peak) peak = v;
		}
	}
	return peak;
}

export const toDb = (linear: number) => (linear <= 0 ? -Infinity : 20 * Math.log10(linear));
export const fromDb = (db: number) => (db === -Infinity ? 0 : Math.pow(10, db / 20));

/** True peak in dBTP, measured at 4x per BS.1770-4 Annex 2. */
export function truePeakDbtp(channels: Float32Array[]): number {
	const peak = samplePeak(channels);
	if (peak <= 0) return -Infinity;
	const env = truePeakEnvelope(channels, peak);
	let top = peak;
	for (let n = 0; n < env.length; n++) if (env[n] > top) top = env[n];
	return toDb(top);
}

// ── The look-ahead limiter ──────────────────────────────────────────────────

export interface LimiterOptions {
	/** The ceiling the person sets, in dBTP. */
	ceilingDbtp?: number;
	/** How far ahead the gain begins to move, in milliseconds. */
	lookaheadMs?: number;
	/** How long the gain takes to climb back, in milliseconds. */
	releaseMs?: number;
}

export const DEFAULT_CEILING_DBTP = -1;
export const DEFAULT_LOOKAHEAD_MS = 5;
export const DEFAULT_RELEASE_MS = 120;

export interface LimiterResult {
	channels: Float32Array[];
	/** The deepest the gain went, in dB — 0 when nothing was held back. */
	gainReductionDb: number;
	/** True peak after limiting, dBTP. */
	truePeakDbtp: number;
	/** A last static trim applied because the reconstruction still ran over, in dB. */
	trimDb: number;
}

/** A running minimum over a centred window, one pass with a monotone deque. */
function slidingMin(values: Float64Array, half: number): Float64Array {
	const n = values.length;
	const out = new Float64Array(n);
	if (n === 0) return out;
	const deque = new Int32Array(n);
	let head = 0;
	let tail = 0;
	let next = 0;
	for (let i = 0; i < n; i++) {
		const limit = Math.min(n - 1, i + half);
		while (next <= limit) {
			while (tail > head && values[deque[tail - 1]] >= values[next]) tail--;
			deque[tail++] = next;
			next++;
		}
		while (deque[head] < i - half) head++;
		out[i] = values[deque[head]];
	}
	return out;
}

/** A centred moving average, one pass over a prefix sum. */
function movingMean(values: Float64Array, half: number): Float64Array {
	const n = values.length;
	const sums = new Float64Array(n + 1);
	for (let i = 0; i < n; i++) sums[i + 1] = sums[i] + values[i];
	const out = new Float64Array(n);
	for (let i = 0; i < n; i++) {
		const from = Math.max(0, i - half);
		const to = Math.min(n - 1, i + half);
		out[i] = (sums[to + 1] - sums[from]) / (to - from + 1);
	}
	return out;
}

/**
 * Hold the reconstructed signal under a ceiling. The gain a sample is given is
 * the smallest gain wanted anywhere within the look-ahead of it, averaged over
 * the same span — so the gain is already down when the peak arrives and no
 * sample is ever scaled above what its own peak allows.
 */
export function limit(
	channels: Float32Array[],
	rate: number,
	options: LimiterOptions = {}
): LimiterResult {
	const ceilingDb = options.ceilingDbtp ?? DEFAULT_CEILING_DBTP;
	const ceiling = fromDb(ceilingDb);
	const frames = channels.length > 0 ? channels[0].length : 0;
	const out = channels.map((c) => Float32Array.from(c));
	if (frames === 0) {
		return { channels: out, gainReductionDb: 0, truePeakDbtp: -Infinity, trimDb: 0 };
	}

	const look = Math.max(
		1,
		Math.round((rate * (options.lookaheadMs ?? DEFAULT_LOOKAHEAD_MS)) / 1000)
	);
	const releaseSamples = Math.max(
		1,
		Math.round((rate * (options.releaseMs ?? DEFAULT_RELEASE_MS)) / 1000)
	);
	const releaseCoef = Math.exp(-1 / releaseSamples);

	const env = truePeakEnvelope(channels, ceiling);

	// What each sample needs, then a release that only ever lets the gain climb
	// slowly — never above what the sample itself asked for.
	const wanted = new Float64Array(frames);
	let held = 1;
	for (let n = 0; n < frames; n++) {
		const need = env[n] > ceiling ? ceiling / env[n] : 1;
		held = Math.min(need, held * releaseCoef + (1 - releaseCoef));
		wanted[n] = held;
	}

	const gain = movingMean(slidingMin(wanted, look), look);

	let deepest = 1;
	for (let n = 0; n < frames; n++) {
		const g = gain[n];
		if (g < deepest) deepest = g;
		for (const c of out) c[n] = c[n] * g;
	}

	// The reconstruction of a gained signal is not the gained reconstruction, so
	// the result is measured and trimmed if it still sits over the ceiling.
	let after = truePeakDbtp(out);
	let trimDb = 0;
	if (after > ceilingDb) {
		trimDb = ceilingDb - after;
		const trim = fromDb(trimDb);
		for (const c of out) for (let n = 0; n < frames; n++) c[n] = c[n] * trim;
		after = truePeakDbtp(out);
	}

	return {
		channels: out,
		gainReductionDb: deepest >= 1 ? 0 : -toDb(deepest),
		truePeakDbtp: after,
		trimDb
	};
}

// ── The master step ─────────────────────────────────────────────────────────

export interface MasterOptions extends LimiterOptions {
	/** The integrated loudness aimed at, in LUFS. */
	targetLufs?: number;
}

/** Spoken word's own target. −14 and −23 are the other two a person may set. */
export const DEFAULT_TARGET_LUFS = -16;

/** The targets the room offers, each with what it is for. */
export const TARGETS: { lufs: number; word: string }[] = [
	{ lufs: -14, word: 'streaming music' },
	{ lufs: -16, word: 'spoken word' },
	{ lufs: -23, word: 'broadcast (EBU R 128)' }
];

export interface MasterMeasure {
	integratedLufs: number;
	momentaryMaxLufs: number;
	shortTermMaxLufs: number;
	truePeakDbtp: number;
	samplePeakDbfs: number;
}

export interface MasterReport {
	before: MasterMeasure;
	after: MasterMeasure;
	targetLufs: number;
	ceilingDbtp: number;
	/** The gain applied to reach the target, in dB. */
	gainDb: number;
	/** The deepest the limiter held the signal back, in dB. */
	gainReductionDb: number;
	/** A last static trim the limiter needed, in dB. */
	trimDb: number;
}

export function measure(channels: Float32Array[], rate: number): MasterMeasure {
	const loudness = measureLoudness(channels, rate);
	return {
		integratedLufs: loudness.integratedLufs,
		momentaryMaxLufs: loudness.momentaryMaxLufs,
		shortTermMaxLufs: loudness.shortTermMaxLufs,
		truePeakDbtp: truePeakDbtp(channels),
		samplePeakDbfs: toDb(samplePeak(channels))
	};
}

/**
 * Gain to the target loudness, then hold the result under the ceiling. The
 * input is never written: the channels that come back are new arrays.
 */
export function master(
	channels: Float32Array[],
	rate: number,
	options: MasterOptions = {}
): { channels: Float32Array[]; report: MasterReport } {
	const targetLufs = options.targetLufs ?? DEFAULT_TARGET_LUFS;
	const ceilingDbtp = options.ceilingDbtp ?? DEFAULT_CEILING_DBTP;
	const before = measure(channels, rate);

	const gainDb = Number.isFinite(before.integratedLufs) ? targetLufs - before.integratedLufs : 0;
	const gain = fromDb(gainDb);
	const gained = channels.map((c) => {
		const next = new Float32Array(c.length);
		for (let n = 0; n < c.length; n++) next[n] = c[n] * gain;
		return next;
	});

	const limited = limit(gained, rate, { ...options, ceilingDbtp });
	return {
		channels: limited.channels,
		report: {
			before,
			after: measure(limited.channels, rate),
			targetLufs,
			ceilingDbtp,
			gainDb,
			gainReductionDb: limited.gainReductionDb,
			trimDb: limited.trimDb
		}
	};
}
