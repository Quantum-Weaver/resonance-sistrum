<script lang="ts">
	import { repairStore, type MadeTake, type Span } from '$lib/stores/repair.svelte';
	import { stepWord } from '$lib/repair';

	// A lane's repair rack: a noise profile learned from a silent selection, then
	// noise reduction, de-click and de-breath as steps that are heard at once and
	// taken back one at a time. Nothing here writes the take — the shelf only
	// gains a file at "Keep as a take", and then it is a new one.

	let {
		trackId,
		take,
		laneNumber,
		selectionIn = 0,
		selectionOut = 0,
		onkept
	}: {
		trackId: string;
		take: string;
		laneNumber: number;
		/** The lane's own in and out points, seconds; out 0 means to the end. */
		selectionIn?: number;
		selectionOut?: number;
		onkept?: (made: MadeTake) => void;
	} = $props();

	let amount = $state(1);
	let floor = $state(0.05);
	let sensitivity = $state(6);
	let maxWidth = $state(64);
	let dipDb = $state(-12);
	let ceilingDb = $state(-28);
	let minZcr = $state(1800);
	let wholeLane = $state(true);
	let keepName = $state('');

	const steps = $derived(repairStore.steps(trackId, take));
	const reports = $derived(repairStore.reports(trackId, take));
	const profile = $derived(repairStore.profile(trackId, take));
	const working = $derived(repairStore.working(trackId, take));

	// The room carries seconds; the store turns them into the step's own samples
	// against the lane's rate.
	function span(): Span | null {
		return wholeLane ? null : { startSecs: selectionIn, endSecs: selectionOut };
	}

	const canLearn = $derived(wholeLane || selectionOut > selectionIn);

	function learn() {
		if (wholeLane) repairStore.learn(trackId, take, 0, 0);
		else repairStore.learn(trackId, take, selectionIn, selectionOut);
	}

	async function addNoise() {
		await repairStore.add(trackId, take, { kind: 'noise', amount, floor }, span());
	}

	async function addDeclick() {
		await repairStore.add(trackId, take, { kind: 'declick', sensitivity, maxWidth }, span());
	}

	async function addDebreath() {
		await repairStore.add(trackId, take, { kind: 'debreath', dipDb, ceilingDb, minZcr }, span());
	}

	async function keep() {
		const made = await repairStore.keep(trackId, take, keepName);
		if (made) {
			keepName = '';
			onkept?.(made);
		}
	}
</script>

<details class="repair">
	<summary>Repair</summary>

	<div class="row">
		<label class="pick">
			<input type="checkbox" bind:checked={wholeLane} />
			<span>The whole lane</span>
		</label>
		{#if !wholeLane}
			<span class="read">
				{selectionIn.toFixed(1)} s → {selectionOut > 0 ? `${selectionOut.toFixed(1)} s` : 'the end'}
			</span>
		{/if}
	</div>

	<div class="block">
		<h3 class="h3">Noise</h3>
		<div class="row">
			<button class="plain" onclick={learn} disabled={working || !canLearn}>
				{wholeLane ? 'Learn from the lane' : 'Learn from the selection'}
			</button>
			<span class="read">
				{profile ? `${profile.frames} frames learned` : 'no profile yet'}
			</span>
		</div>
		<div class="row">
			<label class="knob">
				<span class="word">Strength</span>
				<input type="range" min="0" max="3" step="0.1" bind:value={amount} aria-label="Noise reduction strength for lane {laneNumber}" />
				<span class="read">{amount.toFixed(1)}×</span>
			</label>
			<label class="knob">
				<span class="word">Floor</span>
				<input type="range" min="0" max="0.5" step="0.01" bind:value={floor} aria-label="Noise floor kept for lane {laneNumber}" />
				<span class="read">{Math.round(floor * 100)}%</span>
			</label>
			<button class="plain" onclick={addNoise} disabled={working || !profile}>Apply</button>
		</div>
		<p class="hint">The profile is the mean spectrum of the selection. Learn it where only the room is heard.</p>
	</div>

	<div class="block">
		<h3 class="h3">De-click</h3>
		<div class="row">
			<label class="knob">
				<span class="word">Sensitivity</span>
				<input type="range" min="2" max="20" step="0.5" bind:value={sensitivity} aria-label="De-click sensitivity for lane {laneNumber}" />
				<span class="read">{sensitivity.toFixed(1)}×</span>
			</label>
			<label class="knob">
				<span class="word">Widest click</span>
				<input type="number" class="num" min="4" max="512" step="4" bind:value={maxWidth} aria-label="Widest click in samples for lane {laneNumber}" />
				<span class="read">samples</span>
			</label>
			<button class="plain" onclick={addDeclick} disabled={working}>Apply</button>
		</div>
		<p class="hint">A click is a run whose second difference stands far above the sound around it; it is redrawn from its neighbours.</p>
	</div>

	<div class="block">
		<h3 class="h3">De-breath</h3>
		<div class="row">
			<label class="knob">
				<span class="word">Dip</span>
				<input type="range" min="-40" max="0" step="1" bind:value={dipDb} aria-label="Breath dip in decibels for lane {laneNumber}" />
				<span class="read">{dipDb} dB</span>
			</label>
			<label class="knob">
				<span class="word">Loudest breath</span>
				<input type="range" min="-50" max="-10" step="1" bind:value={ceilingDb} aria-label="Loudest breath in dBFS for lane {laneNumber}" />
				<span class="read">{ceilingDb} dBFS</span>
			</label>
			<label class="knob">
				<span class="word">Noisiness</span>
				<input type="number" class="num" min="200" max="8000" step="100" bind:value={minZcr} aria-label="Breath zero crossings per second for lane {laneNumber}" />
				<span class="read">zc/s</span>
			</label>
			<button class="plain" onclick={addDebreath} disabled={working}>Apply</button>
		</div>
		<p class="hint">A breath is a quiet, broadband run sitting between phrases. The dip is yours to set.</p>
	</div>

	<div class="block">
		<h3 class="h3">Steps</h3>
		{#if steps.length === 0}
			<p class="hint">No steps. The lane plays its take as it is.</p>
		{:else}
			<ol class="steps">
				{#each steps as s, i (i)}
					<li class="step">
						<span>{stepWord(s)}</span>
						{#if reports[i] && reports[i].touched > 0}
							<span class="read">{reports[i].touched} found</span>
						{/if}
						<button class="plain small" onclick={() => repairStore.dropAt(trackId, take, i)} disabled={working}>
							Undo
						</button>
					</li>
				{/each}
			</ol>
			<div class="row">
				<button class="plain small" onclick={() => repairStore.undo(trackId, take)} disabled={working}>
					Undo the last
				</button>
				<button class="plain small" onclick={() => repairStore.clear(trackId, take)} disabled={working}>
					Clear
				</button>
			</div>
		{/if}
	</div>

	<div class="row">
		<label class="knob grow">
			<span class="word">Keep as</span>
			<input type="text" class="text" bind:value={keepName} maxlength="60" placeholder="{take.replace(/\.wav$/, '')}-repaired" aria-label="Name for the repaired take of lane {laneNumber}" />
		</label>
		<button class="press" onclick={keep} disabled={working || steps.length === 0}>💾 Keep as a take</button>
	</div>

	{#if working}
		<p class="note" role="status">Working…</p>
	{/if}
	{#if repairStore.error}
		<p class="err" role="alert">{repairStore.error}</p>
	{/if}

	<p class="hint">
		A step is heard at once and taken back at once. The take on the shelf is never written; keeping
		makes a new take beside it.
	</p>
</details>

<style>
	.repair {
		border: 1px solid var(--border-color);
		border-radius: 10px;
		padding: 0.4rem 0.6rem;
	}

	summary {
		cursor: pointer;
		font-size: 0.82rem;
		color: var(--text-muted);
	}

	.block {
		border-top: 1px solid var(--border-color);
		padding-top: 0.4rem;
		margin-top: 0.4rem;
	}

	.h3 {
		font-size: 0.86rem;
		margin: 0 0 0.3rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin: 0.25rem 0;
	}

	.knob {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.grow {
		flex: 1 1 12rem;
	}

	.word {
		font-size: 0.74rem;
		color: var(--text-muted);
	}

	.read {
		font-size: 0.74rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.pick {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
	}

	.num {
		width: 5.5rem;
	}

	.num,
	.text {
		min-height: 34px;
		padding: 0.25rem 0.5rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text);
		font-size: 0.82rem;
	}

	.text {
		width: 100%;
	}

	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.step {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8rem;
	}

	.plain {
		min-height: 36px;
		padding: 0.3rem 0.7rem;
		border-radius: 18px;
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--text);
		font-size: 0.78rem;
		cursor: pointer;
	}

	.plain.small {
		min-height: 30px;
		padding: 0.2rem 0.6rem;
		font-size: 0.72rem;
	}

	.plain:hover {
		border-color: var(--accent);
	}

	.plain:disabled,
	.press:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.press {
		min-height: 36px;
		padding: 0.35rem 0.9rem;
		border-radius: 18px;
		border: 1.5px solid var(--accent);
		background: color-mix(in srgb, var(--accent) 14%, transparent);
		color: var(--text);
		font-size: 0.8rem;
		cursor: pointer;
	}

	.hint {
		font-size: 0.76rem;
		color: var(--text-muted);
		margin: 0.2rem 0 0;
		line-height: 1.45;
	}

	.note {
		font-size: 0.78rem;
		margin: 0.2rem 0 0;
	}

	.err {
		font-size: 0.78rem;
		color: #e17055;
		margin: 0.2rem 0 0;
	}
</style>
