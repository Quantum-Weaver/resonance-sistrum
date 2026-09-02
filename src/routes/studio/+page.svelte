<script lang="ts">
	import { onMount } from 'svelte';
	import { invoke } from '@tauri-apps/api/core';
	import { recorderStore, type TakeFile } from '$lib/stores/recorder.svelte';
	import { recordPrefs, fmtMax } from '$lib/stores/recordPrefs.svelte';
	import { takeStore } from '$lib/stores/take.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';
	import { mixStore } from '$lib/stores/mix.svelte';
	import { playbackStore } from '$lib/stores/playback.svelte';
	import { sessionToLayers, type SessionTrack } from '$lib/studio';
	import Waveform from '$lib/components/Waveform.svelte';
	import LaneMarks from '$lib/components/LaneMarks.svelte';
	import TakePlayer from '$lib/components/TakePlayer.svelte';
	import { identityStore } from '$lib/stores/identity.svelte';
	import { sealTake } from '$lib/seal';
	import { proposeParts, partKey, readProvenance } from '$lib/provenance';
	import { consent, consented, contributors, validate, type Merismos, type Part } from '$lib/merismos';

	// THE STUDIO — the multi-track room (docs/THE-STUDIO-PLAN.md), at KP's ⚛ word: "sistrum will now need a multi tract studio for mixing and layering recorded tracks."
	// A session of N lanes, each a take from the shelf. Nothing copied, nothing deleted: a lane points at a take; a mixdown, a trim, an overdub each make a NEW take on the shelf.
	// NO AUTOPLAY: nothing sounds until a press.

	const SESSION_KEY = 'resonance-sistrum-studio-session';

	/** The shape `mixdown` and `trim_take` answer with. */
	interface NewTake {
		file_name: string;
		path: string;
		seconds: number;
		sample_rate: number;
		channels: number;
		created_at: number;
		clamped: string[];
	}

	let sessionName = $state('');
	let pickSession = $state('');
	let addTake = $state('');
	let mixName = $state('');
	let bouncing = $state(false);
	let bounceNote = $state<string | null>(null);
	let lastBounce = $state<TakeFile | null>(null);
	let trimming = $state<string | null>(null);
	let trimNote = $state<string | null>(null);
	let roomError = $state<string | null>(null);
	// What the seal managed on the last take this room made — told, never guessed at.
	let sealTold = $state<string | null>(null);

	// Per-lane trim selection, seconds into the lane's own take.
	let trimIn = $state<Record<string, number>>({});
	let trimOut = $state<Record<string, number>>({});

	// Overdub: the chosen input by row index (W4-1's lesson), the stamp from the mix clock.
	let selectedDevice = $state<number | null>(null);
	let overdubName = $state('');
	let overdubAt = $state<number | null>(null);
	let arming = $state(false);

	const tracks = $derived(sessionStore.tracks);
	const playing = $derived(mixStore.playing);
	const position = $derived(mixStore.position);
	const length = $derived(mixStore.length);
	const recording = $derived(recorderStore.recording);
	const shelf = $derived(recorderStore.takes);
	const selectedDeviceName = $derived(
		selectedDevice === null ? null : (recorderStore.devices[selectedDevice]?.name ?? null)
	);

	// The graph follows the session: new lanes decode, gone lanes are torn down, gain/pan/mute/solo land live.
	$effect(() => {
		const t = tracks;
		void mixStore.sync(t);
	});

	function fmt(secs: number): string {
		if (!Number.isFinite(secs) || secs < 0) secs = 0;
		const m = Math.floor(secs / 60);
		const s = secs % 60;
		return `${m}:${s.toFixed(1).padStart(4, '0')}`;
	}

	function laneDuration(t: SessionTrack): number {
		const decoded = mixStore.laneDuration(t.id);
		if (decoded > 0) return decoded;
		return recorderStore.byFileName(t.take)?.seconds ?? 0;
	}

	/** The lane's own playhead: the mix clock, less the lane's offset, held inside the take. */
	function lanePosition(t: SessionTrack): number {
		const d = laneDuration(t);
		const local = position - t.offset_ms / 1000;
		return Math.min(d, Math.max(0, local));
	}

	function laneProgress(t: SessionTrack): number {
		const d = laneDuration(t);
		return d > 0 ? lanePosition(t) / d : 0;
	}

	function nudge(t: SessionTrack, ms: number) {
		sessionStore.updateTrack(t.id, { offset_ms: Math.max(0, t.offset_ms + ms) });
	}

	async function openSession(name: string) {
		const clean = name.trim();
		if (!clean) return;
		mixStore.stop();
		await sessionStore.open(clean);
		if (sessionStore.doc) {
			sessionName = sessionStore.doc.name;
			pickSession = sessionName;
			localStorage.setItem(SESSION_KEY, sessionName);
		}
	}

	function addFromShelf() {
		if (!addTake) return;
		sessionStore.addTrack(addTake, 0);
		addTake = '';
	}

	/** A row for a take the studio just made — the file is the truth; this is the meaning around it.
	 *
	 *  EVERY SEAL SIGNS (2026-09-02, THE COLUMN COMES TO LIFE). The studio's own
	 *  note goes in as it always did, and the signed hand — and, at a mixdown,
	 *  the split — are written BESIDE it by `sealTake`. Nothing is replaced.
	 *  A missing key never blocks a bounce: the take is on the shelf either way
	 *  and the room says what the seal managed. */
	async function registerTake(made: NewTake, base: unknown, extra: { merismos?: unknown } = {}) {
		const mark = await sealTake(made.file_name, base, extra);
		sealTold = mark.told;
		try {
			await takeStore.upsertTake({
				fileName: made.file_name,
				name: made.file_name.replace(/\.wav$/, ''),
				seconds: made.seconds,
				sampleRate: made.sample_rate,
				channels: made.channels,
				provenance: mark.provenance,
				createdAt: made.created_at * 1000
			});
		} catch (e) {
			console.error('[studio] the take is safe on the shelf; its row did not write:', e);
		}
		await recorderStore.refreshTakes();
	}

	// ── The contributors (THE COLUMN COMES TO LIFE, 2026-09-02) ──────────────
	//
	// KP's vision, verbatim, which this serves: "every musician in a band or an
	// orchestra records their part sovereignly; an engineer finishes the
	// project; and all credentials combine so the Sanctuary system can pay
	// everyone involved no matter how small the role — opt-in always: 'no force
	// or deceptive theft.'"
	//
	// THE RULING, verbatim (KP ⚛, pointing at financial-ecosystem.md 140–142):
	// "there is nothing to do but divide by the number of contributors,
	// regardless of role." So this room proposes A LIST OF PEOPLE and NOTHING
	// ELSE — one contributor per DISTINCT identity found in the lanes' takes'
	// provenance, plus whoever is at this desk as the engineer if they did not
	// also play. There is no share to set, no number to type, and nothing here
	// that could rank one hand above another: the divisor is the headcount, and
	// the main artisan is one of them. A role is RECORDED AND NEVER WEIGHED.
	//
	// A PROPOSAL IS NOT A FACT. Consent is a checkbox and this device can tick
	// exactly one line — the one whose identity holds this device's key. Every
	// other line reads "awaiting consent", and there is no path here that fills
	// one in on someone else's behalf.
	let split = $state<Merismos | null>(null);
	let splitTouched = $state(false);
	let splitFrom = $state('');

	const laneSignature = $derived(tracks.map((t) => t.take).join('\u0000'));
	const splitVerdict = $derived(split ? validate(split) : null);
	const splitConsent = $derived(split ? consented(split) : null);
	const meWho = $derived(identityStore.asWho());

	function laneDocs(): unknown[] {
		return tracks.map((t) => takeStore.byFileName(t.take)?.provenance);
	}

	function drawSplit() {
		const proposed = proposeParts(laneDocs(), meWho);
		if (proposed.length === 0) {
			split = null;
			splitTouched = false;
			return;
		}
		const drawn = contributors(proposed.map((p) => p.who));
		drawn.parts = drawn.parts.map((p, i) => ({ ...p, role: proposed[i].role }));
		split = drawn;
		splitTouched = false;
	}

	// The proposal follows the lanes until a hand edits it; after that it holds,
	// and "Redraw from the lanes" is the only thing that replaces a hand's work.
	$effect(() => {
		const sig = laneSignature;
		if (splitTouched) return;
		if (splitFrom === sig) return;
		splitFrom = sig;
		drawSplit();
	});

	function setRole(i: number, role: string) {
		if (!split) return;
		split = { ...split, parts: split.parts.map((p, k) => (k === i ? { ...p, role } : p)) };
		splitTouched = true;
	}

	/** Whether this device may tick THIS line. One line, and only ever one. */
	function isMine(p: Part): boolean {
		const me = meWho;
		if (!me) return false;
		return partKey(p.who) === partKey(me);
	}

	/** The yes, given by the hand at this desk and nobody else. */
	function sayYes(p: Part) {
		const me = meWho;
		if (!split || !me || !isMine(p)) return;
		split = consent(split, me, new Date().toISOString());
		splitTouched = true;
	}

	/** `told` is derived commentary, not a term — it never rides into the column. */
	function splitForColumn(m: Merismos): Merismos {
		const held: Record<string, unknown> = { ...(m as unknown as Record<string, unknown>) };
		delete held.told;
		return held as unknown as Merismos;
	}

	// ── Mixdown (movements 1 and 6) ─────────────────────────────────────────
	async function mixdown() {
		const doc = sessionStore.doc;
		if (!doc) return;
		const layers = sessionToLayers(doc.tracks);
		if (layers.length === 0) {
			bounceNote = 'Nothing to bounce — every lane is muted or the session is empty.';
			return;
		}
		bouncing = true;
		bounceNote = null;
		roomError = null;
		mixStore.pause();
		try {
			const made = await invoke<NewTake>('mixdown', {
				name: mixName.trim() || `${doc.name}-mix`,
				layers
			});
			await registerTake(
				made,
				{
					studio: {
						kind: 'mixdown',
						session: doc.name,
						layers: doc.tracks.map((t) => ({
							take: t.take,
							offset_ms: t.offset_ms,
							gain: t.gain,
							pan: t.pan,
							mute: t.mute,
							solo: t.solo
						})),
						made_at: new Date().toISOString()
					}
				},
				{ merismos: split ? splitForColumn(split) : undefined }
			);
			lastBounce = recorderStore.byFileName(made.file_name) ?? {
				file_name: made.file_name,
				path: made.path,
				seconds: made.seconds,
				sample_rate: made.sample_rate,
				channels: made.channels,
				created_at: made.created_at,
				peak_dbfs: null,
				clipped: null
			};
			bounceNote = `Bounced ${fmt(made.seconds)} at ${made.sample_rate} Hz stereo to ${made.file_name} — it is on the shelf as a take.`;
			mixName = '';
		} catch (e) {
			roomError = e instanceof Error ? e.message : String(e);
		} finally {
			bouncing = false;
		}
	}

	// ── Trim to selection (movement 7) — a NEW take, the original kept ───────
	async function trimLane(t: SessionTrack) {
		const start = Math.max(0, trimIn[t.id] ?? 0);
		const end = trimOut[t.id] ?? 0;
		if (end > 0 && end <= start) {
			trimNote = 'The out point must come after the in point.';
			return;
		}
		trimming = t.id;
		trimNote = null;
		roomError = null;
		try {
			const made = await invoke<NewTake>('trim_take', {
				fileName: t.take,
				startSecs: start,
				endSecs: end,
				name: null
			});
			await registerTake(made, {
				studio: {
					kind: 'trim',
					from: t.take,
					start_secs: start,
					end_secs: end > start ? end : null,
					made_at: new Date().toISOString()
				}
			});
			// The cut joins the session as its own lane, sitting where the selection sat. The original lane stays.
			sessionStore.addTrack(made.file_name, t.offset_ms + Math.round(start * 1000));
			trimNote = `Cut ${fmt(made.seconds)} to ${made.file_name}. The original take is untouched.`;
		} catch (e) {
			roomError = e instanceof Error ? e.message : String(e);
		} finally {
			trimming = null;
		}
	}

	// ── Overdub (movement 5) ────────────────────────────────────────────────
	// The mix plays; the recorder's own session starts (one at a time, as now); the new take's offset is the mix clock at the moment the stream opened. The stamp is honest about what it is: the position when `start_recording` returned, not the first sample — the nudge is for the difference.
	async function overdub() {
		if (!sessionStore.doc || recording) return;
		arming = true;
		roomError = null;
		try {
			if (!playing) await mixStore.play(tracks);
			const ok = await recorderStore.start(
				selectedDeviceName,
				recordPrefs.mode === 'bounded' ? recordPrefs.maxSecs : null
			);
			if (!ok) {
				mixStore.pause();
				return;
			}
			overdubAt = mixStore.position;
		} finally {
			arming = false;
		}
	}

	async function keepOverdub() {
		const at = overdubAt ?? 0;
		const sealed = await recorderStore.stop(true, overdubName.trim() ? overdubName.trim() : null);
		mixStore.pause();
		overdubAt = null;
		overdubName = '';
		if (!sealed) return;
		const mark = await sealTake(sealed.file_name, {
			studio: {
				kind: 'overdub',
				session: sessionStore.name,
				offset_ms: Math.round(at * 1000),
				made_at: new Date().toISOString()
			}
		});
		sealTold = mark.told;
		try {
			await takeStore.upsertTake({
				fileName: sealed.file_name,
				name: sealed.file_name.replace(/\.wav$/, ''),
				seconds: sealed.seconds,
				sampleRate: sealed.sample_rate,
				channels: sealed.channels,
				provenance: mark.provenance,
				createdAt: sealed.created_at * 1000
			});
		} catch (e) {
			console.error('[studio] the overdub is safe; its row did not write:', e);
		}
		sessionStore.addTrack(sealed.file_name, Math.round(at * 1000));
	}

	async function discardOverdub() {
		await recorderStore.stop(false, null);
		mixStore.pause();
		overdubAt = null;
	}

	// A capped overdub has already released the device; keep it as the room would.
	let sealingCap = false;
	$effect(() => {
		if (recorderStore.capped && overdubAt !== null && !sealingCap) {
			sealingCap = true;
			keepOverdub().finally(() => {
				sealingCap = false;
			});
		}
	});

	/** A take THIS ROOM made — the studio's own note, not merely a signed take.
	 *  Since every seal signs, `provenance != null` is now true of a plain
	 *  recording too, and this list would have quietly claimed them. */
	function madeHere(fileName: string): boolean {
		return readProvenance(takeStore.byFileName(fileName)?.provenance).studio !== undefined;
	}

	function openBounce(fileName: string) {
		mixStore.pause();
		lastBounce = recorderStore.byFileName(fileName) ?? lastBounce;
	}

	onMount(() => {
		recordPrefs.load();
		void identityStore.load();
		mixStore.loadVolume();
		playbackStore.loadVolume();
		recorderStore.loadDevices();
		void (async () => {
			await Promise.all([recorderStore.refreshTakes(), takeStore.loadTakes(), sessionStore.list()]);
			const last = localStorage.getItem(SESSION_KEY);
			if (last) await openSession(last);
		})();

		return () => {
			mixStore.close();
			playbackStore.close();
			if (sessionStore.dirty) void sessionStore.save();
			sessionStore.close();
		};
	});
</script>

<div class="page">
	<header class="page-head">
		<h1 class="page-title">Studio</h1>
		<p class="page-sub">
			Lanes are takes from the shelf, laid on one clock. Nothing here copies, moves, or removes a take —
			a mixdown, a trim, and an overdub each make a new one.
		</p>
	</header>

	{#if roomError}
		<p class="room-error" role="alert">{roomError}</p>
	{/if}
	{#if sessionStore.error}
		<p class="room-error" role="alert">{sessionStore.error}</p>
	{/if}
	{#if mixStore.error}
		<p class="room-error" role="alert">The mix did not sound: {mixStore.error}</p>
	{/if}

	<!-- ── The session ─────────────────────────────────────────────────── -->
	<section class="session-bar" aria-label="Session">
		<label class="field">
			<span class="field-word">Session</span>
			<div class="inline">
				<input
					type="text"
					class="text-input"
					bind:value={sessionName}
					maxlength="60"
					placeholder="Name a session"
					onkeydown={(e) => {
						if (e.key === 'Enter') void openSession(sessionName);
					}}
				/>
				<button class="plain" onclick={() => openSession(sessionName)} disabled={!sessionName.trim()}>
					{sessionStore.sessions.includes(sessionName.trim()) ? 'Open' : 'New'}
				</button>
			</div>
		</label>
		{#if sessionStore.sessions.length > 0}
			<label class="field">
				<span class="field-word">On the shelf</span>
				<select
					class="select"
					bind:value={pickSession}
					onchange={() => {
						if (pickSession) void openSession(pickSession);
					}}
				>
					<option value="">Choose a session…</option>
					{#each sessionStore.sessions as s (s)}
						<option value={s}>{s}</option>
					{/each}
				</select>
			</label>
		{/if}
		{#if sessionStore.doc}
			<span class="session-state">
				{sessionStore.saving ? 'Saving…' : sessionStore.dirty ? 'Unsaved changes' : 'Saved beside the takes'}
			</span>
		{/if}
	</section>

	{#if !sessionStore.doc}
		<p class="empty">Name a session to begin. It is kept as a small file beside your takes.</p>
	{:else}
		<!-- ── Transport ───────────────────────────────────────────────── -->
		<section class="transport" aria-label="Transport">
			<button class="press" onclick={() => mixStore.toggle(tracks)} disabled={tracks.length === 0}>
				{playing ? '❚❚ Pause' : '▶ Play'}
			</button>
			<button class="plain" onclick={() => mixStore.stop()} disabled={tracks.length === 0}>■ Stop</button>
			<span class="clock">{fmt(position)} / {fmt(length)}</span>
			{#if mixStore.loading}
				<span class="reading">Reading lanes…</span>
			{/if}
			<input
				type="range"
				class="scrub"
				min="0"
				max={Math.max(0.1, length)}
				step="0.01"
				value={position}
				oninput={(e) => mixStore.seek(Number(e.currentTarget.value), tracks)}
				aria-label="Position in the mix"
				disabled={tracks.length === 0}
			/>
			<label class="volume">
				<span class="field-word">Mix volume</span>
				<input
					type="range"
					min="0"
					max="1"
					step="0.01"
					value={mixStore.volume}
					oninput={(e) => mixStore.setVolume(Number(e.currentTarget.value))}
					aria-label="Mix volume"
				/>
				<span class="read">{Math.round(mixStore.volume * 100)}%</span>
			</label>
		</section>

		<!-- ── Lanes ───────────────────────────────────────────────────── -->
		{#if tracks.length === 0}
			<p class="empty">No lanes yet. Add a take from the shelf below, or record one over silence.</p>
		{/if}
		<ol class="lanes">
			{#each tracks as t, i (t.id)}
				{@const dur = laneDuration(t)}
				{@const local = lanePosition(t)}
				<li class="lane" class:silent={t.mute || (sessionStore.anySolo && !t.solo)}>
					<header class="lane-head">
						<span class="lane-name">
							<span class="lane-n">{i + 1}</span>
							{t.take.replace(/\.wav$/, '')}
							<span class="lane-facts">
								{fmt(dur)}{mixStore.ready[t.id] ? '' : ' · reading…'}
							</span>
						</span>
						<span class="lane-tools">
							<button
								class="toggle"
								class:on={t.mute}
								aria-pressed={t.mute}
								onclick={() => sessionStore.updateTrack(t.id, { mute: !t.mute })}
							>
								Mute
							</button>
							<button
								class="toggle"
								class:on={t.solo}
								aria-pressed={t.solo}
								onclick={() => sessionStore.updateTrack(t.id, { solo: !t.solo })}
							>
								Solo
							</button>
							<button class="plain small" onclick={() => sessionStore.removeTrack(t.id)}>
								Take out of session
							</button>
						</span>
					</header>

					{#if mixStore.laneErrors[t.id]}
						<p class="room-error" role="alert">This lane would not decode: {mixStore.laneErrors[t.id]}</p>
					{/if}

					<Waveform
						fileName={t.take}
						progress={laneProgress(t)}
						duration={dur}
						height={56}
						onscrub={(secs) => mixStore.seek(t.offset_ms / 1000 + secs, tracks)}
					/>

					<LaneMarks
						fileName={t.take}
						duration={dur}
						position={local}
						onseek={(secs) => mixStore.seek(t.offset_ms / 1000 + secs, tracks)}
					/>

					<div class="lane-controls">
						<label class="knob">
							<span class="field-word">Gain</span>
							<input
								type="range"
								min="0"
								max="2"
								step="0.01"
								value={t.gain}
								oninput={(e) => sessionStore.updateTrack(t.id, { gain: Number(e.currentTarget.value) })}
								aria-label="Gain for lane {i + 1}"
							/>
							<span class="read">{Math.round(t.gain * 100)}%</span>
						</label>
						<label class="knob">
							<span class="field-word">Pan</span>
							<input
								type="range"
								min="-1"
								max="1"
								step="0.01"
								value={t.pan}
								oninput={(e) => sessionStore.updateTrack(t.id, { pan: Number(e.currentTarget.value) })}
								aria-label="Pan for lane {i + 1}"
							/>
							<span class="read">{t.pan === 0 ? 'C' : t.pan < 0 ? `L${Math.round(-t.pan * 100)}` : `R${Math.round(t.pan * 100)}`}</span>
						</label>
						<div class="knob offset">
							<span class="field-word">Starts at</span>
							<button class="plain small" onclick={() => nudge(t, -100)} aria-label="Earlier by 100 ms">−100</button>
							<button class="plain small" onclick={() => nudge(t, -10)} aria-label="Earlier by 10 ms">−10</button>
							<input
								type="number"
								class="text-input ms"
								min="0"
								step="1"
								value={t.offset_ms}
								onchange={(e) => sessionStore.updateTrack(t.id, { offset_ms: Number(e.currentTarget.value) })}
								aria-label="Offset in milliseconds for lane {i + 1}"
							/>
							<span class="read">ms</span>
							<button class="plain small" onclick={() => nudge(t, 10)} aria-label="Later by 10 ms">+10</button>
							<button class="plain small" onclick={() => nudge(t, 100)} aria-label="Later by 100 ms">+100</button>
						</div>
					</div>

					<details class="trim">
						<summary>Trim to selection</summary>
						<div class="trim-row">
							<label class="knob">
								<span class="field-word">In (s)</span>
								<input
									type="number"
									class="text-input ms"
									min="0"
									step="0.1"
									value={trimIn[t.id] ?? 0}
									onchange={(e) => (trimIn = { ...trimIn, [t.id]: Number(e.currentTarget.value) })}
									aria-label="Trim in point for lane {i + 1}"
								/>
								<button class="plain small" onclick={() => (trimIn = { ...trimIn, [t.id]: Math.round(local * 10) / 10 })}>
									At playhead
								</button>
							</label>
							<label class="knob">
								<span class="field-word">Out (s, 0 = end)</span>
								<input
									type="number"
									class="text-input ms"
									min="0"
									step="0.1"
									value={trimOut[t.id] ?? 0}
									onchange={(e) => (trimOut = { ...trimOut, [t.id]: Number(e.currentTarget.value) })}
									aria-label="Trim out point for lane {i + 1}"
								/>
								<button class="plain small" onclick={() => (trimOut = { ...trimOut, [t.id]: Math.round(local * 10) / 10 })}>
									At playhead
								</button>
							</label>
							<button class="plain" disabled={trimming === t.id} onclick={() => trimLane(t)}>
								{trimming === t.id ? 'Cutting…' : 'Cut to a new take'}
							</button>
						</div>
						<p class="hint">
							The cut becomes a new take on the shelf and a new lane here; this lane and its take stay as
							they are.
						</p>
					</details>
				</li>
			{/each}
		</ol>
		{#if trimNote}
			<p class="note-line" role="status">{trimNote}</p>
		{/if}

		<!-- ── Add a lane ──────────────────────────────────────────────── -->
		<section class="add" aria-label="Add a lane">
			<label class="field">
				<span class="field-word">Add a take from the shelf</span>
				<div class="inline">
					<select class="select" bind:value={addTake}>
						<option value="">Choose a take…</option>
						{#each shelf as s (s.file_name)}
							<option value={s.file_name}>
								{s.file_name.replace(/\.wav$/, '')} · {fmt(s.seconds)} · {s.sample_rate} Hz
							</option>
						{/each}
					</select>
					<button class="plain" onclick={addFromShelf} disabled={!addTake}>Add as a lane</button>
				</div>
			</label>
		</section>

		<!-- ── Overdub ─────────────────────────────────────────────────── -->
		<section class="overdub" aria-label="Overdub">
			<h2 class="h2">Overdub</h2>
			{#if recorderStore.error}
				<p class="room-error" role="alert">{recorderStore.error}</p>
			{/if}
			{#if !recording}
				<div class="inline wrap">
					<button class="press" onclick={overdub} disabled={arming || bouncing}>
						{arming ? 'Opening the input…' : '● Record over the mix'}
					</button>
					<label class="field">
						<span class="field-word">Name the take (optional)</span>
						<input type="text" class="text-input" bind:value={overdubName} maxlength="60" />
					</label>
					{#if recorderStore.devices.length > 0}
						<label class="field">
							<span class="field-word">Input</span>
							<select class="select" bind:value={selectedDevice}>
								<option value={null}>Default input</option>
								{#each recorderStore.devices as d, i (i)}
									<option value={i}>{d.name}{d.is_default ? ' (default)' : ''}</option>
								{/each}
							</select>
						</label>
					{/if}
				</div>
				<p class="hint">
					The mix plays and the recorder starts; the new take lands as a lane starting where the mix
					clock stood when the input opened. What you hear through speakers can be heard by the
					microphone — headphones keep the lanes apart. Bluetooth listens on a delay; the ±ms buttons
					on each lane are for lining it up by ear.
					{#if recordPrefs.mode === 'bounded'}
						Saves itself at {fmtMax(recordPrefs.maxSecs)}.
					{/if}
				</p>
			{:else}
				<div class="live">
					<p class="listening" aria-live="polite">● Listening</p>
					<p class="live-elapsed">{fmt(recorderStore.elapsedSecs)}</p>
					<p class="live-facts">
						from {fmt(overdubAt ?? 0)} on the mix clock · {recorderStore.device} · {recorderStore.sampleRate} Hz
					</p>
					<div class="meter" role="img" aria-label="Input level">
						<div class="meter-fill" class:hot={recorderStore.peak > 0.9} style="width: {Math.min(100, recorderStore.peak * 100)}%"></div>
					</div>
					<div class="inline">
						<button class="press" onclick={keepOverdub}>■ Keep as a lane</button>
						<button class="plain" onclick={discardOverdub}>Discard</button>
					</div>
				</div>
			{/if}
		</section>

		<!-- ── Mixdown ─────────────────────────────────────────────────── -->
		<section class="bounce" aria-label="Mixdown">
			<h2 class="h2">Mixdown</h2>
			<div class="inline wrap">
				<label class="field">
					<span class="field-word">Name the bounce (optional)</span>
					<input type="text" class="text-input" bind:value={mixName} maxlength="60" placeholder="{sessionStore.name}-mix" />
				</label>
				<button class="press" onclick={mixdown} disabled={bouncing || tracks.length === 0 || recording}>
					{bouncing ? 'Bouncing…' : 'Mixdown to a take'}
				</button>
			</div>
			<p class="hint">
				Every lane you can hear — muted and un-soloed lanes stay out — summed to one 44.1 kHz stereo
				16-bit WAV on the shelf. Nothing is normalised: hot lanes clip at the writer, as they would on
				tape. The bounce is a take like any other: it plays, wears marks, and exports.
			</p>

			<div class="splits" aria-label="The contributors">
				<h3 class="h3">The contributors</h3>
				{#if !split}
					<p class="hint">
						No hand is named in these lanes yet. The contributors are proposed from the signets
						the lanes' takes carry — record or bounce with a signet kept in Settings, and the
						names appear here. Nothing is invented for a lane that names nobody.
					</p>
				{:else}
					<ul class="parts">
						{#each split.parts as p, i (i)}
							<li class="part" class:mine={isMine(p)}>
								<span class="part-who" style="color: {typeof p.who.color === 'string' ? p.who.color : 'inherit'}">
									{typeof p.who.sigil === 'string' ? p.who.sigil : '·'}
									{p.who.name}
								</span>
								<input
									class="text-input tiny"
									type="text"
									value={p.role}
									maxlength="32"
									aria-label="Role for {p.who.name}"
									oninput={(e) => setRole(i, e.currentTarget.value)}
								/>
								<span class="part-share">an equal share</span>
								{#if isMine(p)}
									<label class="part-consent">
										<input
											type="checkbox"
											checked={!!p.consent?.at}
											disabled={!!p.consent?.at}
											onchange={() => sayYes(p)}
										/>
										<span>{p.consent?.at ? 'you opted in' : 'I opt in'}</span>
									</label>
								{:else}
									<span class="part-consent waiting">
										{p.consent?.at ? 'opted in' : 'awaiting consent'}
									</span>
								{/if}
							</li>
						{/each}
					</ul>

					<p class="note-line">
						{splitVerdict?.count ?? 0}
						{(splitVerdict?.count ?? 0) === 1 ? 'contributor' : 'contributors'} — the artist's share
						is divided equally, regardless of role. No ranking, no percentage shares; whoever led
						the work is one of them.
						{#if splitVerdict && !splitVerdict.ok}
							<span class="fault">Faults: {splitVerdict.faults.join(' · ')} — told in plain words and left exactly as declared.</span>
						{/if}
					</p>
					{#if splitConsent}
						<p class="hint">{splitConsent.told[0]}</p>
					{/if}

					<div class="inline wrap">
						<button class="plain small" onclick={drawSplit}>Redraw from the lanes</button>
						{#if splitTouched}<span class="hint">A role was renamed or a yes was given — it no longer follows the lanes.</span>{/if}
					</div>
				{/if}
				<p class="hint">
					"There is nothing to do but divide by the number of contributors, regardless of role."
					A role is written down so the work is remembered in your own words — it is never weighed,
					and there is no share here to edit.
				</p>
				<p class="hint">
					Opt-in always: "no force or deceptive theft." A proposal is not a fact — this device may
					tick only the line whose identity holds its key, and everybody else's yes is theirs to
					give on their own device. This is a description of shares, never a promise of money:
					nothing in this app moves a cent.
				</p>
			</div>

			{#if bounceNote}
				<p class="note-line" role="status">{bounceNote}</p>
			{/if}
			{#if sealTold}
				<p class="hint">{sealTold}</p>
			{/if}
		</section>

		{#if lastBounce}
			<section class="last-bounce" aria-label="The last bounce">
				<h2 class="h2">The bounce</h2>
				<TakePlayer take={lastBounce} onclose={() => { lastBounce = null; playbackStore.close(); }} />
			</section>
		{/if}

		<!-- The shelf's own bounces, for reopening -->
		{#if shelf.some((s) => madeHere(s.file_name))}
			<section class="bounces" aria-label="Takes this studio made">
				<h2 class="h2">Made here</h2>
				<ul class="made">
					{#each shelf.filter((s) => madeHere(s.file_name)) as s (s.file_name)}
						<li>
							<button class="plain small" onclick={() => openBounce(s.file_name)}>
								{s.file_name.replace(/\.wav$/, '')} · {fmt(s.seconds)}
							</button>
						</li>
					{/each}
				</ul>
			</section>
		{/if}
	{/if}
</div>

<style>
	.splits {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.75rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		background: var(--bg);
	}

	.h3 {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
	}

	.parts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.part {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.82rem;
	}

	.part-who {
		font-weight: 600;
		min-width: 8rem;
	}

	.part-share {
		font-size: 0.75rem;
		color: var(--text-muted);
		min-width: 6rem;
	}

	.part-consent {
		margin-left: auto;
		display: flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.part-consent.waiting {
		color: #e1a055;
	}

	.text-input.tiny {
		max-width: 8rem;
	}

	.fault {
		color: #e17055;
	}

	.page {
		padding: 1rem 1.25rem 2rem;
		padding-top: calc(1rem + env(safe-area-inset-top, 0px));
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.page-head {
		margin: 0;
	}

	.page-title {
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: var(--text);
	}

	.page-sub,
	.hint {
		font-size: 0.82rem;
		color: var(--text-muted);
		margin: 0.25rem 0 0;
		max-width: 46rem;
		line-height: 1.5;
	}

	.h2 {
		font-size: 1rem;
		margin: 0 0 0.5rem;
		color: var(--text);
	}

	.room-error {
		color: #e17055;
		font-size: 0.85rem;
		margin: 0;
	}

	.empty,
	.note-line {
		color: var(--text-muted);
		font-size: 0.88rem;
		margin: 0;
	}

	.session-bar,
	.transport,
	.add,
	.overdub,
	.bounce {
		display: flex;
		align-items: flex-end;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.overdub,
	.bounce {
		flex-direction: column;
		align-items: flex-start;
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

	.inline {
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.inline.wrap {
		flex-wrap: wrap;
	}

	.text-input,
	.select {
		min-width: 12rem;
		min-height: 44px;
		padding: 0.5rem 0.8rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg);
		color: var(--text);
		font-size: 0.9rem;
		font-family: inherit;
		outline: none;
		box-sizing: border-box;
	}

	.text-input.ms {
		min-width: 5.5rem;
		width: 6.5rem;
		min-height: 36px;
		padding: 0.3rem 0.5rem;
		font-variant-numeric: tabular-nums;
	}

	.text-input:focus,
	.select:focus {
		border-color: var(--accent);
	}

	.session-state,
	.reading {
		font-size: 0.78rem;
		color: var(--text-muted);
		align-self: center;
	}

	.press {
		min-height: 44px;
		padding: 0.6rem 1.2rem;
		border-radius: 22px;
		border: none;
		background: var(--accent);
		color: #fff;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
	}

	.press:disabled,
	.plain:disabled {
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

	.plain:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.plain.small {
		min-height: 36px;
		padding: 0.3rem 0.7rem;
		font-size: 0.78rem;
	}

	.clock {
		font-size: 0.9rem;
		color: var(--text-secondary);
		font-variant-numeric: tabular-nums;
		align-self: center;
	}

	.scrub {
		flex: 1 1 14rem;
		min-width: 10rem;
		accent-color: var(--accent);
		align-self: center;
	}

	.volume,
	.knob {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		min-height: 36px;
		flex-wrap: wrap;
	}

	.volume input,
	.knob input[type='range'] {
		width: 8rem;
		accent-color: var(--accent);
	}

	.read {
		font-size: 0.78rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		min-width: 2.4rem;
	}

	.lanes {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	.lane {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		background: var(--bg-surface);
	}

	.lane.silent {
		opacity: 0.6;
	}

	.lane-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		flex-wrap: wrap;
	}

	.lane-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		min-width: 0;
	}

	.lane-n {
		font-size: 0.72rem;
		color: var(--text-muted);
		font-weight: 400;
	}

	.lane-facts {
		font-size: 0.76rem;
		color: var(--text-muted);
		font-weight: 400;
	}

	.lane-tools {
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	.toggle {
		min-height: 36px;
		padding: 0.3rem 0.8rem;
		border-radius: 18px;
		border: 1.5px solid var(--border-color);
		background: transparent;
		color: var(--text-secondary);
		font-size: 0.78rem;
		cursor: pointer;
	}

	.toggle.on {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
		font-weight: 600;
	}

	.lane-controls {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.knob.offset {
		gap: 0.25rem;
	}

	.trim summary {
		cursor: pointer;
		font-size: 0.82rem;
		color: var(--text-secondary);
		min-height: 36px;
		display: flex;
		align-items: center;
	}

	.trim-row {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: flex-end;
		margin-top: 0.4rem;
	}

	.live {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		align-items: flex-start;
	}

	.listening {
		color: var(--accent);
		font-weight: 600;
		margin: 0;
	}

	.live-elapsed {
		font-size: 2rem;
		font-weight: 200;
		font-variant-numeric: tabular-nums;
		margin: 0;
		line-height: 1;
		color: var(--text);
	}

	.live-facts {
		font-size: 0.82rem;
		color: var(--text-secondary);
		margin: 0;
	}

	.meter {
		width: min(420px, 100%);
		height: 10px;
		border-radius: 5px;
		background: var(--bg);
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

	.made {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		gap: 0.4rem;
		flex-wrap: wrap;
	}

	@media (prefers-reduced-motion: reduce) {
		.meter-fill {
			transition: none;
		}
	}
</style>
