import { browser } from '$app/environment';
import { invoke } from '@tauri-apps/api/core';
import { mixStore } from '$lib/stores/mix.svelte';
import type { MadeTake } from '$lib/stores/repair.svelte';
import { msToSamples, punchIn, secsToSamples, splice } from '$lib/splice';
import { bytesToBase64, encodeWav } from '$lib/wav';

// SPLICE, CROSSFADE AND PUNCH-IN ON THE LANE. Both verbs work on the samples the
// lane is playing — so a repair already on the lane carries into the cut — and
// both land a NEW take on the shelf. Neither take that went in is written.

/** A channel of a buffer, falling back to its first when it has fewer. */
function channelAt(buffer: AudioBuffer, index: number): Float32Array {
	return buffer.getChannelData(Math.min(index, buffer.numberOfChannels - 1));
}

let busy = $state<string | null>(null);
let error = $state<string | null>(null);
let told = $state<string | null>(null);

async function land(
	channels: Float32Array[],
	rate: number,
	name: string
): Promise<MadeTake | null> {
	const bytes = encodeWav(channels, rate);
	return await invoke<MadeTake>('write_take_wav', { name, wavBase64: bytesToBase64(bytes) });
}

export interface SpliceAsk {
	/** The take joined on, by file name on the shelf. */
	withTake: string;
	/** Where this lane is cut, seconds into what it is playing. */
	cutSecs: number;
	/** Where the joined take is cut, seconds into itself. */
	joinAtSecs: number;
	/** The equal-power crossfade, milliseconds. */
	crossfadeMs: number;
	name?: string | null;
}

/**
 * Cut the lane at its boundary, cut the other take at its own, and join them
 * with an equal-power crossfade of the length the person set.
 */
async function spliceLane(
	trackId: string,
	take: string,
	ask: SpliceAsk
): Promise<MadeTake | null> {
	if (!browser) return null;
	const host = mixStore.laneBuffer(trackId);
	if (!host) {
		error = 'this lane has not decoded yet';
		return null;
	}
	busy = trackId;
	error = null;
	try {
		const other = await mixStore.decodeTake(ask.withTake);
		const rate = host.sampleRate;
		const cut = secsToSamples(ask.cutSecs, rate);
		const joinAt = secsToSamples(ask.joinAtSecs, other.sampleRate);
		const fade = msToSamples(ask.crossfadeMs, rate);
		const count = Math.max(host.numberOfChannels, other.numberOfChannels);
		const out: Float32Array[] = [];
		let used = 0;
		for (let c = 0; c < count; c++) {
			const done = splice(channelAt(host, c), cut, channelAt(other, c), joinAt, fade);
			out.push(done.samples);
			used = done.crossfade;
		}
		const made = await land(
			out,
			rate,
			ask.name?.trim() || `${take.replace(/\.wav$/, '')}-splice`
		);
		if (made) {
			const ms = Math.round((used / rate) * 1000);
			told = `Spliced to ${made.file_name} with a ${ms} ms equal-power join. Both takes are untouched.`;
		}
		return made;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return null;
	} finally {
		busy = null;
	}
}

export interface PunchAsk {
	/** The take recorded over the region, by file name on the shelf. */
	insertTake: string;
	/** The region on this lane, seconds into what it is playing. */
	inSecs: number;
	outSecs: number;
	/** The equal-power crossfade at each end, milliseconds. */
	crossfadeMs: number;
	name?: string | null;
}

/**
 * Put the recorded take into the region between the in and out points, with an
 * equal-power crossfade at both ends.
 */
async function punchLane(trackId: string, take: string, ask: PunchAsk): Promise<MadeTake | null> {
	if (!browser) return null;
	const host = mixStore.laneBuffer(trackId);
	if (!host) {
		error = 'this lane has not decoded yet';
		return null;
	}
	if (!(ask.outSecs > ask.inSecs)) {
		error = 'the out point must come after the in point';
		return null;
	}
	busy = trackId;
	error = null;
	try {
		const insert = await mixStore.decodeTake(ask.insertTake);
		const rate = host.sampleRate;
		const inAt = secsToSamples(ask.inSecs, rate);
		const outAt = secsToSamples(ask.outSecs, rate);
		const fade = msToSamples(ask.crossfadeMs, rate);
		const count = Math.max(host.numberOfChannels, insert.numberOfChannels);
		const out: Float32Array[] = [];
		let used = 0;
		for (let c = 0; c < count; c++) {
			const done = punchIn(channelAt(host, c), channelAt(insert, c), inAt, outAt, fade);
			out.push(done.samples);
			used = done.crossfade;
		}
		const made = await land(out, rate, ask.name?.trim() || `${take.replace(/\.wav$/, '')}-punch`);
		if (made) {
			const ms = Math.round((used / rate) * 1000);
			told = `Punched ${insert.duration.toFixed(2)} s into ${made.file_name} with a ${ms} ms join at each end. Both takes are untouched.`;
		}
		return made;
	} catch (e) {
		error = e instanceof Error ? e.message : String(e);
		return null;
	} finally {
		busy = null;
	}
}

export const spliceStore = {
	get busy() {
		return busy;
	},
	get error() {
		return error;
	},
	get told() {
		return told;
	},
	working(trackId: string): boolean {
		return busy === trackId;
	},
	spliceLane,
	punchLane,
	clearTold() {
		told = null;
	},
	clearError() {
		error = null;
	}
};
