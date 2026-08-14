import { browser } from '$app/environment';
import { getDb, generateId } from '$lib/stores/db';
import type { Feeling } from '$lib/types/types';

// The feeling log — retargeted from the Echoes journal this body was mirrored
// from, and it is NOT a leftover feature. KP's ⚛ words the day it landed:
//
//   "logging how we feel during a moment is the base of all we do, self
//    understanding and understanding oportunities abound"
//   "it is how we discover our values and internal core interests, which help
//    us align with ourselves"
//   "humans and tech need this as money becomes irrelevent"
//
// A feeling hangs on a work, on a take, or on neither — his ruling, "yes both",
// plus the honest third case: a feeling in the room belongs to nobody and is
// still worth keeping.
//
// A POSITION inside a take is not this store's to keep: that is
// `the-moment-marks`, append-only by its own law, living in a `.marks.json`
// sidecar rather than in this database.
//
// The two are JOINED BY A GESTURE and not by a table (Phase 3 Wave 3,
// 2026-08-13, an **Opus** hand), at KP's ⚛ ruling: "moment marks should be able
// to trigger a new mood event when a mark is created. a quick log of emoji in
// the moment is the capture." The marks rail calls `addFeeling` here with the
// face the artist just pinned. Nothing about this store changed to allow it —
// the row it writes is an ordinary feeling on a take, and the moment it came
// from stays where moments live, in the sidecar.

// Personal emoji definitions — the folksonomy layer of the Resonance Grammar.
// Same key convention as Compass and Echoes so the pattern is defined once.
const PERSONAL_DEF_PREFIX = 'emoji_def_';

const COLS =
	'id, work_id, take_file_name, name, sense, subcategory, emoji, note, intensity, timestamp, created_at';

let feelings = $state<Feeling[]>([]);
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

function rowToFeeling(row: Record<string, unknown>): Feeling {
	return {
		id: row.id as string,
		workId: row.work_id != null ? (row.work_id as string) : undefined,
		takeFileName: row.take_file_name != null ? (row.take_file_name as string) : undefined,
		name: row.name as string,
		sense: row.sense as string,
		subcategory: row.subcategory as string,
		emoji: row.emoji as string,
		note: row.note != null ? (row.note as string) : undefined,
		intensity: row.intensity as number,
		timestamp: row.timestamp as number,
		createdAt: row.created_at as number
	};
}

async function initDB() {
	const db = await getDb();
	if (!db) return;
	try {
		await loadFeelings();
		loadPersonalDefinitions();
		dbError = null;
	} catch (e) {
		dbError = e instanceof Error ? e.message : String(e);
		console.error('[feelingStore] initDB failed:', e);
	}
}

async function loadFeelings(limit = 200, offset = 0) {
	const db = await getDb();
	if (!db) return;
	loading = true;
	try {
		const rows = await db.select<Record<string, unknown>[]>(
			'SELECT * FROM feelings ORDER BY timestamp DESC LIMIT $1 OFFSET $2',
			[limit, offset]
		);
		feelings = rows.map(rowToFeeling);
		const countRows = await db.select<Record<string, unknown>[]>(
			'SELECT COUNT(*) as count FROM feelings'
		);
		totalCount = (countRows[0]?.count as number) || 0;
	} catch (e) {
		console.error('[feelingStore] loadFeelings failed:', e);
	} finally {
		loading = false;
	}
}

async function addFeeling(feeling: Omit<Feeling, 'id' | 'createdAt'>) {
	const db = await getDb();
	if (!db) throw new Error('Database not ready — close and reopen the app.');
	const id = generateId();
	const createdAt = Date.now();
	try {
		await db.execute(
			`INSERT INTO feelings (${COLS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			[
				id,
				feeling.workId ?? null,
				feeling.takeFileName ?? null,
				feeling.name,
				feeling.sense,
				feeling.subcategory,
				feeling.emoji,
				feeling.note ?? null,
				feeling.intensity,
				feeling.timestamp,
				createdAt
			]
		);
	} catch (e) {
		console.error('[feelingStore] addFeeling failed:', e);
		throw e;
	}
	await loadFeelings();
}

async function updateFeeling(id: string, updates: Partial<Omit<Feeling, 'id' | 'createdAt'>>) {
	const db = await getDb();
	if (!db) return;
	const existing = feelings.find((f) => f.id === id);
	if (!existing) return;
	const u = { ...existing, ...updates };
	await db.execute(
		'UPDATE feelings SET work_id=$1, take_file_name=$2, name=$3, sense=$4, subcategory=$5, emoji=$6, note=$7, intensity=$8, timestamp=$9 WHERE id=$10',
		[
			u.workId ?? null,
			u.takeFileName ?? null,
			u.name,
			u.sense,
			u.subcategory,
			u.emoji,
			u.note ?? null,
			u.intensity,
			u.timestamp,
			id
		]
	);
	await loadFeelings();
}

async function getAllFeelings(): Promise<Feeling[]> {
	// Export must NEVER serialise the loaded page — `feelings` only ever holds
	// one page (LIMIT 200) while Settings shows the true COUNT(*). This walks
	// the database itself, unbounded. Throws rather than returning []: a silent
	// partial export is the exact wound this closes. (Inherited fix, kept.)
	const db = await getDb();
	if (!db) throw new Error('Database not ready — nothing was exported');
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM feelings ORDER BY timestamp DESC'
	);
	return rows.map(rowToFeeling);
}

async function importFeelings(incoming: Feeling[]): Promise<{ added: number; skipped: number }> {
	// NON-DESTRUCTIVE by law — INSERT OR IGNORE keyed on id, so importing on
	// top of live data can only ever add; nothing existing is touched.
	const db = await getDb();
	if (!db) throw new Error('Database not ready — nothing was imported');
	let added = 0;
	let skipped = 0;
	for (const f of incoming) {
		const res = await db.execute(
			`INSERT OR IGNORE INTO feelings (${COLS}) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
			[
				f.id,
				f.workId ?? null,
				f.takeFileName ?? null,
				f.name,
				f.sense,
				f.subcategory ?? 'custom',
				f.emoji,
				f.note ?? null,
				f.intensity,
				f.timestamp,
				f.createdAt ?? Date.now()
			]
		);
		if ((res as { rowsAffected?: number }).rowsAffected) added++;
		else skipped++;
	}
	await loadFeelings();
	return { added, skipped };
}

async function getFeelingsBySense(senseId: string): Promise<Feeling[]> {
	const db = await getDb();
	if (!db) return [];
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM feelings WHERE sense = $1 ORDER BY timestamp DESC',
		[senseId]
	);
	return rows.map(rowToFeeling);
}

async function getFeelingsByEmoji(emoji: string): Promise<Feeling[]> {
	const db = await getDb();
	if (!db) return [];
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM feelings WHERE emoji = $1 ORDER BY timestamp DESC',
		[emoji]
	);
	return rows.map(rowToFeeling);
}

// The two doors the instrument itself will use: what was felt about a work,
// and what was felt about one attempt at it.
async function getFeelingsForWork(workId: string): Promise<Feeling[]> {
	const db = await getDb();
	if (!db) return [];
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM feelings WHERE work_id = $1 ORDER BY timestamp DESC',
		[workId]
	);
	return rows.map(rowToFeeling);
}

async function getFeelingsForTake(fileName: string): Promise<Feeling[]> {
	const db = await getDb();
	if (!db) return [];
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM feelings WHERE take_file_name = $1 ORDER BY timestamp DESC',
		[fileName]
	);
	return rows.map(rowToFeeling);
}

async function searchFeelings(query: string, limit = 50): Promise<Feeling[]> {
	const db = await getDb();
	if (!db) return [];
	const pattern = `%${query}%`;
	const rows = await db.select<Record<string, unknown>[]>(
		'SELECT * FROM feelings WHERE name LIKE $1 OR note LIKE $1 ORDER BY timestamp DESC LIMIT $2',
		[pattern, limit]
	);
	return rows.map(rowToFeeling);
}

async function purgeAll() {
	// Throws instead of returning silently so the purge surface can tell the
	// vessel when nothing was actually deleted.
	const db = await getDb();
	if (!db) throw new Error('Database not ready — nothing was purged');
	await db.execute('DELETE FROM feelings');
	feelings = [];
	totalCount = 0;
}

export const feelingStore = {
	get feelings() {
		return feelings;
	},
	get totalCount() {
		return totalCount;
	},
	get loading() {
		return loading;
	},
	get dbError() {
		return dbError;
	},
	get personalDefinitions() {
		return personalDefinitions;
	},
	initDB,
	addFeeling,
	updateFeeling,
	loadFeelings,
	getAllFeelings,
	importFeelings,
	getFeelingsBySense,
	getFeelingsByEmoji,
	getFeelingsForWork,
	getFeelingsForTake,
	searchFeelings,
	purgeAll,
	loadPersonalDefinitions,
	setPersonalDefinition,
	getPersonalDefinition
};
