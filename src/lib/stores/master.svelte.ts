import { browser } from '$app/environment';
import { invoke } from '@tauri-apps/api/core';
import { mixStore } from '$lib/stores/mix.svelte';
import type { MadeTake } from '$lib/stores/repair.svelte';
import type { SessionTrack } from '$lib/studio';
import {
	DEFAULT_CEILING_DBTP,
	DEFAULT_LOOKAHEAD_MS,
	DEFAULT_RELEASE_MS,
	DEFAULT_TARGET_LUFS,
	master,
	measure,
	type MasterMeasure,
	type MasterReport
} from '$lib/master';
import {
	chapterize,
	chaptersFfmetadata,
	chaptersVtt,
	normalizeChapters,
	type ChapterMark
} from '$lib/container';
import { bestFormat, encodeSamples, offeredFormats, type EncodeFormat } from '$lib/encode';
import { bytesToBase64, encodeWav } from '$lib/wav';

// MASTERING AND LANDING. The mix is rendered to one buffer in the window, read
// for loudness and true peak (BS.1770-4), gained to the target and held under
// the ceiling — all on a NEW buffer, so no lane and no take is written by any
// of it. Landing writes a chapterized WAV as a new take, and where the platform
// carries a codec, an encoded file and its chapter sidecars beside it.

const TARGET_KEY = 'resonance-sistrum-master-target';
const CEILING_KEY = 'resonance-sistrum-master-ceiling';

interface Rendered {
	channels: Float32Array[];
	rate: number;
	seconds: number;
}

let targetLufs = $state(DEFAULT_TARGET_LUFS);
let ceilingDbtp = $state(DEFAULT_CEILING_DBTP);
let lookaheadMs = $state(DEFAULT_LOOKAHEAD_MS);
let releaseMs = $state(DEFAULT_RELEASE_MS);

let source = $state<Rendered | null>(null);
let mastered = $state<Rendered | null>(null);
let heard = $state<MasterMeasure | null>(null);
let report = $state<MasterReport | null>(null);

let reading = $state(false);
let working = $state(false);
let landing = $state(false);
let encoding = $state<string | null>(null);
let error = $state<string | null>(null);
let told = $state<string | null>(null);

let formats = $state<EncodeFormat[]>([]);
let abort: AbortController | null = null;

function channelsOf(buffer: AudioBuffer): Float32Array[] {
	const out: Float32Array[] = [];
	for (let c = 0; c < buffer.numberOfChannels; c++) out.push(buffer.getChannelData(c));
	return out;
}

/** What the platform will write, asked once and kept for the sitting. */
function askPlatform() {
	if (!browser || formats.length > 0) return;
	formats = offeredFormats();
}

function loadSettings() {
	if (!browser) return;
	const t = Number(localStorage.getItem(TARGET_KEY));
	if (Number.isFinite(t) && t <= 0 && t >= -40) targetLufs = t;
	const c = Number(localStorage.getItem(CEILING_KEY));
	if (Number.isFinite(c) && c <= 0 && c >= -12) ceilingDbtp = c;
	askPlatform();
}

function setTarget(v: number) {
	targetLufs = Math.min(0, Math.max(-40, v));
	if (browser) localStorage.setItem(TARGET_KEY, String(targetLufs));
}

function setCeiling(v: number) {
	ceilingDbtp = Math.min(0, Math.max(-12, v));
	if (browser) localStorage.setItem(CEILING_KEY, String(ceilingDbtp));
}

function setLookahead(v: number) {
	lookaheadMs = Math.min(50, Math.max(1, v));
}

function setRelease(v: number) {
	releaseMs = Math.min(2000, Math.max(10, v));
}

/** Render the lanes to one buffer and read its meters. Nothing is changed. */
async function read(tracks: SessionTrack[]): Promise<boolean> {
	if (!browser) return false;
	reading = true;
	error = null;
	told = null;
	mastered = null;
	report = null;
	try {
		const buffer = await mixStore.renderMix(tracks);
		if (!buffer) {
			source = null;
			heard = null;
			error = 'nothing is decoded to measure — play the mix once, or add a lane';
			return false;
		}
		const channels = channelsOf(buffer).map((c) => Float32Array.from(c));
		source = { channels, rate: buffer.sampleRate, seconds: buffer.duration };
		heard = measure(channels, buffer.sampleRate);
		return true;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	} finally {
		reading = false;
	}
}

/** Gain to the target, then hold under the ceiling — onto a NEW buffer. */
function apply(): boolean {
	const src = source;
	if (!src) {
		error = 'measure the mix first';
		return false;
	}
	working = true;
	error = null;
	try {
		const done = master(src.channels, src.rate, {
			targetLufs,
			ceilingDbtp,
			lookaheadMs,
			releaseMs
		});
		mastered = { channels: done.channels, rate: src.rate, seconds: src.seconds };
		report = done.report;
		told = `Mastered: ${done.report.before.integratedLufs.toFixed(1)} to ${done.report.after.integratedLufs.toFixed(1)} LUFS, ${done.report.before.truePeakDbtp.toFixed(2)} to ${done.report.after.truePeakDbtp.toFixed(2)} dBTP.`;
		return true;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return false;
	} finally {
		working = false;
	}
}

/** Drop the mastered buffer; the rendered mix and its meters stay. */
function revert() {
	mastered = null;
	report = null;
	told = null;
}

export interface LandAsk {
	name: string;
	chapters: ChapterMark[];
	/** The container to encode into beside the WAV, or null for WAV alone. */
	format?: EncodeFormat | null;
	/** Write the chapters beside the encoded file as text. */
	sidecars?: boolean;
}

export interface Landed {
	take: MadeTake;
	/** Every file that landed beside the take, by name. */
	beside: string[];
}

interface SideFile {
	file_name: string;
	path: string;
	bytes: number;
}

/**
 * The chapterized WAV as a NEW take, and where the platform carries a codec,
 * the encoded file and its chapter sidecars beside it. Nothing that went in is
 * written.
 */
async function land(ask: LandAsk): Promise<Landed | null> {
	const out = mastered ?? source;
	if (!browser || !out) {
		error = 'there is nothing mastered to land';
		return null;
	}
	landing = true;
	error = null;
	const beside: string[] = [];
	try {
		const base = ask.name.trim() || `master-${Math.floor(Date.now() / 1000)}`;
		const chapters = normalizeChapters(ask.chapters, out.seconds * 1000);
		const wav = chapterize(encodeWav(out.channels, out.rate), chapters);
		const take = await invoke<MadeTake>('write_take_wav', {
			name: base,
			wavBase64: bytesToBase64(wav)
		});

		if (ask.format?.supported) {
			encoding = ask.format.word;
			abort = new AbortController();
			try {
				const encoded = await encodeSamples(
					out.channels,
					out.rate,
					ask.format,
					undefined,
					abort.signal
				);
				const file = await invoke<SideFile>('write_studio_file', {
					name: base,
					extension: encoded.extension,
					bytesBase64: bytesToBase64(encoded.bytes)
				});
				beside.push(file.file_name);
			} finally {
				encoding = null;
				abort = null;
			}
		}

		if (chapters.length > 0 && (ask.sidecars ?? true)) {
			const lengthMs = out.seconds * 1000;
			for (const [extension, text] of [
				['txt', chaptersFfmetadata(chapters, lengthMs)],
				['vtt', chaptersVtt(chapters, lengthMs)]
			] as [string, string][]) {
				const file = await invoke<SideFile>('write_studio_file', {
					name: `${base}-chapters`,
					extension,
					bytesBase64: bytesToBase64(new TextEncoder().encode(text))
				});
				beside.push(file.file_name);
			}
		}

		told = `${take.file_name} is on the shelf with ${chapters.length} ${chapters.length === 1 ? 'chapter' : 'chapters'} inside it${beside.length > 0 ? `, beside ${beside.join(' and ')}` : ''}.`;
		return { take, beside };
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return null;
	} finally {
		landing = false;
	}
}

/** Stop an encode in flight. The take that already landed stays. */
function stopEncoding() {
	abort?.abort();
}

function clear() {
	source = null;
	mastered = null;
	heard = null;
	report = null;
	error = null;
	told = null;
}

export const masterStore = {
	get targetLufs() {
		return targetLufs;
	},
	get ceilingDbtp() {
		return ceilingDbtp;
	},
	get lookaheadMs() {
		return lookaheadMs;
	},
	get releaseMs() {
		return releaseMs;
	},
	get heard() {
		return heard;
	},
	get report() {
		return report;
	},
	get hasSource() {
		return source !== null;
	},
	get hasMaster() {
		return mastered !== null;
	},
	get seconds() {
		return source?.seconds ?? 0;
	},
	get reading() {
		return reading;
	},
	get working() {
		return working;
	},
	get landing() {
		return landing;
	},
	get encoding() {
		return encoding;
	},
	get error() {
		return error;
	},
	get told() {
		return told;
	},
	get formats() {
		return formats;
	},
	get offered() {
		return formats.filter((f) => f.supported);
	},
	get walls() {
		return formats.filter((f) => !f.supported);
	},
	best: bestFormat,
	loadSettings,
	setTarget,
	setCeiling,
	setLookahead,
	setRelease,
	read,
	apply,
	revert,
	land,
	stopEncoding,
	clear
};
