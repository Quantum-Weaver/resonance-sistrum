<script lang="ts">
	import { spliceStore } from '$lib/stores/splice.svelte';
	import type { MadeTake } from '$lib/stores/repair.svelte';

	// A lane's splice bench: cut at a boundary and join another take with an
	// equal-power crossfade of the length the person sets, and punch a fresh
	// recording into the region between an in and an out point with the crossfade
	// at both ends. Both make a NEW take; neither writes what it was made from.
	//
	// The recorder belongs to the room, so the punch's arm and keep are the page's
	// to run — this bench only holds the points and says what it asked for.

	let {
		trackId,
		take,
		laneNumber,
		playhead = 0,
		shelf = [],
		armed = false,
		recording = false,
		onarm,
		onkeep,
		ondiscard,
		onmade
	}: {
		trackId: string;
		take: string;
		laneNumber: number;
		/** The lane's own playhead, seconds into the take. */
		playhead?: number;
		shelf?: { file_name: string; seconds: number }[];
		armed?: boolean;
		recording?: boolean;
		onarm?: (ask: { inSecs: number; outSecs: number; crossfadeMs: number }) => void;
		onkeep?: () => void;
		ondiscard?: () => void;
		onmade?: (made: MadeTake, detail: Record<string, unknown>) => void;
	} = $props();

	let withTake = $state('');
	let cutSecs = $state(0);
	let joinAtSecs = $state(0);
	let spliceFadeMs = $state(20);
	let spliceName = $state('');

	let punchIn = $state(0);
	let punchOut = $state(0);
	let punchFadeMs = $state(20);

	const working = $derived(spliceStore.working(trackId));
	const others = $derived(shelf.filter((s) => s.file_name !== take));

	async function doSplice() {
		if (!withTake) return;
		const made = await spliceStore.spliceLane(trackId, take, {
			withTake,
			cutSecs,
			joinAtSecs,
			crossfadeMs: spliceFadeMs,
			name: spliceName
		});
		if (made) {
			onmade?.(made, {
				joined: withTake,
				cut_secs: cutSecs,
				join_at_secs: joinAtSecs,
				crossfade_ms: spliceFadeMs
			});
			spliceName = '';
		}
	}

	const punchAsk = $derived({ inSecs: punchIn, outSecs: punchOut, crossfadeMs: punchFadeMs });
</script>

<details class="splice">
	<summary>Splice and punch-in</summary>

	<div class="block">
		<h3 class="h3">Splice</h3>
		<div class="row">
			<label class="knob grow">
				<span class="word">Join with</span>
				<select class="sel" bind:value={withTake} aria-label="Take to join onto lane {laneNumber}">
					<option value="">Choose a take…</option>
					{#each others as s (s.file_name)}
						<option value={s.file_name}>{s.file_name.replace(/\.wav$/, '')}</option>
					{/each}
				</select>
			</label>
		</div>
		<div class="row">
			<label class="knob">
				<span class="word">Cut this lane at (s)</span>
				<input type="number" class="num" min="0" step="0.01" bind:value={cutSecs} aria-label="Cut point on lane {laneNumber}" />
			</label>
			<button class="plain small" onclick={() => (cutSecs = Math.round(playhead * 100) / 100)}>At playhead</button>
			<label class="knob">
				<span class="word">Cut the other at (s)</span>
				<input type="number" class="num" min="0" step="0.01" bind:value={joinAtSecs} aria-label="Cut point on the joined take for lane {laneNumber}" />
			</label>
			<label class="knob">
				<span class="word">Crossfade</span>
				<input type="number" class="num" min="0" max="5000" step="1" bind:value={spliceFadeMs} aria-label="Splice crossfade in milliseconds for lane {laneNumber}" />
				<span class="read">ms</span>
			</label>
		</div>
		<div class="row">
			<label class="knob grow">
				<span class="word">Keep as</span>
				<input type="text" class="text" bind:value={spliceName} maxlength="60" placeholder="{take.replace(/\.wav$/, '')}-splice" aria-label="Name for the spliced take of lane {laneNumber}" />
			</label>
			<button class="press" onclick={doSplice} disabled={working || !withTake}>
				{working ? 'Splicing…' : '✂ Splice to a new take'}
			</button>
		</div>
		<p class="hint">
			This lane runs to its cut, then the other take runs from its own, joined by an equal-power
			crossfade. The joined length is this lane's cut plus what is left of the other.
		</p>
	</div>

	<div class="block">
		<h3 class="h3">Punch-in</h3>
		<div class="row">
			<label class="knob">
				<span class="word">In (s)</span>
				<input type="number" class="num" min="0" step="0.01" bind:value={punchIn} aria-label="Punch in point for lane {laneNumber}" />
			</label>
			<button class="plain small" onclick={() => (punchIn = Math.round(playhead * 100) / 100)}>At playhead</button>
			<label class="knob">
				<span class="word">Out (s)</span>
				<input type="number" class="num" min="0" step="0.01" bind:value={punchOut} aria-label="Punch out point for lane {laneNumber}" />
			</label>
			<button class="plain small" onclick={() => (punchOut = Math.round(playhead * 100) / 100)}>At playhead</button>
			<label class="knob">
				<span class="word">Crossfade</span>
				<input type="number" class="num" min="0" max="5000" step="1" bind:value={punchFadeMs} aria-label="Punch crossfade in milliseconds for lane {laneNumber}" />
				<span class="read">ms</span>
			</label>
		</div>
		<div class="row">
			{#if !armed}
				<button class="press" onclick={() => onarm?.(punchAsk)} disabled={working || recording || !(punchOut > punchIn)}>
					⏺ Punch in
				</button>
			{:else}
				<button class="press" onclick={() => onkeep?.()} disabled={working}>✔ Keep the punch</button>
				<button class="plain" onclick={() => ondiscard?.()} disabled={working}>Discard</button>
			{/if}
		</div>
		<p class="hint">
			The lane plays from the in point and the recorder runs. What you record replaces the region,
			crossfaded at both ends. A punch that exactly fills its region leaves the length as it was.
		</p>
	</div>

	{#if spliceStore.error}
		<p class="err" role="alert">{spliceStore.error}</p>
	{/if}
</details>

<style>
	.splice {
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

	.num {
		width: 6rem;
	}

	.num,
	.text,
	.sel {
		min-height: 34px;
		padding: 0.25rem 0.5rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text);
		font-size: 0.82rem;
	}

	.text,
	.sel {
		width: 100%;
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

	.err {
		font-size: 0.78rem;
		color: #e17055;
		margin: 0.2rem 0 0;
	}
</style>
