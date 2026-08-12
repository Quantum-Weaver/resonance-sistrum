import Database from '@tauri-apps/plugin-sql';
import { browser } from '$app/environment';
import type { Echo } from '$lib/types/types';

// Personal emoji definitions — the folksonomy layer of the Resonance Grammar.
// Same key convention as Compass so the pattern is defined once, everywhere.
const PERSONAL_DEF_PREFIX = 'emoji_def_';

let db: Database | null = null;
let echoes = $state<Echo[]>([]);
let totalCount = $state(0);
let loading = $state(false);
let dbError = $state<string | null>(null);
let personalDefinitions = $state<Record<string, string>>({});

function loadPersonalDefinitions() {
	if (!browser) return;
	const loaded: Record<string, string> = {};
	try {
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith(PERSONAL_DEF_PREFIX)) {
				const emoji = key.slice(PERSONAL_DEF_PREFIX.length);
				const val = localStorage.getItem(key);
				if (val) loaded[emoji] = val;
			}
		}
	} catch {}
	personalDefinitions = loaded;
}

function setPersonalDefinition(emoji: string, definition: string) {
	try {
		localStorage.setItem(`${PERSONAL_DEF_PREFIX}${emoji}`, definition);
		personalDefinitions = { ...personalDefinitions, [emoji]: definition };
	} catch {}
}

function getPersonalDefinition(emoji: string): string {
	return personalDefinitions[emoji] ?? '';
}

function generateId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID();
	}
	// Fallback for Android WebViews that predate randomUUID
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
		const r = (Math.random() * 16) | 0;
		const v = c === 'x' ? r : (r & 0x3) | 0x8;
		return v.toString(16);
	});
}

function rowToEcho(row: Record<string, unknown>): Echo {
	return {
		id: row.id as string,
		name: row.name as string,
		sense: row.sense as string,
		subcategory: row.subcategory as string,
		emoji: row.emoji as string,
		note: row.note != null ? (row.note as string) : undefined,
		intensity: row.intensity as number,
		timestamp: row.timestamp as number,
		createdAt: row.created_at as number,
	};
}

async function initDB() {
	if (!browser || db) return;
	try {
		db = await Database.load('sqlite:echoes.db');
		await loadEchoes();
		loadPersonalDefinitions();
	} catch (e) {
		const msg = e instanceof Error ? e.message : String(e);
		dbError = msg;
		console.error('[echoStore] initDB failed:', e);
	}
}

async function loadEchoes(limit = 200, offset = 0) {
	if (!db) return;
	loading = true;
	try {
		const rows = await db.select<Record<string, unknown>[]>(
			'SELECT * FROM echoes ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
			[limit, offset]
		);
		echoes = rows.map(rowToEcho);
		const countRows = await db.select<Record<string, unknown>[]>(
			'SELECT COUNT(*) as count FROM echoes'
		);
		totalCount = (countRows[0]?.count as number) || 0;
	} catch (e) {
		console.error('[echoStore] loadEchoes failed:', e);
	} finally {
		loading = false;
	}
}

async function addEcho(echo: Omit<Echo, 'id' | 'createdAt'>) {
	if (!db) {
		throw new Error('Database not ready — close and reopen the app.');
	}
	const id = generateId();
	const createdAt = Date.now();
	try {
		await db.execute(
			'INSERT INTO echoes (id, name, sense, subcategory, emoji, note, intensity, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
			[id, echo.name, echo.sense, echo.subcategory, echo.emoji, echo.note ?? null, echo.intensity, echo.timestamp, createdAt]
		);
	} catch (e) {
		console.error('[echoStore] addEcho failed:', e);
		throw e;
	}
	await loadEchoes();
}

async function getAllEchoes(): Promise<Echo[]> {
	// E1 (B4) fix: export must NEVER serialise the loaded page — `echoes`
	// only ever holds one page (LIMIT 200), while Settings shows the true
	// COUNT(*). This walks the database itself, unbounded, so the file
	// carries everything the count promises. Throws rather than returning
	// [] — a silent partial export is the exact wound this closes.
	if (!db) throw new Error('Database not ready — nothing was exported');
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM echoes ORDER BY timestamp DESC'
	);
	return rows.map(rowToEcho);
}

async function importEchoes(incoming: Echo[]): Promise<{ added: number; skipped: number }> {
	// E4 (B6): the other half of the round-trip. NON-DESTRUCTIVE by law —
	// INSERT OR IGNORE keyed on id, so importing on top of live data can
	// only ever add; nothing existing is touched. Throws on a null db for
	// the same reason everything here does: silence is the worse failure.
	if (!db) throw new Error('Database not ready — nothing was imported');
	let added = 0;
	let skipped = 0;
	for (const e of incoming) {
		const res = await db.execute(
			'INSERT OR IGNORE INTO echoes (id, name, sense, subcategory, emoji, note, intensity, timestamp, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
			[e.id, e.name, e.sense, e.subcategory ?? '', e.emoji, e.note ?? null, e.intensity, e.timestamp, e.createdAt ?? Date.now()]
		);
		if ((res as { rowsAffected?: number }).rowsAffected) added++;
		else skipped++;
	}
	await loadEchoes();
	return { added, skipped };
}

async function getEchoesBySense(senseId: string): Promise<Echo[]> {
	if (!db) return [];
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM echoes WHERE sense = $1 ORDER BY timestamp DESC',
		[senseId]
	);
	return rows.map(rowToEcho);
}

async function getEchoesByEmoji(emoji: string): Promise<Echo[]> {
	if (!db) return [];
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM echoes WHERE emoji = $1 ORDER BY timestamp DESC',
		[emoji]
	);
	return rows.map(rowToEcho);
}

async function searchEchoes(query: string, limit = 50): Promise<Echo[]> {
	if (!db) return [];
	const pattern = `%${query}%`;
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM echoes WHERE name LIKE $1 OR note LIKE $1 ORDER BY timestamp DESC LIMIT $2',
		[pattern, limit]
	);
	return rows.map(rowToEcho);
}

async function updateEcho(id: string, updates: Partial<Omit<Echo, 'id' | 'createdAt'>>) {
	if (!db) return;
	const echo = echoes.find(e => e.id === id);
	if (!echo) return;
	const updated = { ...echo, ...updates };
	await db.execute(
		'UPDATE echoes SET name=$1, sense=$2, subcategory=$3, emoji=$4, note=$5, intensity=$6, timestamp=$7 WHERE id=$8',
		[updated.name, updated.sense, updated.subcategory, updated.emoji, updated.note ?? null, updated.intensity, updated.timestamp, id]
	);
	await loadEchoes();
}

async function purgeAll() {
	// Throws instead of returning silently so the purge UI can tell the vessel
	// when nothing was actually deleted (Compass pattern).
	if (!db) throw new Error('Database not ready — nothing was purged');
	await db.execute('DELETE FROM echoes');
	echoes = [];
	totalCount = 0;
}

export const echoStore = {
	get echoes() { return echoes; },
	get totalCount() { return totalCount; },
	get loading() { return loading; },
	get dbError() { return dbError; },
	get personalDefinitions() { return personalDefinitions; },
	initDB,
	addEcho,
	updateEcho,
	loadEchoes,
	getAllEchoes,
	importEchoes,
	getEchoesBySense,
	getEchoesByEmoji,
	searchEchoes,
	purgeAll,
	loadPersonalDefinitions,
	setPersonalDefinition,
	getPersonalDefinition,
};
