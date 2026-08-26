<script lang="ts">
	import { workStore } from '$lib/stores/work.svelte';


	let {
		workId = null,
		onassign
	}: {
		workId?: string | null;
		onassign: (workId: string | null) => void | Promise<void>;
	} = $props();

	let naming = $state(false);
	let newTitle = $state('');
	let busy = $state(false);

	const works = $derived(workStore.works);
	const current = $derived(workId ? workStore.byId(workId) : undefined);

	async function choose(id: string | null) {
		if (busy) return;
		busy = true;
		try {
			await onassign(id);
		} finally {
			busy = false;
		}
	}

	async function nameNewWork() {
		const title = newTitle.trim();
		if (!title || busy) return;
		busy = true;
		try {
			const id = await workStore.addWork(title);
			await onassign(id);
			newTitle = '';
			naming = false;
		} catch (e) {
			console.error('[WorkPicker] the work would not be made:', e);
		} finally {
			busy = false;
		}
	}
</script>

<div class="picker">
	<div class="picker-head">
		<span class="picker-label">Belongs to</span>
		<span class="picker-current">{current ? current.title : 'nothing yet'}</span>
	</div>

	{#if workStore.dbError}
		<p class="picker-note" role="alert">The works did not load: {workStore.dbError}</p>
	{/if}

	<div class="picker-row" role="group" aria-label="Which work this take belongs to">
		<button
			class="pick"
			class:chosen={!workId}
			aria-pressed={!workId}
			disabled={busy}
			onclick={() => choose(null)}
		>
			Later
		</button>

		{#each works as w (w.id)}
			<button
				class="pick"
				class:chosen={workId === w.id}
				aria-pressed={workId === w.id}
				disabled={busy}
				onclick={() => choose(w.id)}
			>
				{w.title}
			</button>
		{/each}

		{#if !naming}
			<button class="pick new" disabled={busy} onclick={() => (naming = true)}>
				+ New work
			</button>
		{/if}
	</div>

	{#if naming}
		<div class="namer">
			<input
				class="namer-input"
				type="text"
				placeholder="What is this work called?"
				bind:value={newTitle}
				maxlength="120"
				aria-label="Title of the new work"
				onkeydown={(e) => {
					if (e.key === 'Enter') nameNewWork();
					if (e.key === 'Escape') {
						naming = false;
						newTitle = '';
					}
				}}
			/>
			<button class="pick" disabled={busy || !newTitle.trim()} onclick={nameNewWork}>Make it</button>
			<button
				class="pick"
				disabled={busy}
				onclick={() => {
					naming = false;
					newTitle = '';
				}}
			>
				Never mind
			</button>
		</div>
	{/if}
</div>

<style>
	.picker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.picker-head {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.picker-label {
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.picker-current {
		font-size: 0.88rem;
		color: var(--text);
		font-weight: 600;
	}

	.picker-note {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.picker-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.pick {
		min-height: 44px;
		padding: 0.5rem 0.9rem;
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

	.pick:not(:disabled):hover {
		border-color: var(--text-muted);
		color: var(--text);
	}

	.pick.chosen {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		font-weight: 600;
	}

	.pick:disabled {
		opacity: 0.6;
		cursor: default;
	}

	.namer {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.namer-input {
		flex: 1;
		min-width: 12rem;
		min-height: 44px;
		padding: 0.5rem 0.9rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text);
		font-size: 0.9rem;
		outline: none;
	}

	.namer-input:focus {
		border-color: var(--accent);
	}

	@media (prefers-reduced-motion: reduce) {
		.pick {
			transition: none;
		}
	}
</style>
