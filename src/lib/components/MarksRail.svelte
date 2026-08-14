<script lang="ts">
	import { marksStore } from '$lib/stores/marks.svelte';
	import { markPrefs } from '$lib/stores/markPrefs.svelte';
	import { feelingStore } from '$lib/stores/feeling.svelte';
	import { fmtTime, type Mark } from '$lib/marks';
	import { EMOJI_DEFS } from '$lib/data/emojis';

	// THE MOMENT MARKS, worn on a take's own rail.
	//
	// Phase 3 Wave 2 (2026-08-13, an **Opus** hand). `the-moment-marks`
	// consumed: the core is copied whole at `$lib/marks.ts` on the water's own
	// invitation, the sidecar lives beside the take's WAV and NEVER in this
	// app's database (Phase 2's ruling), and the append-only law is enforced a
	// second time in Rust at the file itself.
	//
	// WHAT THAT LAW LOOKS LIKE ON A SCREEN, which is the whole of this
	// component's design:
	//
	//   · An edit REVISES. The old entry is still in the history; the rail
	//     shows the current state, and the history is one tap away.
	//   · A removal RETRACTS. The mark leaves the VIEW. It does not leave the
	//     file, and this app has no door that would take it out.
	//   · So the button says "Retract", not "Delete" — because retract is what
	//     actually happens, and a button that names the wrong act is a button
	//     that lies about the law underneath it.
	//
	// EMOJI-FIRST, AND THE WORD IS ALWAYS THERE. The water's law 2 makes the
	// emoji the structure. This house's law makes every face wear its word: the
	// pin on the rail is the emoji, and the word rides underneath in the list
	// below it — and in the pin's own accessible name, so the rail reads aloud
	// as "Calm at 0:12.4" rather than as a shrug.
	//
	// A MOMENT IS A POSITION, NEVER A VERDICT (law 5). There is no severity
	// here, no rating, no score, and no counting of how many marks a take
	// "should" have.
	//
	// ───────────────────────────────────────────────────────────────────────
	// PHASE 3 WAVE 3 (2026-08-13, an **Opus** hand) — THE QUICK LOG.
	//
	// KP's ⚛ ruling, verbatim: "moment marks should be able to trigger a new
	// mood event when a mark is created. a quick log of emoji in the moment is
	// the capture."
	//
	// So pinning a mark ALSO logs a feeling, in the same press. ONE GESTURE,
	// TWO RECORDS, each landing by its own law:
	//
	//   · THE MARK goes to the `.marks.json` sidecar beside the WAV, through
	//     the append-only door and nowhere else. Its mechanics are untouched by
	//     this wave — not a line of the water, not a line of the Rust.
	//   · THE FEELING goes to the `feelings` table through the store that
	//     already exists, bound to this take by `take_file_name` and to its
	//     work by `work_id` when the artist has said which work it is. Both
	//     columns have been there since Phase 2, at KP's ⚛ "yes both".
	//
	// THE QUICK LOG IS THE CAPTURE: no second form, no extra dialog, nothing
	// asked twice. The face already chosen and the word already typed are what
	// the log receives.
	//
	// AND THE MARK IS NEVER HELD HOSTAGE TO THE SECOND RECORD. The mark lands
	// first and stands on its own; if the log refuses the row, the rail says so
	// plainly and offers to carry it again — it never swallows the miss, and it
	// never un-lands a mark over it.

	let {
		fileName,
		duration = 0,
		position = 0,
		workId = null,
		onseek
	}: {
		fileName: string;
		duration?: number;
		/** The playhead, in seconds — where a new mark would land. */
		position?: number;
		/** The work this take belongs to, when the artist has said so. A feeling
		 *  logged with a mark hangs on the take AND on its work — KP's ⚛ "yes
		 *  both". Nothing here ever infers a work; it is handed one or it is
		 *  handed null. */
		workId?: string | null;
		onseek?: (secs: number) => void;
	} = $props();

	let marking = $state(false);
	let draftEmoji = $state('');
	let draftNote = $state('');
	let showHistory = $state(false);
	let selected = $state<string | null>(null);
	let revising = $state<string | null>(null);
	let reviseNote = $state('');

	/** One quick log, held whole: everything the feeling needs, including the
	 *  take it belongs to, so a retry can never land a feeling on the wrong
	 *  take after the room has moved on. */
	type QuickLog = {
		takeFileName: string;
		workId: string | null;
		emoji: string;
		note?: string;
		/** Where in the take the mark was pinned. */
		at: number;
		/** WHEN the artist pinned it — held, not read off the clock at write
		 *  time. A row that lands on a retry still belongs to the moment it was
		 *  felt in, and the clock has moved since. */
		madeAt: number;
	};

	// The quick log's own small news. The mark and the feeling are two records
	// under two laws, so they get two voices: `marksStore.error` speaks for the
	// sidecar, and these speak for the log.
	let logged = $state<string | null>(null);
	let logMiss = $state<string | null>(null);
	/** What the log still owes. Kept rather than dropped, so a miss never costs
	 *  the artist the face they already chose — lose-nothing, at the smallest
	 *  scale it happens at. */
	let unlogged = $state<QuickLog[]>([]);

	// The rail's one preference, read when the rail appears.
	$effect(() => {
		markPrefs.load();
	});

	// The doc follows whichever take is open. The store holds one at a time,
	// which is exactly how many takes the player shows at a time.
	$effect(() => {
		const name = fileName;
		// A confirmation about the take you just left would be a lie about the
		// one in front of you. Any UNLANDED log survives the change instead —
		// each pending entry carries its own take.
		logged = null;
		void marksStore.open(name);
		return () => marksStore.close();
	});

	// DERIVED ON EVERY READ, never stored — the water requires it and the
	// reason is that a stored view can disagree with its own history.
	const view = $derived.by<Mark[]>(() => {
		// Touch the history so this recomputes whenever an entry lands.
		void marksStore.historyCount;
		return marksStore.view();
	});

	const hidden = $derived(marksStore.historyCount - view.length);

	function wordFor(emoji: string): string {
		return EMOJI_DEFS.find((d) => d.emoji === emoji)?.label ?? 'Mark';
	}

	function pct(at: number): number {
		if (!(duration > 0)) return 0;
		return Math.min(100, Math.max(0, (at / duration) * 100));
	}

	function phraseFor(q: QuickLog): string {
		return `${wordFor(q.emoji)} at ${fmtTime(q.at)}`;
	}

	/** Carry one quick log to the emotion log. Returns whether the row landed;
	 *  the QUEUE is the caller's business, so this can be used by the first
	 *  attempt and by a retry without either one surprising the other. */
	async function sendLog(q: QuickLog): Promise<boolean> {
		try {
			await feelingStore.addFeeling({
				// What makes a feeling findable later. The face's own word and the
				// moment it was pinned at — machine-written, so the artist's words
				// (below) are never edited into a title.
				name: phraseFor(q),
				// 'heard' is the honest sense for a feeling about sound being made
				// or played back — the same default the feeling doorway uses, so
				// one app does not hold two opinions about the same act.
				sense: 'heard',
				subcategory: 'music',
				emoji: q.emoji,
				// The artist's own word about the moment, carried across VERBATIM.
				// The mark keeps it too; neither copy is a paraphrase of the other.
				note: q.note,
				// The strength question is NOT asked here. Asking it would be the
				// second form this ruling exists to remove. 3 is the middle the
				// full form itself opens at: a strength left unstated, never a
				// rating this rail invented on the artist's behalf.
				intensity: 3,
				timestamp: q.madeAt,
				// Bound to the take, and to its work when there is one — the two
				// nullable columns Phase 2 put there at KP's ⚛ "yes both".
				takeFileName: q.takeFileName,
				workId: q.workId ?? undefined
			});
			return true;
		} catch (e) {
			logMiss = e instanceof Error ? e.message : String(e);
			return false;
		}
	}

	async function addHere() {
		if (!draftEmoji) return;
		// Held before anything is cleared: the log carries EXACTLY what the mark
		// carried, out of the same one gesture.
		const q: QuickLog = {
			takeFileName: fileName,
			workId,
			emoji: draftEmoji,
			note: draftNote.trim() || undefined,
			at: Math.max(0, position),
			madeAt: Date.now()
		};
		const ok = await marksStore.add(
			{
				at: q.at,
				emoji: q.emoji,
				// The vessel's own meaning for that face travels with the mark —
				// the folksonomy layer, and the water's "contents sovereign".
				definition: feelingStore.getPersonalDefinition(q.emoji) || undefined,
				note: q.note
			},
			duration
		);
		// The mark did not land, so there is no moment for a feeling to be about.
		// The drafts stay exactly where the artist left them.
		if (!ok) return;

		draftEmoji = '';
		draftNote = '';
		marking = false;
		logged = null;

		// THE SECOND RECORD, from the same press. The mark above is already on
		// disk and nothing below this line can reach it.
		if (!markPrefs.logsFeeling) return;
		logMiss = null;
		if (await sendLog(q)) logged = phraseFor(q);
		else unlogged = [...unlogged, q];
	}

	/** Carry the feelings the log missed. Offered, never automatic — a retry
	 *  that fires by itself is a write the artist did not press for. */
	async function retryLogs() {
		const pending = unlogged;
		logMiss = null;
		const missed: QuickLog[] = [];
		let last: string | null = null;
		for (const q of pending) {
			if (await sendLog(q)) last = phraseFor(q);
			else missed.push(q);
		}
		unlogged = missed;
		if (last) logged = last;
	}

	async function retract(id: string) {
		await marksStore.retract(id, duration);
		if (selected === id) selected = null;
	}

	async function saveRevision(id: string) {
		const ok = await marksStore.revise(id, { note: reviseNote.trim() || undefined }, duration);
		if (ok) {
			revising = null;
			reviseNote = '';
		}
	}

	function startRevising(m: Mark) {
		revising = m.id;
		reviseNote = m.note ?? '';
	}
</script>

<div class="marks">
	<!-- THE RAIL. It sits under the waveform and shares its horizontal scale,
	     so a pin is directly beneath the sound it is about. -->
	<div class="rail" role="group" aria-label="Marks on this take">
		{#each view as m (m.id)}
			<button
				class="pin"
				class:selected={selected === m.id}
				style="left: {pct(m.at)}%"
				aria-label="{wordFor(m.emoji)} at {fmtTime(m.at)}{m.note ? ` — ${m.note}` : ''}"
				onclick={() => {
					selected = selected === m.id ? null : m.id;
					onseek?.(m.at);
				}}
			>
				<span aria-hidden="true">{m.emoji}</span>
			</button>
		{/each}
		{#if view.length === 0 && !marksStore.loading}
			<span class="rail-empty">No marks on this take yet.</span>
		{/if}
	</div>

	{#if marksStore.error}
		<p class="marks-error" role="alert">{marksStore.error}</p>
	{/if}

	<!-- THE SECOND RECORD SPEAKS FOR ITSELF. A quick log that landed says so
	     quietly; one that missed says so plainly, and says in the same breath
	     that the mark is safe — because it is, and a musician should not have to
	     wonder. -->
	{#if logged}
		<p class="log-kept" role="status">
			Kept as a feeling too: {logged}.
		</p>
	{/if}
	{#if logMiss}
		<div class="log-miss" role="alert">
			<p class="log-miss-line">
				The mark landed and is safe in the take's own file — it never waits on this. The feeling did
				not reach the log: {logMiss}
			</p>
			<button class="plain small" onclick={retryLogs}>
				{unlogged.length > 1
					? `Log those ${unlogged.length} feelings again`
					: 'Log the feeling again'}
			</button>
		</div>
	{/if}

	<div class="marks-actions">
		{#if !marking}
			<button class="plain" onclick={() => (marking = true)}>
				＋ Mark this moment ({fmtTime(position)})
			</button>
		{:else}
			<button class="plain" onclick={() => (marking = false)}>Never mind</button>
		{/if}
		{#if marksStore.historyCount > 0}
			<button class="plain small" onclick={() => (showHistory = !showHistory)}>
				{showHistory ? 'Hide the history' : `History (${marksStore.historyCount})`}
			</button>
		{/if}
	</div>

	{#if marking}
		<div class="marker">
			<p class="marker-at">Landing at {fmtTime(position)} — the playhead's own position.</p>
			<!-- Emoji-first, and every face wears its word. -->
			<div class="faces" role="group" aria-label="Choose a mark">
				{#each EMOJI_DEFS as def (def.emoji)}
					<button
						class="face"
						class:chosen={draftEmoji === def.emoji}
						aria-pressed={draftEmoji === def.emoji}
						onclick={() => (draftEmoji = draftEmoji === def.emoji ? '' : def.emoji)}
					>
						<span class="face-emoji" aria-hidden="true">{def.emoji}</span>
						<span class="face-word">{def.label}</span>
					</button>
				{/each}
			</div>
			<label class="field">
				<span class="field-word">A word about this moment (optional)</span>
				<input type="text" class="text-input" bind:value={draftNote} maxlength="200" />
			</label>
			<!-- THE QUICK LOG, shown rather than hidden. KP's ⚛ ruling — "a quick
			     log of emoji in the moment is the capture" — so this is ON, and the
			     switch is here so a second record is never written invisibly. -->
			<button
				class="link"
				aria-pressed={markPrefs.logsFeeling}
				onclick={() => markPrefs.setLogsFeeling(!markPrefs.logsFeeling)}
			>
				<span class="link-box" class:on={markPrefs.logsFeeling} aria-hidden="true">
					{markPrefs.logsFeeling ? '✓' : ''}
				</span>
				<span class="link-words">
					<span class="link-title">Log this as a feeling too</span>
					<span class="link-sub">
						{#if markPrefs.logsFeeling}
							One press. The mark goes in this take's own file; the same face goes in the emotion
							log, hung on this take{workId ? ' and its work' : ''}.
						{:else}
							Off — this pins the mark only, and the emotion log stays as it is.
						{/if}
					</span>
				</span>
			</button>
			<button class="press" onclick={addHere} disabled={!draftEmoji || marksStore.saving}>
				{marksStore.saving ? 'Marking…' : 'Pin it here'}
			</button>
		</div>
	{/if}

	{#if view.length > 0}
		<!-- THE WORD UNDERNEATH. The rail is emoji; this is where each one says
		     what it is, at what moment, in what words. -->
		<ul class="mark-list">
			{#each view as m (m.id)}
				<li class="mark-row" class:selected={selected === m.id}>
					<button class="mark-jump" onclick={() => onseek?.(m.at)}>
						<span class="mark-emoji" aria-hidden="true">{m.emoji}</span>
						<span class="mark-words">
							<span class="mark-word">{wordFor(m.emoji)}</span>
							<span class="mark-at">{fmtTime(m.at)}{m.note ? ` · ${m.note}` : ''}</span>
						</span>
					</button>
					<span class="mark-tools">
						{#if revising === m.id}
							<input
								type="text"
								class="text-input inline"
								bind:value={reviseNote}
								maxlength="200"
								aria-label="Revise the words on this mark"
							/>
							<button class="plain small" onclick={() => saveRevision(m.id)}>Revise</button>
							<button class="plain small" onclick={() => (revising = null)}>Cancel</button>
						{:else}
							<button class="plain small" onclick={() => startRevising(m)}>Revise</button>
							<!-- RETRACT, not delete. The entry stays in the file. -->
							<button class="plain small" onclick={() => retract(m.id)}>Retract</button>
						{/if}
					</span>
				</li>
			{/each}
		</ul>
	{/if}

	{#if showHistory}
		<div class="history">
			<p class="history-note">
				The whole history, in arrival order. Nothing here is ever removed: a revision is a new
				entry that supersedes an old one, and a retraction is a new entry that withdraws one.
				{#if hidden > 0}
					{hidden}
					{hidden === 1 ? 'entry is' : 'entries are'} not in the view above, and all of
					{hidden === 1 ? 'it is' : 'them are'} still in the file.
				{/if}
			</p>
			<ol class="history-list">
				{#each marksStore.history as h (h.id)}
					<li class="history-row">
						<span class="history-emoji" aria-hidden="true">{h.emoji}</span>
						<span class="history-what">
							{#if h.retracts}
								retracted
							{:else if h.revises}
								revised
							{:else}
								marked
							{/if}
							{wordFor(h.emoji)} at {fmtTime(h.at)}
						</span>
						<span class="history-when">{new Date(h.madeAt).toLocaleString()}</span>
					</li>
				{/each}
			</ol>
		</div>
	{/if}
</div>

<style>
	.marks {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.rail {
		position: relative;
		height: 34px;
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
		font-size: 0.76rem;
		color: var(--text-muted);
		pointer-events: none;
	}

	/* A pin is small on the rail and large enough to hit: the tap target
	   overhangs the dot, which is how a 44px floor and a fine timeline live
	   together. */
	.pin {
		position: absolute;
		top: 50%;
		transform: translate(-50%, -50%);
		width: 44px;
		height: 34px;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		border: none;
		background: transparent;
		font-size: 1.05rem;
		line-height: 1;
		cursor: pointer;
	}

	.pin.selected {
		filter: drop-shadow(0 0 6px var(--accent));
	}

	.pin:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: -2px;
		border-radius: 6px;
	}

	.marks-error {
		font-size: 0.8rem;
		color: #e17055;
		margin: 0;
		line-height: 1.45;
	}

	/* The quick log's own two lines. The kept one is quiet on purpose — a
	   confirmation, never a congratulation. */
	.log-kept {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.45;
	}

	.log-miss {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.4rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid color-mix(in srgb, #e17055 40%, var(--border-color));
		border-radius: 10px;
	}

	.log-miss-line {
		font-size: 0.8rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	/* THE LINK BETWEEN THE TWO RECORDS, wearing its word like every other face
	   in this house. */
	.link {
		display: flex;
		align-items: flex-start;
		gap: 0.6rem;
		width: 100%;
		min-height: 44px;
		padding: 0.5rem 0.6rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		box-sizing: border-box;
		transition:
			border-color 0.15s,
			background 0.15s;
	}

	.link:hover {
		border-color: var(--accent);
	}

	.link[aria-pressed='true'] {
		background: color-mix(in srgb, var(--accent) 7%, transparent);
	}

	.link-box {
		flex-shrink: 0;
		width: 20px;
		height: 20px;
		margin-top: 0.1rem;
		border-radius: 5px;
		border: 1.5px solid var(--border-color);
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.78rem;
		line-height: 1;
		color: #fff;
	}

	.link-box.on {
		background: var(--accent);
		border-color: var(--accent);
	}

	.link-words {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.link-title {
		font-size: 0.84rem;
		font-weight: 600;
		color: var(--text);
	}

	.link-sub {
		font-size: 0.74rem;
		color: var(--text-muted);
		line-height: 1.4;
	}

	.marks-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.marker {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid color-mix(in srgb, var(--accent) 35%, var(--border-color));
		border-radius: 10px;
		background: var(--bg);
	}

	.marker-at {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0;
		font-variant-numeric: tabular-nums;
	}

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
		background: var(--bg-surface);
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
		font-size: 1.4rem;
		line-height: 1;
	}

	.face-word {
		font-size: 0.68rem;
		line-height: 1.15;
		text-align: center;
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

	.text-input {
		width: 100%;
		min-height: 44px;
		padding: 0.5rem 0.8rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text);
		font-size: 0.88rem;
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}

	.text-input:focus {
		border-color: var(--accent);
	}

	.text-input.inline {
		min-width: 8rem;
		width: auto;
		flex: 1;
	}

	.mark-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.mark-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		padding: 0.25rem 0.35rem;
		border-radius: 8px;
	}

	.mark-row.selected {
		background: color-mix(in srgb, var(--accent) 8%, transparent);
	}

	.mark-jump {
		display: flex;
		align-items: center;
		gap: 0.55rem;
		flex: 1;
		min-width: 12rem;
		min-height: 44px;
		padding: 0.3rem 0.4rem;
		border: none;
		background: transparent;
		color: inherit;
		font: inherit;
		text-align: left;
		cursor: pointer;
		border-radius: 8px;
	}

	.mark-jump:hover {
		background: var(--bg);
	}

	.mark-emoji {
		font-size: 1.15rem;
		line-height: 1;
		flex-shrink: 0;
	}

	.mark-words {
		display: flex;
		flex-direction: column;
		gap: 0.05rem;
		min-width: 0;
	}

	.mark-word {
		font-size: 0.86rem;
		color: var(--text);
		font-weight: 600;
	}

	.mark-at {
		font-size: 0.74rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.mark-tools {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		flex-wrap: wrap;
	}

	.press {
		align-self: flex-start;
		min-height: 44px;
		padding: 0.55rem 1.1rem;
		border-radius: 22px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 0.88rem;
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
		padding: 0.3rem 0.7rem;
		font-size: 0.78rem;
	}

	.history {
		padding: 0.7rem 0.85rem;
		border: 1px dashed var(--border-color);
		border-radius: 10px;
	}

	.history-note {
		font-size: 0.76rem;
		color: var(--text-muted);
		line-height: 1.5;
		margin: 0 0 0.5rem;
	}

	.history-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}

	.history-row {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		font-size: 0.76rem;
		color: var(--text-secondary);
		flex-wrap: wrap;
	}

	.history-emoji {
		font-size: 0.9rem;
	}

	.history-when {
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	@media (prefers-reduced-motion: reduce) {
		.face,
		.link {
			transition: none;
		}
	}
</style>
