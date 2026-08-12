import { getDb, generateId } from '$lib/stores/db';
import type { Work } from '$lib/types/types';

// Works — the things being made. `the-release-model`'s own noun: "a release
// references works, never absorbs them."
//
// A work's id is a PROMISE. resonance-khoros is where a release lives (KP's ⚛
// word: "resonance-khoros will likely be where the release goes easily"), and
// it reaches back to a work by this id. So ids are generated once and never
// regenerated.

let works = $state<Work[]>([]);
let loading = $state(false);
let dbError = $state<string | null>(null);

function rowToWork(row: Record<string, unknown>): Work {
	return {
		id: row.id as string,
		title: row.title as string,
		note: row.note != null ? (row.note as string) : undefined,
		createdAt: row.created_at as number,
		updatedAt: row.updated_at as number
	};
}

async function loadWorks() {
	const db = await getDb();
	if (!db) return;
	loading = true;
	try {
		const rows = await db.select<Record<string, unknown>[]>(
			'SELECT * FROM works ORDER BY updated_at DESC'
		);
		works = rows.map(rowToWork);
		dbError = null;
	} catch (e) {
		dbError = e instanceof Error ? e.message : String(e);
		console.error('[workStore] loadWorks failed:', e);
	} finally {
		loading = false;
	}
}

async function addWork(title: string, note?: string): Promise<string> {
	const db = await getDb();
	if (!db) throw new Error('Database not ready — close and reopen the app.');
	const id = generateId();
	const now = Date.now();
	await db.execute(
		'INSERT INTO works (id, title, note, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
		[id, title, note ?? null, now, now]
	);
	await loadWorks();
	return id;
}

async function updateWork(id: string, updates: { title?: string; note?: string }) {
	const db = await getDb();
	if (!db) return;
	const existing = works.find((w) => w.id === id);
	if (!existing) return;
	const u = { ...existing, ...updates };
	await db.execute('UPDATE works SET title=$1, note=$2, updated_at=$3 WHERE id=$4', [
		u.title,
		u.note ?? null,
		Date.now(),
		id
	]);
	await loadWorks();
}

// Ungrouping, not destruction. Lose-nothing: deleting a work releases its
// takes and its feelings rather than taking them with it. The take FILES are
// never touched by this — the recorder owns the shelf, and deleting audio is a
// separate, explicit act by the hand that made it.
async function deleteWork(id: string) {
	const db = await getDb();
	if (!db) throw new Error('Database not ready — nothing was changed');
	await db.execute('UPDATE takes SET work_id = NULL WHERE work_id = $1', [id]);
	await db.execute('UPDATE feelings SET work_id = NULL WHERE work_id = $1', [id]);
	await db.execute('DELETE FROM works WHERE id = $1', [id]);
	await loadWorks();
}

function byId(id: string): Work | undefined {
	return works.find((w) => w.id === id);
}

export const workStore = {
	get works() {
		return works;
	},
	get loading() {
		return loading;
	},
	get dbError() {
		return dbError;
	},
	loadWorks,
	addWork,
	updateWork,
	deleteWork,
	byId
};
