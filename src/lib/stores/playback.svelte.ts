import { browser } from '$app/environment';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import type { TakeFile } from '$lib/stores/recorder.svelte';

// No autoplay: opening a take LOADS it, never starts it. A take opens at 0.7 volume, headphone-safe.

const VOLUME_KEY = 'resonance-sistrum-playback-volume';
const DEFAULT_VOLUME = 0.7;

let element: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let frame: number | null = null;
// Held only so the play() retry can reopen the same take by the byte road.
let currentTake: TakeFile | null = null;

let fileName = $state<string | null>(null);
let playing = $state(false);
let position = $state(0);
let duration = $state(0);
let volume = $state(DEFAULT_VOLUME);
let loading = $state(false);
let error = $state<string | null>(null);

const reducedMotion = () =>
	browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// With reduced motion the element's own `timeupdate` carries the playhead; otherwise a frame loop keeps it smooth.
function startFollowing() {
	if (!browser || reducedMotion()) return;
	stopFollowing();
	const tick = () => {
		if (element) position = element.currentTime;
		frame = requestAnimationFrame(tick);
	};
	frame = requestAnimationFrame(tick);
}

function stopFollowing() {
	if (frame !== null) cancelAnimationFrame(frame);
	frame = null;
}

function releaseObjectUrl() {
	if (objectUrl) {
		URL.revokeObjectURL(objectUrl);
		objectUrl = null;
	}
}

function ensureElement(): HTMLAudioElement {
	if (element) return element;
	const el = new Audio();
	el.preload = 'metadata';
	el.volume = volume;
	el.addEventListener('loadedmetadata', () => {
		// If the element cannot report duration, the take's own reported length stands (set by open()).
		if (Number.isFinite(el.duration) && el.duration > 0) duration = el.duration;
	});
	el.addEventListener('timeupdate', () => {
		position = el.currentTime;
	});
	el.addEventListener('play', () => {
		playing = true;
		startFollowing();
	});
	el.addEventListener('pause', () => {
		playing = false;
		stopFollowing();
		position = el.currentTime;
	});
	el.addEventListener('ended', () => {
		playing = false;
		stopFollowing();
		position = el.duration || position;
	});
	element = el;
	return el;
}

/**
 * Load a take so it is ready to hear. THIS DOES NOT PLAY IT.
 *
 * The source is the asset protocol (`convertFileSrc`), which serves the file
 * with range requests so scrubbing a long take seeks rather than re-reads. If
 * that road is closed — an asset scope is configuration, and configuration
 * fails quietly — the bytes come over the IPC instead and become a blob. The
 * fallback is slower and says so in the console; it is here so that a musician
 * pressing play on their own take never meets silence with no explanation.
 */
async function open(take: TakeFile) {
	if (!browser) return;
	const el = ensureElement();
	if (fileName === take.file_name && el.src) return;

	stopFollowing();
	el.pause();
	releaseObjectUrl();

	fileName = take.file_name;
	playing = false;
	position = 0;
	duration = take.seconds;
	error = null;
	loading = true;

	try {
		el.src = convertFileSrc(take.path);
		el.load();
		loading = false;
	} catch (e) {
		console.warn('[playback] the asset road did not open, falling back to bytes:', e);
		await openByBytes(take);
	}
}

async function openByBytes(take: TakeFile) {
	const el = ensureElement();
	try {
		const bytes = await invoke<ArrayBuffer | Uint8Array>('read_take_bytes', {
			fileName: take.file_name
		});
		const blob = new Blob([bytes as BlobPart], { type: 'audio/wav' });
		objectUrl = URL.createObjectURL(blob);
		el.src = objectUrl;
		el.load();
		error = null;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
	} finally {
		loading = false;
	}
}

/**
 * Play — and ONLY from the user's own press. Every caller of this is a button
 * a hand touched. A browser that refuses the play says so plainly here rather
 * than leaving a dead control.
 */
async function play() {
	if (!browser || !element) return;
	try {
		await element.play();
	} catch (e) {
		// The asset road can fail at PLAY rather than at load — one retry over the byte road, then the truth.
		const take = currentTake;
		if (take && !objectUrl) {
			await openByBytes(take);
			try {
				await element.play();
				return;
			} catch {
			}
		}
		error = e instanceof Error ? e.message : String(e);
		playing = false;
	}
}

function pause() {
	element?.pause();
}

function toggle() {
	if (playing) pause();
	else void play();
}

/** Scrub. Clamped at both ends — a position outside the take is not a position. */
function seek(secs: number) {
	if (!element) return;
	const end = duration > 0 ? duration : element.duration || 0;
	const next = Math.min(end, Math.max(0, secs));
	element.currentTime = next;
	position = next;
}

function setVolume(v: number) {
	volume = Math.min(1, Math.max(0, v));
	if (element) element.volume = volume;
	// Volume zero is a chosen silence, and a choice is kept.
	if (browser) localStorage.setItem(VOLUME_KEY, String(volume));
}

function loadVolume() {
	if (!browser) return;
	const saved = Number(localStorage.getItem(VOLUME_KEY));
	if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {
		volume = saved;
		if (element) element.volume = volume;
	}
}

/** Let the take go — the sound stops, the file stays exactly where it is. */
function close() {
	stopFollowing();
	element?.pause();
	if (element) element.removeAttribute('src');
	releaseObjectUrl();
	fileName = null;
	playing = false;
	position = 0;
	duration = 0;
	error = null;
}

export const playbackStore = {
	get fileName() {
		return fileName;
	},
	get playing() {
		return playing;
	},
	get position() {
		return position;
	},
	get duration() {
		return duration;
	},
	get volume() {
		return volume;
	},
	get loading() {
		return loading;
	},
	get error() {
		return error;
	},
	/** 0..1, for the waveform's played/unplayed seam. */
	get progress() {
		return duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;
	},
	async open(take: TakeFile) {
		currentTake = take;
		await open(take);
	},
	play,
	pause,
	toggle,
	seek,
	setVolume,
	loadVolume,
	close
};
