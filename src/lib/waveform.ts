// waveform.ts — sound made visible, and the scrub that reads it.
//
// ADAPTED FROM THE SPRING (`the-waveform`, resonance-awen), Phase 3 Wave 1,
// 2026-08-13, an Opus hand. The tool stays where it lives and was not touched;
// what crossed is its shape. Two changes, both because this is an app on a
// filesystem rather than a page with a decoded buffer:
//
//   · `computePeaks` did not come — the fold happens in Rust (see
//     src-tauri/src/waveform.rs), streaming off the main thread, because the
//     samples are a file here and a five-minute take is ~57 MB of them. What
//     arrives is the finished fold: two parallel Float arrays, min and max.
//
//   · `drawWaveform` takes those two arrays instead of an array of pair
//     objects. The drawing is otherwise the spring's own, floor and all.
//
// The pure mappings below are the spring's exactly, character for character in
// behavior: they round-trip, and they clamp.

/** A pointer x on a width-wide view → seconds into a duration. Clamped. */
export function positionToSeconds(x: number, width: number, durationSecs: number): number {
	if (width <= 0 || durationSecs <= 0) return 0;
	return Math.min(durationSecs, Math.max(0, (x / width) * durationSecs));
}

/** Seconds into a duration → the x it lives at on a width-wide view. Clamped. */
export function secondsToPosition(secs: number, width: number, durationSecs: number): number {
	if (width <= 0 || durationSecs <= 0) return 0;
	return Math.min(width, Math.max(0, (secs / durationSecs) * width));
}

export interface WaveformStyle {
	/** The sound already heard. */
	played: string;
	/** The sound still to come. */
	unplayed: string;
	/** The playhead line; omit to draw none. */
	playhead?: string;
	/** Background; omit to leave the canvas as it is. */
	background?: string;
	/** Vertical fill 0..1 — how much of the height the loudest peak uses. Default 0.9. */
	verticalFill?: number;
	/** Minimum visible line height in px so silence still shows a hairline. Default 1. */
	floorPx?: number;
}

/**
 * Draw a take's shape onto a canvas with a progress position. Call it again
 * whenever progress moves — it repaints whole, cheap at canvas scale.
 *
 * SILENCE STILL SHOWS A HAIRLINE. That is the spring's floor and it is not
 * decoration: a quiet passage is sound that happened, and a take that draws as
 * nothing reads as a take that failed. Quiet is visible rather than absent.
 *
 * Reduced-motion is the caller's gate, as everywhere in the family.
 */
export function drawWaveform(
	canvas: HTMLCanvasElement,
	min: number[],
	max: number[],
	progress: number, // 0..1
	style: WaveformStyle
) {
	const ctx = canvas.getContext('2d');
	if (!ctx) return;
	const W = canvas.width;
	const H = canvas.height;
	const mid = H / 2;
	const fill = (style.verticalFill ?? 0.9) * mid;
	const floor = style.floorPx ?? 1;

	if (style.background) {
		ctx.fillStyle = style.background;
		ctx.fillRect(0, 0, W, H);
	} else {
		ctx.clearRect(0, 0, W, H);
	}

	const columns = Math.min(min.length, max.length);
	if (columns === 0) return;

	const colW = W / columns;
	const playedCols = Math.floor(progress * columns);
	for (let i = 0; i < columns; i++) {
		const top = mid - Math.max(floor / 2, max[i] * fill);
		const bottom = mid + Math.max(floor / 2, -min[i] * fill);
		ctx.fillStyle = i < playedCols ? style.played : style.unplayed;
		ctx.fillRect(i * colW, top, Math.max(1, colW - 0.5), bottom - top);
	}

	if (style.playhead) {
		const x = progress * W;
		ctx.fillStyle = style.playhead;
		ctx.fillRect(x - 1, 0, 2, H);
	}
}
