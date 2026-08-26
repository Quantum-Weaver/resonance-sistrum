import { invoke } from '@tauri-apps/api/core';

// The wire type is `TakeFile` (the file the recorder owns), not `Take` (the domain row in the takes table).

export interface InputDevice {
	name: string;
	config: string;
	is_default: boolean;
}

/** What the recorder knows about a take: the file, read from its own header. */
export interface TakeFile {
	file_name: string;
	path: string;
	seconds: number;
	sample_rate: number;
	channels: number;
	created_at: number;
	/**
	 * True peak in dBFS, measured from the samples. Only a take just sealed
	 * carries one — the shelf reads headers, not samples, and says null rather
	 * than guessing. **A silent take is also null**: silence is reported as
	 * silence, never dressed up as a very small number.
	 */
	peak_dbfs: number | null;
	/** Samples that reached full scale. Null from the shelf, which never counted. */
	clipped: number | null;
}

interface RecordingStatus {
	recording: boolean;
	paused: boolean;
	capped: boolean;
	device: string | null;
	sample_rate: number | null;
	channels: number | null;
	elapsed_secs: number;
	peak: number;
	clipped: number;
}

let recording = $state(false);
// Held, not ended: a paused take is still open, and resume appends to it.
let paused = $state(false);
// The take hit its cap: Rust already released the device; the samples wait here to be saved.
let capped = $state(false);
let device = $state<string | null>(null);
let sampleRate = $state<number | null>(null);
let channels = $state<number | null>(null);
let elapsedSecs = $state(0);
let peak = $state(0);
let clipped = $state(0);
let devices = $state<InputDevice[]>([]);
let takes = $state<TakeFile[]>([]);
let error = $state<string | null>(null);

let pollTimer: ReturnType<typeof setInterval> | null = null;

// Generation guard: clearing the timer cannot unsend a poll already in flight, and a late `recording_status` reply would write `recording = true` back over a stopped room.
let pollGen = 0;

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
			const s = await invoke<RecordingStatus>('recording_status');
			if (gen !== pollGen) return; // this reply outlived its take
			recording = s.recording;
			paused = s.paused;
			capped = s.capped;
			elapsedSecs = s.elapsed_secs;
			clipped = s.clipped;
			peak = Math.max(s.peak, peak * 0.75);
			if (!s.recording) stopPolling();
		} catch {
			// A missed poll is silence, not an error state.
		}
	}, 120);
}

async function loadDevices() {
	try {
		devices = await invoke<InputDevice[]>('list_input_devices');
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
}

async function refreshTakes() {
	try {
		takes = await invoke<TakeFile[]>('list_takes');
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
}

// `maxSecs` caps the take (null = no cap); the cap is honored in Rust on the capture thread, never by a timer here.
async function start(deviceHint: string | null, maxSecs: number | null = null) {
	error = null;
	try {
		const granted = await invoke<boolean>('request_mic_permission');
		if (!granted) {
			error = 'Microphone permission not granted.';
			return false;
		}
		const s = await invoke<RecordingStatus>('start_recording', {
			device: deviceHint,
			maxSecs
		});
		recording = true;
		paused = false;
		capped = false;
		device = s.device;
		sampleRate = s.sample_rate;
		channels = s.channels;
		elapsedSecs = 0;
		peak = 0;
		clipped = 0;
		startPolling();
		return true;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	}
}

async function stop(keep: boolean, name: string | null): Promise<TakeFile | null> {
	stopPolling();
	try {
		const take = await invoke<TakeFile | null>('stop_recording', { keep, name });
		recording = false;
		paused = false;
		capped = false;
		device = null;
		elapsedSecs = 0;
		peak = 0;
		if (keep) await refreshTakes();
		return take;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		recording = false;
		paused = false;
		capped = false;
		return null;
	}
}

// Hold the take without ending it — the device stays ours and resume appends to the same file.
async function pause() {
	try {
		await invoke('pause_recording');
		paused = true;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
}

async function resume() {
	try {
		await invoke('resume_recording');
		paused = false;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	}
}

// The only way a recording leaves this device, and it takes a hand to do it.
async function exportTake(fileName: string): Promise<string | null> {
	try {
		const { save } = await import('@tauri-apps/plugin-dialog');
		const dest = await save({
			defaultPath: fileName,
			filters: [{ name: 'WAV audio', extensions: ['wav'] }]
		});
		if (!dest) return null;
		await invoke('export_take', { fileName, dest });
		return dest;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return null;
	}
}

function byFileName(fileName: string): TakeFile | undefined {
	return takes.find((t) => t.file_name === fileName);
}

function clearError() {
	error = null;
}

export const recorderStore = {
	get recording() {
		return recording;
	},
	get paused() {
		return paused;
	},
	get capped() {
		return capped;
	},
	get device() {
		return device;
	},
	get sampleRate() {
		return sampleRate;
	},
	get channels() {
		return channels;
	},
	get elapsedSecs() {
		return elapsedSecs;
	},
	get peak() {
		return peak;
	},
	get clipped() {
		return clipped;
	},
	get devices() {
		return devices;
	},
	get takes() {
		return takes;
	},
	get error() {
		return error;
	},
	loadDevices,
	refreshTakes,
	start,
	pause,
	resume,
	stop,
	exportTake,
	byFileName,
	clearError
};
