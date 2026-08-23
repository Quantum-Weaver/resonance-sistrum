<script lang="ts">
	import { themeStore } from '$lib/stores/theme.svelte';
	import { feelingStore } from '$lib/stores/feeling.svelte';
	import { PRESET_THEMES, presetSwatch } from '$lib/theme/theme';
	import { openUrl } from '@tauri-apps/plugin-opener';
	import { getVersion } from '@tauri-apps/api/app';

	const PRIVACY_URL = 'https://github.com/Quantum-Weaver/resonance-sistrum/blob/main/PRIVACY.md';
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
			/* browser/dev: no-op */
		}
	}

	// Version comes from tauri.conf.json — never hardcoded again.
	let appVersion = $state('');
	getVersion().then((v) => (appVersion = v)).catch(() => (appVersion = ''));

	// ── Theme section ──────────────────────────────────────────────────────────

	// Every preset the shelf holds — derived, never hardcoded, so a new preset
	// appears here the day it is born (the law the onboarding walk already keeps;
	// Rose, Rainbow and Progress Pride arrived this way 2026-08-22 at KP's word).
	// The six founding faces are this app's own dress; the shelf's icon stands in
	// for any it does not name, and a flag preset shows its stripes as the swatch.
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

	// ── Data Sovereignty section ────────────────────────────────────────────────

	const feelingCount = $derived(feelingStore.totalCount);

	// purgeState controls the double-confirmation flow for both purge paths
	let purgeState = $state<'idle' | 'confirm1' | 'confirm2'>('idle');
	let pendingExport = $state(false);
	let showUninstallGuide = $state(false);

	async function exportData() {
		// E1 (B4): straight from the database — never the loaded page.
		// E2+E3 (B5): ONE versioned envelope carrying BOTH the echoes and the
		// folksonomy — KP's ruling, one breath: "we need folksonomy and echoes
		// to export in the same manner." Purge and export now cover exactly
		// the same ground, and the counts are written on the envelope so a
		// vessel can see at a glance that the file carries what the app shows.
		// This shape is the family's to inherit (schema-versioned,
		// app-namespaced): envelope/envelopeVersion identify the format,
		// `app` namespaces the payload, `data` carries the app's tables.
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

	// ── Import (E4/B6) — the other half of the round-trip ────────────────────
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
				// Legacy bare-array export (pre-envelope, ≤ v1.2.0) — still honored:
				// a vessel's old backup must never be told it's worthless.
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
			// Folksonomy merges non-destructively too: an existing definition is
			// the vessel's current mind and is never overwritten by an older file.
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
			// Awaited: the export must be complete IN HAND before anything
			// deletes — export-then-purge may never destroy the remainder (E1).
			if (pendingExport) await exportData();
			await feelingStore.purgeAll();
			// Clear everything, not a curated list — future keys must not
			// survive a purge by omission (Compass pattern).
			localStorage.clear();
		} catch (err) {
			// Stay on the confirm step and say what failed — a silent purge
			// rejection looks like 'purge never purges'.
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

	<!-- ── Section 1: Theme ── -->
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

	<!-- ── Section 2: Data Sovereignty ── -->
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

	<!-- ── Section 3: About ── -->
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
	.settings {
		min-height: 100%;
	}

	/* Header */
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

	/* Sections */
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

	/* ── Theme ── */
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

	/* Font size */
	.font-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		/* Label + three pill buttons exceed 320px — wrap instead of clipping
		   (flex text children won't shrink below their content). */
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

	/* ── Data Sovereignty ── */
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

	/* Danger zone */
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

	/* Confirmation card */
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

	/* ── About ── */
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

	/* ── Uninstall Guide ── */
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
