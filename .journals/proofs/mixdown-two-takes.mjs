// PROOF — two takes bounce to one file on disk, through the encoder, at the
// length the offsets say.
//
// THE STUDIO, 2026-09-02. `node .journals/proofs/mixdown-two-takes.mjs` from the
// repo root. Prints one TRUE or FALSE per claim and exits non-zero on any FALSE.
//
// Two synthetic WAVs are generated HERE (a 440 Hz tone, 2.0 s, mono 48 kHz — the
// device's own rate, as a take would be; and a 660 Hz tone, 1.5 s, stereo 44.1 kHz),
// laid at offsets 0 and 1.0 s. The bounce runs through sistrum's own `bounce_to`
// (src-tauri/src/studio.rs) via its ignored test door, which is the same function
// the `mixdown` command calls after guarding names. The expected length is
// max(0 + 2.0, 1.0 + 1.5) = 2.5 s at the encoder's 44.1 kHz stereo.
//
// This compiles the harness in test mode the first time — the long part.

import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

let failed = false;
const claim = (name, ok) => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}`);
	if (!ok) failed = true;
};

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, '..', '..');
const manifest = join(repo, 'src-tauri', 'Cargo.toml');

/** 16-bit PCM WAV, the recorder's own seal, written by hand. */
function writeWav(path, { rate, channels, seconds, freq, amp = 0.5 }) {
	const frames = Math.round(rate * seconds);
	const data = Buffer.alloc(frames * channels * 2);
	for (let f = 0; f < frames; f++) {
		const v = Math.round(Math.sin((f / rate) * freq * 2 * Math.PI) * amp * 32767);
		for (let c = 0; c < channels; c++) data.writeInt16LE(v, (f * channels + c) * 2);
	}
	const header = Buffer.alloc(44);
	header.write('RIFF', 0);
	header.writeUInt32LE(36 + data.length, 4);
	header.write('WAVE', 8);
	header.write('fmt ', 12);
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20);
	header.writeUInt16LE(channels, 22);
	header.writeUInt32LE(rate, 24);
	header.writeUInt32LE(rate * channels * 2, 28);
	header.writeUInt16LE(channels * 2, 32);
	header.writeUInt16LE(16, 34);
	header.write('data', 36);
	header.writeUInt32LE(data.length, 40);
	writeFileSync(path, Buffer.concat([header, data]));
	return frames;
}

/** Read a WAV header and its samples back — enough to judge a bounce. */
function readWav(path) {
	const b = readFileSync(path);
	if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error('not a WAV');
	let at = 12;
	let fmt = null;
	let data = null;
	while (at + 8 <= b.length) {
		const id = b.toString('ascii', at, at + 4);
		const size = b.readUInt32LE(at + 4);
		if (id === 'fmt ') fmt = { channels: b.readUInt16LE(at + 10), rate: b.readUInt32LE(at + 12), bits: b.readUInt16LE(at + 22) };
		if (id === 'data') data = b.subarray(at + 8, at + 8 + size);
		at += 8 + size + (size % 2);
	}
	if (!fmt || !data) throw new Error('WAV without fmt or data');
	const frames = data.length / (fmt.channels * fmt.bits / 8);
	let peak = 0;
	let peakLate = 0;
	for (let i = 0; i < data.length; i += 2) {
		const v = Math.abs(data.readInt16LE(i)) / 32767;
		if (v > peak) peak = v;
		if (i > data.length * 0.85 && v > peakLate) peakLate = v;
	}
	return { ...fmt, frames, peak, peakLate };
}

const dir = mkdtempSync(join(tmpdir(), 'sistrum-mixdown-proof-'));
try {
	const a = join(dir, 'a-guitar.wav');
	const b = join(dir, 'b-voice.wav');
	writeWav(a, { rate: 48000, channels: 1, seconds: 2.0, freq: 440 });
	writeWav(b, { rate: 44100, channels: 2, seconds: 1.5, freq: 660 });
	claim('two synthetic takes generated on disk', existsSync(a) && existsSync(b));

	const spec = join(dir, 'spec.json');
	writeFileSync(
		spec,
		JSON.stringify([
			{ path: a, offset_secs: 0.0, volume: 1.0, pan: -0.5, fade_in: 0, fade_out: 0 },
			{ path: b, offset_secs: 1.0, volume: 0.8, pan: 0.5, fade_in: 0, fade_out: 0 }
		])
	);
	const out = join(dir, 'bounce.wav');

	const run = spawnSync(
		'cargo',
		['test', '--manifest-path', manifest, '--lib', 'proof_bounce_from_spec', '--', '--ignored', '--nocapture'],
		{ env: { ...process.env, STUDIO_PROOF_SPEC: spec, STUDIO_PROOF_OUT: out }, encoding: 'utf8', shell: true, cwd: repo }
	);
	const log = `${run.stdout ?? ''}${run.stderr ?? ''}`;
	claim('the bounce ran through studio.rs bounce_to (cargo test exit 0)', run.status === 0);
	if (run.status !== 0) console.log(log.split('\n').slice(-30).join('\n'));

	const frames = Number((log.match(/STUDIO_PROOF_FRAMES=(\d+)/) ?? [])[1] ?? NaN);
	const expected = 2.5 * 44100;
	claim(`the engine reports ~${expected} frames (got ${frames})`, Number.isFinite(frames) && Math.abs(frames - expected) < 4096);

	claim('the bounce is on disk', existsSync(out));
	const w = readWav(out);
	claim(`44.1 kHz stereo 16-bit — the encoder's contract (got ${w.rate} Hz, ${w.channels} ch, ${w.bits}-bit)`, w.rate === 44100 && w.channels === 2 && w.bits === 16);
	claim(`file length ≈ 2.5 s (max(0+2.0, 1.0+1.5)): ${w.frames} frames`, Math.abs(w.frames - expected) < 4096);
	claim(`not silent (peak ${w.peak.toFixed(3)})`, w.peak > 0.2);
	claim(`the second take is heard past the first take's end (late peak ${w.peakLate.toFixed(3)})`, w.peakLate > 0.2);
} finally {
	rmSync(dir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
