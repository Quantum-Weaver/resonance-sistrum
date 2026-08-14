// metronome.ts — time you can see, in the body.
//
// Phase 3 Wave 2 (2026-08-13, an **Opus** hand), the second movement:
// `the-metronome` consumed. The spring lives at
// `resonance-awen/tools/the-metronome` and IT WAS NOT EDITED.
//
// WHAT CROSSED. The three parts and their exact arithmetic: the pure beat
// clock any loop drives (and its re-anchoring `setBpm`, so a tempo change
// never makes the count jump backward under the player's feet), the tap tempo
// as the MEDIAN of the tapped phrase (a stumble does not yank the reading,
// and a gap over two seconds starts a fresh phrase rather than averaging
// across the silence), and the lookahead click scheduler booked on the AUDIO
// clock rather than the UI's.
//
// WHAT DIFFERS, and why — named so none of it reads as drift:
//
//   1. THE SPRING IS A LIBRARY WITH ITS OWN PACKAGE, TSCONFIG AND BUILD. A
//      `file:` dependency would make this app's build depend on a sibling
//      repo's build output, which awen's own first law argues against (a tool
//      is given away whole, and no tool imports another). Wave 1 met the same
//      fork with `the-waveform` and answered it the same way: the MATH
//      crosses, the packaging does not.
//
//   2. `startClicks` took its volume ONCE, at construction. In a room with a
//      volume slider that means tearing down and rebuilding the scheduler on
//      every drag — and rebuilding it re-anchors `nextTickTime`, so the pulse
//      would stutter every time a hand moved the slider. Here volume is read
//      live at each booking through a getter. THE LAW IT SERVES IS THE
//      SPRING'S OWN and it is strengthened rather than bent: "volume zero is
//      a chosen silence — the visual pulse still runs." Now that silence can
//      be chosen mid-phrase without the pulse missing a beat.
//
//   3. `subdivision` and `beatsPerBar` are read live for the same reason.
//
// THE LAWS, none of them softened:
//   · NEVER A BUZZER, at any tempo — a soft sine tap, gentle attack, round
//     decay. The Timer's chime law, inherited by the spring and kept here.
//   · THE DOWNBEAT SITS A FIFTH ABOVE the beat. It is a landmark, not an
//     alarm.
//   · VOLUME ZERO IS A CHOSEN SILENCE, and the visual pulse keeps running.
//     Silence is a choice about sound, never a choice to stop the clock.
//   · AUDIO UNLOCKS INSIDE THE USER'S OWN GESTURE — the WebView law. The
//     context is created on the press that starts the metronome, never on
//     mount, never on navigation.
//   · REDUCED MOTION IS THE CALLER'S TO HONOR, and the room honors it.

// ── The beat clock — pure; any loop drives it ────────────────────────────────

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
		// Re-anchor at the tempo change so the beat grid stays continuous —
		// the count never jumps backward under the player's feet.
		const s = startMs === null ? null : sample(nowMs);
		tempo = clampBpm(next);
		if (s !== null) {
			// Beats already counted stay counted: the anchor shifts so `beat`
			// continues from where it was, at the new tempo's spacing.
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

// ── Tap tempo — pure ─────────────────────────────────────────────────────────

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

// ── The click — Web Audio, lookahead-scheduled ───────────────────────────────
//
// Clicks are scheduled ahead on the AUDIO clock (ctx.currentTime), the
// standard cure for UI-thread jitter: a short interval wakes often and books
// every click due in the next lookahead window at its exact time. The click
// itself keeps the family's sound law — a soft sine tap, gentle attack,
// quick-but-round decay, the downbeat a fifth above the others. Never a
// buzzer, at any tempo.

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
	// Read live rather than frozen at construction (difference 2 in the header):
	// a slider must be able to move without rebuilding the scheduler, because
	// rebuilding it re-anchors the grid and the pulse would stutter.
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
