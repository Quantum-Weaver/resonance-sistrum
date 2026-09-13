<script lang="ts">
	import { masterStore } from '$lib/stores/master.svelte';
	import { TARGETS } from '$lib/master';
	import type { ChapterMark } from '$lib/container';
	import type { EncodeFormat } from '$lib/encode';
	import type { SessionTrack } from '$lib/studio';
	import type { MadeTake } from '$lib/stores/repair.svelte';

	// The mastering rack: the meters, the target and the ceiling, the chapter
	// marks, and the door that lands them. The arithmetic is `$lib/master` and
	// `$lib/container`; the encode is the platform's own. This panel only asks.

	let {
		tracks = [],
		chapters = [],
		position = 0,
		onaddchapter,
		onmovechapter,
		onremovechapter,
		onlanded
	}: {
		tracks?: SessionTrack[];
		chapters?: ChapterMark[];
		/** The mix playhead, seconds — where a new chapter mark is dropped. */
		position?: number;
		onaddchapter?: (atMs: number) => void;
		onmovechapter?: (id: string, patch: { at_ms?: number; title?: string }) => void;
		onremovechapter?: (id: string) => void;
		onlanded?: (take: MadeTake, beside: string[]) => void;
	} = $props();

	let landName = $state('');
	let container = $state('');
	let withSidecars = $state(true);

	const heard = $derived(masterStore.heard);
	const report = $derived(masterStore.report);
	const offered = $derived(masterStore.offered);
	const walls = $derived(masterStore.walls);
	const busy = $derived(masterStore.reading || masterStore.working || masterStore.landing);

	const db = (v: number | undefined, digits = 1) =>
		v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);

	function stamp(ms: number): string {
		const total = Math.max(0, Math.round(ms));
		const m = Math.floor(total / 60000);
		const s = Math.floor((total % 60000) / 1000);
		const rest = Math.floor((total % 1000) / 100);
		return `${m}:${String(s).padStart(2, '0')}.${rest}`;
	}

	function chosenFormat(): EncodeFormat | null {
		return offered.find((f) => f.mime === container) ?? null;
	}

	async function landIt() {
		const done = await masterStore.land({
			name: landName,
			chapters,
			format: chosenFormat(),
			sidecars: withSidecars
		});
		if (done) {
			onlanded?.(done.take, done.beside);
			landName = '';
		}
	}
</script>

<section class="master" aria-label="Master">
	<h2 class="h2">Master</h2>

	<div class="row">
		<button class="plain" onclick={() => masterStore.read(tracks)} disabled={busy || tracks.length === 0}>
			{masterStore.reading ? 'Measuring…' : 'Measure the mix'}
		</button>
		{#if masterStore.hasSource}
			<span class="read">{stamp(masterStore.seconds * 1000)} rendered</span>
		{/if}
	</div>

	<div class="meters" aria-label="The meters">
		<div class="meter">
			<span class="word">Integrated</span>
			<span class="figure">{db(heard?.integratedLufs)}<small> LUFS</small></span>
		</div>
		<div class="meter">
			<span class="word">Short-term max</span>
			<span class="figure">{db(heard?.shortTermMaxLufs)}<small> LUFS</small></span>
		</div>
		<div class="meter">
			<span class="word">Momentary max</span>
			<span class="figure">{db(heard?.momentaryMaxLufs)}<small> LUFS</small></span>
		</div>
		<div class="meter">
			<span class="word">True peak</span>
			<span class="figure" class:over={(heard?.truePeakDbtp ?? -99) > masterStore.ceilingDbtp}>
				{db(heard?.truePeakDbtp, 2)}<small> dBTP</small>
			</span>
		</div>
		<div class="meter">
			<span class="word">Sample peak</span>
			<span class="figure">{db(heard?.samplePeakDbfs, 2)}<small> dBFS</small></span>
		</div>
	</div>
	<p class="hint">
		Loudness is ITU-R BS.1770-4: K-weighted, 400 ms blocks at 75% overlap, gated at −70 LUFS and
		again 10 LU below the mean of what survived. True peak is the standard's 4× reconstruction, so
		it reads higher than the sample peak wherever the sound crests between two samples.
	</p>

	<div class="row">
		<label class="knob">
			<span class="word">Target</span>
			<select
				class="num"
				value={String(masterStore.targetLufs)}
				onchange={(e) => masterStore.setTarget(Number(e.currentTarget.value))}
				aria-label="Target loudness in LUFS"
			>
				{#each TARGETS as t (t.lufs)}
					<option value={String(t.lufs)}>{t.lufs} LUFS · {t.word}</option>
				{/each}
			</select>
		</label>
		<label class="knob">
			<span class="word">Ceiling</span>
			<input
				type="range"
				min="-6"
				max="0"
				step="0.1"
				value={masterStore.ceilingDbtp}
				oninput={(e) => masterStore.setCeiling(Number(e.currentTarget.value))}
				aria-label="Limiter ceiling in dBTP"
			/>
			<span class="read">{masterStore.ceilingDbtp.toFixed(1)} dBTP</span>
		</label>
		<label class="knob">
			<span class="word">Look-ahead</span>
			<input
				type="number"
				class="num small"
				min="1"
				max="50"
				step="1"
				value={masterStore.lookaheadMs}
				oninput={(e) => masterStore.setLookahead(Number(e.currentTarget.value))}
				aria-label="Limiter look-ahead in milliseconds"
			/>
			<span class="read">ms</span>
		</label>
		<label class="knob">
			<span class="word">Release</span>
			<input
				type="number"
				class="num small"
				min="10"
				max="2000"
				step="10"
				value={masterStore.releaseMs}
				oninput={(e) => masterStore.setRelease(Number(e.currentTarget.value))}
				aria-label="Limiter release in milliseconds"
			/>
			<span class="read">ms</span>
		</label>
		<button class="press" onclick={() => masterStore.apply()} disabled={busy || !masterStore.hasSource}>
			{masterStore.working ? 'Mastering…' : '🎚 Master'}
		</button>
		{#if masterStore.hasMaster}
			<button class="plain small" onclick={() => masterStore.revert()} disabled={busy}>Drop it</button>
		{/if}
	</div>

	{#if report}
		<table class="beforeafter">
			<thead>
				<tr><th scope="col">　</th><th scope="col">Before</th><th scope="col">After</th></tr>
			</thead>
			<tbody>
				<tr>
					<th scope="row">Integrated</th>
					<td>{db(report.before.integratedLufs)} LUFS</td>
					<td>{db(report.after.integratedLufs)} LUFS</td>
				</tr>
				<tr>
					<th scope="row">True peak</th>
					<td>{db(report.before.truePeakDbtp, 2)} dBTP</td>
					<td>{db(report.after.truePeakDbtp, 2)} dBTP</td>
				</tr>
			</tbody>
		</table>
		<p class="hint">
			{db(report.gainDb, 2)} dB of gain to reach {report.targetLufs} LUFS, then
			{report.gainReductionDb > 0
				? `${db(report.gainReductionDb, 2)} dB held back at the loudest point`
				: 'nothing held back — the ceiling was never reached'}{report.trimDb < 0
				? `, and ${db(report.trimDb, 2)} dB trimmed off the whole to sit under ${report.ceilingDbtp} dBTP`
				: ''}. The master is a new buffer: no lane and no take was written.
		</p>
	{/if}

	<div class="block">
		<h3 class="h3">Chapters</h3>
		<div class="row">
			<button class="plain small" onclick={() => onaddchapter?.(Math.round(position * 1000))}>
				Mark at {stamp(position * 1000)}
			</button>
			<span class="read">{chapters.length} in this session</span>
		</div>
		{#if chapters.length > 0}
			<ol class="chapters">
				{#each chapters as c (c.id)}
					<li class="chapter">
						<span class="read at">{stamp(c.at_ms)}</span>
						<input
							class="num grow"
							type="text"
							value={c.title}
							maxlength="120"
							placeholder="Untitled"
							aria-label="Title of the chapter at {stamp(c.at_ms)}"
							oninput={(e) => onmovechapter?.(c.id, { title: e.currentTarget.value })}
						/>
						<button class="plain small" onclick={() => onremovechapter?.(c.id)}>Remove</button>
					</li>
				{/each}
			</ol>
		{:else}
			<p class="hint">No chapter marks yet. A mark is a point on the mix's clock with a title.</p>
		{/if}
	</div>

	<div class="block">
		<h3 class="h3">Land it</h3>
		<div class="row">
			<label class="knob grow">
				<span class="word">Name</span>
				<input
					type="text"
					class="num grow"
					bind:value={landName}
					maxlength="60"
					placeholder="master"
					aria-label="Name for the mastered take"
				/>
			</label>
			<label class="knob">
				<span class="word">Beside the WAV</span>
				<select class="num" bind:value={container} aria-label="Container to encode into">
					<option value="">nothing — WAV alone</option>
					{#each offered as f (f.mime)}
						<option value={f.mime}>{f.word}</option>
					{/each}
				</select>
			</label>
			<label class="pick">
				<input type="checkbox" bind:checked={withSidecars} />
				<span>chapter sidecars</span>
			</label>
			<button class="press" onclick={landIt} disabled={busy || !masterStore.hasSource}>
				{masterStore.landing ? 'Landing…' : '📥 Land'}
			</button>
			{#if masterStore.encoding}
				<button class="plain small" onclick={() => masterStore.stopEncoding()}>Stop</button>
			{/if}
		</div>
		{#if masterStore.encoding}
			<p class="note" role="status">
				Encoding to {masterStore.encoding} — the platform's recorder writes in real time, so this
				takes as long as the sound does. Nothing is heard while it runs.
			</p>
		{/if}
		<p class="hint">
			The WAV carries its chapters inside it, as a <code>cue </code> chunk and a
			<code>LIST</code>/<code>adtl</code> chunk of labels, both after the samples — so a player
			that knows neither still opens it. It lands as a take like any other.
		</p>
		{#if offered.length > 0}
			<p class="hint">
				This device offers {offered.map((f) => f.word).join(' and ')}. WebM and Ogg carry chapters
				only through a muxer this app does not have, so an encoded file takes its chapters beside
				it as <code>-chapters.txt</code> (ffmetadata) and <code>-chapters.vtt</code> (WebVTT).
			</p>
		{/if}
		{#if walls.length > 0}
			<ul class="walls">
				{#each walls as w (w.mime)}
					<li>{w.word} — {w.wall}.</li>
				{/each}
			</ul>
		{/if}
		<p class="hint">
			No ffmpeg, no codec ships in this app, and nothing here reaches a network. WAV is written
			sample by sample; anything else is whatever this WebView already carries.
		</p>
	</div>

	{#if masterStore.told}
		<p class="note" role="status">{masterStore.told}</p>
	{/if}
	{#if masterStore.error}
		<p class="err" role="alert">{masterStore.error}</p>
	{/if}
</section>

<style>
	.master {
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 0.75rem 0.85rem;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.h2 {
		font-size: 0.95rem;
		margin: 0;
	}

	.h3 {
		font-size: 0.86rem;
		margin: 0 0 0.3rem;
	}

	.block {
		border-top: 1px solid var(--border-color);
		padding-top: 0.5rem;
		margin-top: 0.3rem;
	}

	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin: 0.25rem 0;
	}

	.meters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.meter {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		flex: 1 1 7rem;
		padding: 0.35rem 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 8px;
	}

	.figure {
		font-size: 1.05rem;
		font-variant-numeric: tabular-nums;
	}

	.figure small {
		font-size: 0.66rem;
		color: var(--text-muted);
	}

	.figure.over {
		color: var(--accent);
	}

	.knob {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.grow {
		flex: 1 1 10rem;
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

	.at {
		min-width: 3.5rem;
	}

	.pick {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.78rem;
	}

	.num {
		min-height: 34px;
		padding: 0.25rem 0.5rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text);
		font-size: 0.82rem;
	}

	.num.small {
		width: 4.5rem;
	}

	.beforeafter {
		border-collapse: collapse;
		font-size: 0.78rem;
		font-variant-numeric: tabular-nums;
	}

	.beforeafter th,
	.beforeafter td {
		text-align: left;
		padding: 0.15rem 0.75rem 0.15rem 0;
		font-weight: 400;
	}

	.beforeafter thead th {
		color: var(--text-muted);
		font-size: 0.72rem;
	}

	.chapters {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.chapter {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.walls {
		margin: 0.2rem 0;
		padding-left: 1.1rem;
		font-size: 0.76rem;
		color: var(--text-muted);
	}

	.hint {
		font-size: 0.76rem;
		color: var(--text-muted);
		margin: 0.15rem 0;
		line-height: 1.45;
	}

	.note {
		font-size: 0.8rem;
		margin: 0.15rem 0;
	}

	.err {
		font-size: 0.8rem;
		color: var(--accent);
		margin: 0.15rem 0;
	}

	code {
		font-size: 0.72rem;
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
</style>
