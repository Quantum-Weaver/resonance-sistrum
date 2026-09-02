<script lang="ts">
	import { invoke } from '@tauri-apps/api/core';
	import { addMark, fmtTime, newDoc, readMarks, type Mark, type MarksDoc } from '$lib/marks';
	import { EMOJI_DEFS } from '$lib/data/emojis';

	// A lane's marks rail. The record room's `marksStore` holds ONE document at a time and the studio shows N lanes at once, so each lane reads its own sidecar here — the same water (`$lib/marks`), the same append-only door (`append_take_marks`), a smaller room. Nothing here logs a feeling; that is the record room's coupling and it stays there.

	let {
		fileName,
		duration = 0,
		position = 0,
		onseek
	}: {
		fileName: string;
		duration?: number;
		/** The lane's own playhead, in seconds into the take. */
		position?: number;
		onseek?: (secs: number) => void;
	} = $props();

	let doc = $state<MarksDoc>(newDoc());
	let error = $state<string | null>(null);
	let marking = $state(false);
	let draftEmoji = $state('');
	let saving = $state(false);

	let gen = 0;
	$effect(() => {
		const name = fileName;
		const g = ++gen;
		doc = newDoc();
		error = null;
		void invoke<MarksDoc>('read_take_marks', { fileName: name })
			.then((d) => {
				if (g === gen) doc = d;
			})
			.catch((e) => {
				if (g === gen) error = e instanceof Error ? e.message : String(e);
			});
	});

	const view = $derived.by<Mark[]>(() => readMarks(doc));

	function pct(at: number): number {
		if (!(duration > 0)) return 0;
		return Math.min(100, Math.max(0, (at / duration) * 100));
	}

	function wordFor(emoji: string): string {
		return EMOJI_DEFS.find((d) => d.emoji === emoji)?.label ?? 'Mark';
	}

	function theHand(): string | undefined {
		const name = localStorage.getItem('resonance-sistrum-vessel-name');
		return name && name.trim() ? name.trim() : undefined;
	}

	async function pin() {
		if (!draftEmoji) return;
		saving = true;
		error = null;
		try {
			const next = addMark(doc, { at: Math.max(0, position), emoji: draftEmoji, by: theHand() });
			const entries = next.marks.slice(doc.marks.length);
			const landed = await invoke<MarksDoc>('append_take_marks', {
				fileName,
				media: { kind: 'audio', title: fileName.replace(/\.wav$/, ''), ...(duration > 0 ? { duration } : {}) },
				entries
			});
			doc = landed;
			draftEmoji = '';
			marking = false;
		} catch (e) {
			error = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}
</script>

<div class="lane-marks">
	<div class="rail" role="group" aria-label="Marks on this lane">
		{#each view as m (m.id)}
			<button
				class="pin"
				style="left: {pct(m.at)}%"
				aria-label="{wordFor(m.emoji)} at {fmtTime(m.at)}{m.note ? ` — ${m.note}` : ''}"
				title="{wordFor(m.emoji)} at {fmtTime(m.at)}{m.note ? ` — ${m.note}` : ''}"
				onclick={() => onseek?.(m.at)}
			>
				<span aria-hidden="true">{m.emoji}</span>
			</button>
		{/each}
		{#if view.length === 0}
			<span class="rail-empty">No marks on this take.</span>
		{/if}
	</div>

	<div class="row">
		{#if !marking}
			<button class="plain small" onclick={() => (marking = true)}>＋ Mark at {fmtTime(position)}</button>
		{:else}
			<div class="faces" role="group" aria-label="Choose a mark">
				{#each EMOJI_DEFS as def (def.emoji)}
					<button
						class="face"
						class:chosen={draftEmoji === def.emoji}
						aria-pressed={draftEmoji === def.emoji}
						title={def.label}
						onclick={() => (draftEmoji = draftEmoji === def.emoji ? '' : def.emoji)}
					>
						{def.emoji}
					</button>
				{/each}
			</div>
			<button class="plain small" disabled={!draftEmoji || saving} onclick={pin}>
				{saving ? 'Marking…' : 'Pin it'}
			</button>
			<button class="plain small" onclick={() => (marking = false)}>Never mind</button>
		{/if}
	</div>
	{#if error}
		<p class="err" role="alert">{error}</p>
	{/if}
</div>

<style>
	.lane-marks {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.rail {
		position: relative;
		height: 28px;
		border-radius: 8px;
		background: var(--bg);
		border: 1px solid var(--border-color);
	}

	.rail-empty {
		position: absolute;
		inset: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.72rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	.pin {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 36px;
		height: 28px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		background: transparent;
		font-size: 0.95rem;
		line-height: 1;
		cursor: pointer;
	}

	.pin:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
		border-radius: 6px;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.faces {
		display: flex;
		flex-wrap: wrap;
		gap: 0.25rem;
	}

	.face {
		min-width: 36px;
		min-height: 36px;
		border-radius: 8px;
		border: 1.5px solid var(--border-color);
		background: var(--bg-surface);
		font-size: 1.05rem;
		cursor: pointer;
	}

	.face.chosen {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
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

	.plain:hover {
		border-color: var(--accent);
	}

	.plain:disabled {
		opacity: 0.45;
		cursor: not-allowed;
	}

	.err {
		font-size: 0.78rem;
		color: #e17055;
		margin: 0;
	}
</style>
