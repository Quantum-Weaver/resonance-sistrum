<script lang="ts">
	import { onMount } from 'svelte';
	import { tunerStore } from '$lib/stores/tuner.svelte';
	import { recorderStore } from '$lib/stores/recorder.svelte';
	import { QUANTUM_COLORS } from '$lib/cosmic';


	let selectedDevice = $state<string | null>(null);

	const listening = $derived(tunerStore.listening);
	const cents = $derived(tunerStore.cents);
	const heard = $derived(tunerStore.heard);

	const prefersReduced =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const band = $derived.by(() => {
		if (cents === null) return null;
		const a = Math.abs(cents);
		if (a < 5) return { word: 'in tune', color: QUANTUM_COLORS['sanctuary.green'] };
		if (a < 15) return { word: 'close', color: QUANTUM_COLORS['hearth.gold'] };
		return { word: 'keep turning', color: QUANTUM_COLORS['quantum.purple'] };
	});

	// 0% is -50 cents, 50% is centre, 100% is +50. Clamped.
	const markerPct = $derived(cents === null ? 50 : Math.min(100, Math.max(0, (cents / 50) * 50 + 50)));

	const levelPct = $derived(Math.min(100, tunerStore.rms * 400));

	function fmtCents(c: number): string {
		return `${c >= 0 ? '+' : '−'}${Math.abs(c).toFixed(1)}`;
	}

	async function toggle() {
		if (listening) await tunerStore.stop();
		else await tunerStore.start(selectedDevice);
	}

	onMount(() => {
		recorderStore.loadDevices();
		return () => {
			// Leaving closes the ear — an open microphone must never outlive the room that asked for it.
			void tunerStore.stop();
		};
	});
</script>

<svelte:head><title>Tuner</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1 class="page-title">Tuner</h1>
		<p class="page-sub">
			Nothing listens until you press Listen, and nothing you play here is recorded or kept — the
			pitch exists only in the moment it is heard.
		</p>
	</header>

	{#if tunerStore.error}
		<p class="tuner-error" role="alert">{tunerStore.error}</p>
	{/if}

	<div class="reading" aria-live="polite">
		{#if !listening}
			<p class="note-blank">Not listening</p>
			<p class="reading-word">Press Listen when you are ready.</p>
		{:else if heard && band && cents !== null}
			<p class="note" style="color: {band.color}">
				{tunerStore.note}<span class="octave">{tunerStore.octave}</span>
			</p>
			<p class="cents" style="color: {band.color}">
				{fmtCents(cents)} cents
			</p>
			<p class="reading-word" style="color: {band.color}">{band.word}</p>
		{:else}
			<p class="note-blank">—</p>
			<p class="reading-word">Listening. Nothing pitched yet.</p>
		{/if}
	</div>

	<div
		class="scale"
		role="img"
		aria-label={heard && cents !== null && band
			? `${tunerStore.note}${tunerStore.octave}, ${fmtCents(cents)} cents, ${band.word}`
			: 'No pitch heard'}
	>
		<div class="rail">
			<span class="tick" style="left: 0%"></span>
			<span class="tick" style="left: 25%"></span>
			<span class="tick centre" style="left: 50%"></span>
			<span class="tick" style="left: 75%"></span>
			<span class="tick" style="left: 100%"></span>
			{#if heard && band}
				<span
					class="marker"
					class:no-motion={prefersReduced}
					style="left: {markerPct}%; background: {band.color}; box-shadow: 0 0 12px {band.color}"
				></span>
			{/if}
		</div>
		<div class="scale-words">
			<span>−50</span>
			<span>−25</span>
			<span class="scale-centre">centre</span>
			<span>+25</span>
			<span>+50</span>
		</div>
	</div>

	<div class="level-row">
		<span class="level-word">Coming in</span>
		<div class="level" role="img" aria-label="How much sound is reaching the microphone">
			<div class="level-fill" class:no-motion={prefersReduced} style="width: {levelPct}%"></div>
		</div>
	</div>

	<div class="controls">
		<button class="press" onclick={toggle} disabled={tunerStore.starting}>
			{#if tunerStore.starting}
				Opening…
			{:else if listening}
				■ Stop listening
			{:else}
				● Listen
			{/if}
		</button>

		{#if !listening && recorderStore.devices.length > 0}
			<label class="field">
				<span class="field-word">Input</span>
				<select class="device-select" bind:value={selectedDevice}>
					<option value={null}>Default input</option>
					{#each recorderStore.devices as d (d.name)}
						<option value={d.name}>{d.name}{d.is_default ? ' (default)' : ''}</option>
					{/each}
				</select>
			</label>
		{/if}
	</div>

	{#if listening}
		<p class="live-device">
			{tunerStore.device}{tunerStore.sampleRate ? ` · ${tunerStore.sampleRate} Hz` : ''}
			{#if tunerStore.freq !== null}
				· {tunerStore.freq.toFixed(2)} Hz
			{/if}
		</p>
	{/if}

	<p class="keeping">
		An offset is information. There is nothing to score here and nothing to beat — where the note
		sits is simply where it sits, and you turn the peg until it sits where you want it.
	</p>
</div>

<style>
	.page {
		padding: 1rem 1.25rem 2rem;
		padding-top: calc(1rem + env(safe-area-inset-top, 0px));
	}

	.page-head {
		margin-bottom: 1.25rem;
	}

	.page-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: var(--text);
	}

	.page-sub {
		font-size: 0.82rem;
		color: var(--text-muted);
		margin: 0.25rem 0 0;
		max-width: 44rem;
		line-height: 1.5;
	}

	.tuner-error {
		color: #e17055;
		font-size: 0.9rem;
	}

	.reading {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.15rem;
		margin: 1.5rem 0 1rem;
		min-height: 9rem;
		justify-content: center;
	}

	.note {
		font-size: 4.5rem;
		font-weight: 200;
		line-height: 1;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	.octave {
		font-size: 2rem;
		font-weight: 300;
		margin-left: 0.15rem;
		opacity: 0.75;
	}

	.note-blank {
		font-size: 4.5rem;
		font-weight: 200;
		line-height: 1;
		margin: 0;
		color: var(--text-muted);
	}

	.cents {
		font-size: 1.35rem;
		font-weight: 300;
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

	.reading-word {
		font-size: 0.9rem;
		margin: 0.2rem 0 0;
		color: var(--text-secondary);
	}

	.scale {
		max-width: 34rem;
		margin: 0 auto;
	}

	.rail {
		position: relative;
		height: 44px;
		border-radius: 10px;
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
	}

	.tick {
		position: absolute;
		top: 10px;
		bottom: 10px;
		width: 1px;
		background: color-mix(in srgb, var(--text-muted) 45%, transparent);
		transform: translateX(-50%);
	}

	.tick.centre {
		top: 6px;
		bottom: 6px;
		width: 2px;
		background: color-mix(in srgb, var(--text-secondary) 70%, transparent);
	}

	.marker {
		position: absolute;
		top: 50%;
		width: 14px;
		height: 14px;
		border-radius: 50%;
		transform: translate(-50%, -50%);
		transition: left 90ms linear;
	}

	.marker.no-motion {
		transition: none;
	}

	.scale-words {
		display: flex;
		justify-content: space-between;
		margin-top: 0.35rem;
		font-size: 0.7rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.scale-centre {
		color: var(--text-secondary);
	}

	.level-row {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		max-width: 34rem;
		margin: 1.25rem auto 0;
	}

	.level-word {
		font-size: 0.76rem;
		color: var(--text-muted);
		flex-shrink: 0;
	}

	.level {
		flex: 1;
		height: 6px;
		border-radius: 3px;
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		overflow: hidden;
	}

	.level-fill {
		height: 100%;
		background: color-mix(in srgb, var(--accent) 70%, transparent);
		transition: width 120ms linear;
	}

	.level-fill.no-motion {
		transition: none;
	}

	.controls {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
		margin: 1.5rem 0 0.75rem;
	}

	.press {
		min-height: 44px;
		min-width: 10rem;
		padding: 0.7rem 1.4rem;
		border-radius: 24px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 0.98rem;
		font-weight: 600;
		cursor: pointer;
	}

	.press:hover:not(:disabled) {
		filter: brightness(1.08);
	}

	.press:disabled {
		opacity: 0.7;
		cursor: default;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.field-word {
		font-size: 0.76rem;
		color: var(--text-muted);
	}

	.device-select {
		width: min(320px, 100%);
		min-height: 44px;
		padding: 0.55rem 0.9rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text);
		font-size: 0.9rem;
		outline: none;
	}

	.device-select:focus {
		border-color: var(--accent);
	}

	.live-device {
		font-size: 0.82rem;
		color: var(--text-secondary);
		margin: 0 0 0.5rem;
		font-variant-numeric: tabular-nums;
	}

	.keeping {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 1rem 0 0;
		line-height: 1.55;
		max-width: 44rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.marker,
		.level-fill {
			transition: none;
		}
	}
</style>
