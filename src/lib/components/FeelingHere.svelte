<script lang="ts">
	import { goto } from '$app/navigation';
	import { feelingStore } from '$lib/stores/feeling.svelte';
	import { EMOJI_DEFS } from '$lib/data/emojis';

	// HOW THIS FELT — the emotion log, hung on a creation.
	//
	// Phase 3 Wave 2 (2026-08-13, an **Opus** hand), the third movement's
	// second half: the sattva room and the timer STAY (KP's ⚛ ruling for this
	// phase), and the emotion log is RETARGETED to creations rather than
	// standing off on its own.
	//
	// WHY IT IS HERE AT ALL, in KP's own words, which are the reason this is a
	// foundation and not a feature:
	//
	//   "logging how we feel during a moment is the base of all we do, self
	//    understanding and understanding oportunities abound"
	//   "it is how we discover our values and internal core interests, which
	//    help us align with ourselves"
	//   "humans and tech need this as money becomes irrelevent"
	//
	//   — and, plainest of all: "the emotion log is not an inherited feature.
	//     It is the base."
	//
	// So it does not live three taps away behind a nav drawer. It stands where
	// the making happens: in the record room, and on a take while you are
	// listening back to it.
	//
	// WHAT IT HANGS ON. The feelings table has carried `work_id` AND
	// `take_file_name` since Phase 2, at KP's ⚛ "yes both" — a feeling about
	// the song, a feeling about THIS attempt at it, or a feeling belonging to
	// nothing at all. All three are honest, and "belongs to nothing" is a
	// lawful answer offered plainly rather than hidden.
	//
	// A FACE WEARS ITS WORD. The emoji grid here is never emoji-only: every
	// face carries its name underneath. The full form at /add has its own
	// grid; this one is the quick door beside the work.
	//
	// A FEELING IS NOT A MARK. A feeling is about the take; a MARK is pinned
	// to a moment INSIDE it, lives in a `.marks.json` sidecar, and is
	// append-only by its own law. Different doors on purpose.

	let {
		workId = null,
		takeFileName = null,
		workTitle = null,
		takeTitle = null
	}: {
		workId?: string | null;
		takeFileName?: string | null;
		workTitle?: string | null;
		takeTitle?: string | null;
	} = $props();

	type Target = 'take' | 'work' | 'nothing';

	let open = $state(false);
	let emoji = $state('');
	let nameDraft = $state('');
	let note = $state('');
	let intensity = $state(3);
	let saving = $state(false);
	let saved = $state(false);
	let saveError = $state<string | null>(null);

	// The most specific thing available is where a feeling logged HERE most
	// likely belongs — this door was opened from a take or from a work, and
	// answering with the thing in front of you is not the same as guessing.
	// It is still only a default, and all three answers are one tap away.
	let target = $state<Target>('nothing');
	let targetTouched = $state(false);
	$effect(() => {
		if (targetTouched) return;
		target = takeFileName ? 'take' : workId ? 'work' : 'nothing';
	});

	const chosenDef = $derived(EMOJI_DEFS.find((d) => d.emoji === emoji));
	// The name is what makes a feeling findable later. If a hand names nothing,
	// the face's own word stands in — never a blank row, and never a nag.
	const effectiveName = $derived(nameDraft.trim() || chosenDef?.label || 'A feeling');

	function targetLabel(t: Target): string {
		if (t === 'take') return takeTitle ? `This take · ${takeTitle}` : 'This take';
		if (t === 'work') return workTitle ? `This work · ${workTitle}` : 'This work';
		return 'Nothing in particular';
	}

	async function save() {
		if (saving || !emoji) return;
		saving = true;
		saveError = null;
		try {
			await feelingStore.addFeeling({
				name: effectiveName,
				// 'heard' is the honest sense for a feeling about sound being
				// made or played back. It is a default and the full form can
				// say otherwise.
				sense: 'heard',
				subcategory: 'music',
				emoji,
				note: note.trim() || undefined,
				intensity,
				timestamp: Date.now(),
				workId: target === 'work' ? (workId ?? undefined) : undefined,
				takeFileName: target === 'take' ? (takeFileName ?? undefined) : undefined
			});
			saved = true;
			emoji = '';
			nameDraft = '';
			note = '';
			intensity = 3;
			setTimeout(() => {
				saved = false;
				open = false;
			}, 1200);
		} catch (e) {
			saveError = e instanceof Error ? e.message : String(e);
		} finally {
			saving = false;
		}
	}

	// The full form, carrying what this door already knows. Nothing is retyped.
	function openFullForm() {
		const params = new URLSearchParams();
		if (target === 'take' && takeFileName) params.set('take', takeFileName);
		if (target === 'work' && workId) params.set('work', workId);
		if (emoji) params.set('emoji', emoji);
		const q = params.toString();
		goto(q ? `/add?${q}` : '/add');
	}
</script>

<section class="feeling-door">
	{#if !open}
		<button class="doorway" onclick={() => (open = true)}>
			<span class="doorway-face" aria-hidden="true">🫀</span>
			<span class="doorway-words">
				<span class="doorway-title">How did this feel?</span>
				<span class="doorway-sub">Log a feeling about this — or about nothing in particular.</span>
			</span>
		</button>
	{:else}
		<div class="panel">
			<div class="panel-head">
				<span class="panel-title">How did this feel?</span>
				<button class="plain small" onclick={() => (open = false)}>Not now</button>
			</div>

			{#if feelingStore.dbError}
				<p class="panel-error" role="alert">The log is not ready: {feelingStore.dbError}</p>
			{/if}

			<!-- THE FACES. Never emoji-only: every face wears its word. -->
			<div class="faces" role="group" aria-label="Choose a feeling">
				{#each EMOJI_DEFS as def (def.emoji)}
					<button
						class="face"
						class:chosen={emoji === def.emoji}
						aria-pressed={emoji === def.emoji}
						onclick={() => (emoji = emoji === def.emoji ? '' : def.emoji)}
					>
						<span class="face-emoji" aria-hidden="true">{def.emoji}</span>
						<span class="face-word">{def.label}</span>
					</button>
				{/each}
			</div>

			{#if chosenDef}
				<!-- The vessel's own definition outranks the Sanctuary's — the
				     folksonomy law, the same one the full form keeps. -->
				<p class="face-def">
					{feelingStore.getPersonalDefinition(chosenDef.emoji) || chosenDef.definition}
				</p>
			{/if}

			<!-- WHAT IT BELONGS TO. Asked calmly, never inferred, and "nothing"
			     is a real answer sitting in the row with the others. -->
			<div class="belongs">
				<span class="belongs-word">Hang it on</span>
				<div class="belongs-row" role="group" aria-label="What this feeling belongs to">
					{#if takeFileName}
						<button
							class="chip"
							class:chosen={target === 'take'}
							aria-pressed={target === 'take'}
							onclick={() => {
								target = 'take';
								targetTouched = true;
							}}
						>
							{targetLabel('take')}
						</button>
					{/if}
					{#if workId}
						<button
							class="chip"
							class:chosen={target === 'work'}
							aria-pressed={target === 'work'}
							onclick={() => {
								target = 'work';
								targetTouched = true;
							}}
						>
							{targetLabel('work')}
						</button>
					{/if}
					<button
						class="chip"
						class:chosen={target === 'nothing'}
						aria-pressed={target === 'nothing'}
						onclick={() => {
							target = 'nothing';
							targetTouched = true;
						}}
					>
						{targetLabel('nothing')}
					</button>
				</div>
			</div>

			<label class="field">
				<span class="field-word">Name this moment (optional)</span>
				<input
					type="text"
					class="text-input"
					bind:value={nameDraft}
					maxlength="120"
					placeholder={chosenDef ? chosenDef.label : 'A feeling'}
				/>
			</label>

			<label class="field">
				<span class="field-word">Anything else? (optional)</span>
				<textarea class="text-input" rows="2" bind:value={note} maxlength="500"></textarea>
			</label>

			<div class="field">
				<span class="field-word">How strong? {intensity}/5</span>
				<div class="intensity" role="group" aria-label="How strong the feeling was">
					{#each [1, 2, 3, 4, 5] as n (n)}
						<button
							class="dot"
							class:filled={n <= intensity}
							aria-pressed={intensity === n}
							aria-label="Strength {n} of 5"
							onclick={() => (intensity = n)}
						></button>
					{/each}
				</div>
			</div>

			<div class="panel-actions">
				<button class="press" onclick={save} disabled={!emoji || saving || saved}>
					{saved ? '✓ Kept' : saving ? 'Keeping…' : 'Keep this feeling'}
				</button>
				<button class="plain" onclick={openFullForm}>More options…</button>
			</div>

			{#if !emoji}
				<p class="panel-note">Pick a face when one fits. There is no wrong one, and no hurry.</p>
			{/if}
			{#if saveError}
				<p class="panel-error" role="alert">{saveError}</p>
			{/if}
		</div>
	{/if}
</section>

<style>
	.feeling-door {
		display: block;
	}

	.doorway {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		min-height: 44px;
		padding: 0.7rem 0.9rem;
		border-radius: 12px;
		border: 1px solid var(--border-color);
		background: color-mix(in srgb, var(--accent) 5%, transparent);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		box-sizing: border-box;
	}

	.doorway:hover {
		border-color: color-mix(in srgb, var(--accent) 45%, var(--border-color));
	}

	.doorway-face {
		font-size: 1.35rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.doorway-words {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
	}

	.doorway-title {
		font-size: 0.92rem;
		font-weight: 600;
		color: var(--text);
	}

	.doorway-sub {
		font-size: 0.76rem;
		color: var(--text-muted);
		line-height: 1.4;
	}

	.panel {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 0.9rem 1rem 1rem;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border-color));
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.panel-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
	}

	.panel-error {
		font-size: 0.82rem;
		color: #e17055;
		margin: 0;
	}

	.panel-note {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.45;
	}

	/* THE FACES — emoji above, word below, always. */
	.faces {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr));
		gap: 0.4rem;
	}

	.face {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.2rem;
		min-height: 56px;
		padding: 0.4rem 0.3rem;
		border-radius: 10px;
		border: 1.5px solid var(--border-color);
		background: var(--bg);
		color: var(--text-secondary);
		cursor: pointer;
		transition:
			border-color 0.15s,
			color 0.15s,
			background 0.15s;
	}

	.face:not(.chosen):hover {
		border-color: var(--text-muted);
		color: var(--text);
	}

	.face.chosen {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		font-weight: 600;
	}

	.face-emoji {
		font-size: 1.5rem;
		line-height: 1;
	}

	.face-word {
		font-size: 0.68rem;
		line-height: 1.15;
		text-align: center;
	}

	.face-def {
		margin: 0;
		padding: 0.5rem 0.75rem;
		font-size: 0.8rem;
		color: var(--text-muted);
		line-height: 1.5;
		background: color-mix(in srgb, var(--accent) 6%, transparent);
		border-radius: 8px;
		border-left: 2px solid color-mix(in srgb, var(--accent) 40%, transparent);
	}

	.belongs {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.belongs-word,
	.field-word {
		font-size: 0.76rem;
		color: var(--text-muted);
	}

	.belongs-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.chip {
		min-height: 44px;
		padding: 0.5rem 0.9rem;
		border-radius: 22px;
		border: 1.5px solid var(--border-color);
		background: var(--bg);
		color: var(--text-secondary);
		font-size: 0.83rem;
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

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.text-input {
		width: 100%;
		min-height: 44px;
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

	.text-input:focus {
		border-color: var(--accent);
	}

	.intensity {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		min-height: 44px;
	}

	.dot {
		width: 28px;
		height: 28px;
		border-radius: 50%;
		border: 2px solid var(--border-color);
		background: transparent;
		cursor: pointer;
		transition:
			background 0.15s,
			border-color 0.15s;
	}

	.dot.filled {
		background: var(--accent);
		border-color: var(--accent);
	}

	.panel-actions {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
	}

	.press {
		min-height: 44px;
		padding: 0.6rem 1.2rem;
		border-radius: 22px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 0.9rem;
		font-weight: 600;
		cursor: pointer;
	}

	.press:disabled {
		opacity: 0.45;
		cursor: not-allowed;
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

	.plain.small {
		min-height: 36px;
		padding: 0.35rem 0.8rem;
		font-size: 0.8rem;
	}

	@media (prefers-reduced-motion: reduce) {
		.face,
		.chip,
		.dot {
			transition: none;
		}
	}
</style>
