// encode.ts — encode-out through what the platform itself offers, and an honest
// list of the walls.
//
// THE NO-FFMPEG PROMISE HOLDS: there is no encoder in this app and no native
// codec dependency. WAV is written here, sample by sample (`src/lib/wav.ts`).
// Everything else is the platform's own `MediaRecorder` — whatever the WebView
// already carries. Where it carries Opus, an Opus file lands. Where it carries
// nothing, WAV is the answer and the room says so.
//
// A MediaRecorder records a stream, so the master is played once through a
// MediaStreamAudioDestinationNode into it: the encode takes as long as the sound
// does, and nothing is heard, because that node is not the speakers.
//
// WebM and Ogg carry chapters only through a muxer this app does not have, so a
// chapterized encode leaves its chapters beside it as text (`src/lib/container.ts`).

import { browser } from '$app/environment';

export interface EncodeFormat {
	mime: string;
	extension: string;
	/** What the person reads. */
	word: string;
	supported: boolean;
	/** Named when the format is not on offer. */
	wall: string | null;
}

/** Every container asked of `MediaRecorder`, in the order the room offers them. */
const CANDIDATES: { mime: string; extension: string; word: string; wall: string }[] = [
	{
		mime: 'audio/webm;codecs=opus',
		extension: 'webm',
		word: 'Opus in WebM',
		wall: 'this WebView does not carry an Opus encoder'
	},
	{
		mime: 'audio/ogg;codecs=opus',
		extension: 'ogg',
		word: 'Opus in Ogg',
		wall: 'this WebView does not carry an Opus encoder'
	},
	{
		mime: 'audio/mp4;codecs=mp4a.40.2',
		extension: 'm4a',
		word: 'AAC in MP4',
		wall: 'AAC is a wall without a codec — no encoder ships in this app and this WebView offers none'
	},
	{
		mime: 'audio/mpeg',
		extension: 'mp3',
		word: 'MP3',
		wall: 'MP3 is a wall without a codec — no browser recorder writes it and no encoder ships in this app'
	}
];

const canAsk = () =>
	browser && typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function';

/** What the platform answers for each container, asked once per call. */
export function offeredFormats(): EncodeFormat[] {
	return CANDIDATES.map((c) => {
		let supported = false;
		if (canAsk()) {
			try {
				supported = MediaRecorder.isTypeSupported(c.mime);
			} catch {
				supported = false;
			}
		}
		return {
			mime: c.mime,
			extension: c.extension,
			word: c.word,
			supported,
			wall: supported ? null : c.wall
		};
	});
}

/** The first container the platform will write, or null when there is none. */
export function bestFormat(): EncodeFormat | null {
	return offeredFormats().find((f) => f.supported) ?? null;
}

export interface EncodeProgress {
	secondsDone: number;
	secondsTotal: number;
}

export interface EncodeResult {
	bytes: Uint8Array;
	mime: string;
	extension: string;
	seconds: number;
}

/**
 * The samples played once into a recorder and caught as bytes. Nothing is heard:
 * the stream node is not the destination. It takes as long as the sound does,
 * because the platform's recorder is a real-time recorder.
 */
export async function encodeSamples(
	channels: Float32Array[],
	rate: number,
	format: EncodeFormat,
	onProgress?: (p: EncodeProgress) => void,
	signal?: AbortSignal
): Promise<EncodeResult> {
	if (!browser) throw new Error('an encode needs a window');
	if (!format.supported) throw new Error(format.wall ?? 'that container is not on offer here');
	const frames = channels.length > 0 ? channels[0].length : 0;
	if (frames === 0) throw new Error('there is nothing to encode');

	const ctx = new AudioContext({ sampleRate: Math.max(8000, Math.round(rate)) });
	const seconds = frames / ctx.sampleRate;
	try {
		const buffer = ctx.createBuffer(Math.max(1, channels.length), frames, ctx.sampleRate);
		for (let c = 0; c < buffer.numberOfChannels; c++) {
			buffer.getChannelData(c).set(channels[Math.min(c, channels.length - 1)]);
		}

		const sink = ctx.createMediaStreamDestination();
		const source = ctx.createBufferSource();
		source.buffer = buffer;
		source.connect(sink);

		const recorder = new MediaRecorder(sink.stream, { mimeType: format.mime });
		const parts: BlobPart[] = [];
		recorder.ondataavailable = (e) => {
			if (e.data && e.data.size > 0) parts.push(e.data);
		};

		const done = new Promise<void>((resolve, reject) => {
			recorder.onstop = () => resolve();
			recorder.onerror = () => reject(new Error('the recorder stopped on its own'));
			source.onended = () => {
				if (recorder.state !== 'inactive') recorder.stop();
			};
			signal?.addEventListener('abort', () => {
				try {
					source.stop();
				} catch {
					/* already ended */
				}
				if (recorder.state !== 'inactive') recorder.stop();
				reject(new Error('the encode was stopped'));
			});
		});

		const startedAt = ctx.currentTime;
		let ticker: ReturnType<typeof setInterval> | null = null;
		if (onProgress) {
			ticker = setInterval(() => {
				onProgress({ secondsDone: Math.min(seconds, ctx.currentTime - startedAt), secondsTotal: seconds });
			}, 250);
		}

		recorder.start();
		source.start();
		try {
			await done;
		} finally {
			if (ticker) clearInterval(ticker);
		}

		const blob = new Blob(parts, { type: format.mime });
		return {
			bytes: new Uint8Array(await blob.arrayBuffer()),
			mime: format.mime,
			extension: format.extension,
			seconds
		};
	} finally {
		await ctx.close().catch(() => {});
	}
}
