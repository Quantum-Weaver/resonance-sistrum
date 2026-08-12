use tauri_plugin_sql::{Migration, MigrationKind};

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Welcome to Resonance Sistrum, {}.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // The domain, at KP's ⚛ ruling 2026-08-12: "yes, works, takes, feelings,
    // moment-marks, release" — and the release lives in resonance-khoros, not
    // here, so there is no releases table.
    //
    // The nouns are the house's own. `work` is the-release-model's word ("a
    // release references works, never absorbs them"); `take` is the-recorder's;
    // `feeling` is the retargeted Echoes journal, which KP names as the base of
    // the whole thing rather than a feature: "logging how we feel during a
    // moment is the base of all we do... it is how we discover our values and
    // internal core interests, which help us align with ourselves."
    //
    // Echoes' own three migrations were NOT carried. They are another app's
    // history; this body was mirrored from it and owes it no schema. Nothing was
    // lost: no data existed when this ran, and the file name changed with it.
    let migrations = vec![Migration {
        version: 1,
        description: "sistrum_domain_works_takes_feelings",
        sql: "
            CREATE TABLE IF NOT EXISTS works (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                note TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_works_updated ON works(updated_at);

            CREATE TABLE IF NOT EXISTS takes (
                file_name TEXT PRIMARY KEY,
                work_id TEXT,
                name TEXT,
                note TEXT,
                seconds REAL,
                sample_rate INTEGER,
                channels INTEGER,
                provenance TEXT,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_takes_work ON takes(work_id);
            CREATE INDEX IF NOT EXISTS idx_takes_created ON takes(created_at);

            CREATE TABLE IF NOT EXISTS feelings (
                id TEXT PRIMARY KEY,
                work_id TEXT,
                take_file_name TEXT,
                name TEXT NOT NULL,
                sense TEXT NOT NULL DEFAULT 'other',
                subcategory TEXT NOT NULL DEFAULT 'custom',
                emoji TEXT NOT NULL DEFAULT '',
                note TEXT,
                intensity INTEGER NOT NULL DEFAULT 3,
                timestamp INTEGER NOT NULL,
                created_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_feelings_timestamp ON feelings(timestamp);
            CREATE INDEX IF NOT EXISTS idx_feelings_sense ON feelings(sense);
            CREATE INDEX IF NOT EXISTS idx_feelings_work ON feelings(work_id);
            CREATE INDEX IF NOT EXISTS idx_feelings_take ON feelings(take_file_name);
        ",
        kind: MigrationKind::Up,
    }];

    // ── takes.provenance — the held place, KP's ⚛ ruling ──────────────────
    //
    // "none of that belongs in the recorder, the recorder db structure simply
    //  requires a jsonb column to handle the expected use case, the colum will
    //  come to life when reeady" — and, a breath later: "i meant json"
    //
    // The use case it is held for, in his words: every musician in a band or an
    // orchestra records their part SOVEREIGNLY, an engineer finishes the
    // project, and all credentials combine so the Sanctuary system can pay
    // everyone involved no matter how small the role — regardless of the
    // project's size or shape. Opt-in always: "no force or deceptive theft."
    //
    // So this column will carry the signed hand that made the take and the
    // GRANT that travels with it. Three of its four pieces already exist as
    // waters: `the-signet` (identity as a snapshot, never a reference; combined
    // authorship read out by deriveLegend), `the-envelope` (versioned carrier,
    // import non-destructive by law), `the-moment-marks` (structure shared,
    // contents sovereign). The two that do NOT exist yet are the ones money
    // requires: a verifiable credential — the signet says plainly of itself
    // "a seal, not a lock... if a door ever needs a lock, that is a different
    // tool and it should say so" — and the splits.
    //
    // Until then: a TEXT column holding JSON, read with json_extract().
    // NOTHING in this repo writes it, nothing validates it, and nothing may
    // drop it — whatever a hand puts here rides whole. It is a held place, and
    // it comes to life when ready.

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:sistrum.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running Resonance Sistrum");
}
