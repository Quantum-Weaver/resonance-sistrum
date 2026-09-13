// PROOF — the bytes the window writes for a repaired, spliced or punched take
// are a readable 16-bit PCM WAV, and the samples come back.
//
// `node .journals/proofs/wav-bytes-round-trip.mjs` from the repo root. Prints
// one TRUE or FALSE per claim and exits non-zero on any FALSE. These bytes are
// what `write_take_wav` (src-tauri/src/studio.rs) lands on the shelf.

import { bytesToBase64, encodeWav } from '../../src/lib/wav.ts';

let failed = false;
const claim = (name, ok, measured = '') => {
	console.log(`${ok ? 'TRUE ' : 'FALSE'} — ${name}${measured ? ` (${measured})` : ''}`);
	if (!ok) failed = true;
};

const RATE = 48000;
const ascii = (bytes, at, n) => String.fromCharCode(...bytes.subarray(at, at + n));

const left = new Float32Array(1000);
const right = new Float32Array(1000);
for (let i = 0; i < 1000; i++) {
	left[i] = Math.sin((2 * Math.PI * 440 * i) / RATE) * 0.5;
	right[i] = -left[i];
}

const bytes = encodeWav([left, right], RATE);
const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

claim('the bytes open with RIFF and name WAVE', ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE');
claim('the size in the header is the rest of the file', view.getUint32(4, true) === bytes.length - 8, `${view.getUint32(4, true)}`);
claim('the format is uncompressed PCM', view.getUint16(20, true) === 1);
claim('the channel count is what went in', view.getUint16(22, true) === 2);
claim('the rate is what went in', view.getUint32(24, true) === RATE, `${view.getUint32(24, true)} Hz`);
claim('the samples are sixteen bits', view.getUint16(34, true) === 16);
claim('the byte rate is the rate times the block', view.getUint32(28, true) === RATE * 4);
claim('the data chunk names the sample bytes', ascii(bytes, 36, 4) === 'data' && view.getUint32(40, true) === 1000 * 4);
claim('the file is the header plus the samples', bytes.length === 44 + 1000 * 4, `${bytes.length} bytes`);

// The samples themselves, read back interleaved.
let worst = 0;
for (let i = 0; i < 1000; i++) {
	const l = view.getInt16(44 + i * 4, true) / 0x7fff;
	const r = view.getInt16(44 + i * 4 + 2, true) / 0x7fff;
	worst = Math.max(worst, Math.abs(l - left[i]), Math.abs(r - right[i]));
}
claim('every sample survives to within one sixteen-bit step', worst < 2 / 0x7fff, `worst ${worst.toExponential(2)}`);

// Past full scale is held, never wrapped.
const loud = new Float32Array([2, -2, 1, -1, 0]);
const loudBytes = encodeWav([loud], RATE);
const loudView = new DataView(loudBytes.buffer, loudBytes.byteOffset, loudBytes.byteLength);
claim('a sample past full scale is held at the top, not wrapped', loudView.getInt16(44, true) === 32767, `${loudView.getInt16(44, true)}`);
claim('a sample past full scale downward is held at the bottom', loudView.getInt16(46, true) === -32768, `${loudView.getInt16(46, true)}`);
claim('silence is silence', loudView.getInt16(52, true) === 0);

// Base64 is the road across the IPC; it must be the same bytes back.
const text = bytesToBase64(bytes);
const back = Uint8Array.from(atob(text), (c) => c.charCodeAt(0));
let same = back.length === bytes.length;
for (let i = 0; same && i < bytes.length; i++) if (back[i] !== bytes[i]) same = false;
claim('base64 carries the bytes whole', same, `${text.length} characters`);

process.exit(failed ? 1 : 0);
