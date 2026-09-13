// wav.ts — channels of Float32 samples to the bytes of a 16-bit PCM WAV, and
// those bytes to base64 for the one door that lands them on the shelf.
//
// The takes shelf holds WAV and only WAV. A repaired, spliced or punched lane
// is written here in the window and sent whole to `write_take_wav`, which makes
// a NEW take and never touches the one it came from.

/** A sample held inside the 16-bit range, rounded to the nearest step. */
function toPcm16(sample: number): number {
	const s = Math.max(-1, Math.min(1, sample));
	return Math.round(s < 0 ? s * 0x8000 : s * 0x7fff);
}

/** The bytes of a 16-bit PCM WAV: RIFF header, fmt chunk, data chunk. */
export function encodeWav(channels: Float32Array[], sampleRate: number): Uint8Array {
	const count = Math.max(1, channels.length);
	const frames = channels.length > 0 ? channels[0].length : 0;
	const rate = Math.max(1, Math.round(sampleRate));
	const blockAlign = count * 2;
	const dataBytes = frames * blockAlign;
	const bytes = new Uint8Array(44 + dataBytes);
	const view = new DataView(bytes.buffer);

	const ascii = (at: number, text: string) => {
		for (let i = 0; i < text.length; i++) bytes[at + i] = text.charCodeAt(i);
	};

	ascii(0, 'RIFF');
	view.setUint32(4, 36 + dataBytes, true);
	ascii(8, 'WAVE');
	ascii(12, 'fmt ');
	view.setUint32(16, 16, true);
	view.setUint16(20, 1, true);
	view.setUint16(22, count, true);
	view.setUint32(24, rate, true);
	view.setUint32(28, rate * blockAlign, true);
	view.setUint16(32, blockAlign, true);
	view.setUint16(34, 16, true);
	ascii(36, 'data');
	view.setUint32(40, dataBytes, true);

	let at = 44;
	for (let f = 0; f < frames; f++) {
		for (let c = 0; c < count; c++) {
			const channel = channels[c] ?? channels[0];
			view.setInt16(at, toPcm16(channel[f] ?? 0), true);
			at += 2;
		}
	}
	return bytes;
}

/** Bytes as base64, chunked so a long take does not overrun the call stack. */
export function bytesToBase64(bytes: Uint8Array): string {
	const chunk = 0x8000;
	let binary = '';
	for (let i = 0; i < bytes.length; i += chunk) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
	}
	return btoa(binary);
}
