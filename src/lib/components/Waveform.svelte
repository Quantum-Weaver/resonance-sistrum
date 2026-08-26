<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { drawWaveform, positionToSeconds } from '$lib/waveform';


	interface TakeShape {
		min: number[];
		max: number[];
		seconds: number;
		sample_rate: number;
		channels: number;
		columns: number;
	}

	let {
		fileName,
		progress = 0,
		duration = 0,
		onscrub,
		height = 72
	}: {
		fileName: string;
		/** 0..1 — where the sound has reached. */
		progress?: number;
		/** The take's length, for the scrub's arithmetic. */
		duration?: number;
		/** A hand moved the playhead. Seconds, already clamped. */
		onscrub?: (secs: number) => void;
		height?: number;
	} = $props();

	let canvas = $state<HTMLCanvasElement | null>(null);
	let wrap = $state<HTMLDivElement | null>(null);
	let shape = $state<TakeShape | null>(null);
	let shapeError = $state<string | null>(null);
	let loading = $state(false);
	let cssWidth = $state(0);
	let scrubbing = $state(false);

	// Asked once per take per width — re-reading the WAV on every resize is the freeze all over again.
	let asked = '';

	async function loadShape(name: string, columns: number) {
		const key = `${name}@${columns}`;
		if (asked === key) return;
		asked = key;
		loading = true;
		shapeError = null;
		try {
			shape = await invoke<TakeShape>('take_shape', { fileName: name, buckets: columns });
		} catch (e) {
			shapeError = e instanceof Error ? e.message : String(e);
			shape = null;
		} finally {
			loading = false;
		}
	}

	const dpr = $derived(typeof window !== 'undefined' ? Math.min(3, window.devicePixelRatio || 1) : 1);
	const columns = $derived(Math.max(1, Math.round(cssWidth * dpr)));

	$effect(() => {
		const name = fileName;
		const c = columns;
		if (!name || c <= 1) return;
		void loadShape(name, c);
	});

	$effect(() => {
		const el = canvas;
		const s = shape;
		const p = progress;
		if (!el) return;

		const w = Math.max(1, Math.round(cssWidth * dpr));
		const h = Math.max(1, Math.round(height * dpr));
		if (el.width !== w) el.width = w;
		if (el.height !== h) el.height = h;

		const styles = getComputedStyle(el);
		const played = styles.getPropertyValue('--wave-played').trim() || '#6C5CE7';
		const unplayed = styles.getPropertyValue('--wave-unplayed').trim() || '#555';
		const playhead = styles.getPropertyValue('--wave-playhead').trim() || '#fff';

		if (!s) {
			const ctx = el.getContext('2d');
			ctx?.clearRect(0, 0, el.width, el.height);
			return;
		}

		drawWaveform(el, s.min, s.max, p, {
			played,
			unplayed,
			playhead,
			floorPx: Math.max(1, dpr),
			verticalFill: 0.9
		});
	});

	function measure() {
		if (wrap) cssWidth = wrap.clientWidth;
	}

	$effect(() => {
		measure();
		if (typeof window === 'undefined') return;
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	});

	function scrubTo(clientX: number) {
		if (!wrap || !onscrub) return;
		const rect = wrap.getBoundingClientRect();
		const secs = positionToSeconds(clientX - rect.left, rect.width, duration);
		onscrub(secs);
	}

	function onPointerDown(e: PointerEvent) {
		if (!onscrub || duration <= 0) return;
		scrubbing = true;
		(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
		scrubTo(e.clientX);
	}

	function onPointerMove(e: PointerEvent) {
		if (!scrubbing) return;
		scrubTo(e.clientX);
	}

	function onPointerUp(e: PointerEvent) {
		if (!scrubbing) return;
		scrubbing = false;
		(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
	}

	function onKeyDown(e: KeyboardEvent) {
		if (!onscrub || duration <= 0) return;
		const here = progress * duration;
		const step = e.shiftKey ? 10 : 1;
		if (e.key === 'ArrowLeft') {
			e.preventDefault();
			onscrub(Math.max(0, here - step));
		} else if (e.key === 'ArrowRight') {
			e.preventDefault();
			onscrub(Math.min(duration, here + step));
		} else if (e.key === 'Home') {
			e.preventDefault();
			onscrub(0);
		} else if (e.key === 'End') {
			e.preventDefault();
			onscrub(duration);
		}
	}
</script>

<div
	class="wave-wrap"
	bind:this={wrap}
	style="height: {height}px;"
	role="slider"
	tabindex="0"
	aria-label="Position in the take"
	aria-valuemin={0}
	aria-valuemax={Math.round(duration)}
	aria-valuenow={Math.round(progress * duration)}
	aria-valuetext="{Math.floor((progress * duration) / 60)} minutes {Math.floor(
		(progress * duration) % 60
	)} seconds"
	onpointerdown={onPointerDown}
	onpointermove={onPointerMove}
	onpointerup={onPointerUp}
	onpointercancel={onPointerUp}
	onkeydown={onKeyDown}
>
	<canvas bind:this={canvas} style="width: 100%; height: {height}px;"></canvas>

	{#if loading && !shape}
		<span class="wave-word">Reading the shape…</span>
	{:else if shapeError}
		<span class="wave-word">The shape did not come: {shapeError}</span>
	{/if}
</div>

<style>
	.wave-wrap {
		position: relative;
		width: 100%;
		border-radius: 10px;
		background: var(--bg);
		border: 1px solid var(--border-color);
		overflow: hidden;
		cursor: pointer;
		touch-action: none;
		--wave-played: var(--accent);
		--wave-unplayed: color-mix(in srgb, var(--text-muted) 55%, transparent);
		--wave-playhead: var(--text);
	}

	.wave-wrap:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	canvas {
		display: block;
	}

	.wave-word {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
		color: var(--text-muted);
		pointer-events: none;
		padding: 0 0.75rem;
		text-align: center;
	}
</style>
