import { getDb } from '$lib/stores/db';
import type { Take } from '$lib/types/types';

// Take rows — the MEANING around the files, never a copy of them.
//
// `the-recorder` owns the takes directory and reads each WAV's own header:
// `list_takes` is the truth about what exists, how long it is, and at what
// sample rate. This table adds only what a file cannot hold — which work an
// attempt belongs to, what it was called, what was thought about it.
//
// Two laws ride here from resonance-khoros' catalogue, and they are why a take
// is keyed by its file name and nothing is ever merged automatically:
//   "same title + different duration = DIFFERENT RECORDING. Keep both."
//   "ambiguous pairs return to the artist" — where a machine cannot know, it
//   asks the person whose work it is. It does not guess, and it does not
//   quietly pick one.
// So nothing in this store ever infers a take's work. A hand says so.

let takes = $state<Take[]>([]);
let loading = $state(false);
let dbError = $state<string | null>(null);

// The held place rides WHOLE. Unreadable json comes back as the raw string
// rather than being dropped or nulled: nothing in this repo may lose what a
// hand put in that column, and a parse failure is not permission to discard.
function parseProvenance(raw: unknown): unknown {
	if (raw == null) return undefined;
	if (typeof raw !== 'string') return raw;
	try {
		return JSON.parse(raw);
	} catch {
		return raw;
	}
}

function rowToTake(row: Record<string, unknown>): Take {
	return {
		fileName: row.file_name as string,
		workId: row.work_id != null ? (row.work_id as string) : undefined,
		name: row.name != null ? (row.name as string) : undefined,
		note: row.note != null ? (row.note as string) : undefined,
		seconds: row.seconds != null ? (row.seconds as number) : undefined,
		sampleRate: row.sample_rate != null ? (row.sample_rate as number) : undefined,
		channels: row.channels != null ? (row.channels as number) : undefined,
		provenance: parseProvenance(row.provenance),
		createdAt: row.created_at as number
	};
}

async function loadTakes() {
	const db = await getDb();
	if (!db) return;
	loading = true;
	try {
		const rows = await db.select<Record<string, unknown>[]>(
			'SELECT * FROM takes ORDER BY created_at DESC'
		);
		takes = rows.map(rowToTake);
		dbError = null;
	} catch (e) {
		dbError = e instanceof Error ? e.message : String(e);
		console.error('[takeStore] loadTakes failed:', e);
	} finally {
		loading = false;
	}
}

// Called when a take is saved. Idempotent on file_name: the recorder is the
// authority on the audio facts, so a re-record of the same name updates them
// while leaving the meaning (work, note) alone unless it is supplied.
async function upsertTake(t: Take) {
	const db = await getDb();
	if (!db) throw new Error('Database not ready — the take file is safe, its row is not written');
	await db.execute(
		`INSERT INTO takes (file_name, work_id, name, note, seconds, sample_rate, channels, provenance, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT(file_name) DO UPDATE SET
		   work_id    = COALESCE(excluded.work_id,    takes.work_id),
		   name       = COALESCE(excluded.name,       takes.name),
		   note       = COALESCE(excluded.note,       takes.note),
		   provenance = COALESCE(excluded.provenance, takes.provenance),
		   seconds = excluded.seconds,
		   sample_rate = excluded.sample_rate,
		   channels = excluded.channels`,
		[
			t.fileName,
			t.workId ?? null,
			t.name ?? null,
			t.note ?? null,
			t.seconds ?? null,
			t.sampleRate ?? null,
			t.channels ?? null,
			t.provenance != null ? JSON.stringify(t.provenance) : null,
			t.createdAt
		]
	);
	await loadTakes();
}

// A hand says which work this attempt belongs to. null unbinds it, which is a
// real answer — an attempt that turned out to be something else.
async function setTakeWork(fileName: string, workId: string | null) {
	const db = await getDb();
	if (!db) return;
	await db.execute('UPDATE takes SET work_id = $1 WHERE file_name = $2', [workId, fileName]);
	await loadTakes();
}

async function setTakeNote(fileName: string, note: string | null) {
	const db = await getDb();
	if (!db) return;
	await db.execute('UPDATE takes SET note = $1 WHERE file_name = $2', [note, fileName]);
	await loadTakes();
}

async function setTakeName(fileName: string, name: string | null) {
	const db = await getDb();
	if (!db) return;
	await db.execute('UPDATE takes SET name = $1 WHERE file_name = $2', [name, fileName]);
	await loadTakes();
}

function forWork(workId: string): Take[] {
	return takes.filter((t) => t.workId === workId);
}

function byFileName(fileName: string): Take | undefined {
	return takes.find((t) => t.fileName === fileName);
}

// Forgetting the ROW, which is not deleting the FILE. `delete_take` in the
// recorder removes audio; this only drops what we said about it.
async function forgetTakeRow(fileName: string) {
	const db = await getDb();
	if (!db) return;
	await db.execute('DELETE FROM takes WHERE file_name = $1', [fileName]);
	await loadTakes();
}

export const takeStore = {
	get takes() {
		return takes;
	},
	get loading() {
		return loading;
	},
	get dbError() {
		return dbError;
	},
	loadTakes,
	upsertTake,
	setTakeWork,
	setTakeName,
	setTakeNote,
	forWork,
	byFileName,
	forgetTakeRow
};
