import { browser } from '$app/environment';
import {
	clampBpm,
	createBeatClock,
	createTapTempo,
	startClicks,
	type BeatSample
} from '$lib/metronome';

// The metronome room's store — Phase 3 Wave 2 (2026-08-13, an **Opus** hand).
// `the-metronome` consumed: the beat clock, the tap tempo and the lookahead
// click scheduler all live in `$lib/metronome.ts`; this store is the room's
// running state and the vessel's kept choices.
//
// THE TWO CLOCKS, and why there are two. The CLICK is booked on the audio
// clock (`ctx.currentTime`) — that is the spring's whole point, and it is why
// a click never drifts with a busy UI thread. The PULSE is sampled from the
// beat clock on animation frames, because a visual is a visual. They are
// anchored together at start and they agree; if a frame is late the pulse is
// late and the sound is not, which is the correct way round.
//
// SILENCE IS A CHOICE WITH THE PULSE STILL RUNNING. Volume zero books no
// sound and stops nothing else: the beat count keeps counting, the pulse keeps
// pulsing, the bar keeps turning. This is the spring's own law and it is the
// one thing in this file that must never be "fixed".
//
// NO URGENCY ANYWHERE. There is no countdown, no "get ready", no flashing at
// tempo, no red. A metronome states the time; it does not chase anybody
// through it.

const BPM_KEY = 'resonance-sistrum-metronome-bpm';
const BAR_KEY = 'resonance-sistrum-metronome-beats-per-bar';
const SUB_KEY = 'resonance-sistrum-metronome-subdivision';
const VOL_KEY = 'resonance-sistrum-metronome-volume';

export type Subdivision = 1 | 2 | 3 | 4;

export const SUBDIVISIONS: { value: Subdivision; label: string }[] = [
	{ value: 1, label: 'Quarters' },
	{ value: 2, label: 'Eighths' },
	{ value: 3, label: 'Triplets' },
	{ value: 4, label: 'Sixteenths' }
];

const DEFAULT_BPM = 100;
const DEFAULT_VOLUME = 0.7;

let bpm = $state(DEFAULT_BPM);
let beatsPerBar = $state(4);
let subdivision = $state<Subdivision>(1);
let volume = $state(DEFAULT_VOLUME);

let running = $state(false);
let beat = $state(0);
let bar = $state(0);
let beatInBar = $state(0);
/** 0..1 through the current beat — the pulse rides this. */
let phase = $state(0);
let tapReading = $state<number | null>(null);
let tapCount = $state(0);
let error = $state<string | null>(null);

// Non-reactive machinery: an AudioContext in a rune is a rune nobody reads.
let ctx: AudioContext | null = null;
let clicks: ReturnType<typeof startClicks> | null = null;
let clock: ReturnType<typeof createBeatClock> | null = null;
let frame: number | null = null;
const tapper = createTapTempo();

const reducedMotion = () =>
	browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function stopFollowing() {
	if (frame !== null) cancelAnimationFrame(frame);
	frame = null;
}

// ONE WRITER PER FACT, which is the whole reason this loop is so short.
//
// The COUNT (beat · bar · beatInBar) comes from the scheduler's `onBeat` and
// from nowhere else: the click is booked on the audio clock, so the sound is
// what decides which beat it is, and the picture should follow the sound
// rather than run a second opinion beside it. The frame loop supplies ONLY
// the phase, which is a smoothness, not a fact.
//
// It matters more than it looks. When both wrote the count, changing the bar
// length mid-run left the beat clock and the scheduler disagreeing about which
// beat was current, and the number under the pulse flickered between two
// answers. With one writer there is nothing to disagree.
//
// With reduced motion there is no frame loop at all — the count still
// advances, because its writer is the scheduler. Reduced motion removes the
// MOTION, never the information.
function startFollowing() {
	if (!browser || reducedMotion()) return;
	stopFollowing();
	const tick = () => {
		if (clock) phase = clock.sample(performance.now()).phase;
		frame = requestAnimationFrame(tick);
	};
	frame = requestAnimationFrame(tick);
}

/**
 * Start the pulse. AUDIO UNLOCKS INSIDE THE USER'S OWN GESTURE — the
 * AudioContext is created here, on the press, and never on mount. A context
 * made outside a gesture starts suspended and the room would look like it was
 * running while making no sound at all.
 */
async function start() {
	if (!browser || running) return;
	error = null;
	try {
		if (!ctx) ctx = new AudioContext();
		// A context that was suspended (tab hidden, an earlier stop) resumes
		// inside this same gesture.
		if (ctx.state === 'suspended') await ctx.resume();

		clock = createBeatClock(bpm, beatsPerBar);
		clock.reset();
		beat = 0;
		bar = 0;
		beatInBar = 0;
		phase = 0;

		clicks = startClicks(ctx, {
			bpm,
			beatsPerBar,
			subdivision,
			volume,
			onBeat: (s: BeatSample) => {
				// THE ONLY WRITER OF THE COUNT. See startFollowing above.
				beat = s.beat;
				bar = s.bar;
				beatInBar = s.beatInBar;
			}
		});
		running = true;
		startFollowing();
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		running = false;
	}
}

/** Stop the pulse. The context stays alive for the next press — building one
 *  per start is how a room ends up with a dozen of them. */
function stop() {
	clicks?.stop();
	clicks = null;
	clock = null;
	stopFollowing();
	running = false;
	phase = 0;
}

function toggle() {
	if (running) stop();
	else void start();
}

function setBpm(next: number) {
	bpm = clampBpm(next);
	// Re-anchored rather than restarted: the count continues at the new
	// spacing instead of jumping backward under the player's feet.
	if (clock) clock.setBpm(performance.now(), bpm);
	clicks?.setBpm(bpm);
	if (browser) localStorage.setItem(BPM_KEY, String(bpm));
}

function setBeatsPerBar(next: number) {
	beatsPerBar = Math.min(12, Math.max(1, Math.round(next)));
	// Only the scheduler is told: it owns the count, and the beat clock here
	// is only asked for phase, which the bar's length does not touch. The
	// pulse does not stutter and the tempo does not move — changing how you
	// are counting should not interrupt what you are playing.
	clicks?.setBeatsPerBar(beatsPerBar);
	if (browser) localStorage.setItem(BAR_KEY, String(beatsPerBar));
}

function setSubdivision(next: Subdivision) {
	subdivision = next;
	clicks?.setSubdivision(next);
	if (browser) localStorage.setItem(SUB_KEY, String(next));
}

/** Zero is a chosen silence: no sound is booked, and everything else keeps
 *  running. The choice persists, because a choice is kept. */
function setVolume(next: number) {
	volume = Math.min(1, Math.max(0, next));
	clicks?.setVolume(volume);
	if (browser) localStorage.setItem(VOL_KEY, String(volume));
}

/** Tap the tempo. The median of the phrase, so one stumble does not yank the
 *  reading — and a gap over two seconds starts a fresh phrase rather than
 *  averaging across the silence. */
function tap() {
	const reading = tapper.tap(performance.now());
	tapCount = tapper.count();
	if (reading !== null) {
		tapReading = reading;
		setBpm(reading);
	}
}

function resetTap() {
	tapper.reset();
	tapReading = null;
	tapCount = 0;
}

function load() {
	if (!browser) return;
	const savedBpm = Number(localStorage.getItem(BPM_KEY));
	if (Number.isFinite(savedBpm) && savedBpm > 0) bpm = clampBpm(savedBpm);
	const savedBar = Number(localStorage.getItem(BAR_KEY));
	if (Number.isFinite(savedBar) && savedBar >= 1) beatsPerBar = Math.min(12, Math.round(savedBar));
	const savedSub = Number(localStorage.getItem(SUB_KEY));
	if (savedSub === 1 || savedSub === 2 || savedSub === 3 || savedSub === 4) subdivision = savedSub;
	const savedVol = Number(localStorage.getItem(VOL_KEY));
	// Zero is a real saved value and must survive the load — `savedVol > 0`
	// would silently un-choose somebody's silence every time they opened the
	// room.
	if (Number.isFinite(savedVol) && savedVol >= 0 && savedVol <= 1) volume = savedVol;
}

export const metronomeStore = {
	get bpm() {
		return bpm;
	},
	get beatsPerBar() {
		return beatsPerBar;
	},
	get subdivision() {
		return subdivision;
	},
	get volume() {
		return volume;
	},
	get running() {
		return running;
	},
	get beat() {
		return beat;
	},
	get bar() {
		return bar;
	},
	get beatInBar() {
		return beatInBar;
	},
	get phase() {
		return phase;
	},
	get tapReading() {
		return tapReading;
	},
	get tapCount() {
		return tapCount;
	},
	get error() {
		return error;
	},
	/** True when the click is silenced by choice while the pulse runs on. */
	get silenced() {
		return volume <= 0;
	},
	load,
	start,
	stop,
	toggle,
	setBpm,
	setBeatsPerBar,
	setSubdivision,
	setVolume,
	tap,
	resetTap
};
