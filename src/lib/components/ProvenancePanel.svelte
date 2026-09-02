<script lang="ts">
	import { readProvenance } from '$lib/provenance';
	import { openCredential } from '$lib/seal';
	import { isCredential, type Credential } from '$lib/clavis';
	import type { Opening } from '$lib/lok';
	import { consented, validate, type Merismos, type Part } from '$lib/merismos';

	// WHAT THIS TAKE CARRIES — the held column, read out. THE COLUMN COMES TO
	// LIFE (2026-09-02).
	//
	// Four things, and any of them may be absent: the studio's note (where the
	// sound came from), the signet (who), the clavis (the signed hand, opened
	// through the lok), the merismos (who gets what, and who has said yes).
	//
	// NOTHING IS DROPPED. Json this reader cannot parse is shown as the raw
	// string, and every key this app has never heard of is shown by name.

	let { fileName, provenance }: { fileName: string; provenance: unknown } = $props();

	const read = $derived(readProvenance(provenance));
	const credential = $derived(isCredential(read.clavis) ? (read.clavis as Credential) : null);
	const split = $derived(
		read.merismos && typeof read.merismos === 'object' ? (read.merismos as Merismos) : null
	);
	const verdict = $derived(split ? validate(split) : null);
	const yeses = $derived(split ? consented(split) : null);
	const otherKeys = $derived(Object.keys(read.other));

	let opening = $state<Opening | null>(null);
	let checking = $state(false);
	let checkError = $state<string | null>(null);
	let checkedFor = $state<string | null>(null);

	// Opening a take verifies it. The bytes are read once, here, and the lok
	// answers open or shut with the reason in its own words.
	$effect(() => {
		const name = fileName;
		const cred = credential;
		const stamp = cred ? `${name}::${cred.signature}` : name;
		if (checkedFor === stamp) return;
		checkedFor = stamp;
		opening = null;
		checkError = null;
		if (!cred) return;
		checking = true;
		void openCredential(name, cred)
			.then((o) => {
				opening = o;
			})
			.catch((e) => {
				checkError = e instanceof Error ? e.message : String(e);
			})
			.finally(() => {
				checking = false;
			});
	});

	function studioLine(studio: unknown): string {
		const s = studio as Record<string, unknown> | null;
		if (!s || typeof s !== 'object') return String(studio);
		const kind = typeof s.kind === 'string' ? s.kind : 'made in the studio';
		if (kind === 'mixdown') {
			const layers = Array.isArray(s.layers) ? s.layers.length : 0;
			return `Mixdown of ${layers} lane${layers === 1 ? '' : 's'}${s.session ? ` in the session “${String(s.session)}”` : ''}.`;
		}
		if (kind === 'trim') {
			const from = s.from ? String(s.from) : 'another take';
			const start = typeof s.start_secs === 'number' ? s.start_secs.toFixed(2) : '0';
			const end = typeof s.end_secs === 'number' ? `${s.end_secs.toFixed(2)} s` : 'the end';
			return `Trimmed from ${from}, ${start} s to ${end}. The original is untouched.`;
		}
		if (kind === 'overdub') {
			const at = typeof s.offset_ms === 'number' ? (s.offset_ms / 1000).toFixed(2) : '0';
			return `Overdubbed${s.session ? ` into “${String(s.session)}”` : ''} at ${at} s on the mix clock.`;
		}
		return `Made in the studio: ${kind}.`;
	}

	function partName(p: Part): string {
		const who = p.who ?? { name: '' };
		const sigil = typeof who.sigil === 'string' && who.sigil ? `${who.sigil} ` : '';
		return `${sigil}${who.name || '(unnamed)'}`;
	}

	/** A document written before KP's ⚛ ruling may still carry a `points` field.
	 *  It rides whole — nothing may drop what a hand put in this column — and it
	 *  is IGNORED and SAID to be ignored, rather than shown as if it meant
	 *  something. "There is nothing to do but divide by the number of
	 *  contributors, regardless of role." */
	const legacyWeighted = $derived(
		!!split && Array.isArray(split.parts) && split.parts.some((p) => 'points' in (p ?? {}))
	);
</script>

<section class="prov" aria-label="What this take carries">
	<h3 class="prov-head">What this take carries</h3>

	{#if !read.present}
		<p class="prov-none">
			Nothing yet. This take was sealed before a signet stood on this device, or with no signet at
			all — and nothing here will invent one for it after the fact.
		</p>
	{:else if read.unreadable}
		<div class="prov-block">
			<span class="prov-label">Unreadable</span>
			<p class="prov-told">
				The column holds json this reader could not parse. It is shown exactly as stored and it was
				never dropped — a parse failure is not permission to discard.
			</p>
			<pre class="prov-raw">{read.raw}</pre>
		</div>
	{:else}
		{#if read.studio !== undefined}
			<div class="prov-block">
				<span class="prov-label">The studio</span>
				<p class="prov-told">{studioLine(read.studio)}</p>
			</div>
		{/if}

		{#if read.signet}
			<div class="prov-block">
				<span class="prov-label">The hand</span>
				<p class="prov-told">
					<span class="sigil" style="color: {read.signet.color}">{read.signet.sigil}</span>
					<strong>{read.signet.name}</strong> — a snapshot taken when this take was sealed, never a
					lookup. If that hand has changed its colour since, this take keeps the colour it was sealed
					under.
				</p>
			</div>
		{/if}

		{#if read.clavis !== undefined}
			<div class="prov-block">
				<span class="prov-label">The key</span>
				{#if !credential}
					<p class="prov-shut">
						There is something under <code>clavis</code> that is not the shape of a credential. It is
						kept exactly as stored and nothing was checked.
					</p>
					<pre class="prov-raw">{JSON.stringify(read.clavis, null, 2)}</pre>
				{:else if checking}
					<p class="prov-told">Reading the take's own bytes to see whether the key turns…</p>
				{:else if checkError}
					<p class="prov-shut">
						The take's bytes would not open, so nothing was verified: {checkError}
					</p>
				{:else if opening?.open}
					<p class="prov-open">
						<strong>Open.</strong>
						{opening.who.sigil}
						{opening.who.name}'s key turns for this take's own bytes — Ed25519, key
						<code>{opening.publicKey.slice(0, 12)}…</code>, claimed at
						{new Date(opening.when).toLocaleString()}.
					</p>
					<p class="prov-fine">A lok is a gate, not a cipher: nothing here was ever hidden.</p>
				{:else if opening}
					<p class="prov-shut">
						<strong>Not open — {opening.why}.</strong>
						{opening.told}
					</p>
				{/if}
			</div>
		{:else if read.signet}
			<div class="prov-block">
				<span class="prov-label">The key</span>
				<p class="prov-told">
					None. This take carries a seal and no lock — the hand is named, and nothing proves it was
					that hand. That is the honest reading, and it is what a take sealed on a device with no key
					says about itself.
				</p>
			</div>
		{/if}

		{#if split}
			<div class="prov-block">
				<span class="prov-label">The contributors</span>
				{#if Array.isArray(split.parts) && split.parts.length > 0}
					<ul class="parts">
						{#each split.parts as p, i (i)}
							<li class="part">
								<span class="part-who">{partName(p)}</span>
								<span class="part-role">{p.role ?? ''}</span>
								<span class="part-share">an equal share</span>
								<span class="part-consent" class:given={!!p.consent?.at}>
									{p.consent?.at ? `opted in ${new Date(p.consent.at).toLocaleDateString()}` : 'awaiting consent'}
								</span>
							</li>
						{/each}
					</ul>
					<p class="prov-told">
						{verdict?.count ?? 0}
						{(verdict?.count ?? 0) === 1 ? 'contributor' : 'contributors'} — the artist's share
						divided equally, regardless of role. No ranking, no percentage shares.
						{#if verdict && !verdict.ok}
							<span class="prov-shut">Faults: {verdict.faults.join(' · ')} — told, and left exactly as declared.</span>
						{/if}
					</p>
					{#if legacyWeighted}
						<p class="prov-told prov-shut">
							This take was sealed before the ruling and carries a weighting on its
							contributors. It is kept exactly as it was written and it is not read: the share
							is equal.
						</p>
					{/if}
					{#if yeses}
						<p class="prov-told" class:prov-open={yeses.all}>
							{yeses.told[0]}
						</p>
					{/if}
					<p class="prov-fine">
						Opt-in always: "no force or deceptive theft." This is a description of shares, never a
						promise of money — nothing in this app moves a cent.
					</p>
				{:else}
					<p class="prov-told">A list with nobody on it. It apportions nothing, and is shown rather than hidden.</p>
				{/if}
			</div>
		{/if}

		{#if otherKeys.length > 0}
			<div class="prov-block">
				<span class="prov-label">Also carried</span>
				<p class="prov-told">
					Keys this room does not read, kept whole: {otherKeys.join(' · ')}.
				</p>
				<pre class="prov-raw">{JSON.stringify(read.other, null, 2)}</pre>
			</div>
		{/if}
	{/if}
</section>

<style>
	.prov {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		padding: 0.75rem 0.9rem;
		border: 1px solid var(--border-color);
		border-radius: 10px;
		background: var(--bg);
	}

	.prov-head {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text);
	}

	.prov-block {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.prov-label {
		font-size: 0.7rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.prov-told,
	.prov-none,
	.prov-open,
	.prov-shut,
	.prov-fine {
		margin: 0;
		font-size: 0.8rem;
		line-height: 1.45;
		color: var(--text-secondary);
	}

	.prov-none {
		color: var(--text-muted);
	}

	.prov-open {
		color: #2ecc71;
	}

	.prov-shut {
		color: #e17055;
	}

	.prov-fine {
		font-size: 0.72rem;
		color: var(--text-muted);
	}

	.sigil {
		font-size: 1rem;
	}

	.prov-raw {
		margin: 0;
		padding: 0.5rem 0.6rem;
		border-radius: 8px;
		border: 1px solid var(--border-color);
		background: var(--bg-surface);
		color: var(--text-muted);
		font-size: 0.72rem;
		white-space: pre-wrap;
		word-break: break-word;
		max-height: 12rem;
		overflow: auto;
	}

	code {
		font-size: 0.72rem;
		word-break: break-all;
	}

	.parts {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.part {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
		color: var(--text);
	}

	.part-who {
		font-weight: 600;
	}

	.part-role,
	.part-share {
		color: var(--text-muted);
		font-size: 0.75rem;
	}

	.part-consent {
		margin-left: auto;
		font-size: 0.72rem;
		color: #e1a055;
	}

	.part-consent.given {
		color: #2ecc71;
	}
</style>
