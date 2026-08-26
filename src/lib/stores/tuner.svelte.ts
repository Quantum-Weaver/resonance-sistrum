import { invoke } from '@tauri-apps/api/core';

// Poll-generation guard: clearing an interval cannot unsend a poll already in flight, and a late reply would write `listening = true` back over a stopped room.

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
