<script lang="ts">
	import { onMount } from 'svelte';
	import { metronomeStore, SUBDIVISIONS, type Subdivision } from '$lib/stores/metronome.svelte';

	// THE METRONOME ROOM — Phase 3 Wave 2 (2026-08-13, an **Opus** hand).
	// `the-metronome` consumed: the beat clock, the tap tempo (median of the
	// phrase) and the lookahead click scheduler booked on the AUDIO clock.
	//
	// THE LAWS ON THIS PAGE, none of them softened:
	//
	//   · NEVER A BUZZER. A soft sine tap, gentle attack, round decay, at every
	//     tempo. The downbeat sits a fifth above the beat — a landmark, not an
	//     alarm.
	//   · SILENCE IS A CHOICE WITH THE PULSE STILL RUNNING. Volume zero books
	//     no sound and stops nothing else; the room says so in words rather
	//     than leaving a musician wondering whether it broke.
	//   · NO URGENCY ANYWHERE. No countdown, no "get ready", no flash at speed,
	//     no red, nothing that hurries anyone. A metronome states the time.
	//   · REDUCED MOTION IS HONORED ON THE PULSE — and honored by removing the
	//     MOTION, never the information: the beat count and the bar keep
	//     advancing, drawn as a steady state rather than a swell.
	//   · Every face wears its word, and 44px is the floor.

	const running = $derived(metronomeStore.running);
	const beatsPerBar = $derived(metronomeStore.beatsPerBar);
	const beatInBar = $derived(metronomeStore.beatInBar);

	const prefersReduced =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	// The pulse swells at the top of each beat and settles across it. With
	// reduced motion it does not swell at all — the lit beat is simply lit.
	const pulseScale = $derived.by(() => {
		if (!running || prefersReduced) return 1;
		const p = metronomeStore.phase;
		return 1 + 0.16 * Math.max(0, 1 - p * 3.2);
	});

	const pulseOpacity = $derived.by(() => {
		if (!running) return 0.35;
		if (prefersReduced) return 0.9;
		const p = metronomeStore.phase;
		return 0.55 + 0.45 * Math.max(0, 1 - p * 2.4);
	});

	function nudge(by: number) {
		metronomeStore.setBpm(metronomeStore.bpm + by);
	}

	onMount(() => {
		metronomeStore.load();
		return () => {
			// Leaving stops the pulse. Sound that follows you out of a room you
			// left is sound nobody asked for — the player's own reasoning.
			metronomeStore.stop();
		};
	});
</script>

<svelte:head><title>Metronome</title></svelte:head>

<div class="page">
	<header class="page-head">
		<h1 class="page-title">Metronome</h1>
		<p class="page-sub">Time you can see. Nothing here is recorded, and nothing hurries you.</p>
	</header>

	{#if metronomeStore.error}
		<p class="met-error" role="alert">{metronomeStore.error}</p>
	{/if}

	<!-- THE PULSE. It runs whenever the metronome runs, whatever the volume is
	     — that is the law, and it is why the visual is here and not merely a
	     decoration on the sound. -->
	<div class="pulse-area">
		<div
			class="pulse"
			class:running
			class:downbeat={running && beatInBar === 0}
			style="transform: scale({pulseScale}); opacity: {pulseOpacity}"
			aria-hidden="true"
		></div>
		<p class="count" aria-live="off">
			{running ? beatInBar + 1 : '—'}<span class="count-of">/{beatsPerBar}</span>
		</p>
	</div>

	<!-- The bar, as beads. A place in the bar, drawn plainly. -->
	<div class="beads" role="img" aria-label="Beat {running ? beatInBar + 1 : 0} of {beatsPerBar}">
		{#each Array(beatsPerBar) as _, i (i)}
			<span class="bead" class:lit={running && i === beatInBar} class:first={i === 0}></span>
		{/each}
	</div>

	{#if running && metronomeStore.silenced}
		<p class="silence-note">
			The click is silent by your choice. The pulse is still running, and the count is still
			counting — silence is a decision about sound, not about time.
		</p>
	{/if}

	<div class="transport">
		<button class="press" onclick={() => metronomeStore.toggle()}>
			{running ? '■ Stop' : '▶ Start'}
		</button>
		<button class="plain tap" onclick={() => metronomeStore.tap()}>Tap tempo</button>
		{#if metronomeStore.tapCount > 0}
			<span class="tap-read">
				{metronomeStore.tapCount}
				{metronomeStore.tapCount === 1 ? 'tap' : 'taps'}{#if metronomeStore.tapReading}
					· {Math.round(metronomeStore.tapReading)} BPM{/if}
			</span>
			<button class="plain small" onclick={() => metronomeStore.resetTap()}>Clear taps</button>
		{/if}
	</div>

	<p class="tap-note">
		Tap tempo reads the <strong>median</strong> of the phrase you tap, so one stumbled tap does not
		yank the tempo. Leave it more than two seconds and it starts a fresh phrase rather than
		averaging across the gap.
	</p>

	<section class="control" aria-label="Tempo">
		<div class="control-head">
			<span class="control-word">Tempo</span>
			<span class="control-read">{metronomeStore.bpm} BPM</span>
		</div>
		<div class="tempo-row">
			<button class="plain small" onclick={() => nudge(-5)} aria-label="Five slower">−5</button>
			<button class="plain small" onclick={() => nudge(-1)} aria-label="One slower">−1</button>
			<input
				type="range"
				min="20"
				max="300"
				step="1"
				value={metronomeStore.bpm}
				oninput={(e) => metronomeStore.setBpm(Number(e.currentTarget.value))}
				aria-label="Tempo in beats per minute"
			/>
			<button class="plain small" onclick={() => nudge(1)} aria-label="One faster">+1</button>
			<button class="plain small" onclick={() => nudge(5)} aria-label="Five faster">+5</button>
		</div>
	</section>

	<section class="control" aria-label="Beats in a bar">
		<div class="control-head">
			<span class="control-word">Beats in a bar</span>
			<span class="control-read">{beatsPerBar}</span>
		</div>
		<div class="chip-row" role="group" aria-label="Beats in a bar">
			{#each [2, 3, 4, 5, 6, 7] as n (n)}
				<button
					class="chip"
					class:chosen={beatsPerBar === n}
					aria-pressed={beatsPerBar === n}
					onclick={() => metronomeStore.setBeatsPerBar(n)}
				>
					{n}
				</button>
			{/each}
		</div>
	</section>

	<section class="control" aria-label="Subdivision">
		<div class="control-head">
			<span class="control-word">Subdivision</span>
		</div>
		<div class="chip-row" role="group" aria-label="Subdivision">
			{#each SUBDIVISIONS as s (s.value)}
				<button
					class="chip"
					class:chosen={metronomeStore.subdivision === s.value}
					aria-pressed={metronomeStore.subdivision === s.value}
					onclick={() => metronomeStore.setSubdivision(s.value as Subdivision)}
				>
					{s.label}
				</button>
			{/each}
		</div>
	</section>

	<section class="control" aria-label="Click volume">
		<div class="control-head">
			<span class="control-word">Click</span>
			<span class="control-read">
				{metronomeStore.silenced ? 'silent' : `${Math.round(metronomeStore.volume * 100)}%`}
			</span>
		</div>
		<div class="volume-row">
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={metronomeStore.volume}
				oninput={(e) => metronomeStore.setVolume(Number(e.currentTarget.value))}
				aria-label="Click volume — zero is a chosen silence and the pulse keeps running"
			/>
			<button class="plain small" onclick={() => metronomeStore.setVolume(0)}>Silence it</button>
		</div>
		<p class="control-note">
			Zero is a choice, not a fault — the pulse keeps running and the count keeps counting.
		</p>
	</section>

	<p class="keeping">
		The click is booked on the audio clock rather than the screen's, so it stays honest while the
		window is busy. The downbeat sits a fifth above the beat: a landmark, never an alarm.
	</p>
</div>

<style>
	.page {
		padding: 1rem 1.25rem 2rem;
		padding-top: calc(1rem + env(safe-area-inset-top, 0px));
	}

	.page-head {
		margin-bottom: 1rem;
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

	.met-error {
		color: #e17055;
		font-size: 0.9rem;
	}

	.pulse-area {
		position: relative;
		display: grid;
		place-items: center;
		height: 11rem;
		margin: 0.5rem 0 0.25rem;
	}

	.pulse {
		width: 7.5rem;
		height: 7.5rem;
		border-radius: 50%;
		background: color-mix(in srgb, var(--accent) 22%, transparent);
		border: 2px solid color-mix(in srgb, var(--accent) 55%, transparent);
		/* No transition: the swell is sampled per frame from the beat clock, so
		   a CSS transition would fight the arithmetic rather than help it. */
	}

	.pulse.downbeat {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 30%, transparent);
	}

	.count {
		position: absolute;
		margin: 0;
		font-size: 2.6rem;
		font-weight: 200;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		pointer-events: none;
	}

	.count-of {
		font-size: 1.1rem;
		color: var(--text-muted);
	}

	.beads {
		display: flex;
		gap: 0.5rem;
		justify-content: center;
		margin-bottom: 1rem;
	}

	.bead {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: transparent;
		border: 1.5px solid var(--border-color);
	}

	.bead.first {
		border-color: color-mix(in srgb, var(--text-secondary) 70%, transparent);
	}

	.bead.lit {
		background: var(--accent);
		border-color: var(--accent);
	}

	.silence-note {
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--text-secondary);
		max-width: 44rem;
		margin: 0 0 1rem;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.press {
		min-height: 44px;
		min-width: 7.5rem;
		padding: 0.65rem 1.4rem;
		border-radius: 24px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 0.98rem;
		font-weight: 600;
		cursor: pointer;
	}

	.press:hover {
		filter: brightness(1.08);
	}

	.plain {
		min-height: 44px;
		padding: 0.5rem 1rem;
		border-radius: 22px;
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--text);
		font-size: 0.88rem;
		cursor: pointer;
	}

	.plain:hover {
		border-color: var(--accent);
	}

	.plain.small {
		padding: 0.4rem 0.75rem;
		font-size: 0.82rem;
		min-width: 3rem;
	}

	.tap {
		min-width: 7rem;
	}

	.tap-read {
		font-size: 0.82rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.tap-note,
	.control-note {
		font-size: 0.78rem;
		line-height: 1.5;
		color: var(--text-muted);
		max-width: 44rem;
		margin: 0.35rem 0 0;
	}

	.control {
		margin-top: 1.5rem;
		max-width: 44rem;
	}

	.control-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.control-word {
		font-size: 0.76rem;
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.control-read {
		font-size: 0.9rem;
		color: var(--text);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.tempo-row,
	.volume-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.tempo-row input[type='range'] {
		flex: 1;
		min-width: 10rem;
		accent-color: var(--accent);
	}

	.volume-row input[type='range'] {
		flex: 1;
		min-width: 10rem;
		accent-color: var(--accent);
	}

	.chip-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		min-height: 44px;
		padding: 0.5rem 0.95rem;
		border-radius: 22px;
		border: 1.5px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text-secondary);
		font-size: 0.85rem;
		cursor: pointer;
		transition:
			border-color 0.15s,
			color 0.15s,
			background 0.15s;
	}

	.chip:not(.chosen):hover {
		border-color: var(--text-muted);
		color: var(--text);
	}

	.chip.chosen {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		font-weight: 600;
	}

	.keeping {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 1.5rem 0 0;
		line-height: 1.55;
		max-width: 44rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.chip {
			transition: none;
		}
	}
</style>
