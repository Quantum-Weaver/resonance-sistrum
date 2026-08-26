// Volume, subdivision and beatsPerBar are read live at each booking — taking them once at construction forces a scheduler rebuild, which re-anchors the grid and stutters the pulse.
// The audio context is created inside the user's own gesture (the WebView unlock law), never on mount.


export interface BeatSample {
	/** Beat index since start, 0-based. */
	beat: number;
	/** Bar index since start, 0-based. */
	bar: number;
	/** This beat's position in its bar, 0-based (0 = the downbeat). */
	beatInBar: number;
	/** Progress through the current beat, 0..1 — the visual pulse rides this. */
	phase: number;
	/** True on the bar's first beat. */
	isDownbeat: boolean;
}

export function createBeatClock(bpm: number, beatsPerBar = 4) {
	let tempo = clampBpm(bpm);
	let startMs: number | null = null;

	function sample(nowMs: number): BeatSample {
		if (startMs === null) startMs = nowMs;
		const beatMs = 60_000 / tempo;
		const elapsed = Math.max(0, nowMs - startMs);
		const beatFloat = elapsed / beatMs;
		const beat = Math.floor(beatFloat);
		const beatInBar = beat % beatsPerBar;
		return {
			beat,
			bar: Math.floor(beat / beatsPerBar),
			beatInBar,
			phase: beatFloat - beat,
			isDownbeat: beatInBar === 0
		};
	}

	function setBpm(nowMs: number, next: number) {
		// Re-anchor at the tempo change so the beat grid stays continuous.
		const s = startMs === null ? null : sample(nowMs);
		tempo = clampBpm(next);
		if (s !== null) {
			startMs = nowMs - (s.beat + s.phase) * (60_000 / tempo);
		}
	}

	function reset() {
		startMs = null;
	}

	return {
		get bpm() {
			return tempo;
		},
		sample,
		setBpm,
		reset
	};
}

export function clampBpm(bpm: number): number {
	return Math.min(300, Math.max(20, bpm));
}


/**
 * Tap along; the tempo emerges. Uses the median of the recent intervals so
 * one stumbled tap doesn't yank the reading. A long silence (> 2s) starts a
 * fresh phrase rather than averaging across the gap.
 */
export function createTapTempo(window = 5) {
	let taps: number[] = [];

	function tap(nowMs: number): number | null {
		if (taps.length > 0 && nowMs - taps[taps.length - 1] > 2000) {
			taps = [];
		}
		taps.push(nowMs);
		if (taps.length > window) taps = taps.slice(-window);
		if (taps.length < 2) return null;
		const intervals: number[] = [];
		for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i - 1]);
		intervals.sort((a, b) => a - b);
		const mid = Math.floor(intervals.length / 2);
		const median =
			intervals.length % 2 === 1 ? intervals[mid] : (intervals[mid - 1] + intervals[mid]) / 2;
		return clampBpm(60_000 / median);
	}

	function reset() {
		taps = [];
	}

	/** How many taps are in the phrase so far — the room says so plainly. */
	function count(): number {
		return taps.length;
	}

	return { tap, reset, count };
}

// Clicks are scheduled ahead on the AUDIO clock (ctx.currentTime), the cure for UI-thread jitter.

export interface ClickOptions {
	bpm: number;
	beatsPerBar?: number;
	/** 1 = quarters only; 2 = eighths; 3 = triplets; 4 = sixteenths. Subdivision taps are quieter. */
	subdivision?: 1 | 2 | 3 | 4;
	/** 0..1 — and zero is a chosen silence. */
	volume?: number;
	/** Downbeat / beat / subdivision frequencies, Hz. */
	freqs?: { downbeat: number; beat: number; sub: number };
	/** Called on the UI side just after each beat is booked — drive visuals here. */
	onBeat?: (beat: BeatSample) => void;
}

export function startClicks(ctx: AudioContext, options: ClickOptions) {
	let bpm = clampBpm(options.bpm);
	let beatsPerBar = options.beatsPerBar ?? 4;
	let subdivision: 1 | 2 | 3 | 4 = options.subdivision ?? 1;
	let volume = Math.min(1, Math.max(0, options.volume ?? 0.8));
	const freqs = options.freqs ?? { downbeat: 1318.5, beat: 880, sub: 660 };

	const LOOKAHEAD_S = 0.12; // book everything due in the next 120ms
	const WAKE_MS = 40; // wake often enough that the window never starves

	let nextTickTime = ctx.currentTime + 0.05;
	let tickIndex = 0; // counts subdivisions
	let stopped = false;

	function bookClick(at: number, tick: number) {
		if (volume <= 0) return; // chosen silence — the visual pulse still runs
		const ticksPerBeat = subdivision;
		const isBeat = tick % ticksPerBeat === 0;
		const beatIndex = Math.floor(tick / ticksPerBeat);
		const isDownbeat = isBeat && beatIndex % beatsPerBar === 0;
		const freq = isDownbeat ? freqs.downbeat : isBeat ? freqs.beat : freqs.sub;
		const peak = (isDownbeat ? 0.22 : isBeat ? 0.16 : 0.09) * volume;

		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = freq;
		gain.gain.setValueAtTime(0, at);
		gain.gain.linearRampToValueAtTime(peak, at + 0.004); // gentle attack
		gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.09); // round decay — never a buzzer
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(at);
		osc.stop(at + 0.12);
	}

	const interval = setInterval(() => {
		if (stopped) return;
		const tickDur = 60 / bpm / subdivision;
		while (nextTickTime < ctx.currentTime + LOOKAHEAD_S) {
			bookClick(nextTickTime, tickIndex);
			if (options.onBeat && tickIndex % subdivision === 0) {
				const beat = Math.floor(tickIndex / subdivision);
				options.onBeat({
					beat,
					bar: Math.floor(beat / beatsPerBar),
					beatInBar: beat % beatsPerBar,
					phase: 0,
					isDownbeat: beat % beatsPerBar === 0
				});
			}
			nextTickTime += tickDur;
			tickIndex += 1;
		}
	}, WAKE_MS);

	return {
		setBpm(next: number) {
			bpm = clampBpm(next);
		},
		setBeatsPerBar(next: number) {
			beatsPerBar = Math.max(1, Math.round(next));
		},
		setSubdivision(next: 1 | 2 | 3 | 4) {
			subdivision = next;
		},
		/** Zero is a chosen silence, and it is honored immediately — the next
		 *  booking simply books nothing. The pulse is not this function's
		 *  business and it keeps running. */
		setVolume(next: number) {
			volume = Math.min(1, Math.max(0, next));
		},
		stop() {
			stopped = true;
			clearInterval(interval);
		}
	};
}
