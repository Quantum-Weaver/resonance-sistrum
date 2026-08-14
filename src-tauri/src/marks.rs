// marks.rs — the moment-marks sidecar, and the door that cannot erase.
//
// Phase 3 Wave 2 (2026-08-13, an **Opus** hand), the third movement's first
// half: `the-moment-marks` worn by takes. The water lives at
// `resonance-awen/tools/the-moment-marks` and IT WAS NOT EDITED.
//
// WHERE MARKS LIVE, and it is a ruling rather than a preference. Phase 2's
// domain table says it in its own row, verbatim: a mark lives in "a
// `.marks.json` sidecar, **never this database**." So there is no `marks`
// table, there never will be one, and this file is the whole of the storage.
// The sidecar sits beside the take's WAV on the same shelf, named for it:
// `take-1755.wav` → `take-1755.marks.json`, which is the water's own naming
// (`song.marks.json`).
//
// ── THE APPEND-ONLY LAW IS ENFORCED HERE, AT THE FILE ──────────────────────
//
// The water's first law: "APPEND-ONLY, NEVER MUTATE — an edit is a new mark
// that `revises` an old one; a removal is a mark that `retracts` one. History
// stays honest; nothing is ever erased."
//
// A `write_marks(doc)` command would keep that law only as long as every
// caller chose to. That is not a law, it is an etiquette — one buggy window,
// one bad merge, one hand-written invoke, and a timeline is gone. So THERE IS
// NO WRITE COMMAND. There is only `append_take_marks`, which:
//
//   · reads what is already on disk and keeps every entry of it, always;
//   · REFUSES to write at all if what is on disk will not parse — an
//     unreadable history is not permission to start a new one (lose-nothing);
//   · refuses an entry whose id already exists, because reusing an id is how
//     a replacement would disguise itself as an addition;
//   · appends, and writes through a temp file so a crash mid-write cannot
//     leave a half-file where a history was.
//
// There is no delete command for a sidecar either, and there must not be one.
// Retracting a mark is a mark. Losing a file is not.
//
// THE PERMANENT ROAD RULE: both commands are `async` with their bodies in
// `spawn_blocking`. They read and write files. That is the whole rule.

use serde_json::{json, Value};

use crate::recorder::take_path_guarded;

/// The sidecar beside a take. The take's own name is guarded first — the
/// no-paths-in-names rule is the recorder's and it is reused rather than
/// re-reasoned — and the sidecar is then derived from the guarded path, so it
/// can only ever land on the takes shelf.
fn marks_path(
    app_handle: &tauri::AppHandle,
    file_name: &str,
) -> Result<std::path::PathBuf, String> {
    let wav = take_path_guarded(app_handle, file_name)?;
    let stem = wav
        .file_stem()
        .and_then(|s| s.to_str())
        .ok_or_else(|| "that take has no name to hang marks on".to_string())?;
    Ok(wav.with_file_name(format!("{stem}.marks.json")))
}

/// A fresh, empty document — the water's own shape, `newDoc`'s exact fields.
/// An absent sidecar is NOT an error: a take nobody has marked yet simply has
/// no marks, and saying so plainly is the honest answer.
fn empty_doc(media: Value) -> Value {
    json!({
        "format": "moment-marks",
        "version": 1,
        "media": if media.is_object() { media } else { json!({}) },
        "marks": []
    })
}

/// Read a document from disk, or `None` when there is nothing there yet.
/// A file that exists but will not parse comes back as an error — never as
/// an empty document, which is how a history gets quietly replaced.
fn read_doc(path: &std::path::Path) -> Result<Option<Value>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let text = std::fs::read_to_string(path)
        .map_err(|e| format!("the marks would not open: {e}"))?;
    let doc: Value = serde_json::from_str(&text).map_err(|e| {
        format!(
            "the marks file will not parse ({e}) — nothing was written. \
             History is never overwritten to make room for new marks; this file \
             is still on disk exactly as it was."
        )
    })?;
    if doc.get("format").and_then(Value::as_str) != Some("moment-marks") {
        return Err("that file is not a moment-marks document — nothing was written".into());
    }
    if doc.get("marks").and_then(Value::as_array).is_none() {
        return Err("that marks document has no marks array — nothing was written".into());
    }
    Ok(Some(doc))
}

/// The water's `parseDoc` validation for one incoming entry, in the same
/// order and with the same honesty. A mark is emoji-first, pinned to a
/// position in seconds, and carries a stable id and the time it was made.
fn validate_entry(entry: &Value) -> Result<String, String> {
    let obj = entry
        .as_object()
        .ok_or_else(|| "a mark is an object".to_string())?;
    let id = obj
        .get("id")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .ok_or_else(|| "every mark carries a stable id".to_string())?;
    let at = obj
        .get("at")
        .and_then(Value::as_f64)
        .ok_or_else(|| format!("mark {id}: a moment is seconds into the timeline"))?;
    if !(at >= 0.0) {
        return Err(format!("mark {id}: a moment is seconds into the timeline"));
    }
    if obj
        .get("emoji")
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .is_none()
    {
        return Err(format!("mark {id}: a mark is emoji-first"));
    }
    if obj.get("madeAt").and_then(Value::as_str).is_none() {
        return Err(format!("mark {id}: madeAt missing"));
    }
    Ok(id.to_string())
}

/// A take's marks, whole — the honest history, not the derived view. Deriving
/// the current view is the water's own `readMarks`, and it happens in the
/// window where the water's code runs.
#[tauri::command]
pub async fn read_take_marks(
    app_handle: tauri::AppHandle,
    file_name: String,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = marks_path(&app_handle, &file_name)?;
        Ok(read_doc(&path)?.unwrap_or_else(|| empty_doc(Value::Null)))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Append entries to a take's sidecar. THE ONLY WAY MARKS ARE WRITTEN.
///
/// `entries` are already-shaped marks — an addition, a revision, or a
/// retraction, all three of which are additions to this file, which is the
/// entire point of the water's first law. `media` fills in the courtesy
/// record (title, duration) only where the stored document has none: media
/// identity that is already written is never rewritten from a window.
///
/// Returns the whole document as it now stands on disk, so the window never
/// has to guess whether its own copy is current.
#[tauri::command]
pub async fn append_take_marks(
    app_handle: tauri::AppHandle,
    file_name: String,
    media: Value,
    entries: Vec<Value>,
) -> Result<Value, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if entries.is_empty() {
            return Err("nothing to append".to_string());
        }

        let path = marks_path(&app_handle, &file_name)?;
        // Read FIRST, and refuse on a bad read. Everything that can fail
        // happens before a single byte is written — the stop-ordering lesson
        // from the recorder, worn here.
        let mut doc = read_doc(&path)?.unwrap_or_else(|| empty_doc(media.clone()));

        let existing = doc
            .get("marks")
            .and_then(Value::as_array)
            .ok_or_else(|| "that marks document has no marks array".to_string())?;
        let mut seen: std::collections::HashSet<String> = existing
            .iter()
            .filter_map(|m| m.get("id").and_then(Value::as_str).map(str::to_string))
            .collect();

        for entry in &entries {
            let id = validate_entry(entry)?;
            if !seen.insert(id.clone()) {
                // An id is an identity. A repeat would be a replacement in an
                // addition's clothes, and this file does not host those.
                return Err(format!(
                    "mark {id} is already in this history — an id is an identity, \
                     and history is append-only. Nothing was written."
                ));
            }
        }

        // The courtesy record, filled in only where it is empty.
        if let Some(incoming) = media.as_object() {
            let stored = doc
                .get_mut("media")
                .and_then(Value::as_object_mut)
                .ok_or_else(|| "that marks document has no media record".to_string())?;
            for (k, v) in incoming {
                // The local path never travels and is never stored — the
                // water's third law. The shelf knows where the take is.
                if k == "path" {
                    continue;
                }
                stored.entry(k.clone()).or_insert_with(|| v.clone());
            }
        }

        let marks = doc
            .get_mut("marks")
            .and_then(Value::as_array_mut)
            .ok_or_else(|| "that marks document has no marks array".to_string())?;
        marks.extend(entries);

        // Written through a temp file and renamed over: a crash halfway
        // through cannot leave a truncated history where a whole one was.
        // (`fs::rename` replaces an existing file on every platform this app
        // runs on.)
        let text = serde_json::to_string_pretty(&doc)
            .map_err(|e| format!("the marks would not serialize: {e}"))?;
        let tmp = path.with_extension("json.writing");
        std::fs::write(&tmp, text.as_bytes())
            .map_err(|e| format!("the marks would not write: {e}"))?;
        std::fs::rename(&tmp, &path).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            format!("the marks would not land: {e}")
        })?;

        Ok(doc)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Which takes on the shelf carry marks. One directory read, no file opened —
/// enough for the shelf to show a take wears marks without reading anybody's
/// history to find out.
#[tauri::command]
pub async fn takes_with_marks(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = crate::recorder::takes_dir(&app_handle)?;
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();
            if let Some(stem) = name.strip_suffix(".marks.json") {
                out.push(format!("{stem}.wav"));
            }
        }
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())?
}
