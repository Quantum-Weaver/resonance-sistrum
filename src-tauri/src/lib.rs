use tauri_plugin_sql::{Migration, MigrationKind};

// The waters, consumed (Phase 3 Wave 1, 2026-08-13, an Opus hand):
//   recorder — `the-recorder`'s record verb wrapped for this body, carried
//              whole from resonance-assets/sistrum-inheritance with the S25
//              freeze fix already in it.
//   waveform — `the-waveform`'s fold and `the-player`'s bytes, adapted to a
//              stack where the samples live on disk instead of in the page.
//
// And Wave 2 (2026-08-13, an Opus hand):
//   tuner    — `the-tuner`'s YIN math called from a path crate; the capture is
//              this harness's own, because the tuner keeps nothing and no
//              existing water offers a listen-without-keeping session.
//   marks    — `the-moment-marks` worn by takes, in a `.marks.json` SIDECAR
//              beside each take's WAV and NEVER in this database (Phase 2's
//              own ruling). The append-only law is enforced at the file: the
//              only write door appends, and it refuses rather than overwrite.
//
// The metronome is the third water of this wave and it has no Rust at all —
// it is a beat clock and a Web Audio scheduler, and both belong in the window.
// THE STUDIO (2026-09-02, a Fable hand dealt by Caesura 🎻), at KP's ⚛ word:
//   studio   — `the-encoder`'s mixer called from a path crate, exactly as
//              the recorder is: a mixdown to one new take on the shelf, a
//              trim as a NEW take (the original kept), and the session
//              document as a `.session.json` sidecar beside the sound —
//              the marks' own road, nothing in this database.
//              `docs/THE-STUDIO-PLAN.md` is the brief.
mod marks;
mod media_permission;
mod recorder;
mod studio;
mod tuner;
mod waveform;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Welcome to Resonance Sistrum, {}.", name)
}

/// The microphone door.
///
/// Desktop has no runtime permission model for a local input — the platform
/// asks on its own if it asks at all, so the honest answer is yes.
///
/// ANDROID IS WIRED HERE since the microphone wave of 2026-08-20: the record
/// room and the tuner both ask this door before opening a stream, and on
/// Android it now asks the vessel through `media_permission.rs` — the
/// app-local Kotlin plugin synced into `gen/` at build time, whose init block
/// also hands cpal the JNI context its oboe backend needs (without which cpal
/// does not return an error on Android — it PANICS, which takes the app down
/// with it). Compass walked this road first; the infrastructure crossed whole.
#[tauri::command]
async fn request_mic_permission(app_handle: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(target_os = "android")]
    {
        // run_mobile_plugin blocks until the vessel answers the system dialog —
        // keep that wait off the async runtime's core threads.
        return tauri::async_runtime::spawn_blocking(move || {
            media_permission::mic_request(&app_handle)
        })
        .await
        .map_err(|e| e.to_string())?;
    }
    #[cfg(not(target_os = "android"))]
    {
        let _ = app_handle;
        Ok(true)
    }
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
    // So this column carries the signed hand that made the take and the GRANT
    // that travels with it. Three of its four pieces already existed as waters:
    // `the-signet` (identity as a snapshot, never a reference; combined
    // authorship read out by deriveLegend), `the-envelope` (versioned carrier,
    // import non-destructive by law), `the-moment-marks` (structure shared,
    // contents sovereign). The two that did NOT exist were the ones money
    // requires: a verifiable credential — the signet says plainly of itself
    // "a seal, not a lock... if a door ever needs a lock, that is a different
    // tool and it should say so" — and the splits. Both now exist.
    //
    // It stays a TEXT column holding JSON, read with json_extract(). Nothing
    // validates it, and nothing may drop it — whatever a hand puts here rides
    // whole, including json this reader cannot parse, which comes back as the
    // RAW STRING rather than as null.
    //
    // THE COLUMN CAME TO LIFE 2026-09-02, and NOTHING IN THIS FILE CHANGED to
    // let it. The whole collaboration layer arrived through the held place, in
    // the window, exactly as ruled. What a document may now hold, told rather
    // than hidden:
    //
    //   studio?   — where the sound came from. The studio room's own key on
    //               the takes IT makes: a bounce (`kind: mixdown`, the
    //               session's name and its layers), a trim (`kind: trim`, the
    //               source take and the window), an overdub (`kind: overdub`,
    //               the session and the stamped offset).
    //   signet?   — WHO, as a snapshot taken at sealing and never a reference.
    //   clavis?   — the signed hand: an Ed25519 credential over THE TAKE'S OWN
    //               BYTES, claimed with a key made on the device and held in
    //               its own IndexedDB, private half non-extractable. Verified
    //               on opening through `the-lok`, which answers open or names
    //               why not. A take sealed with no key carries `signet` alone
    //               and the room says so — a seal is NEVER blocked on a key.
    //   merismos? — the splits, in basis points summing to 10000, proposed at
    //               a mixdown from the hands the lanes name. Opt-in always:
    //               a part that has not consented is NAMED, never assumed.
    //
    // and any key a later hand puts beside them, which rides whole and is
    // shown by name. This column is not a payment rail and cannot become one:
    // a merismos is a description of shares, and nothing in this body moves a
    // cent. `src/lib/provenance.ts` is the reader; the proofs are
    // `.journals/proofs/provenance-round-trip.mjs` and `splits-from-lanes.mjs`.

    let builder = tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:sistrum.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        // The recorder's managed state. One room, one running take — the state
        // itself is what refuses a second start over a live one.
        .manage(recorder::RecorderState::default())
        // The tuner's managed state. One ear, one listening — and like the
        // recorder's, the state itself is what refuses a second start over a
        // live one, so a double tap cannot orphan a stream holding the mic.
        .manage(tuner::TunerState::default());

    // The microphone-permission bridge — Android only. Its Kotlin half hands
    // cpal the JNI context on construction; desktop has no such door and
    // never registers one (the microphone wave, 2026-08-20).
    #[cfg(target_os = "android")]
    let builder = builder.plugin(media_permission::init());

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            request_mic_permission,
            // ── The record room ──────────────────────────────────────────
            recorder::list_input_devices,
            recorder::start_recording,
            recorder::pause_recording,
            recorder::resume_recording,
            recorder::recording_status,
            recorder::stop_recording,
            recorder::list_takes,
            recorder::export_take,
            // ── The shape and the sound ──────────────────────────────────
            waveform::take_shape,
            waveform::read_take_bytes,
            // ── The tuner room (Wave 2) ──────────────────────────────────
            // Nothing listens until start_tuner is pressed; nothing it hears
            // is recorded and nothing is kept.
            tuner::start_tuner,
            tuner::stop_tuner,
            tuner::tuner_reading,
            // ── The marks sidecar (Wave 2) ───────────────────────────────
            // Note what is NOT here: there is no write and no delete. The
            // only write door appends, by law.
            marks::read_take_marks,
            marks::append_take_marks,
            marks::takes_with_marks,
            // ── The studio (2026-09-02) ──────────────────────────────────
            // A bounce and a trim each make a NEW take and never touch an
            // existing one; the session is a sidecar on the shelf.
            studio::mixdown,
            studio::trim_take,
            studio::read_session,
            studio::write_session,
            studio::list_sessions,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Resonance Sistrum");
}
