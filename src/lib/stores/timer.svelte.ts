import { browser } from '$app/environment';

// Ported from Compass's timer store (2026-07-18) with one deliberate
// difference, per KP's Landscape-board note: "echoes should get a timer like
// compass that can also sound off when done not just silence, since a song
// will not be playing in echoes." Compass fades music and pauses at expiry;
// Echoes has no music, so completion is AUDIBLE by design — a gentle chime
// that repeats a few times until dismissed, with an opt-out toggle.

export type TimerMode = 'sand' | 'breathing' | 'dissolve' | 'flower' | 'metatron' | 'cycle' | 'numeric';

const MODE_ORDER: TimerMode[] = ['sand', 'breathing', 'dissolve', 'flower', 'metatron', 'cycle', 'numeric'];

// Locks to numeric and hides the cycle control when the OS prefers reduced motion.
export const prefersReducedMotion =
	browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const SOUND_KEY = 'resonance-sistrum-timer-sound';
const CHIME_KEY = 'resonance-sistrum-timer-chime';
const VOLUME_KEY = 'resonance-sistrum-timer-volume';

// Chime options (KP's ask, 2026-07-26). All synthesized — no audio assets,
// nothing fetched — and all built on the same sensory-friendly philosophy
// as the original: gentle attack, long decay, never a buzzer.
export type ChimeId = 'rise' | 'bell' | 'drop' | 'pulse';
type ChimeNote = { freq: number; at: number; peak: number; decay: number };
const CHIME_DEFS: Record<ChimeId, ChimeNote[]> = {
	// The original three-note rise (C5–E5–G5) — the default, unchanged.
	rise: [
		{ freq: 523.25, at: 0, peak: 0.18, decay: 1.4 },
		{ freq: 659.25, at: 0.35, peak: 0.18, decay: 1.4 },
		{ freq: 783.99, at: 0.7, peak: 0.18, decay: 1.4 },
	],
	// One deep bell strike (E4 + its octave harmonic), long settle.
	bell: [
		{ freq: 329.63, at: 0, peak: 0.22, decay: 2.2 },
		{ freq: 659.25, at: 0, peak: 0.06, decay: 1.6 },
	],
	// A soft descent (G5→C5) — arrival rather than alert.
	drop: [
		{ freq: 783.99, at: 0, peak: 0.16, decay: 1.6 },
		{ freq: 523.25, at: 0.4, peak: 0.16, decay: 1.8 },
	],
	// Two quiet A4 taps — the heartbeat shape.
	pulse: [
		{ freq: 440, at: 0, peak: 0.15, decay: 0.9 },
		{ freq: 440, at: 0.5, peak: 0.15, decay: 0.9 },
	],
};

function loadChime(): ChimeId {
	if (!browser) return 'rise';
	const v = localStorage.getItem(CHIME_KEY);
	return v === 'bell' || v === 'drop' || v === 'pulse' ? v : 'rise';
}

function loadVolume(): number {
	if (!browser) return 1;
	const v = Number(localStorage.getItem(VOLUME_KEY));
	return Number.isFinite(v) && v >= 0 && v <= 1 ? v : 1;
}

let totalSecs = $state(0);
let remainingSecs = $state(0);
let isRunning = $state(false);
let isPaused = $state(false);
let completed = $state(false);
let soundOn = $state(browser ? localStorage.getItem(SOUND_KEY) !== 'off' : true);
let chime = $state<ChimeId>(loadChime());
let chimeVolume = $state(loadVolume());
let mode = $state<TimerMode>(prefersReducedMotion ? 'numeric' : 'sand');

// Module state (not component-local) so the timer survives navigating away
// from /timer — same reasoning as Compass: a page-local interval would
// orphan on unmount or stack a duplicate on revisit.
let tickInterval: ReturnType<typeof setInterval> | null = null;
let chimeTimeout: ReturnType<typeof setTimeout> | null = null;
let chimeCount = 0;
let audioCtx: AudioContext | null = null;

// Created/resumed inside start() — a user gesture — so the Android WebView
// permits playback later when the timer completes unattended.
function ensureAudio(): AudioContext | null {
	if (!browser || !soundOn) return null;
	try {
		if (!audioCtx) audioCtx = new AudioContext();
		if (audioCtx.state === 'suspended') void audioCtx.resume();
		return audioCtx;
	} catch {
		return null; // no audio available — the visual completion state still shows
	}
}

// Plays the selected chime at the selected volume. Each note is a sine
// bell with a gentle attack and long decay — sensory-friendly on purpose:
// no buzzer, at any setting.
function playChime() {
	if (chimeVolume <= 0) return; // volume zero is a chosen silence
	const ctx = ensureAudio();
	if (!ctx) return;
	for (const n of CHIME_DEFS[chime]) {
		const osc = ctx.createOscillator();
		const gain = ctx.createGain();
		osc.type = 'sine';
		osc.frequency.value = n.freq;
		const t = ctx.currentTime + n.at;
		const peak = Math.max(0.0005, n.peak * chimeVolume);
		gain.gain.setValueAtTime(0, t);
		gain.gain.linearRampToValueAtTime(peak, t + 0.03);
		gain.gain.exponentialRampToValueAtTime(0.0001, t + n.decay);
		osc.connect(gain);
		gain.connect(ctx.destination);
		osc.start(t);
		osc.stop(t + n.decay + 0.1);
	}
}

function ringLoop() {
	if (!completed || !soundOn) return;
	chimeCount += 1;
	playChime();
	if (chimeCount < 5) {
		chimeTimeout = setTimeout(ringLoop, 4000);
	}
}

function stopChime() {
	if (chimeTimeout) clearTimeout(chimeTimeout);
	chimeTimeout = null;
	chimeCount = 0;
}

function startTick() {
	tickInterval = setInterval(() => {
		remainingSecs -= 1;
		if (remainingSecs <= 0) {
			isRunning = false;
			isPaused = false;
			if (tickInterval) clearInterval(tickInterval);
			tickInterval = null;
			totalSecs = 0;
			remainingSecs = 0;
			completed = true;
			ringLoop();
		}
	}, 1000);
}

function start(minutes: number) {
	cancel(); // replace rather than stack if one's already running
	ensureAudio(); // unlock audio inside the tap that starts the timer
	totalSecs = minutes * 60;
	remainingSecs = minutes * 60;
	isRunning = true;
	isPaused = false;
	startTick();
}

function pause() {
	// The sand holds still; nothing is lost. Pause keeps the remaining time
	// exactly where it stood — no drift, no penalty for stepping away.
	if (!isRunning || isPaused) return;
	isPaused = true;
	if (tickInterval) clearInterval(tickInterval);
	tickInterval = null;
}

function resume() {
	if (!isRunning || !isPaused) return;
	isPaused = false;
	ensureAudio(); // resume is a user gesture too — re-unlock for the WebView
	startTick();
}

function dismiss() {
	completed = false;
	stopChime();
}

function cancel() {
	isRunning = false;
	isPaused = false;
	completed = false;
	totalSecs = 0;
	remainingSecs = 0;
	if (tickInterval) clearInterval(tickInterval);
	tickInterval = null;
	stopChime();
}

function setSoundOn(v: boolean) {
	soundOn = v;
	if (browser) localStorage.setItem(SOUND_KEY, v ? 'on' : 'off');
	if (!v) stopChime();
}

function setChime(id: ChimeId) {
	chime = id;
	if (browser) localStorage.setItem(CHIME_KEY, id);
	playChime(); // preview inside the tap that chose it — hear before trusting
}

function setChimeVolume(v: number) {
	chimeVolume = Math.min(1, Math.max(0, v));
	if (browser) localStorage.setItem(VOLUME_KEY, String(chimeVolume));
}

function previewChime() {
	playChime();
}

function cycleMode() {
	if (prefersReducedMotion) return;
	const idx = MODE_ORDER.indexOf(mode);
	mode = MODE_ORDER[(idx + 1) % MODE_ORDER.length];
}

export const timerStore = {
	get totalSecs() { return totalSecs; },
	get remainingSecs() { return remainingSecs; },
	get isRunning() { return isRunning; },
	get isPaused() { return isPaused; },
	get completed() { return completed; },
	get soundOn() { return soundOn; },
	get chime() { return chime; },
	get chimeVolume() { return chimeVolume; },
	get mode() { return mode; },
	start,
	pause,
	resume,
	dismiss,
	cancel,
	setSoundOn,
	setChime,
	setChimeVolume,
	previewChime,
	cycleMode,
};
