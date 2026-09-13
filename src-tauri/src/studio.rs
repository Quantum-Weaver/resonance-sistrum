// studio.rs — the multi-track room's engine tail.
//
// THE STUDIO (2026-09-02, a Fable hand dealt by Caesura 🎻), at KP's ⚛ word,
// verbatim, spelling kept: "sistrum will now need a multi tract studio for
// mixing and layering recorded tracks." The plan is `docs/THE-STUDIO-PLAN.md`;
// this file is its movements 1 (the encoder crosses), 2 (the session on disk)
// and 7 (trim as a NEW take), the three that touch the filesystem.
//
// The mixer itself is the spring's — `the-encoder`, consumed as a path crate
// from resonance-awen exactly as the-recorder is, and NOT EDITED. What lives
// here is the tauri harness only: shelf-guarded names in, files on the takes
// shelf out, honest reports to the room.
//
// THE ENCODER'S CONTRACT STANDS (the plan's §4.2): 44.1 kHz stereo 16-bit WAV
// out, whatever the takes' own rate. Layers are summed without normalization
// and clamped at the writer; offsets are forward only; every layer is decoded
// whole into memory. A mix of long takes is a lot of RAM, and that is the
// encoder's honest shape, not hidden here.
//
// LOSE-NOTHING, at the file: a bounce or a trim NEVER lands on a name that is
// already on the shelf — the name is suffixed until it is free. Nothing in
// this module deletes, moves, or overwrites a take. The session document is
// the one file that is rewritten, and it is the musician's own working state,
// written through a temp file and renamed over so a crash cannot leave half
// a session where a whole one was.
//
// THE PERMANENT ROAD RULE: every command here is `async` with its body in
// `spawn_blocking`. They read and write files. A mixdown decodes and sums
// every layer — seconds of CPU for minutes of audio — and that is exactly the
// work that must never run on the thread the WebView needs.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::{Path, PathBuf};
use the_encoder::{decode_window, mix_layers, write_wav, LayerSpec, CHANNELS, SAMPLE_RATE};

use crate::recorder::{safe_name, take_path_guarded, takes_dir};

/// One lane as the window sends it: a take BY NAME on the shelf (never a
/// path — the guard is the recorder's), and where and how it sits in the mix.
#[derive(Deserialize, Clone)]
pub struct Layer {
    pub file_name: String,
    /// Seconds from the mix's own zero. The encoder offsets forward only, so
    /// a negative offset is clamped to zero here and said so in the report.
    pub offset_secs: f64,
    /// 0..2, the encoder's own range — 1 is unity.
    pub volume: f64,
    /// -1 (left) .. 1 (right).
    pub pan: f64,
    #[serde(default)]
    pub fade_in: f64,
    #[serde(default)]
    pub fade_out: f64,
}

/// What a bounce or a trim reports back: the new take, exactly as
/// `list_takes` would describe it, so the room can register it as a row
/// without reading the shelf again.
#[derive(Serialize)]
pub struct NewTake {
    pub file_name: String,
    pub path: String,
    pub seconds: f64,
    pub sample_rate: u32,
    pub channels: u16,
    pub created_at: u64,
    /// Layers whose offset was clamped from negative to zero, by name. Empty
    /// when nothing was moved. Told, never silently done.
    pub clamped: Vec<String>,
}

fn now_secs() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

/// A name that is not yet on the shelf. `base` is already safe. The first
/// free of `base.wav`, `base-2.wav`, `base-3.wav`… — a bounce never lands
/// on an existing take, whatever it was asked to be called.
fn free_wav_name(dir: &Path, base: &str) -> String {
    let first = format!("{base}.wav");
    if !dir.join(&first).exists() {
        return first;
    }
    let mut n = 2u32;
    loop {
        let candidate = format!("{base}-{n}.wav");
        if !dir.join(&candidate).exists() {
            return candidate;
        }
        n += 1;
    }
}

/// The pure heart of a bounce, kept free of tauri so it can be proven
/// without a window: layers whose paths are ALREADY resolved and guarded,
/// mixed by the encoder, written to `out`. Returns frames written.
pub fn bounce_to(layers: &[LayerSpec], out: &Path) -> Result<usize, String> {
    if layers.is_empty() {
        return Err("a mixdown needs at least one lane".into());
    }
    let master = mix_layers(layers)?;
    write_wav(out, &master)?;
    Ok(master.len() / CHANNELS as usize)
}

/// Resolve the window's lanes to the encoder's specs. Names are guarded to
/// the shelf; offsets below zero are clamped and their names returned.
fn resolve_layers(
    app_handle: &tauri::AppHandle,
    layers: &[Layer],
) -> Result<(Vec<LayerSpec>, Vec<String>), String> {
    let mut specs = Vec::with_capacity(layers.len());
    let mut clamped = Vec::new();
    for l in layers {
        let path = take_path_guarded(app_handle, &l.file_name)?;
        if !path.exists() {
            return Err(format!("{} is not on the shelf", l.file_name));
        }
        if l.offset_secs < 0.0 {
            clamped.push(l.file_name.clone());
        }
        specs.push(LayerSpec {
            path: path.to_string_lossy().to_string(),
            offset_secs: l.offset_secs.max(0.0),
            volume: l.volume.clamp(0.0, 2.0),
            pan: l.pan.clamp(-1.0, 1.0),
            fade_in: l.fade_in.max(0.0),
            fade_out: l.fade_out.max(0.0),
        });
    }
    Ok((specs, clamped))
}

/// Mix N lanes to one new take on the shelf. The bounce is a take like any
/// other from here on — it plays, wears marks, exports — and the lanes it
/// was made from are untouched. `name` is optional; `mix-<epoch>` otherwise.
#[tauri::command]
pub async fn mixdown(
    app_handle: tauri::AppHandle,
    name: Option<String>,
    layers: Vec<Layer>,
) -> Result<NewTake, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = takes_dir(&app_handle)?;
        let base = name
            .map(|n| safe_name(&n))
            .filter(|n| !n.is_empty())
            .unwrap_or_else(|| format!("mix-{}", now_secs()));
        let file_name = free_wav_name(&dir, &base);
        let out = dir.join(&file_name);

        let (specs, clamped) = resolve_layers(&app_handle, &layers)?;
        let frames = bounce_to(&specs, &out)?;

        Ok(NewTake {
            file_name,
            path: out.to_string_lossy().to_string(),
            seconds: frames as f64 / SAMPLE_RATE as f64,
            sample_rate: SAMPLE_RATE,
            channels: CHANNELS,
            created_at: now_secs(),
            clamped,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Cut a window out of a take into a NEW take. The original is kept, always
/// — the plan's §4.3, verbatim: "a trim would be a NEW take, the original
/// kept." `end_secs <= start_secs` means to the end of the take. The cut
/// leaves through the encoder, so it wears the encoder's contract (44.1 kHz
/// stereo) whatever the source was.
#[tauri::command]
pub async fn trim_take(
    app_handle: tauri::AppHandle,
    file_name: String,
    start_secs: f64,
    end_secs: f64,
    name: Option<String>,
) -> Result<NewTake, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let src = take_path_guarded(&app_handle, &file_name)?;
        if !src.exists() {
            return Err(format!("{file_name} is not on the shelf"));
        }
        if start_secs < 0.0 {
            return Err("a trim starts at or after zero".into());
        }
        let dir = takes_dir(&app_handle)?;
        let stem = src
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("take")
            .to_string();
        let base = name
            .map(|n| safe_name(&n))
            .filter(|n| !n.is_empty())
            .unwrap_or_else(|| {
                let tail = if end_secs > start_secs {
                    format!("{start_secs:.1}-{end_secs:.1}")
                } else {
                    format!("{start_secs:.1}-end")
                };
                safe_name(&format!("{stem}-trim-{tail}"))
            });
        let out_name = free_wav_name(&dir, &base);
        let out = dir.join(&out_name);

        let samples = decode_window(&src.to_string_lossy(), start_secs, end_secs)?;
        write_wav(&out, &samples)?;
        let frames = samples.len() / CHANNELS as usize;

        Ok(NewTake {
            file_name: out_name,
            path: out.to_string_lossy().to_string(),
            seconds: frames as f64 / SAMPLE_RATE as f64,
            sample_rate: SAMPLE_RATE,
            channels: CHANNELS,
            created_at: now_secs(),
            clamped: Vec::new(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ── A take the window made (repair, splice, punch-in) ───────────────────────
//
// Repair and splice are typed-array work in the window, on samples Web Audio
// already decoded there (`src/lib/repair.ts`, `src/lib/splice.ts`). What lands
// here is the finished WAV, base64 across the IPC because Android's invoke
// carries no raw body. This door WRITES A NEW TAKE AND NOTHING ELSE: the take
// it was made from is untouched, and the name is suffixed until it is free.

/// Base64 to bytes, standard alphabet, padding and line breaks tolerated.
fn from_base64(text: &str) -> Result<Vec<u8>, String> {
    let mut out = Vec::with_capacity(text.len() / 4 * 3);
    let mut acc: u32 = 0;
    let mut bits: u32 = 0;
    for c in text.bytes() {
        let value = match c {
            b'A'..=b'Z' => c - b'A',
            b'a'..=b'z' => c - b'a' + 26,
            b'0'..=b'9' => c - b'0' + 52,
            b'+' => 62,
            b'/' => 63,
            b'=' => break,
            b'\r' | b'\n' => continue,
            _ => return Err("the take's bytes did not arrive as base64".into()),
        } as u32;
        acc = (acc << 6) | value;
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push(((acc >> bits) & 0xff) as u8);
        }
    }
    Ok(out)
}

/// Land WAV bytes made in the window as a NEW take on the shelf. The header is
/// read back before anything is written, so nothing lands that will not open.
#[tauri::command]
pub async fn write_take_wav(
    app_handle: tauri::AppHandle,
    name: Option<String>,
    wav_base64: String,
) -> Result<NewTake, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let bytes = from_base64(&wav_base64)?;
        let (sample_rate, channels, frames) = {
            let reader = hound::WavReader::new(std::io::Cursor::new(&bytes))
                .map_err(|e| format!("those bytes are not a WAV: {e}"))?;
            let spec = reader.spec();
            (spec.sample_rate, spec.channels, reader.duration())
        };
        if sample_rate == 0 || channels == 0 {
            return Err("that WAV names no rate or no channels".into());
        }

        let dir = takes_dir(&app_handle)?;
        let base = name
            .map(|n| safe_name(&n))
            .filter(|n| !n.is_empty())
            .unwrap_or_else(|| format!("edit-{}", now_secs()));
        let file_name = free_wav_name(&dir, &base);
        let out = dir.join(&file_name);

        // Through a temp file and renamed over, as the session is.
        let tmp = out.with_extension("wav.writing");
        std::fs::write(&tmp, &bytes).map_err(|e| format!("the take would not write: {e}"))?;
        std::fs::rename(&tmp, &out).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            format!("the take would not land: {e}")
        })?;

        Ok(NewTake {
            file_name,
            path: out.to_string_lossy().to_string(),
            seconds: frames as f64 / sample_rate as f64,
            sample_rate,
            channels,
            created_at: now_secs(),
            clamped: Vec::new(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ── A file the master made that is not a take ───────────────────────────────
//
// The chapterized WAV is a take and goes through `write_take_wav` above: hound
// reads the fmt and data chunks and ignores the `cue ` and `LIST` chunks that
// follow them, so a chapterized WAV opens exactly as a plain one does.
//
// An encoded file and a chapter sidecar are NOT takes — `list_takes` reads only
// `.wav` and would never see them — so they land through this door instead. It
// takes no audio on trust and reads no header: bytes in, a file beside the
// takes out, on a name that is free. It never deletes, moves or overwrites.

/// The extensions this door will land. Anything else is refused by name.
const SIDE_EXTENSIONS: [&str; 6] = ["webm", "ogg", "m4a", "opus", "txt", "vtt"];

/// A file that is not a take: where it landed and how big it is.
#[derive(Serialize)]
pub struct LandedFile {
    pub file_name: String,
    pub path: String,
    pub bytes: usize,
}

/// The first free `base.ext`, `base-2.ext`, `base-3.ext`… on the shelf.
fn free_name(dir: &Path, base: &str, ext: &str) -> String {
    let first = format!("{base}.{ext}");
    if !dir.join(&first).exists() {
        return first;
    }
    let mut n = 2u32;
    loop {
        let candidate = format!("{base}-{n}.{ext}");
        if !dir.join(&candidate).exists() {
            return candidate;
        }
        n += 1;
    }
}

/// Land bytes the window made beside the takes, under a guarded extension.
#[tauri::command]
pub async fn write_studio_file(
    app_handle: tauri::AppHandle,
    name: String,
    extension: String,
    bytes_base64: String,
) -> Result<LandedFile, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let ext = extension.to_ascii_lowercase();
        if !SIDE_EXTENSIONS.contains(&ext.as_str()) {
            return Err(format!(
                "this door lands {} and nothing else — not .{ext}",
                SIDE_EXTENSIONS.join(", .")
            ));
        }
        let base = safe_name(&name);
        if base.is_empty() {
            return Err("that file needs a name".into());
        }
        let bytes = from_base64(&bytes_base64)?;
        if bytes.is_empty() {
            return Err("there were no bytes to land".into());
        }

        let dir = takes_dir(&app_handle)?;
        let file_name = free_name(&dir, &base, &ext);
        let out = dir.join(&file_name);

        // Through a temp file and renamed over, as every other write here is.
        let tmp = out.with_extension(format!("{ext}.writing"));
        std::fs::write(&tmp, &bytes).map_err(|e| format!("the file would not write: {e}"))?;
        std::fs::rename(&tmp, &out).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            format!("the file would not land: {e}")
        })?;

        Ok(LandedFile {
            file_name,
            path: out.to_string_lossy().to_string(),
            bytes: bytes.len(),
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

// ── The session on disk (the plan's §4.1) ───────────────────────────────────
//
// A `<name>.session.json` sidecar ON THE TAKES SHELF — the marks' own road:
// a file beside the sound, no migration, nothing in the database. A session
// names its takes; it never copies them.

const SESSION_SUFFIX: &str = ".session.json";

/// The session's file, derived from a guarded name so it can only ever land
/// on the takes shelf. A session name walks the same safe-name discipline a
/// take does.
fn session_path(app_handle: &tauri::AppHandle, name: &str) -> Result<(PathBuf, String), String> {
    let clean = safe_name(name);
    if clean.is_empty() {
        return Err("a session needs a name".into());
    }
    let file = format!("{clean}{SESSION_SUFFIX}");
    // Reuses the recorder's guard so the no-paths-in-names rule is one rule.
    let path = take_path_guarded(app_handle, &file)?;
    Ok((path, clean))
}

/// A session document, whole, or `None` when no such session exists — an
/// absent session is a real answer, not an error. A file that will not parse
/// is an error and is left exactly as it was.
#[tauri::command]
pub async fn read_session(
    app_handle: tauri::AppHandle,
    name: String,
) -> Result<Option<Value>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let (path, _) = session_path(&app_handle, &name)?;
        if !path.exists() {
            return Ok(None);
        }
        let text = std::fs::read_to_string(&path)
            .map_err(|e| format!("the session would not open: {e}"))?;
        let doc: Value = serde_json::from_str(&text).map_err(|e| {
            format!("the session file will not parse ({e}) — it is on disk exactly as it was")
        })?;
        Ok(Some(doc))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Write a session document. The window owns the document's shape; this door
/// only insists that it is an object and lands it safely. Returns the name
/// the session was actually stored under (the safe name).
#[tauri::command]
pub async fn write_session(
    app_handle: tauri::AppHandle,
    name: String,
    doc: Value,
) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        if !doc.is_object() {
            return Err("a session document is an object".into());
        }
        let (path, clean) = session_path(&app_handle, &name)?;
        let text = serde_json::to_string_pretty(&doc)
            .map_err(|e| format!("the session would not serialize: {e}"))?;
        // Through a temp file and renamed over: a crash halfway cannot leave
        // a truncated session where a whole one was.
        let tmp = path.with_extension("json.writing");
        std::fs::write(&tmp, text.as_bytes())
            .map_err(|e| format!("the session would not write: {e}"))?;
        std::fs::rename(&tmp, &path).map_err(|e| {
            let _ = std::fs::remove_file(&tmp);
            format!("the session would not land: {e}")
        })?;
        Ok(clean)
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Every session on the shelf, by name. One directory read, no file opened.
#[tauri::command]
pub async fn list_sessions(app_handle: tauri::AppHandle) -> Result<Vec<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let dir = takes_dir(&app_handle)?;
        let mut out = Vec::new();
        for entry in std::fs::read_dir(&dir).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().to_string();
            if let Some(stem) = name.strip_suffix(SESSION_SUFFIX) {
                out.push(stem.to_string());
            }
        }
        out.sort();
        Ok(out)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    /// THE PROOF'S DOOR. `.journals/proofs/mixdown-two-takes.mjs` writes two
    /// synthetic WAVs and a layer spec, then runs this test with the spec's
    /// path in `STUDIO_PROOF_SPEC` and the wanted output in
    /// `STUDIO_PROOF_OUT`; the proof reads the WAV that comes out and judges
    /// its length itself. Ignored by default so a plain `cargo test` never
    /// looks for files that are not there.
    #[test]
    #[ignore]
    fn proof_bounce_from_spec() {
        let spec = std::env::var("STUDIO_PROOF_SPEC").expect("STUDIO_PROOF_SPEC");
        let out = std::env::var("STUDIO_PROOF_OUT").expect("STUDIO_PROOF_OUT");
        let text = std::fs::read_to_string(&spec).expect("spec readable");
        let layers: Vec<LayerSpec> = serde_json::from_str(&text).expect("spec parses");
        let frames = bounce_to(&layers, Path::new(&out)).expect("bounce");
        println!("STUDIO_PROOF_FRAMES={frames}");
    }

    #[test]
    fn base64_carries_the_window_s_bytes_whole() {
        assert_eq!(from_base64("").unwrap(), Vec::<u8>::new());
        assert_eq!(from_base64("TQ==").unwrap(), b"M");
        assert_eq!(from_base64("TWE=").unwrap(), b"Ma");
        assert_eq!(from_base64("TWFu").unwrap(), b"Man");
        assert_eq!(from_base64("UklGRg==").unwrap(), b"RIFF");
        assert_eq!(from_base64("TWFu\r\nTWFu").unwrap(), b"ManMan");
        assert!(from_base64("not base64!").is_err());
    }

    /// THE CHAPTERIZED WAV'S DOOR. `src/lib/container.ts` appends a `cue ` chunk
    /// and a `LIST`/`adtl` chunk after the data chunk. `write_take_wav` reads the
    /// header back through hound before anything lands, so a chapterized WAV must
    /// open there exactly as a plain one does.
    #[test]
    fn hound_opens_a_wav_that_carries_chapters_after_its_samples() {
        let rate: u32 = 8000u32;
        let frames: u32 = 4;
        let data: Vec<u8> = vec![0, 0, 1, 0, 2, 0, 3, 0];

        let mut cue = Vec::new();
        cue.extend_from_slice(b"cue ");
        cue.extend_from_slice(&(4u32 + 24).to_le_bytes());
        cue.extend_from_slice(&1u32.to_le_bytes()); // one point
        cue.extend_from_slice(&1u32.to_le_bytes()); // its name
        cue.extend_from_slice(&2u32.to_le_bytes()); // position
        cue.extend_from_slice(b"data");
        cue.extend_from_slice(&0u32.to_le_bytes());
        cue.extend_from_slice(&0u32.to_le_bytes());
        cue.extend_from_slice(&2u32.to_le_bytes()); // sample offset

        let mut labl = Vec::new();
        labl.extend_from_slice(b"labl");
        labl.extend_from_slice(&8u32.to_le_bytes());
        labl.extend_from_slice(&1u32.to_le_bytes());
        labl.extend_from_slice(b"two\0");

        let mut list = Vec::new();
        list.extend_from_slice(b"LIST");
        list.extend_from_slice(&((4 + labl.len()) as u32).to_le_bytes());
        list.extend_from_slice(b"adtl");
        list.extend_from_slice(&labl);

        let mut bytes = Vec::new();
        bytes.extend_from_slice(b"RIFF");
        bytes.extend_from_slice(&0u32.to_le_bytes()); // filled in below
        bytes.extend_from_slice(b"WAVE");
        bytes.extend_from_slice(b"fmt ");
        bytes.extend_from_slice(&16u32.to_le_bytes());
        bytes.extend_from_slice(&1u16.to_le_bytes()); // PCM
        bytes.extend_from_slice(&1u16.to_le_bytes()); // mono
        bytes.extend_from_slice(&rate.to_le_bytes());
        bytes.extend_from_slice(&(rate * 2).to_le_bytes());
        bytes.extend_from_slice(&2u16.to_le_bytes());
        bytes.extend_from_slice(&16u16.to_le_bytes());
        bytes.extend_from_slice(b"data");
        bytes.extend_from_slice(&(data.len() as u32).to_le_bytes());
        bytes.extend_from_slice(&data);
        bytes.extend_from_slice(&cue);
        bytes.extend_from_slice(&list);
        let riff = (bytes.len() - 8) as u32;
        bytes[4..8].copy_from_slice(&riff.to_le_bytes());

        let reader = hound::WavReader::new(std::io::Cursor::new(&bytes))
            .expect("a chapterized WAV opens");
        let spec = reader.spec();
        assert_eq!(spec.sample_rate, rate);
        assert_eq!(spec.channels, 1);
        assert_eq!(spec.bits_per_sample, 16);
        // The frame count comes from the data chunk, not the file length: the
        // chapter chunks after it must not be read as samples.
        assert_eq!(reader.duration(), frames);
    }

    #[test]
    fn a_side_file_name_is_free_and_its_extension_is_guarded() {
        let dir = std::env::temp_dir().join("sistrum-studio-side-name");
        std::fs::create_dir_all(&dir).unwrap();
        let _ = std::fs::remove_file(dir.join("master.webm"));
        let _ = std::fs::remove_file(dir.join("master-2.webm"));
        assert_eq!(free_name(&dir, "master", "webm"), "master.webm");
        std::fs::write(dir.join("master.webm"), b"x").unwrap();
        assert_eq!(free_name(&dir, "master", "webm"), "master-2.webm");
        assert_eq!(free_name(&dir, "master", "txt"), "master.txt");
        assert!(SIDE_EXTENSIONS.contains(&"webm"));
        assert!(SIDE_EXTENSIONS.contains(&"vtt"));
        assert!(!SIDE_EXTENSIONS.contains(&"wav"));
        assert!(!SIDE_EXTENSIONS.contains(&"exe"));
    }

    #[test]
    fn free_name_never_lands_on_an_existing_take() {
        let dir = std::env::temp_dir().join("sistrum-studio-free-name");
        std::fs::create_dir_all(&dir).unwrap();
        let _ = std::fs::remove_file(dir.join("mix.wav"));
        let _ = std::fs::remove_file(dir.join("mix-2.wav"));
        assert_eq!(free_wav_name(&dir, "mix"), "mix.wav");
        std::fs::write(dir.join("mix.wav"), b"x").unwrap();
        assert_eq!(free_wav_name(&dir, "mix"), "mix-2.wav");
        std::fs::write(dir.join("mix-2.wav"), b"x").unwrap();
        assert_eq!(free_wav_name(&dir, "mix"), "mix-3.wav");
    }
}
