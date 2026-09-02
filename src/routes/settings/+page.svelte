<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { feelingStore } from '$lib/stores/feeling.svelte';
	import { PRESET_THEMES, presetSwatch } from '$lib/theme/theme';
	import { onMount } from 'svelte';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { getVersion } from '@tauri-apps/api/app';
	import { identityStore } from '$lib/stores/identity.svelte';
	import { forgetKeyring } from '$lib/keyring/store';

	const PRIVACY_URL = 'https://audhdities.com/apps/privacy';
	const SANCTUARY_URL = 'https://audhdities.com';
	let privacyError = $state(false);
	async function openPrivacy() {
		try {
			await openUrl(PRIVACY_URL);
		} catch {
			privacyError = true; // browser/dev fallback: show the URL itself
		}
	}
	async function openSanctuary() {
		try {
			await openUrl(SANCTUARY_URL);
		} catch {
		}
	}

	// Version comes from tauri.conf.json — never hardcoded again.
	let appVersion = $state('');
	getVersion().then((v) => (appVersion = v)).catch(() => (appVersion = ''));


	// ── WHO YOU ARE HERE (2026-09-02, THE COLUMN COMES TO LIFE) ───────────
	//
	// A signet (name · sigil · color) and a clavis keypair. The keypair is
	// generated ONCE through the WebCrypto host with the private half
	// NON-EXTRACTABLE, and it is held as CryptoKey objects in THIS DEVICE'S
	// IndexedDB — this app's own sovereign key storage, because `the-clavis`
	// says plainly that storage is the host's business and keeps none itself.
	// The public half is shown and can be copied. NOTHING LEAVES THE DEVICE,
	// and there is no verb anywhere in this app that could send it.
	let signetName = $state('');
	let signetSigil = $state('⚛');
	let signetColor = $state('#b58cff');
	let signetSaved = $state(false);
	let publicCopied = $state(false);
	let keyConfirm = $state(false);

	const identity = $derived(identityStore.identity);
	const publicHalf = $derived(identityStore.publicKey);

	// The form follows the stored identity the first time it arrives, and never again:
	// a hand editing the fields must not have them yanked back by a load.
	let filledFrom = $state<string | null>(null);
	$effect(() => {
		const who = identityStore.identity;
		const stamp = who ? `${who.name}|${who.sigil}|${who.color}` : null;
		if (!who || filledFrom !== null) return;
		filledFrom = stamp;
		signetName = who.name;
		signetSigil = who.sigil;
		signetColor = who.color;
	});

	async function saveSignet() {
		signetSaved = await identityStore.saveIdentity({
			name: signetName,
			sigil: signetSigil || '·',
			color: signetColor
		});
	}

	async function makeKey() {
		keyConfirm = false;
		await identityStore.generateKey();
	}

	async function copyPublic() {
		const text = identityStore.publicHalfText();
		if (!text) return;
		try {
			await navigator.clipboard.writeText(text);
			publicCopied = true;
		} catch {
			publicCopied = false;
		}
	}

	onMount(() => {
		void identityStore.load();
	});

	const PRESET_ICONS: Record<string, string> = {
		dark: '🌙', warm: '🔥', ocean: '🌊', forest: '🌲', sunset: '🌅', amoled: '⚫'
	};
	const themeOptions = Object.entries(PRESET_THEMES).map(([key, t]) => ({
		key,
		icon: PRESET_ICONS[key] ?? t.icon ?? '✨',
		name: key === 'amoled' ? 'AMOLED' : t.presetName,
		accent: t.accentColor,
		swatch: presetSwatch(t)
	}));

	// Matched on presetName, not accent — Dark and AMOLED share an accent color.
	const activePreset = $derived.by(() => {
		const name = themeStore.config.presetName;
		return (
			Object.entries(PRESET_THEMES).find(([, p]) => p.presetName === name)?.[0] ?? 'dark'
		);
	});

	const displayModes = [
		{ key: 'light' as const, label: '☀️ Light' },
		{ key: 'dark' as const, label: '🌙 Dark' },
		{ key: 'amoled' as const, label: '⚫ AMOLED' }
	];

	const tintLevels = [
		{ key: 'off' as const, label: 'Off' },
		{ key: 'subtle' as const, label: 'Subtle' },
		{ key: 'full' as const, label: 'Full' }
	];

	const fontSizes = [
		{ key: 'small' as const, label: 'Small' },
		{ key: 'medium' as const, label: 'Medium' },
		{ key: 'large' as const, label: 'Large' }
	];


	const feelingCount = $derived(feelingStore.totalCount);

	// purgeState controls the double-confirmation flow for both purge paths
	let purgeState = $state<'idle' | 'confirm1' | 'confirm2'>('idle');
	let pendingExport = $state(false);
	let showUninstallGuide = $state(false);

	async function exportData() {
		// Straight from the database, never the loaded page. One versioned envelope carries both the echoes and the folksonomy.
		const allFeelings = await feelingStore.getAllFeelings();
		const folksonomy = { ...feelingStore.personalDefinitions };
		const payload = {
			envelope: 'resonance-export',
			envelopeVersion: 1,
			app: 'resonance-sistrum',
			appVersion: appVersion || 'unknown',
			exportedAt: new Date().toISOString(),
			counts: { feelings: allFeelings.length, folksonomy: Object.keys(folksonomy).length },
			data: { feelings: allFeelings, folksonomy }
		};
		const json = JSON.stringify(payload, null, 2);
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		const date = new Date().toISOString().split('T')[0];
		a.href = url;
		a.download = `resonance-sistrum-export-${date}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	let importInput = $state<HTMLInputElement | null>(null);
	let importReport = $state<string | null>(null);
	let importError = $state<string | null>(null);

	function isImportableFeeling(e: unknown): boolean {
		const r = e as Record<string, unknown>;
		return (
			!!r &&
			typeof r.id === 'string' &&
			typeof r.name === 'string' &&
			typeof r.sense === 'string' &&
			typeof r.emoji === 'string' &&
			typeof r.intensity === 'number' &&
			typeof r.timestamp === 'number'
		);
	}

	async function handleImportFile(ev: Event) {
		const input = ev.target as HTMLInputElement;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		importError = null;
		importReport = null;
		try {
			const parsed = JSON.parse(await file.text());
			let feelingsIn: unknown[] = [];
			let folkIn: Record<string, unknown> = {};
			if (Array.isArray(parsed)) {
				// Legacy bare-array export (pre-envelope, <= v1.2.0) is still honored.
				feelingsIn = parsed;
			} else if (parsed?.envelope === 'resonance-export' && parsed?.data) {
				if (parsed.app !== 'resonance-sistrum') {
					throw new Error(
						`This file belongs to ${parsed.app ?? 'another app'} — Sistrum imports only its own envelopes.`
					);
				}
				feelingsIn = Array.isArray(parsed.data.feelings) ? parsed.data.feelings : [];
				if (parsed.data.folksonomy && typeof parsed.data.folksonomy === 'object') {
					folkIn = parsed.data.folksonomy as Record<string, unknown>;
				}
			} else {
				throw new Error('Not a Resonance Sistrum export file.');
			}
			const valid = feelingsIn.filter(isImportableFeeling) as Parameters<
				typeof feelingStore.importFeelings
			>[0];
			const malformed = feelingsIn.length - valid.length;
			const { added, skipped } = await feelingStore.importFeelings(valid);
			// Folksonomy merges non-destructively: an existing definition is never overwritten by an older file.
			let defsAdded = 0;
			let defsKept = 0;
			for (const [emoji, def] of Object.entries(folkIn)) {
				if (typeof def !== 'string' || !def) continue;
				if (feelingStore.getPersonalDefinition(emoji)) defsKept++;
				else {
					feelingStore.setPersonalDefinition(emoji, def);
					defsAdded++;
				}
			}
			const parts = [
				`${added} ${added === 1 ? 'feeling' : 'feelings'} imported`,
				skipped ? `${skipped} already present` : '',
				defsAdded ? `${defsAdded} definitions added` : '',
				defsKept ? `${defsKept} definitions kept as yours` : '',
				malformed ? `${malformed} entries unreadable` : ''
			].filter(Boolean);
			importReport = parts.join(' · ') + '.';
		} catch (err) {
			importError = err instanceof Error ? err.message : String(err);
		}
	}

	function startPurge(withExport: boolean) {
		pendingExport = withExport;
		purgeState = 'confirm1';
	}

	function cancelPurge() {
		purgeState = 'idle';
		pendingExport = false;
		purgeError = null;
	}

	let purgeError = $state<string | null>(null);

	async function executePurge() {
		purgeError = null;
		try {
			// Awaited: the export must be complete in hand before anything deletes.
			if (pendingExport) await exportData();
			await feelingStore.purgeAll();
			// Clear everything, not a curated list — future keys must not survive a purge by omission.
			localStorage.clear();
			// THE PURGE TRULY PURGES: the signet and the keypair go with it. The
			// private half is non-extractable and has no copy anywhere, so this
			// ends it — takes already sealed stay verifiable, and nothing new can
			// ever be sealed as that key again. Said on the screen before the press.
			await identityStore.forget();
			await forgetKeyring();
		} catch (err) {
			purgeError = err instanceof Error ? err.message : String(err);
			return;
		}
		location.reload();
	}
</script>

<div class="settings" style="padding-top: env(safe-area-inset-top, 0px);">
	<header class="settings-header">
		<h1 class="settings-title">Settings</h1>
	</header>

	<section class="section">
		<h2 class="section-title">Theme</h2>

		<div class="theme-grid">
			{#each themeOptions as opt}
				<button
					class="theme-card"
					class:selected={activePreset === opt.key}
					style="--card-accent: {opt.accent};"
					onclick={() => themeStore.setPreset(opt.key)}
					aria-pressed={activePreset === opt.key}
				>
					<span class="theme-icon">{opt.icon}</span>
					<span class="theme-name">{opt.name}</span>
					<div class="theme-swatch" style="background: {opt.swatch};"></div>
				</button>
			{/each}
		</div>

		<div class="font-row">
			<span class="font-label">Display mode</span>
			<div class="font-btns" role="group" aria-label="Display mode">
				{#each displayModes as { key, label }}
					<button
						class="font-btn"
						class:active={themeStore.config.mode === key}
						onclick={() => themeStore.setMode(key)}
					>{label}</button>
				{/each}
			</div>
		</div>

		<div class="font-row">
			<span class="font-label">Background tint</span>
			<div class="font-btns" role="group" aria-label="Background tint">
				{#each tintLevels as { key, label }}
					<button
						class="font-btn"
						class:active={themeStore.config.tint === key}
						onclick={() => themeStore.setTint(key)}
					>{label}</button>
				{/each}
			</div>
		</div>

		<div class="font-row">
			<span class="font-label">Font size</span>
			<div class="font-btns" role="group" aria-label="Font size">
				{#each fontSizes as { key, label }}
					<button
						class="font-btn"
						class:active={themeStore.config.fontSize === key}
						onclick={() => themeStore.setFontSize(key)}
					>{label}</button>
				{/each}
			</div>
		</div>
	</section>

	<section class="section">
		<h2 class="section-title">Who you are here</h2>

		<p class="who-intro">
			A take can carry the hand that made it. This is that hand: a name, a sigil and a colour, and —
			if you want one — a signing key made on this device and held only here.
		</p>

		<div class="who-grid">
			<label class="who-field">
				<span class="who-label">Name</span>
				<input
					class="who-input"
					type="text"
					bind:value={signetName}
					oninput={() => (signetSaved = false)}
					placeholder="Whoever owns the mark"
					maxlength="64"
				/>
			</label>
			<label class="who-field narrow">
				<span class="who-label">Sigil</span>
				<input
					class="who-input"
					type="text"
					bind:value={signetSigil}
					oninput={() => (signetSaved = false)}
					placeholder="⚛"
					maxlength="8"
				/>
			</label>
			<label class="who-field narrow">
				<span class="who-label">Colour</span>
				<input
					class="who-color"
					type="color"
					bind:value={signetColor}
					oninput={() => (signetSaved = false)}
					aria-label="Your colour"
				/>
			</label>
		</div>

		<div class="who-actions">
			<button class="btn-data" onclick={saveSignet} disabled={identityStore.busy}>
				Keep this signet
			</button>
			{#if signetSaved}<span class="who-note">Kept.</span>{/if}
			{#if identity}
				<span class="who-preview" style="color: {identity.color}">
					{identity.sigil} {identity.name}
				</span>
			{/if}
		</div>

		<p class="who-fine">
			A seal, not a lock: the signet carries provenance and makes no tamper-proof claim. It rides
			into a take as a <em>snapshot</em> — change your colour tomorrow and every take you already
			sealed keeps the colour it was sealed under.
		</p>

		<div class="who-key">
			<p class="who-label">Your signing key</p>

			{#if identityStore.ed25519 === false}
				<p class="purge-error">
					This device's WebCrypto does not name Ed25519, so no key can be made here. Takes still seal
					with your signet alone, and the room says so on each one.
				</p>
			{:else if !identityStore.hasKey}
				{#if !keyConfirm}
					<button class="btn-data" onclick={() => (keyConfirm = true)} disabled={!identity || identityStore.busy}>
						Make a key on this device
					</button>
					{#if !identity}
						<span class="who-note">Keep a signet first — a key signs on behalf of a named hand.</span>
					{/if}
				{:else}
					<div class="confirm-card">
						<p class="confirm-text">
							The key is made here and stays here. The private half is generated
							<strong>non-extractable</strong>: this app cannot read it, cannot export it, cannot back
							it up and cannot move it to another device — the machine itself refuses. If you purge
							this app or clear its storage, that key is gone for good. Takes already sealed under it
							stay verifiable; nothing new could ever be sealed as it again.
						</p>
						<div class="confirm-actions">
							<button class="btn-neutral" onclick={() => (keyConfirm = false)}>Cancel</button>
							<button class="btn-data" onclick={makeKey} disabled={identityStore.busy}>
								Make it
							</button>
						</div>
					</div>
				{/if}
			{:else}
				<p class="who-note">
					A key stands on this device. It is made once — a second one would orphan every take sealed
					under the first, so it is refused rather than done quietly.
				</p>
				<p class="who-public">Public half<br /><code>{publicHalf}</code></p>
				<div class="who-actions">
					<button class="btn-data" onclick={copyPublic}>Copy the public half</button>
					{#if publicCopied}<span class="who-note">Copied.</span>{/if}
				</div>
				<p class="who-fine">
					The public half, and only ever the public half: there is no export path for the private one
					anywhere in this app, and the absence is the law. Signing, not secrecy — a credential
					proves who made a take and hides nothing from anyone.
				</p>
			{/if}

			{#if identityStore.error}
				<p class="purge-error" role="alert">{identityStore.error}</p>
			{/if}
		</div>

		<p class="privacy-line">
			Your signet and your key never leave this device. Nothing in this app sends either anywhere,
			and a take's credential travels only if you export the take yourself.
		</p>
	</section>

	<section class="section">
		<h2 class="section-title">Data Sovereignty</h2>

		<p class="feeling-count">
			{feelingCount === 0
				? 'No feelings stored yet.'
				: `${feelingCount} ${feelingCount === 1 ? 'feeling' : 'feelings'} stored on your device.`}
		</p>

		<div class="data-actions">
			<button class="btn-data" onclick={exportData} disabled={feelingCount === 0}>
				Export All Data
			</button>
			<button class="btn-data" onclick={() => importInput?.click()}>
				Import Data
			</button>
			<input
				type="file"
				accept="application/json,.json"
				hidden
				bind:this={importInput}
				onchange={handleImportFile}
			/>
			<button class="btn-data warning" onclick={() => startPurge(true)} disabled={feelingCount === 0}>
				Export &amp; Purge
			</button>
		</div>

		{#if importReport}
			<p class="import-report" role="status">{importReport}</p>
		{/if}
		{#if importError}
			<p class="purge-error" role="alert">Import failed: {importError}</p>
		{/if}

		<p class="privacy-line">
			Your feelings never leave this device.
			<button class="privacy-link" onclick={openPrivacy}>Privacy Policy</button>
			{#if privacyError}<span class="privacy-url">{PRIVACY_URL}</span>{/if}
		</p>

		<div class="danger-zone">
			<p class="danger-label">Danger zone</p>

			{#if purgeState === 'idle'}
				<button class="btn-danger" onclick={() => startPurge(false)} disabled={feelingCount === 0}>
					Purge All Data
				</button>

			{:else if purgeState === 'confirm1'}
				<div class="confirm-card">
					<p class="confirm-text">
						{#if pendingExport}
							This will export your data and permanently delete all your feelings. This cannot be undone.
						{:else}
							This will permanently delete all your feelings. This cannot be undone.
						{/if}
					</p>
					<div class="confirm-actions">
						<button class="btn-neutral" onclick={cancelPurge}>Cancel</button>
						<button class="btn-danger" onclick={() => (purgeState = 'confirm2')}>Continue</button>
					</div>
				</div>

			{:else}
				<div class="confirm-card final">
					<p class="confirm-text">
						{#if pendingExport}
							Are you absolutely sure? Your feelings will be downloaded then permanently deleted.
						{:else}
							Are you absolutely sure? All feelings, insights, and settings will be removed.
						{/if}
						{#if identityStore.hasKey}
							<br /><strong>Your signing key goes too.</strong> The private half is non-extractable —
							there is no copy of it anywhere, so this ends it. Takes you have already sealed stay
							verifiable; nothing new can ever be sealed as that key again.
						{/if}
					</p>
					{#if purgeError}
						<p class="purge-error" role="alert">Purge failed: {purgeError}</p>
					{/if}
					<div class="confirm-actions">
						<button class="btn-neutral" onclick={cancelPurge}>Cancel</button>
						<button class="btn-danger-filled" onclick={executePurge}>Delete Everything</button>
					</div>
				</div>
			{/if}
		</div>

		<div class="uninstall-section">
			{#if !showUninstallGuide}
				<button class="btn-uninstall" onclick={() => (showUninstallGuide = true)}>
					Uninstall App
				</button>
			{:else}
				<div class="uninstall-guide">
					<p class="uninstall-intro">Resonance Sistrum stores all data on your device. To completely remove the app and all data:</p>
					<ol class="uninstall-steps">
						<li>Export your data if you want to keep it</li>
						<li>Go to Android Settings → Apps → Resonance Sistrum → Uninstall</li>
					</ol>
					<p class="uninstall-note">This ensures Android removes all app data.</p>
					<button class="btn-neutral" onclick={() => (showUninstallGuide = false)}>Got it</button>
				</div>
			{/if}
		</div>
	</section>

	<section class="section">
		<h2 class="section-title">About</h2>

		<div class="about-card">
			<div class="about-app">
				<span class="about-name">Resonance Sistrum</span>
				{#if appVersion}<span class="about-version">v{appVersion}</span>{/if}
			</div>
			<p class="about-tag">A sovereign journal for logging anything with feeling.</p>
			<p class="about-built">Built with Aethelred by Quantum Weaver for the AudHDities Sanctuary.</p>
			<p class="about-license">All data belongs to the vessel. The Resonance Grammar governs.</p>
			<div class="about-links">
				<button class="privacy-link" onclick={openSanctuary}>audhdities.com — the Sanctuary</button>
				<button class="privacy-link" onclick={openPrivacy}>Privacy Policy</button>
			</div>
			<p class="about-companion">Companion room: Resonance Compass — the Sanctuary's music player.</p>
		</div>
	</section>
</div>

<style>
	.who-intro,
	.who-fine,
	.who-note,
	.who-public {
		font-size: 0.82rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.who-fine,
	.who-note {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.who-grid {
		display: flex;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin: 0.75rem 0 0.5rem;
	}

	.who-field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1 1 12rem;
		min-width: 0;
	}

	.who-field.narrow {
		flex: 0 0 6rem;
	}

	.who-label {
		font-size: 0.72rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.who-input {
		min-height: 44px;
		padding: 0.5rem 0.75rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg);
		color: var(--text);
		font-size: 0.9rem;
		font-family: inherit;
		box-sizing: border-box;
		outline: none;
	}

	.who-input:focus {
		border-color: var(--accent);
	}

	.who-color {
		min-height: 44px;
		width: 100%;
		padding: 0.2rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg);
		box-sizing: border-box;
	}

	.who-actions {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		margin-bottom: 0.5rem;
	}

	.who-preview {
		font-size: 0.95rem;
		font-weight: 600;
	}

	.who-key {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: 1rem 0 0.75rem;
		padding: 0.85rem 1rem;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		background: var(--bg);
	}

	.who-public code {
		font-size: 0.72rem;
		word-break: break-all;
		color: var(--text-muted);
	}

	.settings {
		min-height: 100%;
	}

	.settings-header {
		padding: 1rem 1.25rem 0.75rem;
		border-bottom: 1px solid var(--border-color);
	}

	.settings-title {
		font-size: 1.25rem;
		font-weight: 700;
		color: var(--text);
		margin: 0;
	}

	.section {
		padding: 1.25rem 1.25rem 0;
		border-bottom: 1px solid var(--border-color);
		display: flex;
		flex-direction: column;
		gap: 1rem;
		padding-bottom: 1.25rem;
	}

	.section-title {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--text-muted);
		margin: 0;
	}

	.theme-grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.65rem;
	}

	.theme-card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 1rem 0.5rem 0.75rem;
		background: var(--bg-surface);
		border: 2px solid var(--border-color);
		border-radius: 14px;
		cursor: pointer;
		transition: border-color 0.2s, background 0.2s, transform 0.15s;
	}
	.theme-card:active { transform: scale(0.97); }
	.theme-card.selected {
		border-color: var(--card-accent);
		background: color-mix(in srgb, var(--card-accent) 10%, var(--bg-surface));
	}

	.theme-icon { font-size: 1.6rem; line-height: 1; }
	.theme-name { font-size: 0.78rem; font-weight: 600; color: var(--text-secondary); }
	.theme-swatch { width: 24px; height: 4px; border-radius: 2px; }

	.font-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		/* Wrap instead of clipping — flex text children won't shrink below their content. */
		flex-wrap: wrap;
	}

	.font-label {
		font-size: 0.875rem;
		color: var(--text-secondary);
	}

	.font-btns {
		display: flex;
		gap: 0.35rem;
	}

	.font-btn {
		padding: 0.3rem 0.7rem;
		background: var(--bg-surface);
		border: 1.5px solid var(--border-color);
		border-radius: 20px;
		color: var(--text-secondary);
		font-size: 0.78rem;
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s, background 0.15s;
	}
	.font-btn.active {
		border-color: var(--accent);
		color: var(--accent);
		background: color-mix(in srgb, var(--accent) 12%, transparent);
	}

	.feeling-count {
		font-size: 0.875rem;
		color: var(--text-muted);
		margin: 0;
	}

	.data-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.privacy-line {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0;
	}
	.privacy-link {
		background: none;
		border: none;
		padding: 0;
		font-size: inherit;
		color: var(--accent);
		text-decoration: underline;
		cursor: pointer;
		text-align: left;
	}
	.privacy-url {
		display: block;
		font-size: 0.75rem;
		color: var(--text-muted);
		word-break: break-all;
	}
	.about-links {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin-top: 0.5rem;
		font-size: 0.85rem;
	}
	.about-companion {
		font-size: 0.8rem;
		color: var(--text-muted);
		margin: 0.5rem 0 0;
	}

	.btn-data {
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--bg-surface);
		border: 1.5px solid var(--border-color);
		border-radius: 10px;
		color: var(--text);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, background 0.15s;
	}
	.btn-data:not(:disabled):hover { border-color: var(--accent); }
	.btn-data:disabled { opacity: 0.35; cursor: not-allowed; }

	.btn-data.warning {
		border-color: rgba(243, 156, 18, 0.5);
		color: var(--color-warning);
	}
	.btn-data.warning:not(:disabled):hover {
		background: color-mix(in srgb, var(--color-warning) 10%, var(--bg-surface));
		border-color: var(--color-warning);
	}

	.danger-zone {
		border: 1px solid rgba(231, 76, 60, 0.3);
		border-radius: 12px;
		padding: 0.875rem 1rem;
		background: color-mix(in srgb, var(--color-emergency-high) 5%, transparent);
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.danger-label {
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: rgba(231, 76, 60, 0.7);
		margin: 0;
	}

	.btn-danger {
		width: 100%;
		padding: 0.75rem 1rem;
		background: none;
		border: 1.5px solid var(--color-emergency-high);
		border-radius: 10px;
		color: var(--color-emergency-high);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		text-align: left;
		transition: background 0.15s;
	}
	.btn-danger:not(:disabled):hover { background: rgba(231, 76, 60, 0.1); }
	.btn-danger:disabled { opacity: 0.35; cursor: not-allowed; }

	.btn-danger-filled {
		padding: 0.6rem 1rem;
		background: var(--color-emergency-high);
		border: none;
		border-radius: 8px;
		color: #fff;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s, transform 0.1s;
	}
	.btn-danger-filled:active { transform: scale(0.97); }

	.btn-neutral {
		padding: 0.6rem 1rem;
		background: var(--bg-surface);
		border: 1.5px solid var(--border-color);
		border-radius: 8px;
		color: var(--text-secondary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.15s;
	}
	.btn-neutral:hover { border-color: var(--text-muted); }

	.confirm-card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.confirm-card.final .confirm-text { color: var(--color-emergency-high); }

	.confirm-text {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.5;
		margin: 0;
	}

	.purge-error {
		font-size: 0.8rem;
		color: var(--color-emergency-high);
		margin: 0;
		overflow-wrap: anywhere;
	}

	.import-report {
		font-size: 0.8rem;
		color: var(--color-success, var(--accent));
		margin: 0;
		overflow-wrap: anywhere;
	}

	.confirm-actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}

	.about-card {
		background: var(--bg-surface);
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 1rem 1.1rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.about-app {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.about-name {
		font-size: 1rem;
		font-weight: 700;
		color: var(--text);
	}

	.about-version {
		font-size: 0.75rem;
		color: var(--text-muted);
		background: var(--bg);
		border: 1px solid var(--border-color);
		border-radius: 10px;
		padding: 0.1rem 0.45rem;
	}

	.about-tag {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.5;
	}

	.about-built, .about-license {
		font-size: 0.78rem;
		color: var(--text-muted);
		margin: 0;
		line-height: 1.5;
	}

	.uninstall-section {
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
	}

	.btn-uninstall {
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--bg-surface);
		border: 1.5px solid var(--border-color);
		border-radius: 10px;
		color: var(--text-muted);
		font-size: 0.9rem;
		font-weight: 500;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.15s, color 0.15s;
	}
	.btn-uninstall:hover { border-color: var(--text-muted); color: var(--text-secondary); }

	.uninstall-guide {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.uninstall-intro, .uninstall-note {
		font-size: 0.875rem;
		color: var(--text-secondary);
		margin: 0;
		line-height: 1.55;
	}

	.uninstall-steps {
		margin: 0;
		padding-left: 1.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.uninstall-steps li {
		font-size: 0.875rem;
		color: var(--text-secondary);
		line-height: 1.5;
	}
</style>
