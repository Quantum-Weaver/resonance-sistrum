// PROOF — a chapterized WAV carries its chapters inside it, in the chunks a
// RIFF reader knows, and parses back to exactly the marks that went in.
//
// `node .journals/proofs/chapters-in-a-wav.mjs` from the repo root. Prints one
// TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// The body is `encodeWav`'s, unchanged. `chapterize` appends a `cue ` chunk and
// a `LIST`/`adtl` chunk of `labl` entries AFTER the data chunk, which is what
// lets `write_take_wav` (src-tauri/src/studio.rs) land it as an ordinary take:
// hound reads fmt, then data, and ignores whatever follows.

import {
	adtlChunk,
	chapterize,
	chaptersFfmetadata,
	chaptersVtt,
	cueChunk,
	normalizeChapters,
	readContainer
} from '../../src/lib/container.ts';
import { encodeWav } from '../../src/lib/wav.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};

const RATE = 44100;
const SECS = 30;
const frames = RATE * SECS;

const left = new Float32Array(frames);
const right = new Float32Array(frames);
for (let i = 0; i < frames; i++) {
	left[i] = 0.3 * Math.sin((2 * Math.PI * 220 * i) / RATE);
	right[i] = -left[i];
}

const plain = encodeWav([left, right], RATE);
const marks = [
	{ id: 'c1', at_ms: 0, title: 'The opening' },
	{ id: 'c2', at_ms: 7500, title: 'A turn' },
	{ id: 'c3', at_ms: 21000, title: 'Coda — with a dash' }
];
const bytes = chapterize(plain, marks);
const back = readContainer(bytes);

// ── The chunks ──────────────────────────────────────────────────────────────

claim('the chunks are fmt, data, cue and LIST, in that order',
	back.chunks.join(',') === 'fmt ,data,cue ,LIST', `${back.chunks.join(', ')}`);
claim('the chapters sit AFTER the samples, so a reader that stops at data still opens it',
	back.chunks.indexOf('data') < back.chunks.indexOf('cue '));
// Only the RIFF size field moves: it must name the longer file. Everything
// else the plain WAV said — header, fmt, data and every sample — is untouched.
const moved = [];
for (let i = 0; i < plain.length; i++) if (bytes[i] !== plain[i]) moved.push(i);
claim('the only byte of the plain WAV that changes is its RIFF size',
	bytes.length > plain.length && moved.every((i) => i >= 4 && i < 8),
	`${moved.length} bytes moved, at ${moved.join(', ')}; ${plain.length - moved.length} of ${bytes.length} unchanged`);

const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
claim('the RIFF size names the whole file', view.getUint32(4, true) === bytes.length - 8,
	`${view.getUint32(4, true)} against ${bytes.length - 8}`);
claim('the fmt chunk still says what it said', back.sampleRate === RATE && back.channels === 2,
	`${back.sampleRate} Hz, ${back.channels} channels`);
claim('the data chunk still holds every frame', back.frames === frames, `${back.frames} frames`);

// ── The cue points ──────────────────────────────────────────────────────────

claim('there is one cue point per chapter', back.cues.length === marks.length,
	`${back.cues.length} points`);
claim('each cue point sits on the frame its millisecond names',
	back.cues.every((c, i) => c.frame === Math.round((marks[i].at_ms * RATE) / 1000)),
	back.cues.map((c) => c.frame).join(', '));
claim('the cue points are named 1, 2, 3', back.cues.map((c) => c.id).join(',') === '1,2,3');

// ── The labels ──────────────────────────────────────────────────────────────

claim('every label comes back, matched to its own cue point by name',
	back.cues.every((c, i) => back.labels[c.id] === marks[i].title),
	Object.values(back.labels).map((t) => `"${t}"`).join(', '));
claim('and the chapters read back exactly as they went in',
	back.chapters.length === marks.length &&
		back.chapters.every((c, i) => c.at_ms === marks[i].at_ms && c.title === marks[i].title),
	back.chapters.map((c) => `${c.at_ms}ms "${c.title}"`).join(' · '));

// A title whose byte count is odd must still leave the next chunk on an even
// boundary — the RIFF pad byte, which the size field does not count.
const odd = chapterize(plain, [
	{ id: 'a', at_ms: 1000, title: 'odd' },
	{ id: 'b', at_ms: 2000, title: 'even!' }
]);
const oddBack = readContainer(odd);
claim('an odd-length title is padded and the chunk after it still parses',
	oddBack.chunks.join(',') === 'fmt ,data,cue ,LIST' &&
		oddBack.chapters.map((c) => c.title).join(',') === 'odd,even!',
	oddBack.chapters.map((c) => c.title).join(', '));

const unicode = readContainer(chapterize(plain, [{ id: 'u', at_ms: 500, title: 'Préambule · 序章 🎻' }]));
claim('a title outside ASCII survives whole, as UTF-8',
	unicode.chapters[0]?.title === 'Préambule · 序章 🎻', `"${unicode.chapters[0]?.title}"`);

// ── What is refused, dropped and ordered ────────────────────────────────────

const messy = normalizeChapters(
	[
		{ id: 'z', at_ms: 9000, title: '  spaced  ' },
		{ id: 'y', at_ms: 1000, title: 'first' },
		{ id: 'x', at_ms: 1000, title: 'a duplicate at the same moment' },
		{ id: 'w', at_ms: -50, title: 'before the start' },
		{ id: 'v', at_ms: 999999, title: 'past the end' }
	],
	SECS * 1000
);
claim('marks come back in order of time', messy.map((c) => c.at_ms).join(',') === '0,1000,9000',
	messy.map((c) => c.at_ms).join(', '));
claim('a second mark at the same millisecond is dropped', messy.filter((c) => c.at_ms === 1000).length === 1);
claim('a mark before the start is held at zero', messy[0].at_ms === 0);
claim('a mark past the end of the sound is dropped', !messy.some((c) => c.title === 'past the end'));
claim('a title is trimmed of its spaces', messy[2].title === 'spaced', `"${messy[2].title}"`);

claim('a WAV with no chapters is the plain WAV, unchanged',
	chapterize(plain, []).length === plain.length);
claim('bytes that are not RIFF/WAVE are refused, not guessed at', (() => {
	try {
		readContainer(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]));
		return false;
	} catch {
		return true;
	}
})());

// ── The chunks built on their own ───────────────────────────────────────────

const cue = cueChunk([0, 100, 200]);
claim('a cue chunk is eight header bytes, a count, and twenty-four per point',
	cue.length === 8 + 4 + 24 * 3, `${cue.length} bytes`);
const adtl = adtlChunk(['one', 'two']);
claim('an adtl list names itself and holds a labl per title',
	String.fromCharCode(...adtl.subarray(0, 4)) === 'LIST' &&
		String.fromCharCode(...adtl.subarray(8, 12)) === 'adtl',
	`${adtl.length} bytes`);

// ── The sidecars, for the containers that cannot carry chapters ─────────────

const meta = chaptersFfmetadata(marks, SECS * 1000);
claim('the ffmetadata sidecar opens with its own marker', meta.startsWith(';FFMETADATA1\n'));
claim('it carries one CHAPTER block per mark, on a millisecond timebase',
	(meta.match(/\[CHAPTER\]/g) ?? []).length === 3 && meta.includes('TIMEBASE=1/1000'));
claim('each block names where it starts, where it ends and what it is called',
	meta.includes('START=7500') && meta.includes('END=21000') && meta.includes('title=A turn'));
claim('the last chapter ends where the sound does',
	meta.includes(`START=21000`) && meta.includes(`END=${SECS * 1000}`));

const vtt = chaptersVtt(marks, SECS * 1000);
claim('the WebVTT sidecar opens with WEBVTT', vtt.startsWith('WEBVTT\n'));
claim('its cues are stamped to the millisecond',
	vtt.includes('00:00:07.500 --> 00:00:21.000'),
	vtt.split('\n').find((l) => l.includes('-->')));
claim('and each cue carries the chapter’s own words', vtt.includes('Coda — with a dash'));

process.exit(failed ? 1 : 0);
