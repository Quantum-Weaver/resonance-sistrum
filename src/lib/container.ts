// container.ts — the chapterized container: a WAV that carries its own chapter
// marks, and the sidecar texts for the containers that cannot.
//
// A chapter mark is a point on the mix's clock with a title. In a WAV it is a
// `cue ` point plus a `labl` entry inside a `LIST`/`adtl` chunk — the marks ride
// inside the file, and a reader that knows neither chunk still opens the sound,
// because both sit AFTER the data chunk. For Opus in WebM or Ogg there is no
// muxer here, so the chapters leave beside the file as text.
//
// Pure arithmetic over typed arrays: no DOM, no Web Audio, no disk, and no
// imports, so the whole of it is provable in a node script. The WAV body is
// `encodeWav`'s (`src/lib/wav.ts`), handed in whole; this module only appends.

/** A point on the mix's clock, with the words a person gave it. */
export interface ChapterMark {
	/** Stable within the session. */
	id: string;
	/** Where the chapter begins on the mix's clock, in whole milliseconds. */
	at_ms: number;
	title: string;
}

const MAX_TITLE = 120;

/** Chapters in order, held inside the sound, deduped by position, titles trimmed. */
export function normalizeChapters(marks: ChapterMark[], lengthMs = Infinity): ChapterMark[] {
	const seen = new Set<number>();
	const out: ChapterMark[] = [];
	for (const m of marks) {
		const at = Math.max(0, Math.round(Number.isFinite(m.at_ms) ? m.at_ms : 0));
		if (at > lengthMs) continue;
		if (seen.has(at)) continue;
		seen.add(at);
		out.push({
			id: m.id,
			at_ms: at,
			title: String(m.title ?? '').trim().slice(0, MAX_TITLE)
		});
	}
	out.sort((a, b) => a.at_ms - b.at_ms);
	return out;
}

const ascii = (text: string): number[] => {
	const out: number[] = [];
	for (let i = 0; i < text.length; i++) out.push(text.charCodeAt(i) & 0xff);
	return out;
};

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

/** A RIFF chunk: four id bytes, a little-endian size, the body, and a pad byte to even. */
function chunk(id: string, body: Uint8Array): Uint8Array {
	const padded = body.length % 2 === 1 ? 1 : 0;
	const out = new Uint8Array(8 + body.length + padded);
	out.set(ascii(id), 0);
	new DataView(out.buffer).setUint32(4, body.length, true);
	out.set(body, 8);
	return out;
}

/** The `cue ` chunk: one 24-byte point per chapter, at its own frame in `data`. */
export function cueChunk(frames: number[]): Uint8Array {
	const body = new Uint8Array(4 + 24 * frames.length);
	const view = new DataView(body.buffer);
	view.setUint32(0, frames.length, true);
	for (let i = 0; i < frames.length; i++) {
		const at = 4 + i * 24;
		view.setUint32(at, i + 1, true); // the point's own name, matched by its label
		view.setUint32(at + 4, frames[i], true); // position in the play order
		body.set(ascii('data'), at + 8);
		view.setUint32(at + 12, 0, true); // chunk start — no wave list here
		view.setUint32(at + 16, 0, true); // block start — uncompressed, so zero
		view.setUint32(at + 20, frames[i], true); // the frame the mark sits on
	}
	return chunk('cue ', body);
}

/** The `LIST`/`adtl` chunk: one null-terminated `labl` per cue point. */
export function adtlChunk(titles: string[]): Uint8Array {
	const parts: Uint8Array[] = [new Uint8Array(ascii('adtl'))];
	for (let i = 0; i < titles.length; i++) {
		const text = utf8(titles[i]);
		const body = new Uint8Array(4 + text.length + 1);
		new DataView(body.buffer).setUint32(0, i + 1, true);
		body.set(text, 4);
		parts.push(chunk('labl', body));
	}
	let size = 0;
	for (const p of parts) size += p.length;
	const body = new Uint8Array(size);
	let at = 0;
	for (const p of parts) {
		body.set(p, at);
		at += p.length;
	}
	return chunk('LIST', body);
}

/**
 * A WAV with its chapters inside: the bytes as they came, then `cue ` and
 * `LIST`/`adtl`. The chunks sit after `data`, so a reader that stops at the
 * samples still opens the file whole. The rate and the frame count are read
 * from the bytes themselves; no mark may land past the end of the sound.
 */
export function chapterize(wav: Uint8Array, marks: ChapterMark[]): Uint8Array {
	const read = readContainer(wav);
	const rate = read.sampleRate > 0 ? read.sampleRate : 1;
	const chapters = normalizeChapters(marks, (read.frames / rate) * 1000);
	if (chapters.length === 0) return Uint8Array.from(wav);

	const frames = chapters.map((c) => Math.min(read.frames, Math.round((c.at_ms * rate) / 1000)));
	const cue = cueChunk(frames);
	const adtl = adtlChunk(chapters.map((c) => c.title));

	const out = new Uint8Array(wav.length + cue.length + adtl.length);
	out.set(wav, 0);
	out.set(cue, wav.length);
	out.set(adtl, wav.length + cue.length);
	// RIFF names everything after its own size field.
	new DataView(out.buffer).setUint32(4, out.length - 8, true);
	return out;
}

// ── Reading it back ─────────────────────────────────────────────────────────

export interface CuePoint {
	id: number;
	frame: number;
}

export interface ContainerRead {
	/** Every chunk id found, in file order. */
	chunks: string[];
	sampleRate: number;
	channels: number;
	frames: number;
	cues: CuePoint[];
	labels: Record<number, string>;
	chapters: ChapterMark[];
}

/** Every chunk of a RIFF/WAVE file, with the cue points and labels resolved. */
export function readContainer(bytes: Uint8Array): ContainerRead {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const id = (at: number) => String.fromCharCode(bytes[at], bytes[at + 1], bytes[at + 2], bytes[at + 3]);
	const out: ContainerRead = {
		chunks: [],
		sampleRate: 0,
		channels: 0,
		frames: 0,
		cues: [],
		labels: {},
		chapters: []
	};
	if (bytes.length < 12 || id(0) !== 'RIFF' || id(8) !== 'WAVE') {
		throw new Error('those bytes are not a RIFF/WAVE file');
	}

	let blockAlign = 0;
	let at = 12;
	while (at + 8 <= bytes.length) {
		const kind = id(at);
		const size = view.getUint32(at + 4, true);
		const body = at + 8;
		if (body + size > bytes.length) break;
		out.chunks.push(kind);
		if (kind === 'fmt ') {
			out.channels = view.getUint16(body + 2, true);
			out.sampleRate = view.getUint32(body + 4, true);
			blockAlign = view.getUint16(body + 12, true);
		} else if (kind === 'data') {
			out.frames = blockAlign > 0 ? Math.floor(size / blockAlign) : 0;
		} else if (kind === 'cue ') {
			const count = view.getUint32(body, true);
			for (let i = 0; i < count; i++) {
				const p = body + 4 + i * 24;
				out.cues.push({ id: view.getUint32(p, true), frame: view.getUint32(p + 20, true) });
			}
		} else if (kind === 'LIST' && id(body) === 'adtl') {
			let sub = body + 4;
			while (sub + 8 <= body + size) {
				const subKind = id(sub);
				const subSize = view.getUint32(sub + 4, true);
				if (subKind === 'labl' && subSize >= 4) {
					const name = view.getUint32(sub + 8, true);
					let end = sub + 8 + subSize;
					while (end > sub + 12 && bytes[end - 1] === 0) end--;
					out.labels[name] = new TextDecoder().decode(bytes.subarray(sub + 12, end));
				}
				sub += 8 + subSize + (subSize % 2);
			}
		}
		at = body + size + (size % 2);
	}

	const rate = out.sampleRate > 0 ? out.sampleRate : 1;
	out.chapters = out.cues.map((c) => ({
		id: String(c.id),
		at_ms: Math.round((c.frame * 1000) / rate),
		title: out.labels[c.id] ?? ''
	}));
	return out;
}

// ── The sidecars, for containers this app cannot mux ────────────────────────

const msToStamp = (ms: number): string => {
	const total = Math.max(0, Math.round(ms));
	const h = Math.floor(total / 3600000);
	const m = Math.floor((total % 3600000) / 60000);
	const s = Math.floor((total % 60000) / 1000);
	const rest = total % 1000;
	const pad = (v: number, n = 2) => String(v).padStart(n, '0');
	return `${pad(h)}:${pad(m)}:${pad(s)}.${pad(rest, 3)}`;
};

/** Chapters in the ffmetadata shape — the text every muxer that has chapters reads. */
export function chaptersFfmetadata(marks: ChapterMark[], lengthMs: number): string {
	const chapters = normalizeChapters(marks, lengthMs);
	const lines = [';FFMETADATA1'];
	for (let i = 0; i < chapters.length; i++) {
		const end = i + 1 < chapters.length ? chapters[i + 1].at_ms : Math.round(lengthMs);
		lines.push('', '[CHAPTER]', 'TIMEBASE=1/1000', `START=${chapters[i].at_ms}`, `END=${Math.max(chapters[i].at_ms, end)}`, `title=${chapters[i].title}`);
	}
	return `${lines.join('\n')}\n`;
}

/** Chapters as a WebVTT chapter track, for a player that takes one beside the sound. */
export function chaptersVtt(marks: ChapterMark[], lengthMs: number): string {
	const chapters = normalizeChapters(marks, lengthMs);
	const lines = ['WEBVTT', ''];
	for (let i = 0; i < chapters.length; i++) {
		const end = i + 1 < chapters.length ? chapters[i + 1].at_ms : Math.round(lengthMs);
		lines.push(
			String(i + 1),
			`${msToStamp(chapters[i].at_ms)} --> ${msToStamp(Math.max(chapters[i].at_ms, end))}`,
			chapters[i].title || `Chapter ${i + 1}`,
			''
		);
	}
	return lines.join('\n');
}
