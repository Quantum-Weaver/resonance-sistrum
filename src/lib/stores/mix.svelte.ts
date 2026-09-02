import { browser } from '$app/environment';
import { invoke } from '@tauri-apps/api/core';
import { effectiveGain, mixLength, positionAt, scheduleLane } from '$lib/studio';
import type { SessionTrack } from '$lib/studio';

// HEARING THE MIX (the plan's §4.5): one AudioContext, one AudioBufferSourceNode per lane fed by `read_take_bytes` and decoded in the window, gain and pan nodes per lane, offsets scheduled on the context's own clock. Play, pause, stop, scrub — the whole mix on one clock. Nothing here touches the takes' files: the bytes cross once, and what they become is a buffer in this window.
// A phone that cannot hold the bytes still has the bounce (the plan's §4.5, the fallback).
// NO AUTOPLAY: the context is made on the first press of play and nothing sounds before that.

interface Lane {
	trackId: string;
	take: string;
	buffer: AudioBuffer | null;
	source: AudioBufferSourceNode | null;
	gain: GainNode;
	pan: StereoPannerNode;
	error: string | null;
}

const VOLUME_KEY = 'resonance-sistrum-mix-volume';
const DEFAULT_VOLUME = 0.7;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let lanes = new Map<string, Lane>();
let frame: number | null = null;

// The clock: when play began on the context's clock, and where the mix was then.
let startedAt = 0;
let startPosition = 0;

let playing = $state(false);
let position = $state(0);
let length = $state(0);
let volume = $state(DEFAULT_VOLUME);
let loadingCount = $state(0);
let error = $state<string | null>(null);
// Which lanes are decoded, by track id — so the room can say "reading…" per lane.
let ready = $state<Record<string, boolean>>({});
let laneErrors = $state<Record<string, string>>({});

const reducedMotion = () => browser && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function ensureContext(): AudioContext {
	if (ctx && master) return ctx;
	const c = new AudioContext();
	const m = c.createGain();
	m.gain.value = volume;
	m.connect(c.destination);
	ctx = c;
	master = m;
	// Lanes made before the context existed are wired now.
	for (const lane of lanes.values()) {
		lane.gain.disconnect();
		lane.pan.disconnect();
		lane.gain.connect(lane.pan);
		lane.pan.connect(m);
	}
	return c;
}

function makeLane(c: AudioContext, track: SessionTrack): Lane {
	const gain = c.createGain();
	const pan = c.createStereoPanner();
	gain.connect(pan);
	if (master) pan.connect(master);
	return { trackId: track.id, take: track.take, buffer: null, source: null, gain, pan, error: null };
}

function recomputeLength(tracks: SessionTrack[]) {
	length = mixLength(
		tracks.map((t) => ({
			offsetSecs: t.offset_ms / 1000,
			durationSecs: lanes.get(t.id)?.buffer?.duration ?? 0
		}))
	);
}

/** Decode one lane's take. The bytes come over the IPC once — `read_take_bytes` is the road, raw binary, never base64. */
async function decodeLane(lane: Lane) {
	const c = ensureContext();
	loadingCount++;
	try {
		const bytes = await invoke<ArrayBuffer | Uint8Array>('read_take_bytes', { fileName: lane.take });
		const ab = bytes instanceof ArrayBuffer ? bytes : new Uint8Array(bytes).buffer.slice(0);
		lane.buffer = await c.decodeAudioData(ab as ArrayBuffer);
		lane.error = null;
		ready = { ...ready, [lane.trackId]: true };
		const next = { ...laneErrors };
		delete next[lane.trackId];
		laneErrors = next;
	} catch (e) {
		lane.buffer = null;
		lane.error = e instanceof Error ? e.message : String(e);
		laneErrors = { ...laneErrors, [lane.trackId]: lane.error };
	} finally {
		loadingCount--;
	}
}

/**
 * Bring the graph to the session's lanes: new tracks get a lane and a
 * decode, gone tracks are torn down, gain/pan/mute/solo are applied LIVE to
 * the nodes. Called whenever the session's tracks change. Idempotent.
 */
async function sync(tracks: SessionTrack[]) {
	if (!browser) return;
	const c = ensureContextLazily();
	const anySolo = tracks.some((t) => t.solo);
	const seen = new Set<string>();
	const decodes: Promise<void>[] = [];

	for (const t of tracks) {
		seen.add(t.id);
		let lane = lanes.get(t.id);
		if (!lane || lane.take !== t.take) {
			if (lane) teardownLane(lane);
			if (!c) continue;
			lane = makeLane(c, t);
			lanes.set(t.id, lane);
			decodes.push(decodeLane(lane));
		}
		lane.gain.gain.value = effectiveGain(t, anySolo);
		lane.pan.pan.value = Math.min(1, Math.max(-1, t.pan));
	}
	for (const [id, lane] of lanes) {
		if (!seen.has(id)) {
			teardownLane(lane);
			lanes.delete(id);
			const next = { ...ready };
			delete next[id];
			ready = next;
		}
	}
	const decodedNow = decodes.length > 0;
	await Promise.all(decodes);
	recomputeLength(tracks);
	currentTracks = tracks;
	// A lane whose offset moved while playing — or one that only now has a buffer — is rescheduled on the same clock. Gain and pan already landed on their nodes above and need no restart.
	const moved = tracks.some((t) => scheduledOffsets.has(t.id) && scheduledOffsets.get(t.id) !== t.offset_ms);
	if (playing && (moved || decodedNow)) restartSources(tracks);
}

// The context is a user-gesture object in most browsers; decoding needs it, so lanes are decoded once the room has been touched. Before that, `sync` records nothing and the first play does the decode.
function ensureContextLazily(): AudioContext | null {
	if (ctx) return ctx;
	try {
		return ensureContext();
	} catch {
		return null;
	}
}

function teardownLane(lane: Lane) {
	stopSource(lane);
	try {
		lane.gain.disconnect();
		lane.pan.disconnect();
	} catch {
	}
}

function stopSource(lane: Lane) {
	if (lane.source) {
		try {
			lane.source.onended = null;
			lane.source.stop();
		} catch {
		}
		try {
			lane.source.disconnect();
		} catch {
		}
		lane.source = null;
	}
}

function stopAllSources() {
	for (const lane of lanes.values()) stopSource(lane);
	scheduledOffsets = new Map();
}

/** Every lane scheduled from the current position, on one clock. THE ARITHMETIC IS `scheduleLane`'s — proven in `.journals/proofs/`. */
function startSources(tracks: SessionTrack[]) {
	const c = ensureContext();
	const now = c.currentTime;
	for (const t of tracks) {
		const lane = lanes.get(t.id);
		if (!lane?.buffer) continue;
		const plan = scheduleLane(now, startPosition, t.offset_ms / 1000, lane.buffer.duration);
		if (!plan) continue;
		const src = c.createBufferSource();
		src.buffer = lane.buffer;
		src.connect(lane.gain);
		src.start(plan.when, plan.bufferOffset);
		lane.source = src;
	}
	scheduledOffsets = new Map(tracks.map((t) => [t.id, t.offset_ms]));
}

function restartSources(tracks: SessionTrack[]) {
	const c = ensureContext();
	// Fold the elapsed time into the start position and begin the clock again.
	startPosition = positionAt(c.currentTime, startedAt, startPosition);
	startedAt = c.currentTime;
	stopAllSources();
	startSources(tracks);
}

let currentTracks: SessionTrack[] = [];
// What offset each lane was last scheduled at — so a gain or pan change mid-play never restarts the sources, and only a moved lane (or one that just finished decoding) does.
let scheduledOffsets = new Map<string, number>();

function follow() {
	stopFollowing();
	const tick = () => {
		if (!ctx || !playing) return;
		position = positionAt(ctx.currentTime, startedAt, startPosition);
		if (length > 0 && position >= length) {
			// The mix ran to its own end. Rest there; a press of play begins again from the top.
			stopAllSources();
			playing = false;
			position = length;
			startPosition = length;
			return;
		}
		frame = reducedMotion() ? (setTimeout(tick, 250) as unknown as number) : requestAnimationFrame(tick);
	};
	tick();
}

function stopFollowing() {
	if (frame !== null) {
		cancelAnimationFrame(frame);
		clearTimeout(frame);
	}
	frame = null;
}

/** Play the mix from where it rests — and ONLY from the user's own press. */
async function play(tracks: SessionTrack[]) {
	if (!browser) return;
	error = null;
	try {
		const c = ensureContext();
		if (c.state === 'suspended') await c.resume();
		currentTracks = tracks;
		// Lanes that never decoded (the context did not exist yet) decode now.
		await sync(tracks);
		if (length > 0 && startPosition >= length) startPosition = 0;
		startedAt = c.currentTime;
		stopAllSources();
		startSources(tracks);
		playing = true;
		follow();
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		playing = false;
	}
}

function pause() {
	if (!ctx || !playing) return;
	startPosition = positionAt(ctx.currentTime, startedAt, startPosition);
	position = startPosition;
	stopAllSources();
	playing = false;
	stopFollowing();
}

function stop() {
	stopAllSources();
	playing = false;
	stopFollowing();
	startPosition = 0;
	position = 0;
}

/** Scrub the whole mix. Clamped to its own length. */
function seek(secs: number, tracks: SessionTrack[] = currentTracks) {
	const next = Math.min(length > 0 ? length : Infinity, Math.max(0, secs));
	startPosition = Number.isFinite(next) ? next : 0;
	position = startPosition;
	if (playing && ctx) {
		startedAt = ctx.currentTime;
		stopAllSources();
		startSources(tracks);
	}
}

function toggle(tracks: SessionTrack[]) {
	if (playing) pause();
	else void play(tracks);
}

function setVolume(v: number) {
	volume = Math.min(1, Math.max(0, v));
	if (master) master.gain.value = volume;
	if (browser) localStorage.setItem(VOLUME_KEY, String(volume));
}

function loadVolume() {
	if (!browser) return;
	const saved = Number(localStorage.getItem(VOLUME_KEY));
	if (Number.isFinite(saved) && saved >= 0 && saved <= 1) {
		volume = saved;
		if (master) master.gain.value = volume;
	}
}

/** The lane's own duration, once decoded — the buffer's truth. */
function laneDuration(trackId: string): number {
	return lanes.get(trackId)?.buffer?.duration ?? 0;
}

/** Let the graph go. Buffers are released; the files stay exactly where they are. */
function close() {
	stop();
	for (const lane of lanes.values()) teardownLane(lane);
	lanes = new Map();
	ready = {};
	laneErrors = {};
	length = 0;
	currentTracks = [];
	scheduledOffsets = new Map();
	if (ctx) {
		void ctx.close().catch(() => {});
		ctx = null;
		master = null;
	}
}

export const mixStore = {
	get playing() {
		return playing;
	},
	get position() {
		return position;
	},
	get length() {
		return length;
	},
	get volume() {
		return volume;
	},
	get loading() {
		return loadingCount > 0;
	},
	get error() {
		return error;
	},
	get ready() {
		return ready;
	},
	get laneErrors() {
		return laneErrors;
	},
	/** 0..1 across the whole mix. */
	get progress() {
		return length > 0 ? Math.min(1, Math.max(0, position / length)) : 0;
	},
	sync,
	play,
	pause,
	stop,
	seek,
	toggle,
	setVolume,
	loadVolume,
	laneDuration,
	close
};
