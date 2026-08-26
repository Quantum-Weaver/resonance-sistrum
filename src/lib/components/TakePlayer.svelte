<script lang="ts">
	import { playbackStore } from '$lib/stores/playback.svelte';
	import { recorderStore, type TakeFile } from '$lib/stores/recorder.svelte';
	import { takeStore } from '$lib/stores/take.svelte';
	import { workStore } from '$lib/stores/work.svelte';
	import Waveform from '$lib/components/Waveform.svelte';
	import WorkPicker from '$lib/components/WorkPicker.svelte';
	import MarksRail from '$lib/components/MarksRail.svelte';
	import FeelingHere from '$lib/components/FeelingHere.svelte';

	// No autoplay: opening this panel loads the take and stops there.

	let { take, onclose }: { take: TakeFile; onclose: () => void } = $props();

	let lastExported = $state<string | null>(null);
	let noteDraft = $state('');
	let noteSaved = $state(false);

	const row = $derived(takeStore.byFileName(take.file_name));
	const isOpen = $derived(playbackStore.fileName === take.file_name);
	const playing = $derived(isOpen && playbackStore.playing);
	const duration = $derived(isOpen && playbackStore.duration > 0 ? playbackStore.duration : take.seconds);
	const progress = $derived(isOpen ? playbackStore.progress : 0);
	const playhead = $derived(isOpen ? playbackStore.position : 0);
	const workTitle = $derived(row?.workId ? (workStore.byId(row.workId)?.title ?? null) : null);

	$effect(() => {
		const t = take;
		void playbackStore.open(t);
	});

	let noteFor = $state<string | null>(null);
	$effect(() => {
		const name = take.file_name;
		if (noteFor !== name) {
			noteFor = name;
			noteDraft = row?.note ?? '';
			noteSaved = false;
		}
	});

	function fmt(secs: number): string {
		if (!Number.isFinite(secs) || secs < 0) secs = 0;
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	async function ensureRow() {
		if (row) return;
		await takeStore.upsertTake({
			fileName: take.file_name,
			seconds: take.seconds,
			sampleRate: take.sample_rate,
			channels: take.channels,
			createdAt: take.created_at * 1000
		});
	}

	async function assignWork(workId: string | null) {
		await ensureRow();
		await takeStore.setTakeWork(take.file_name, workId);
	}

	async function saveNote() {
		await ensureRow();
		await takeStore.setTakeNote(take.file_name, noteDraft.trim() ? noteDraft.trim() : null);
		noteSaved = true;
	}

	async function exportTake() {
		const dest = await recorderStore.exportTake(take.file_name);
		if (dest) lastExported = dest;
	}
</script>

<section class="player" aria-label="Take {take.file_name}">
	<header class="player-head">
		<div class="player-title">
			<span class="player-name">{take.file_name.replace(/\.wav$/, '')}</span>
			<span class="player-facts">
				{fmt(take.seconds)} · {take.sample_rate} Hz · {take.channels === 1
					? 'mono'
					: `${take.channels} channels`}
			</span>
		</div>
		<button class="plain" onclick={onclose}>Close</button>
	</header>

	{#if playbackStore.error}
		<p class="player-error" role="alert">
			The sound did not open: {playbackStore.error}
		</p>
	{/if}

	<Waveform
		fileName={take.file_name}
		{progress}
		{duration}
		onscrub={(secs) => playbackStore.seek(secs)}
	/>

	<div class="transport">
		<button class="press" onclick={() => playbackStore.toggle()}>
			{playing ? '❚❚ Pause' : '▶ Play'}
		</button>

		<span class="clock">{fmt(isOpen ? playbackStore.position : 0)} / {fmt(duration)}</span>

		<label class="volume">
			<span class="volume-word">Volume</span>
			<input
				type="range"
				min="0"
				max="1"
				step="0.01"
				value={playbackStore.volume}
				oninput={(e) => playbackStore.setVolume(Number(e.currentTarget.value))}
				aria-label="Volume"
			/>
			<span class="volume-read">{Math.round(playbackStore.volume * 100)}%</span>
		</label>
	</div>


	<MarksRail
		fileName={take.file_name}
		{duration}
		position={playhead}
		workId={row?.workId ?? null}
		onseek={(secs) => playbackStore.seek(secs)}
	/>

	<WorkPicker workId={row?.workId ?? null} onassign={assignWork} />

	<FeelingHere
		takeFileName={take.file_name}
		takeTitle={take.file_name.replace(/\.wav$/, '')}
		workId={row?.workId ?? null}
		{workTitle}
	/>

	<div class="note">
		<label class="note-label" for="take-note-{take.file_name}">What was this attempt?</label>
		<textarea
			id="take-note-{take.file_name}"
			class="note-input"
			rows="2"
			placeholder="Anything worth remembering about this take (optional)"
			bind:value={noteDraft}
			oninput={() => (noteSaved = false)}
		></textarea>
		<div class="note-actions">
			<button class="plain" onclick={saveNote}>Keep the note</button>
			{#if noteSaved}<span class="note-kept">Kept.</span>{/if}
		</div>
	</div>

	<div class="shelf-actions">
		<button class="plain" onclick={exportTake}>Export a copy</button>
		{#if lastExported}
			<span class="exported">Copied to {lastExported}</span>
		{/if}
	</div>

	<p class="keeping">
		The take itself stays on the shelf. Exporting copies it; nothing here moves or removes it. Marks
		are kept in a file beside the take and are append-only — retracting one takes it out of the view,
		never out of the history. Pinning a mark also logs the face you chose as a feeling, unless you
		switch that off on the rail.
	</p>
</section>

<style>
	.player {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.9rem 1rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.player-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.player-title {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.player-name {
		font-size: 1rem;
		font-weight: 600;
		color: var(--text);
		word-break: break-word;
	}

	.player-facts {
		font-size: 0.76rem;
		color: var(--text-muted);
	}

	.player-error {
		font-size: 0.85rem;
		color: #e17055;
		margin: 0;
	}

	.transport {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.press {
		min-height: 44px;
		min-width: 6.5rem;
		padding: 0.6rem 1.2rem;
		border-radius: 22px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
	}

	.press:hover {
		filter: brightness(1.08);
	}

	.clock {
		font-size: 0.85rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.volume {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
		min-height: 44px;
	}

	.volume-word {
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.volume input {
		width: 8rem;
		accent-color: var(--accent);
	}

	.volume-read {
		font-size: 0.78rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		min-width: 2.5rem;
		text-align: right;
	}

	.note {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.note-label {
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.note-input {
		width: 100%;
		padding: 0.55rem 0.8rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg);
		color: var(--text);
		font-size: 0.9rem;
		font-family: inherit;
		resize: vertical;
		outline: none;
		box-sizing: border-box;
	}

	.note-input:focus {
		border-color: var(--accent);
	}

	.note-actions,
	.shelf-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.plain {
		min-height: 44px;
		padding: 0.5rem 1rem;
		border-radius: 22px;
		border: 1px solid var(--border-color);
		background: transparent;
		color: var(--text);
		font-size: 0.85rem;
		cursor: pointer;
	}

	.plain:hover {
		border-color: var(--accent);
	}

	.note-kept,
	.exported {
		font-size: 0.78rem;
		color: var(--text-muted);
		word-break: break-all;
	}

	.keeping {
		font-size: 0.76rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.45;
	}
</style>
