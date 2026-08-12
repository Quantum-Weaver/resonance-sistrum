<script lang="ts">
	import { timerStore, prefersReducedMotion, type TimerMode, type ChimeId } from '$lib/stores/timer.svelte';
	import TimerVisualization from '$lib/components/TimerVisualization.svelte';

	// General-purpose presets (Compass's are sleep-lengths; Echoes is a
	// day-companion — shorter spans serve rests, focus stretches, and tea).
	const PRESETS = [5, 10, 15, 25, 45, 60];
	const CHIME_OPTIONS: Array<{ id: ChimeId; label: string; icon: string }> = [
		{ id: 'rise', label: 'Rise', icon: '🎐' },
		{ id: 'bell', label: 'Bell', icon: '🔔' },
		{ id: 'drop', label: 'Drop', icon: '💧' },
		{ id: 'pulse', label: 'Pulse', icon: '💓' },
	];
	const MODES: Array<{ id: TimerMode; label: string; icon: string }> = [
		{ id: 'sand', label: 'Sand', icon: '⌛' },
		{ id: 'breathing', label: 'Breathe', icon: '🫧' },
		{ id: 'dissolve', label: 'Mandala', icon: '✨' },
		{ id: 'flower', label: 'Flower', icon: '🌸' },
		{ id: 'metatron', label: 'Metatron', icon: '🔷' },
		{ id: 'cycle', label: 'Cycle', icon: '♻️' },
		{ id: 'numeric', label: 'Numeric', icon: '🔢' },
	];

	const isRunning = $derived(timerStore.isRunning);
	const isPaused = $derived(timerStore.isPaused);
	const completed = $derived(timerStore.completed);
	const totalSecs = $derived(timerStore.totalSecs);
	const remainingSecs = $derived(timerStore.remainingSecs);
	const mode = $derived(timerStore.mode);
	const soundOn = $derived(timerStore.soundOn);
	const chime = $derived(timerStore.chime);
	const chimeVolume = $derived(timerStore.chimeVolume);
	const currentModeInfo = $derived(MODES.find((m) => m.id === mode));

	let customMins = $state<number | null>(null);
	const isValidCustom = $derived(customMins !== null && customMins >= 1 && customMins <= 1440);

	function startCustom() {
		if (isValidCustom && customMins !== null) timerStore.start(customMins);
	}

	function formatDuration(mins: number): string {
		if (mins >= 60) {
			const h = Math.floor(mins / 60);
			const m = mins % 60;
			return m > 0 ? `${h}h ${m}m` : `${h}h`;
		}
		return `${mins} min`;
	}

	function formatCountdown(secs: number): string {
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
	}
</script>

<div class="timer-page" style="padding-top: env(safe-area-inset-top, 0px);">
	<header class="timer-header">
		<h1 class="timer-title">Timer</h1>
		{#if isRunning && !prefersReducedMotion}
			<div class="mode-btn-wrap">
				<button class="mode-btn" onclick={() => timerStore.cycleMode()} title="Switch visualization">
					{currentModeInfo?.icon} {currentModeInfo?.label}
					<span class="mode-cycle-icon">↻</span>
				</button>
			</div>
		{/if}
	</header>

	{#if completed}
		<div class="done-state" role="status">
			<span class="done-icon">🔔</span>
			<p class="done-label">Time is up</p>
			<p class="done-sub">
				{soundOn ? 'The chime will settle on its own, or…' : 'Quietly, as you asked.'}
			</p>
			<button class="done-btn" onclick={() => timerStore.dismiss()}>Dismiss</button>
		</div>
	{:else if isRunning}
		<div class="active-timer">
			<p class="timer-label">{isPaused ? 'Paused — the sand holds still' : 'Time remaining'}</p>

			<div class="vis-wrap" class:paused={isPaused}>
				<TimerVisualization {remainingSecs} {totalSecs} {mode} />
			</div>

			{#if mode !== 'numeric' && mode !== 'breathing'}
				<span class="time-overlay">{formatCountdown(remainingSecs)}</span>
			{/if}

			<div class="progress-bar">
				<div
					class="progress-fill"
					style="width: {totalSecs > 0 ? ((totalSecs - remainingSecs) / totalSecs) * 100 : 0}%;"
				></div>
			</div>

			<div class="run-actions">
				{#if isPaused}
					<button class="pause-btn" onclick={() => timerStore.resume()}>Resume</button>
				{:else}
					<button class="pause-btn" onclick={() => timerStore.pause()}>Pause</button>
				{/if}
				<button class="cancel-btn" onclick={() => timerStore.cancel()}>Cancel Timer</button>
			</div>
		</div>
	{:else}
		<p class="section-label">Select duration</p>
		<div class="presets">
			{#each PRESETS as mins (mins)}
				<button class="preset-btn" onclick={() => timerStore.start(mins)}>
					{formatDuration(mins)}
				</button>
			{/each}
		</div>

		<div class="custom-row">
			<input
				class="custom-input"
				type="number"
				min="1"
				max="1440"
				inputmode="numeric"
				placeholder="Custom minutes"
				bind:value={customMins}
				aria-label="Custom duration in minutes"
			/>
			<button class="custom-btn" disabled={!isValidCustom} onclick={startCustom}>
				{isValidCustom ? `Start · ${formatDuration(customMins ?? 0)}` : 'Start'}
			</button>
		</div>

		<div class="sound-row">
			<span>Sound when done</span>
			<button
				class="toggle"
				class:active={soundOn}
				onclick={() => timerStore.setSoundOn(!soundOn)}
				aria-label="Play a chime when the timer completes"
				aria-pressed={soundOn}
			>
				<span class="dot"></span>
			</button>
		</div>

		{#if soundOn}
			<div class="chime-section">
				<div class="chime-options" role="group" aria-label="Chime sound">
					{#each CHIME_OPTIONS as c (c.id)}
						<button
							class="chime-btn"
							class:active={chime === c.id}
							onclick={() => timerStore.setChime(c.id)}
							aria-pressed={chime === c.id}
							title="Tap to choose and hear it"
						>
							{c.icon} {c.label}
						</button>
					{/each}
				</div>
				<div class="volume-row">
					<span class="volume-label">Chime volume</span>
					<input
						class="volume-slider"
						type="range"
						min="0"
						max="100"
						step="5"
						value={Math.round(chimeVolume * 100)}
						oninput={(e) => timerStore.setChimeVolume(Number(e.currentTarget.value) / 100)}
						onchange={() => timerStore.previewChime()}
						aria-label="Chime volume"
					/>
					<span class="volume-pct">{Math.round(chimeVolume * 100)}%</span>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.timer-page {
		min-height: 100%;
		display: flex;
		flex-direction: column;
		padding: 1rem 1.25rem 1.5rem;
	}

	.timer-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: 1.5rem;
	}

	.timer-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.mode-btn-wrap {
		display: flex;
		padding-top: 1.5rem;
	}

	.mode-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.4rem 0.85rem;
		border: 1px solid var(--border-color);
		border-radius: 20px;
		background: var(--bg-surface);
		color: var(--text-secondary);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.mode-btn:hover {
		border-color: var(--accent);
		color: var(--accent);
	}

	.mode-cycle-icon {
		font-size: 0.9rem;
		opacity: 0.6;
	}

	.section-label {
		margin: 0 0 0.75rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
	}

	/* Completed */
	.done-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding-top: 3rem;
		text-align: center;
	}

	.done-icon {
		font-size: 3rem;
	}

	.done-label {
		font-size: 1.4rem;
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.done-sub {
		color: var(--text-secondary);
		font-size: 0.9rem;
		margin: 0;
	}

	.done-btn {
		margin-top: 0.75rem;
		color: #fff;
		border: none;
		padding: 0.75rem 2.5rem;
		border-radius: 20px;
		font-weight: 600;
		font-size: 1rem;
		cursor: pointer;
		background-color: var(--accent);
	}

	/* Active timer */
	.active-timer {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.timer-label {
		color: var(--text-secondary);
		margin: 0;
		font-size: 0.9rem;
	}

	.vis-wrap {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 300px;
	}

	.time-overlay {
		font-size: 2rem;
		font-weight: 700;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
		letter-spacing: 0.04em;
	}

	.progress-bar {
		width: 100%;
		max-width: 360px;
		height: 4px;
		border-radius: 2px;
		background-color: var(--border-color);
	}

	.progress-fill {
		height: 100%;
		border-radius: 2px;
		background-color: var(--accent);
		transition: width 1s linear;
	}

	.run-actions {
		display: flex;
		gap: 0.5rem;
	}

	.pause-btn {
		color: #fff;
		border: none;
		padding: 0.5rem 2rem;
		border-radius: 20px;
		font-weight: 600;
		cursor: pointer;
		background-color: var(--accent);
	}

	.vis-wrap.paused {
		opacity: 0.55;
		filter: saturate(0.6);
		transition: opacity 0.3s, filter 0.3s;
	}

	.cancel-btn {
		color: #fff;
		border: none;
		padding: 0.5rem 2rem;
		border-radius: 20px;
		font-weight: 600;
		cursor: pointer;
		background-color: var(--color-warning);
	}

	/* Chime options */
	.chime-section {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding-top: 1rem;
	}

	.chime-options {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chime-btn {
		padding: 0.45rem 0.9rem;
		background: var(--bg-surface);
		border: 1.5px solid var(--border-color);
		border-radius: 20px;
		color: var(--text-secondary);
		font-size: 0.82rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s, background 0.15s;
	}
	.chime-btn.active {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}

	.volume-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.volume-label {
		font-size: 0.875rem;
		color: var(--text-secondary);
		white-space: nowrap;
	}

	.volume-slider {
		flex: 1;
		min-width: 0;
		accent-color: var(--accent);
	}

	.volume-pct {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		min-width: 2.6em;
		text-align: right;
	}

	/* Presets */
	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.preset-btn {
		width: calc(33% - 0.35rem);
		padding: 1.2rem 0;
		border-radius: 12px;
		border: 1px solid var(--border-color);
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		background-color: var(--bg-surface);
		color: var(--text);
	}

	.preset-btn:hover {
		background-color: color-mix(in srgb, var(--accent) 15%, var(--bg-surface));
	}

	/* Custom duration */
	.custom-row {
		display: flex;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.custom-input {
		flex: 1;
		min-width: 0;
		padding: 0 1rem;
		border-radius: 12px;
		border: 1px solid var(--border-color);
		background-color: var(--bg-surface);
		color: var(--text);
		font-size: 1rem;
	}

	.custom-input::placeholder {
		color: var(--text-secondary);
	}

	.custom-btn {
		padding: 0.9rem 1.5rem;
		border-radius: 12px;
		border: 1px solid var(--accent);
		background-color: var(--accent);
		color: #fff;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
	}

	.custom-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Sound toggle */
	.sound-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 1.5rem;
		margin-top: 2rem;
		border-top: 1px solid var(--border-color);
		color: var(--text);
	}

	.toggle {
		width: 48px;
		height: 28px;
		border-radius: 14px;
		border: none;
		cursor: pointer;
		display: flex;
		align-items: center;
		padding: 3px;
		background-color: var(--border-color);
		transition: background-color 0.2s;
	}

	.toggle.active {
		background-color: var(--accent);
	}

	.dot {
		width: 22px;
		height: 22px;
		border-radius: 50%;
		background-color: #fff;
		transition: transform 0.2s;
	}

	.toggle.active .dot {
		transform: translateX(20px);
	}
</style>
