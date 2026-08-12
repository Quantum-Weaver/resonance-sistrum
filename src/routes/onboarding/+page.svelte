<script lang="ts">
	import { goto } from '$app/navigation';
	import { getName } from '@tauri-apps/api/app';
	import { themeStore } from '$lib/stores/theme.svelte';
	import { PRESET_THEMES } from '$lib/theme/theme';
	import GradientPulse from '$lib/components/GradientPulse.svelte';
	import {
		beginWalk,
		current,
		isDone,
		enter,
		toggleChoice,
		skip,
		advance,
		dots,
		completion,
		type StepDef,
		type Walk
	} from '$lib/epagoge';

	// The wordmark law, learned from Bubbles: the title reads the app's OWN
	// name (productName in tauri.conf.json is the single truth), so a rename
	// never gets chased into the chrome. Outside Tauri the fallback stands.
	let appName = $state('Sistrum');
	getName()
		.then((n) => { appName = n.replace(/^Resonance\s+/i, ''); })
		.catch(() => {});

	// THE WALK — this door consumes the-epagoge (the spring's leading-in;
	// Compass its first consumer, Bubbles the road-prover). The app brings
	// the particulars into the walk's slots; the walk owns the flow, the
	// dots, the honest record. ALL presets are offered at the door —
	// derived from the shelf itself, never hardcoded, so a new preset
	// appears here the day it is born (KP's word: "it adds the other
	// available styles choices").
	const PRESET_ICONS: Record<string, string> = {
		dark: '🌙',
		warm: '🔥',
		ocean: '🌊',
		forest: '🌲',
		sunset: '🌅',
		amoled: '🌑'
	};

	// THE KEY LAW: the key is stored ("amoled"); the display name
	// (presetName, "AMOLED Black") is dress and appears nowhere in the record.
	const themeOffers = Object.entries(PRESET_THEMES).map(([key, t]) => ({
		key,
		name: t.presetName,
		icon: PRESET_ICONS[key] ?? '✨',
		accent: t.accentColor
	}));

	const STEPS: StepDef[] = [
		{ id: 'welcome', kind: 'entry' },
		{ id: 'how', kind: 'threshold' },
		{ id: 'theme', kind: 'choose', atMost: 1, preset: ['dark'], offers: themeOffers }
	];

	const begun = beginWalk(STEPS);
	let walk = $state<Walk>(begun.walk ?? beginWalk([{ id: 'welcome', kind: 'entry' }]).walk!);
	const beginTrouble = begun.trouble;

	let vesselName = $state('');

	const step = $derived(current(walk));
	const progress = $derived(dots(walk));
	const chosenTheme = $derived((walk.choices['theme'] ?? ['dark'])[0] ?? 'dark');

	function pickTheme(key: string) {
		walk = toggleChoice(walk, key);
		// Live preview is dress, not record — the walk holds the key.
		themeStore.setPreset((walk.choices['theme'] ?? ['dark'])[0] ?? 'dark');
	}

	function onward() {
		if (step?.kind === 'entry') walk = enter(walk, vesselName);
		walk = advance(walk);
		if (isDone(walk)) finish();
	}

	function pass() {
		walk = skip(walk);
		if (isDone(walk)) finish();
	}

	// THE DOORWAY LAW: completion hands over what was given and what was
	// not; the app stores it under its own roof, and every answer stays
	// changeable in Settings.
	function finish() {
		const done = completion(walk);
		const name = done.entries['welcome'];
		if (name) localStorage.setItem('resonance-sistrum-vessel-name', name);
		themeStore.setPreset((done.choices['theme'] ?? ['dark'])[0] ?? 'dark');
		localStorage.setItem('onboarding_complete', 'true');
		goto('/');
	}
</script>

<div class="onboarding" style="padding-top: env(safe-area-inset-top, 0px);">

	{#if beginTrouble}
		<!-- Trouble is data, told never thrown — and it should never stand here:
		     the steps are static. Honest anyway. -->
		<div class="screen"><div class="screen-body"><p class="ob-sub">{beginTrouble}</p></div></div>
	{:else if step?.id === 'welcome'}
		<!-- Step 1: Welcome — the entry -->
		<div class="screen">
			<div class="screen-body">
				<div class="sigil-wrap">
					<GradientPulse pulse={true}>
						<div class="sigil">🧭</div>
					</GradientPulse>
				</div>

				<div class="header-text">
					<h1 class="ob-title">Welcome to {appName}</h1>
					<p class="ob-sub">Your space to log anything with feeling. All stored on your device. No accounts. No cloud.</p>
				</div>

				<div class="name-section">
					<label class="name-label" for="vessel-name">What should we call you?</label>
					<input
						id="vessel-name"
						type="text"
						bind:value={vesselName}
						placeholder="Your name, a nickname, anything"
						class="name-input"
						maxlength="40"
						autocomplete="off"
					/>
					<p class="name-hint">This is who you are in the Sanctuary.</p>
				</div>
			</div>

			<div class="screen-actions">
				<button class="btn-primary" onclick={onward}>Begin</button>
				<button class="btn-skip" onclick={pass}>Skip</button>
			</div>

			<div
				class="progress"
				role="progressbar"
				aria-label={progress.label}
				aria-valuenow={progress.valuenow}
				aria-valuemin={progress.valuemin}
				aria-valuemax={progress.valuemax}
			>
				{#each progress.states as s, i (i)}
					<div class="dot" class:active={s === 'active'} class:done={s === 'past'}></div>
				{/each}
			</div>
		</div>

	{:else if step?.id === 'how'}
		<!-- Step 2: How it works — a threshold, passage only -->
		<div class="screen">
			<div class="screen-body">
				<h1 class="ob-title">How it works</h1>

				<div class="how-cards">
					<div class="how-card">
						<span class="how-icon">📖</span>
						<div class="how-text">
							<strong>Log anything</strong>
							<span>Name a moment, choose a sense, tag it with an emoji.</span>
						</div>
					</div>
					<div class="how-card">
						<span class="how-icon">✨</span>
						<div class="how-text">
							<strong>See patterns</strong>
							<span>Gentle insights emerge over time — no pressure, no judgment.</span>
						</div>
					</div>
					<div class="how-card">
						<span class="how-icon">🔒</span>
						<div class="how-text">
							<strong>Your data stays yours</strong>
							<span>Export anytime. Delete anytime. Nothing leaves your device.</span>
						</div>
					</div>
				</div>
			</div>

			<div class="screen-actions">
				<button class="btn-primary" onclick={onward}>Continue</button>
				<button class="btn-skip" onclick={pass}>Skip</button>
			</div>

			<div
				class="progress"
				role="progressbar"
				aria-label={progress.label}
				aria-valuenow={progress.valuenow}
				aria-valuemin={progress.valuemin}
				aria-valuemax={progress.valuemax}
			>
				{#each progress.states as s, i (i)}
					<div class="dot" class:active={s === 'active'} class:done={s === 'past'}></div>
				{/each}
			</div>
		</div>

	{:else}
		<!-- Step 3: Theme — every preset the shelf holds, live-preview cards -->
		<div class="screen">
			<div class="screen-body">
				<h1 class="ob-title">Choose your atmosphere</h1>

				<div class="theme-grid">
					{#each themeOffers as opt (opt.key)}
						<button
							class="theme-card"
							class:selected={chosenTheme === opt.key}
							style="--card-accent: {opt.accent};"
							onclick={() => pickTheme(opt.key)}
							aria-pressed={chosenTheme === opt.key}
						>
							<span class="theme-icon">{opt.icon}</span>
							<span class="theme-name">{opt.name}</span>
							<div class="theme-swatch" style="background: {opt.accent};"></div>
						</button>
					{/each}
				</div>

				<!-- The doorway line — the leading-in never locks a door. -->
				<p class="name-hint">You can change this anytime in Settings.</p>
			</div>

			<div class="screen-actions">
				<button class="btn-primary" onclick={onward}>Enter {appName}</button>
				<button class="btn-skip" onclick={pass}>Skip</button>
			</div>

			<div
				class="progress"
				role="progressbar"
				aria-label={progress.label}
				aria-valuenow={progress.valuenow}
				aria-valuemin={progress.valuemin}
				aria-valuemax={progress.valuemax}
			>
				{#each progress.states as s, i (i)}
					<div class="dot" class:active={s === 'active'} class:done={s === 'past'}></div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<style>
	.onboarding {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		background: var(--bg);
	}

	/* Each screen fills the viewport */
	.screen {
		flex: 1;
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		padding: 2rem 1.5rem 0;
		box-sizing: border-box;
	}

	/* Vertically centers the content area */
	.screen-body {
		flex: 1;
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: 1.75rem;
	}

	/* ── Step 1: Welcome ── */
	.sigil-wrap {
		display: flex;
		justify-content: center;
	}

	.sigil {
		font-size: 4.5rem;
		line-height: 1;
		text-align: center;
	}

	.header-text {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		text-align: center;
	}

	.ob-title {
		font-size: 1.8rem;
		font-weight: 700;
		color: var(--text);
		margin: 0;
		text-align: center;
	}

	.ob-sub {
		font-size: 0.95rem;
		color: var(--text-secondary);
		line-height: 1.65;
		margin: 0;
		text-align: center;
	}

	.name-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.name-label {
		font-size: 0.875rem;
		color: var(--text-secondary);
		text-align: center;
	}

	.name-input {
		width: 100%;
		padding: 0.8rem 1rem;
		background: var(--bg-surface);
		border: 1.5px solid var(--border-color);
		border-radius: 12px;
		color: var(--text);
		font-size: 1rem;
		text-align: center;
		outline: none;
		box-sizing: border-box;
		transition: border-color 0.15s;
	}
	.name-input:focus { border-color: var(--accent); }
	.name-input::placeholder { color: var(--text-muted); }

	.name-hint {
		font-size: 0.75rem;
		color: var(--text-muted);
		text-align: center;
		margin: 0;
	}

	/* ── Step 2: How it works ── */
	.how-cards {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.how-card {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 1rem;
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: 12px;
	}

	.how-icon {
		font-size: 1.5rem;
		line-height: 1;
		flex-shrink: 0;
		width: 2rem;
		text-align: center;
	}

	.how-text {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
	}
	.how-text strong {
		font-size: 0.95rem;
		color: var(--text);
	}
	.how-text span {
		font-size: 0.82rem;
		color: var(--text-muted);
		line-height: 1.5;
	}

	/* ── Step 3: Theme — six cards, 2 columns on a phone, 3 on wider land ── */
	.theme-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.75rem;
	}

	@media (min-width: 640px) {
		.theme-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.theme-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
		padding: 1.4rem 0.5rem 1rem;
		background: var(--bg-surface);
		border: 2px solid var(--border-color);
		border-radius: 16px;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s, transform 0.15s;
	}
	.theme-card:active { transform: scale(0.97); }
	.theme-card.selected {
		border-color: var(--card-accent);
		background: color-mix(in srgb, var(--card-accent) 10%, var(--bg-surface));
		transform: scale(1.03);
	}

	.theme-icon { font-size: 2rem; line-height: 1; }
	.theme-name { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); }
	.theme-swatch {
		width: 28px;
		height: 5px;
		border-radius: 3px;
	}

	/* ── Actions ── */
	.screen-actions {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin-top: 1.5rem;
	}

	.btn-primary {
		width: 100%;
		padding: 0.9rem;
		background: var(--accent);
		border: none;
		border-radius: 12px;
		color: #fff;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.1s;
	}
	.btn-primary:active { transform: scale(0.98); }

	.btn-skip {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: 0.875rem;
		cursor: pointer;
		padding: 0.25rem 0.75rem;
		transition: color 0.15s;
	}
	.btn-skip:hover { color: var(--text-secondary); }

	/* ── Progress dots — derived by the walk, drawn by the app ── */
	.progress {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 0.5rem;
		padding: 1.25rem 0 calc(1.25rem + env(safe-area-inset-bottom, 0px));
	}

	.dot {
		width: 8px;
		height: 8px;
		border-radius: 4px;
		background: var(--border-color);
		transition: width 0.3s ease, background 0.3s ease;
	}
	.dot.active {
		width: 22px;
		background: var(--accent);
	}
	.dot.done {
		background: color-mix(in srgb, var(--accent) 45%, var(--border-color));
	}
</style>
