<script lang="ts">
	import { onMount } from 'svelte';
	import { recorderStore, type TakeFile } from '$lib/stores/recorder.svelte';
	import { recordPrefs, fmtMax, MAX_CHOICES } from '$lib/stores/recordPrefs.svelte';
	import { takeStore } from '$lib/stores/take.svelte';
	import { workStore } from '$lib/stores/work.svelte';
	import { playbackStore } from '$lib/stores/playback.svelte';
	import { marksStore } from '$lib/stores/marks.svelte';
	import TakePlayer from '$lib/components/TakePlayer.svelte';
	import FeelingHere from '$lib/components/FeelingHere.svelte';

	// THE RECORD ROOM — Phase 3 Wave 1 (2026-08-13, an Opus hand). The room is
	// carried from `resonance-assets/sistrum-inheritance/` and then wired into
	// THIS body's domain: a sealed take's row lands in the takes table, keyed by
	// its file name, and its work is assigned by the artist's own hand or not
	// at all.
	//
	// The two findings of the Summons ride here from the inheritance: the room
	// ARMS INSTANTLY (nothing heavy on mount — the idea must not die while the
	// app loads), and Bluetooth's monitoring delay is said plainly rather than
	// pretended away.
	//
	// THE LAWS ON THIS PAGE, none of them softened:
	//   · Nothing records until a hand presses Record. Opt-in by nature.
	//   · Nothing recorded touches a network. Ever. The only door out is the
	//     export, and it opens onto this device's own file dialog.
	//   · Lose-nothing: there is no delete here. A take that exists keeps
	//     existing.
	//   · Nothing infers a take's work.

	let selectedDevice = $state<string | null>(null);
	let takeName = $state('');
	let openTake = $state<string | null>(null);
	let lastSealed = $state<TakeFile | null>(null);

	const recording = $derived(recorderStore.recording);
	const paused = $derived(recorderStore.paused);
	const capped = $derived(recorderStore.capped);
	// Holding is a choice made below — an autonomy call about when the
	// microphone may be open at all, not a tuning knob.
	const canHold = $derived(recordPrefs.mode === 'hold');
	const peak = $derived(recorderStore.peak);
	const clipped = $derived(recorderStore.clipped);
	const takes = $derived(recorderStore.takes);
	const chosen = $derived(openTake ? recorderStore.byFileName(openTake) : undefined);

	const prefersReduced =
		typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const btHint = $derived.by(() => {
		const name = (
			selectedDevice ??
			recorderStore.devices.find((d) => d.is_default)?.name ??
			''
		).toLowerCase();
		return /bluetooth|airpod|buds|headset|bt-|wh-|wf-/.test(name);
	});

	function fmtElapsed(secs: number): string {
		const m = Math.floor(secs / 60);
		const s = Math.floor(secs % 60);
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function fmtSeconds(secs: number): string {
		if (secs >= 60) return fmtElapsed(secs);
		return `${secs.toFixed(1)}s`;
	}

	function workTitle(fileName: string): string | null {
		const id = takeStore.byFileName(fileName)?.workId;
		return id ? (workStore.byId(id)?.title ?? null) : null;
	}

	async function startTake() {
		lastSealed = null;
		await recorderStore.start(selectedDevice, recordPrefs.capSecs);
	}

	// The room works like a voice recorder (KP's ⚛ shape, 2026-08-12): record,
	// hold, resume, save. There is no keep-or-discard moment at the end of a
	// take — a saved take simply lands on the shelf and stays there.
	//
	// THE ROW LANDS WITH THE FILE. The file on disk is the truth; this row is
	// the meaning around it, and it is written here so that a take is
	// assignable, noteable and findable from the moment it exists. It carries
	// NO work: `work_id` stays null until a hand says otherwise.
	async function saveTake() {
		const sealed = await recorderStore.stop(true, takeName.trim() ? takeName.trim() : null);
		takeName = '';
		if (!sealed) return;
		lastSealed = sealed;
		try {
			await takeStore.upsertTake({
				fileName: sealed.file_name,
				name: sealed.file_name.replace(/\.wav$/, ''),
				seconds: sealed.seconds,
				sampleRate: sealed.sample_rate,
				channels: sealed.channels,
				createdAt: sealed.created_at * 1000
			});
		} catch (e) {
			// The audio is sealed and safe on disk whatever happens here — the
			// row is meaning, and meaning can be written again. Said plainly
			// rather than swallowed.
			console.error('[record] the take is safe; its row did not write:', e);
		}
	}

	// A capped take has ALREADY released the device, on the capture thread in
	// Rust — the samples are simply waiting. Seal them at once: the no-holding
	// mode's whole promise is that a take ends by itself at its maximum with
	// nothing left for anyone to do. The flag is a plain let, not $state, so
	// sealing cannot re-trigger the effect that started it.
	let sealingCap = false;
	$effect(() => {
		if (capped && !sealingCap) {
			sealingCap = true;
			saveTake().finally(() => {
				sealingCap = false;
			});
		}
	});

	// Every file on the shelf gets a row, so that a take recorded by an older
	// build is as assignable as one recorded a minute ago. This registers what
	// ALREADY EXISTS — it records nothing, it infers no work, and it never
	// overwrites meaning a hand has already put on a take.
	async function registerOrphans() {
		for (const t of recorderStore.takes) {
			if (takeStore.byFileName(t.file_name)) continue;
			try {
				await takeStore.upsertTake({
					fileName: t.file_name,
					seconds: t.seconds,
					sampleRate: t.sample_rate,
					channels: t.channels,
					createdAt: t.created_at * 1000
				});
			} catch {
				// A row that will not write is not a reason to stop reading the
				// shelf. The file is still there and still playable.
			}
		}
	}

	function openPanel(fileName: string) {
		openTake = openTake === fileName ? null : fileName;
		if (openTake === null) playbackStore.close();
	}

	onMount(() => {
		// Fast-arm: the record button is live immediately (a null device hint
		// means the platform default); everything else fills in behind it.
		recordPrefs.load();
		playbackStore.loadVolume();
		recorderStore.loadDevices();
		void (async () => {
			await Promise.all([
				recorderStore.refreshTakes(),
				takeStore.loadTakes(),
				workStore.loadWorks(),
				// One directory read — which takes carry a sidecar at all. No
				// history is opened to find out, so the shelf stays cheap.
				marksStore.loadMarked()
			]);
			await registerOrphans();
		})();

		return () => {
			// Leaving the room never stops a running take silently — the take
			// keeps recording and the room shows it honestly on return. The
			// PLAYBACK does stop, because sound following you out of a room you
			// left is sound nobody asked for.
			playbackStore.close();
		};
	});
</script>

<div class="page">
	<header class="page-head">
		<h1 class="page-title">Record</h1>
		<p class="page-sub">Nothing here listens until you say so, and nothing recorded leaves this device.</p>
	</header>

	{#if recorderStore.error}
		<p class="rec-error" role="alert">{recorderStore.error}</p>
	{/if}

	{#if !recording}
		<div class="arm-panel">
			<button class="record-btn" onclick={startTake}>
				<span class="record-dot" aria-hidden="true"></span>
				Record
			</button>

			<label class="field">
				<span class="field-word">Name the take (optional)</span>
				<input type="text" class="take-name" bind:value={takeName} maxlength="60" />
			</label>

			{#if recorderStore.devices.length > 0}
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

			<fieldset class="holding">
				<legend class="field-word">While recording</legend>
				<div class="holding-row">
					<button
						class="mode"
						class:chosen={recordPrefs.mode === 'hold'}
						aria-pressed={recordPrefs.mode === 'hold'}
						onclick={() => recordPrefs.setMode('hold')}
					>
						A take may be held
					</button>
					<button
						class="mode"
						class:chosen={recordPrefs.mode === 'bounded'}
						aria-pressed={recordPrefs.mode === 'bounded'}
						onclick={() => recordPrefs.setMode('bounded')}
					>
						Never held — set a maximum
					</button>
				</div>
				{#if recordPrefs.mode === 'bounded'}
					<div class="holding-row">
						{#each MAX_CHOICES as secs (secs)}
							<button
								class="mode small"
								class:chosen={recordPrefs.maxSecs === secs}
								aria-pressed={recordPrefs.maxSecs === secs}
								onclick={() => recordPrefs.setMaxSecs(secs)}
							>
								{fmtMax(secs)}
							</button>
						{/each}
					</div>
					<p class="mode-note">
						The microphone is open only while actually recording, and the take ends by itself at
						{fmtMax(recordPrefs.maxSecs)}. The maximum is kept in the capture thread, not in this
						window — a promise about a microphone should not depend on whether a screen is awake.
					</p>
				{:else}
					<p class="mode-note">
						A take can be held and picked back up. The microphone stays open while held, which the
						room says plainly when it happens.
					</p>
				{/if}
			</fieldset>

			{#if btHint}
				<p class="bt-note">
					Bluetooth listens on a delay — what you hear runs behind what you play. The take itself
					stays true, and can be aligned later. A wired input hears itself honestly.
				</p>
			{/if}

			<!-- The doorway stands here too, before a note has been played:
			     what a musician feels walking UP to a take is worth as much as
			     what they feel after it, and "belongs to nothing" is lawful. -->
			<div class="arm-feeling">
				<FeelingHere />
			</div>
		</div>
	{:else}
		<div class="live-panel">
			<p class="listening" class:held={paused} aria-live="polite">
				{paused ? '❚❚ Held' : '● Listening'}
			</p>
			<p class="live-elapsed">{fmtElapsed(recorderStore.elapsedSecs)}</p>
			<p class="live-device">
				{recorderStore.device} · {recorderStore.sampleRate} Hz · {recorderStore.channels === 1
					? 'mono'
					: `${recorderStore.channels} channels`}
			</p>

			{#if !canHold}
				<p class="cap-note">Saves itself at {fmtMax(recordPrefs.maxSecs)}.</p>
			{/if}

			<div class="meter" role="img" aria-label="Input level">
				<div
					class="meter-fill"
					class:hot={peak > 0.9}
					class:no-motion={prefersReduced}
					style="width: {Math.min(100, peak * 100)}%"
				></div>
			</div>
			{#if clipped > 0}
				<p class="clip-note">clipped ×{clipped}</p>
			{/if}

			{#if paused}
				<p class="held-note">
					The mic stays open while held, so your phone may still show its microphone light. Nothing
					is heard and nothing is kept — resume picks the same take back up where it left off.
				</p>
			{/if}

			<div class="live-actions">
				{#if canHold}
					{#if paused}
						<button class="hold-btn" onclick={() => recorderStore.resume()}>▶ Resume</button>
					{:else}
						<button class="hold-btn" onclick={() => recorderStore.pause()}>❚❚ Pause</button>
					{/if}
				{/if}
				<button class="stop-btn" onclick={saveTake}>■ Save take</button>
			</div>
		</div>
	{/if}

	{#if lastSealed}
		<!-- THE TAKE REPORT, said plainly. The real length measured from the
		     samples, the device's own rate, the true peak — and silence
		     reported as silence rather than as a very small number. -->
		<p class="sealed-note">
			Sealed: {fmtSeconds(lastSealed.seconds)} at {lastSealed.sample_rate} Hz ·
			{#if lastSealed.peak_dbfs !== null}
				peak {lastSealed.peak_dbfs.toFixed(1)} dBFS
			{:else}
				silence — nothing rose above the floor
			{/if}{#if lastSealed.clipped}
				· clipped ×{lastSealed.clipped}{/if}. It is on the shelf.
		</p>

		<!-- THE EMOTION LOG AT THE MAKING SURFACE (Wave 2). It stands right
		     after the take seals, because that is the moment KP's own reason
		     is about: "logging how we feel during a moment is the base of all
		     we do." It asks nothing and blocks nothing — a take that is never
		     felt at is a complete take. -->
		<div class="sealed-feeling">
			<FeelingHere
				takeFileName={lastSealed.file_name}
				takeTitle={lastSealed.file_name.replace(/\.wav$/, '')}
				workId={takeStore.byFileName(lastSealed.file_name)?.workId ?? null}
				workTitle={workTitle(lastSealed.file_name)}
			/>
		</div>
	{/if}

	<h2 class="takes-title">Takes</h2>
	{#if takes.length === 0}
		<p class="takes-empty">No takes yet — the room is ready when you are.</p>
	{:else}
		<ul class="takes-list">
			{#each takes as t (t.file_name)}
				{@const title = workTitle(t.file_name)}
				<li class="take-item">
					<button
						class="take-row"
						class:open={openTake === t.file_name}
						aria-expanded={openTake === t.file_name}
						onclick={() => openPanel(t.file_name)}
					>
						<span class="take-meta">
							<span class="take-name-label">{t.file_name.replace(/\.wav$/, '')}</span>
							<span class="take-sub">
								{fmtSeconds(t.seconds)} · {t.sample_rate} Hz · {t.channels === 1
									? 'mono'
									: `${t.channels} channels`}{title ? ` · ${title}` : ''}{marksStore.hasMarks(
									t.file_name
								)
									? ' · marked'
									: ''}
							</span>
						</span>
						<span class="take-open">{openTake === t.file_name ? 'Close' : 'Open'}</span>
					</button>

					{#if openTake === t.file_name && chosen}
						<TakePlayer
							take={chosen}
							onclose={() => {
								openTake = null;
								playbackStore.close();
							}}
						/>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
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

	.rec-error {
		color: #e17055;
		font-size: 0.9rem;
	}

	.arm-panel,
	.live-panel {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}

	.record-btn {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.9rem 1.8rem;
		border-radius: 28px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 1.05rem;
		font-weight: 600;
		cursor: pointer;
		min-height: 44px;
	}

	.record-btn:hover {
		filter: brightness(1.1);
	}

	.record-dot {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		background: #fff;
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

	.take-name,
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

	.take-name:focus,
	.device-select:focus {
		border-color: var(--accent);
	}

	.holding {
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 0.75rem 0.9rem 0.9rem;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		max-width: 46rem;
	}

	.holding-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.mode {
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

	.mode.small {
		font-size: 0.8rem;
	}

	.mode.chosen {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		font-weight: 600;
	}

	.mode:not(.chosen):hover {
		border-color: var(--text-muted);
		color: var(--text);
	}

	.mode-note,
	.bt-note,
	.held-note {
		font-size: 0.82rem;
		line-height: 1.5;
		color: var(--text-secondary);
		max-width: 44rem;
		margin: 0;
	}

	.listening {
		color: var(--accent);
		font-weight: 600;
		margin: 0;
	}

	/* Held is a resting state, not an alarm: the word goes quiet rather than
	   red, and the meter falls to nothing on its own because a held take
	   feeds the level no samples. */
	.listening.held {
		color: var(--text-secondary);
	}

	.live-elapsed {
		font-size: 2.4rem;
		font-weight: 200;
		font-variant-numeric: tabular-nums;
		margin: 0;
		line-height: 1;
		color: var(--text);
	}

	.live-device,
	.cap-note {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.meter {
		width: min(420px, 100%);
		height: 10px;
		border-radius: 5px;
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		overflow: hidden;
	}

	.meter-fill {
		height: 100%;
		background: var(--accent);
		transition: width 120ms linear;
	}

	.meter-fill.hot {
		background: #e17055;
	}

	.meter-fill.no-motion {
		transition: none;
	}

	.clip-note {
		font-size: 0.8rem;
		color: #e17055;
		margin: 0;
	}

	.live-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.stop-btn {
		padding: 0.7rem 1.4rem;
		border-radius: 22px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		min-height: 44px;
	}

	.hold-btn {
		padding: 0.7rem 1.4rem;
		border-radius: 22px;
		/* Full-strength text and a visible edge. The button this replaced was
		   never disabled, but a muted color on transparent read as greyed-out
		   to its first user (KP, S25, 2026-08-12). A live action must look
		   live — the sensory law cuts both ways. */
		border: 1px solid var(--text-secondary);
		background: transparent;
		color: var(--text);
		font-size: 0.95rem;
		cursor: pointer;
		min-height: 44px;
	}

	.sealed-note {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0 0 1rem;
	}

	.sealed-feeling,
	.arm-feeling {
		max-width: 44rem;
		width: 100%;
		margin-bottom: 1rem;
	}

	.takes-title {
		font-size: 1.05rem;
		margin: 1.25rem 0 0.5rem;
		color: var(--text);
	}

	.takes-empty {
		color: var(--text-muted);
		font-size: 0.9rem;
	}

	.takes-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.take-item {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.take-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		min-height: 44px;
		padding: 0.65rem 0.9rem;
		border-radius: 12px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		box-sizing: border-box;
	}

	.take-row:hover {
		border-color: color-mix(in srgb, var(--accent) 40%, var(--border-color));
	}

	.take-row.open {
		border-color: var(--accent);
	}

	.take-meta {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.take-name-label {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.take-sub {
		font-size: 0.78rem;
		color: var(--text-muted);
	}

	.take-open {
		font-size: 0.8rem;
		color: var(--accent);
		flex-shrink: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.mode,
		.meter-fill {
			transition: none;
		}
	}
</style>
