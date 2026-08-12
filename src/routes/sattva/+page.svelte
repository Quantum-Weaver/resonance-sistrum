<script lang="ts">
	// SATTVA — the regulation door.
	//
	// The MATH is carried verbatim from `the-breath`
	// (resonance-awen/tools/the-breath), the re-homed engine whose curves
	// were verified live to three decimals: the four-count rise, the count
	// opacity 0.04 → 0.21 by t=0.75 falling home after, the border's sine
	// pulse, warm amber in and deep violet out.
	//
	// The DOOR is Compass's Sattva door — full screen, tap or Enter or
	// Space or Escape to leave, the canvas glow behind, reduced motion
	// honoured by opening without moving.
	//
	// Inline rather than imported, exactly as Compass carries its own.
	// KP's law, 2026-07-30: "the rehoming should not mean extracting."
	// Compass's dressing room (theme, volume, the EQ and playlist
	// snapshots) stays app-side and is not copied — it belongs to a music
	// player. This app's room is quieter: the door simply opens.
	import { onDestroy, onMount } from 'svelte';
	import { goto } from '$app/navigation';

	type BreathDuration = '4-4' | '4-6' | '4-8' | '5-5';

	const BREATH_DURATIONS: Record<BreathDuration, [number, number]> = {
		'4-4': [8000, 8000],
		'4-6': [8000, 12000],
		'4-8': [8000, 16000],
		'5-5': [10000, 10000]
	};
	const PHASE_COLORS: [string, string] = ['#FDCB6E', '#6C5CE7'];
	const SETTINGS_KEY = 'sattva_settings';

	function loadDuration(): BreathDuration {
		try {
			const raw = localStorage.getItem(SETTINGS_KEY);
			const d = raw ? JSON.parse(raw)?.breathDuration : null;
			if (d && d in BREATH_DURATIONS) return d as BreathDuration;
		} catch {
			/* a broken preference is not a reason to refuse the door */
		}
		// 4-6: the longer exhale, which is the one that settles a nervous system.
		return '4-6';
	}

	function createBreath(duration: BreathDuration) {
		const durations = BREATH_DURATIONS[duration] ?? BREATH_DURATIONS['4-4'];
		let phaseIdx: 0 | 1 = 0;
		let phaseStartTime = 0;
		// The origin marked "unstarted" with phaseStartTime === 0, safe under
		// performance.now(). The re-homed engine gave it an explicit flag; that
		// mend is carried here too.
		let started = false;
		return {
			sample(nowMs: number) {
				if (!started) {
					phaseStartTime = nowMs;
					started = true;
				}
				const phaseDur = durations[phaseIdx];
				const t = Math.min(1, (nowMs - phaseStartTime) / phaseDur);
				const count = Math.min(4, Math.floor(t * 4) + 1);
				let countOpacity: number;
				if (t < 0.75) {
					countOpacity = 0.04 + (t / 0.75) * 0.17;
				} else {
					const ft = (t - 0.75) / 0.25;
					countOpacity = 0.21 - ft * 0.17;
				}
				const borderAlpha = 0.09 + Math.sin(t * Math.PI) * 0.09;
				const s = { phaseIdx, t, count, countOpacity, borderAlpha, color: PHASE_COLORS[phaseIdx] };
				if (t >= 1) {
					phaseIdx = phaseIdx === 0 ? 1 : 0;
					phaseStartTime = nowMs;
				}
				return s;
			}
		};
	}

	function hexToRgb(hex: string): [number, number, number] {
		const n = parseInt(hex.slice(1), 16);
		return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
	}

	type RoundRectCtx = CanvasRenderingContext2D & {
		roundRect?: (x: number, y: number, w: number, h: number, r: number) => void;
	};

	function drawSquarePulse(canvas: HTMLCanvasElement, color: string, alpha: number) {
		const ctx = canvas.getContext('2d') as RoundRectCtx | null;
		if (!ctx) return;
		const W = canvas.width;
		const H = canvas.height;
		ctx.clearRect(0, 0, W, H);
		if (alpha <= 0) return;
		const dim = Math.min(W, H);
		const sqSz = dim * 0.6;
		const x = (W - sqSz) / 2;
		const y = (H - sqSz) / 2;
		const cr = 10;
		const [r, g, b] = hexToRgb(color);
		ctx.save();
		ctx.shadowBlur = 36;
		ctx.shadowColor = `rgba(${r},${g},${b},${alpha * 0.6})`;
		ctx.beginPath();
		if (ctx.roundRect) ctx.roundRect(x, y, sqSz, sqSz, cr);
		else ctx.rect(x, y, sqSz, sqSz);
		ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.45})`;
		ctx.lineWidth = 6 + alpha * 6;
		ctx.stroke();
		ctx.shadowBlur = 14;
		ctx.shadowColor = `rgba(${r},${g},${b},${alpha})`;
		ctx.beginPath();
		if (ctx.roundRect) ctx.roundRect(x, y, sqSz, sqSz, cr);
		else ctx.rect(x, y, sqSz, sqSz);
		ctx.strokeStyle = `rgba(${r},${g},${b},${alpha * 0.85})`;
		ctx.lineWidth = 1.2;
		ctx.stroke();
		ctx.shadowBlur = 0;
		ctx.globalAlpha = alpha * 0.04;
		ctx.fillStyle = `rgb(${r},${g},${b})`;
		ctx.fill();
		ctx.restore();
	}

	let canvas = $state<HTMLCanvasElement | null>(null);
	let currentCount = $state(1);
	let countOpacity = $state(0.04);
	let phaseIdx = $state<0 | 1>(0);
	let visible = $state(false);
	let rafId = 0;
	let exiting = false;

	const prefersReduced =
		typeof window !== 'undefined' &&
		window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

	function frame() {
		const c = canvas;
		if (!c) return;
		if (c.width !== c.clientWidth || c.height !== c.clientHeight) {
			c.width = c.clientWidth;
			c.height = c.clientHeight;
		}
		const s = breath.sample(performance.now());
		drawSquarePulse(c, s.color, s.borderAlpha);
		currentCount = s.count;
		countOpacity = s.countOpacity;
		phaseIdx = s.phaseIdx;
		rafId = requestAnimationFrame(frame);
	}

	const breath = createBreath(loadDuration());

	function exitSattva() {
		if (exiting) return;
		exiting = true;
		if (rafId) cancelAnimationFrame(rafId);
		rafId = 0;
		visible = false;
		// A beat for the fade, then back where they were. history.back() would
		// bounce anyone who arrived here by link, so the nav's home is the
		// honest destination.
		setTimeout(() => goto('/'), prefersReduced ? 0 : 260);
	}

	onMount(() => {
		visible = true;
		if (!prefersReduced) rafId = requestAnimationFrame(frame);
		else countOpacity = 0.15;
	});

	onDestroy(() => {
		if (rafId) cancelAnimationFrame(rafId);
	});
</script>

<svelte:head><title>Sattva</title></svelte:head>

<div
	class="sattva"
	class:visible
	onclick={exitSattva}
	role="button"
	tabindex="0"
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') exitSattva();
	}}
	aria-label="Sattva — tap anywhere to leave"
>
	{#if !prefersReduced}
		<canvas bind:this={canvas} class="border-canvas" aria-hidden="true"></canvas>
	{/if}

	<div
		class="count-number"
		style="opacity: {countOpacity}; color: {PHASE_COLORS[phaseIdx]};"
		aria-hidden="true"
	>
		{prefersReduced ? '' : currentCount}
	</div>

	<p class="hint">tap anywhere when you're ready</p>
</div>

<style>
	.sattva {
		position: fixed;
		inset: 0;
		z-index: 200;
		display: grid;
		place-items: center;
		background: #0b0b12;
		cursor: pointer;
		opacity: 0;
		transition: opacity 260ms ease;
		border: none;
		padding: 0;
	}
	.sattva.visible {
		opacity: 1;
	}
	.border-canvas {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}
	.count-number {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		font-size: 22vmin;
		font-weight: 200;
		line-height: 1;
		user-select: none;
		pointer-events: none;
		transition: color 900ms ease;
	}
	.hint {
		position: absolute;
		bottom: max(2.5rem, env(safe-area-inset-bottom, 0px));
		font-size: 0.8rem;
		color: rgba(224, 224, 224, 0.28);
		letter-spacing: 0.02em;
		pointer-events: none;
	}
	@media (prefers-reduced-motion: reduce) {
		.sattva {
			transition: none;
		}
	}
</style>
