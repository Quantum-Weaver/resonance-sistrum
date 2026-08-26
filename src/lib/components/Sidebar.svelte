<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { onMount, untrack } from 'svelte';
	import { uiStore } from '$lib/stores/ui.svelte';
	import { getName } from '@tauri-apps/api/app';
	import Icons from '$lib/components/icons/Icons.svelte';
	import type { IconName } from '$lib/components/icons/Icons.svelte';
	import { derive, rederive, wear, type Menu, type Shrine, type Door } from '$lib/cumdach';
	import { QUANTUM_COLORS } from '$lib/cosmic';

	let appName = $state('Sistrum');
	getName()
		.then((n) => { appName = n.replace(/^Resonance\s+/i, ''); })
		.catch(() => {});

	const open = $derived(uiStore.navOpen);

	type SistrumDoor = Door & { href: string; icon: IconName };

	const door = (id: string, href: string, icon: IconName, label: string): SistrumDoor => ({
		id,
		href,
		icon,
		label,
	});

	const MENU: Menu = {
		doors: [
			door('home', '/', 'home', 'Home'),
			door('record', '/record', 'record', 'Record'),
			door('tuner', '/tuner', 'tuner', 'Tuner'),
			door('metronome', '/metronome', 'metronome', 'Metronome'),
			door('insights', '/insights', 'insights', 'Insights'),
			door('timer', '/timer', 'timer', 'Timer'),
			door('sattva', '/sattva', 'sattva', 'Sattva'),
		],
		foot: { door: door('settings', '/settings', 'settings', 'Settings') },
	};

	const COSTS = { door: 48, head: 64, switchButton: 58, switchColumns: 2 };
	const PALETTE = {
		colors: [
			QUANTUM_COLORS['cosmic.blue'],
			QUANTUM_COLORS['hearth.gold'],
			QUANTUM_COLORS['sanctuary.green'],
			QUANTUM_COLORS['quantum.purple'],
		],
		emojis: ['📖', '✨', '🌿', '🌀'],
	};
	// The ComfortBar (48px, fixed) is a declared edge honored by arithmetic — an INPUT, never a CSS-only mend.
	const RESERVED = 48;

	let land = $state({ height: 900, reserved: RESERVED });
	let shrine = $state<Shrine>(derive(MENU, { height: 900, reserved: RESERVED }, COSTS, PALETTE));

	function measure() {
		land = { height: window.innerHeight, reserved: RESERVED };
	}

	$effect(() => {
		const l = land;
		shrine = rederive(
			untrack(() => shrine),
			MENU,
			l,
			COSTS,
			PALETTE
		);
	});

	function wearPanel(i: number) {
		shrine = wear(shrine, i);
	}

	const wornPanel = $derived(shrine.panels[shrine.worn] ?? null);
	const wornDoors = $derived((wornPanel?.doors ?? []) as SistrumDoor[]);
	const footDoor = MENU.foot.door as SistrumDoor;

	$effect(() => {
		if (uiStore.comfortBarExpanded) uiStore.setNavOpen(false);
	});

	onMount(() => {
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	});

	function navigate(href: string) {
		goto(href);
		uiStore.setNavOpen(false);
	}
</script>


{#if open}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		class="backdrop"
		onclick={() => uiStore.setNavOpen(false)}
		onkeydown={(e) => { if (e.key === 'Escape') uiStore.setNavOpen(false); }}
		role="presentation"
	></div>
{/if}

<nav class="sidebar" class:open aria-label="Main navigation">
	<div class="sidebar__header">
		<span class="sidebar__wordmark cosmic-sparkle-text">{appName}</span>
	</div>

	{#if shrine.switchShown}
		<div
			class="mode-switch"
			role="group"
			aria-label="Menu panels"
			style="grid-template-columns: repeat({COSTS.switchColumns}, 1fr);"
		>
			{#each shrine.panels as panel, i (i)}
				<button
					class="mode-btn"
					class:worn={i === shrine.worn}
					style="--face: {panel.face.color}"
					aria-pressed={i === shrine.worn}
					onclick={() => wearPanel(i)}
				>
					<span class="face-emoji" aria-hidden="true">{panel.face.emoji}</span>
					<span class="face-words">{panel.face.words}</span>
				</button>
			{/each}
		</div>
	{/if}

	<ul class="sidebar__nav">
		{#each wornDoors as item (item.id)}
			<li>
				<button
					class="nav-item"
					class:active={page.url.pathname === item.href}
					onclick={() => navigate(item.href)}
				>
					<span class="nav-icon"><Icons name={item.icon} size={18} /></span>
					<span class="nav-label">{item.label}</span>
				</button>
			</li>
		{/each}
	</ul>

	<div class="sidebar__foot">
		<button
			class="nav-item"
			class:active={page.url.pathname === footDoor.href}
			onclick={() => navigate(footDoor.href)}
		>
			<span class="nav-icon"><Icons name={footDoor.icon} size={18} /></span>
			<span class="nav-label">{footDoor.label}</span>
		</button>
	</div>
</nav>

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 49;
		background-color: transparent;
	}

	.sidebar {
		position: fixed;
		top: 0;
		left: 0;
		height: 100vh;
		width: 20vw;
		min-width: 180px;
		max-width: 280px;
		background-color: var(--bg-surface);
		border-right: 1px solid var(--border-color);
		z-index: 50;
		transform: translateX(-100%);
		transition: transform 0.3s ease;
		display: flex;
		flex-direction: column;
		overflow-y: auto;
		/* Must stay equal to RESERVED in the script above — the ComfortBar paints over the sidebar. */
		padding-bottom: calc(48px + env(safe-area-inset-bottom, 0px));
	}

	.sidebar.open {
		transform: translateX(0);
	}

	.sidebar__header {
		padding: calc(1rem + env(safe-area-inset-top, 0px)) 1.25rem 1rem;
		border-bottom: 1px solid var(--border-color);
	}

	.sidebar__wordmark {
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--accent);
		letter-spacing: 0.02em;
	}

	.mode-switch {
		display: grid;
		gap: 0.35rem;
		padding: 0.75rem 0.5rem 0.5rem;
		border-bottom: 1px solid var(--border-color);
	}

	.mode-btn {
		min-height: 52px;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.15rem;
		padding: 0.3rem 0.4rem;
		border-radius: 8px;
		background: none;
		border: 1.5px solid color-mix(in srgb, var(--face) 45%, var(--border-color));
		color: var(--text-secondary);
		cursor: pointer;
		transition: background-color 0.15s ease, border-color 0.15s ease;
	}

	.mode-btn:hover {
		background-color: color-mix(in srgb, var(--face) 10%, transparent);
		color: var(--text);
	}

	.mode-btn.worn {
		border-color: var(--face);
		background-color: color-mix(in srgb, var(--face) 16%, transparent);
		color: var(--text);
		font-weight: 600;
	}

	.face-emoji {
		font-size: 1.1rem;
		line-height: 1;
	}

	.face-words {
		font-size: 0.68rem;
		line-height: 1.1;
	}

	.sidebar__nav {
		list-style: none;
		padding: 0.75rem 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.sidebar__foot {
		padding: 0.5rem;
		border-top: 1px solid var(--border-color);
	}

	.nav-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.65rem 0.75rem;
		border-radius: 8px;
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		text-align: left;
		font-size: 0.95rem;
		transition: background-color 0.15s ease, color 0.15s ease;
	}

	.nav-item:hover {
		background-color: var(--bg);
		color: var(--text);
	}

	.nav-item.active {
		background-color: var(--accent);
		color: #fff;
	}

	.nav-icon {
		display: flex;
		align-items: center;
		flex-shrink: 0;
	}

	@media (prefers-reduced-motion: reduce) {
		.sidebar {
			transition: none;
		}
	}
</style>
