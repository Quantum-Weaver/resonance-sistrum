import { invoke } from '@tauri-apps/api/core';

// The tuner room's store — Phase 3 Wave 2 (2026-08-13, an **Opus** hand).
// `the-tuner` consumed; the YIN math runs in Rust from the path crate and this
// store is only the window onto it.
//
// THE LAWS, kept in this file as much as in the Rust:
//
//   · OPT-IN ALWAYS. Nothing listens until `start()` is called, and `start()`
//     is only ever called from a press. Leaving the room stops the listening —
//     an ear that follows you out of a room you left is an ear nobody asked
//     for, and it is the same reasoning the player uses to stop sound on exit.
//
//   · NOTHING RECORDED, NOTHING KEPT. There is no take here, no file, no
//     history, and no row. What was heard a second ago is gone; only what is
//     being heard now exists. The tuner cannot create a take even by accident,
//     because it holds no path to one.
//
//   · A POSITION, NEVER A VERDICT. This store reports `note`, `octave` and
//     signed `cents`. It has no `inTune` boolean and it will not grow one:
//     the moment a store answers yes-or-no, the screen has been handed a
//     verdict to draw. Distance is information; the room decides how to show
//     it, and the room does not judge either.
//
// THE POLL-GENERATION GUARD, carried from the recorder store rather than
// re-learned. Clearing an interval stops new polls but cannot unsend one
// already in flight, and a reply that lands after the listening has stopped
// would write `listening = true` back over a stopped room. That exact wound
// cost the record room its Record button on an S25. It does not get to happen
// twice in one app.

export interface TunerReading {
	listening: boolean;
	device: string | null;
	sample_rate: number | null;
	freq: number | null;
	note: string | null;
	octave: number | null;
	cents: number | null;
	rms: number;
	readings: number;
}

let listening = $state(false);
let device = $state<string | null>(null);
let sampleRate = $state<number | null>(null);
let freq = $state<number | null>(null);
let note = $state<string | null>(null);
let octave = $state<number | null>(null);
let cents = $state<number | null>(null);
let rms = $state(0);
let readings = $state(0);
let starting = $state(false);
let error = $state<string | null>(null);

let pollTimer: ReturnType<typeof setInterval> | null = null;
let pollGen = 0;

/** The reading refreshes about as often as Rust computes one. */
const POLL_MS = 90;

function clearReading() {
	freq = null;
	note = null;
	octave = null;
	cents = null;
	rms = 0;
}

function stopPolling() {
	if (pollTimer) clearInterval(pollTimer);
	pollTimer = null;
	pollGen++; // whatever is still in flight is now stale and must not land
}

function startPolling() {
	stopPolling();
	const gen = pollGen;
	pollTimer = setInterval(async () => {
		try {
			const r = await invoke<TunerReading>('tuner_reading');
			if (gen !== pollGen) return; // this reply outlived its listening
			listening = r.listening;
			device = r.device;
			sampleRate = r.sample_rate;
			freq = r.freq;
			note = r.note;
			octave = r.octave;
			cents = r.cents;
			rms = r.rms;
			readings = r.readings;
			if (!r.listening) stopPolling();
		} catch {
			// A missed poll is silence, not an error state.
		}
	}, POLL_MS);
}

/**
 * Open the ear. ONLY FROM A PRESS.
 *
 * The microphone door is asked the same way the record room asks it, which
 * means Android gets the same honest refusal rather than a panic: the JNI
 * context cpal's oboe backend needs is not wired in this app yet, and without
 * it cpal does not error on Android — it takes the whole app down.
 */
async function start(deviceHint: string | null = null): Promise<boolean> {
	if (listening || starting) return listening;
	error = null;
	starting = true;
	try {
		const granted = await invoke<boolean>('request_mic_permission');
		if (!granted) {
			error = 'Microphone permission not granted.';
			return false;
		}
		const r = await invoke<TunerReading>('start_tuner', { device: deviceHint });
		listening = true;
		device = r.device;
		sampleRate = r.sample_rate;
		clearReading();
		readings = 0;
		startPolling();
		return true;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		listening = false;
		return false;
	} finally {
		starting = false;
	}
}

/** Close the ear. Idempotent — stopping a stopped tuner is a hand being
 *  careful, and being careful never produces an error here. */
async function stop() {
	stopPolling();
	listening = false;
	clearReading();
	try {
		await invoke('stop_tuner');
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
	device = null;
	sampleRate = null;
}

function clearError() {
	error = null;
}

export const tunerStore = {
	get listening() {
		return listening;
	},
	get starting() {
		return starting;
	},
	get device() {
		return device;
	},
	get sampleRate() {
		return sampleRate;
	},
	get freq() {
		return freq;
	},
	get note() {
		return note;
	},
	get octave() {
		return octave;
	},
	/** Signed cents from the nearest note's center, −50..+50. A POSITION. */
	get cents() {
		return cents;
	},
	get rms() {
		return rms;
	},
	get readings() {
		return readings;
	},
	get error() {
		return error;
	},
	/** True while listening and hearing an actual pitch. Silence and noise are
	 *  both honestly "not heard" — never a guessed note. */
	get heard() {
		return listening && freq !== null;
	},
	start,
	stop,
	clearError
};
