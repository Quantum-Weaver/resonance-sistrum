// waveform.rs — the take's own shape, and the take's own bytes.
//
// Phase 3 Wave 1 (2026-08-13, an Opus hand), the second movement: the-player
// and the-waveform consumed. Both are TypeScript waters in resonance-awen and
// they stay there untouched — what crosses is the PATTERN, adapted where this
// stack is different.
//
// WHY THE PEAKS ARE COMPUTED HERE AND NOT IN THE WINDOW. `the-waveform`'s own
// contract is "samples in, sight out" — its `computePeaks` takes a Float32Array
// the caller already holds, because on a web page Web Audio's decodeAudioData
// hands you one. In a Tauri app the samples live in a file on disk, and a
// five-minute stereo take at 48 kHz is ~57 MB of them. Shipping that through
// the IPC to fold it into a few hundred min/max pairs would be the freeze at
// the foot of recorder.rs all over again, wearing a third set of clothes. So
// the fold happens in Rust, streaming, off the main thread — and what crosses
// the wire is the finished shape: two small arrays of floats.
//
// THE MATH IS THE SPRING'S, EXACTLY: one min/max pair per pixel column,
// channels folded together (the view shows the sound's whole body, as
// single-lane waveforms conventionally do). The hairline for silence is the
// DRAWING's floor, honored on the canvas side where the spring puts it.
//
// Both commands here are `async` with their bodies in `spawn_blocking`. They
// read files. That is the whole rule.

use serde::Serialize;
use tauri::ipc::Response;

use crate::recorder::take_path_guarded;

#[derive(Serialize)]
pub struct TakeShape {
    /// Most negative excursion per column, -1..0.
    pub min: Vec<f32>,
    /// Most positive excursion per column, 0..1.
    pub max: Vec<f32>,
    /// The true length, measured from the samples themselves.
    pub seconds: f64,
    pub sample_rate: u32,
    pub channels: u16,
    /// How many columns actually came back. Fewer than asked for when the
    /// take is shorter than the canvas is wide — one column per frame is the
    /// floor, because inventing columns would be inventing sound.
    pub columns: usize,
}

/// Fold a take's samples into `buckets` min/max pairs — one pair per future
/// pixel column. The take is read once, streaming; nothing is held in memory
/// but the buckets.
#[tauri::command]
pub async fn take_shape(
    app_handle: tauri::AppHandle,
    file_name: String,
    buckets: usize,
) -> Result<TakeShape, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = take_path_guarded(&app_handle, &file_name)?;
        let mut reader = hound::WavReader::open(&path)
            .map_err(|e| format!("the take would not open: {e}"))?;
        let spec = reader.spec();
        let channels = spec.channels.max(1);
        let frames = reader.len() as usize / channels as usize;
        let seconds = frames as f64 / spec.sample_rate as f64;

        // One column per frame is the floor: a take of nine frames cannot
        // honestly fill nine hundred columns.
        let cols = buckets.clamp(1, 8192).min(frames.max(1));
        let mut min = vec![0f32; cols];
        let mut max = vec![0f32; cols];

        if frames == 0 {
            // A take with no frames is a real answer, not an error. It comes
            // back as a flat line and the drawing gives it its hairline.
            return Ok(TakeShape {
                min,
                max,
                seconds: 0.0,
                sample_rate: spec.sample_rate,
                channels,
                columns: cols,
            });
        }

        let frames_per_bucket = frames as f64 / cols as f64;
        let mut fold = |index: usize, value: f32| {
            let frame = index / channels as usize;
            let b = ((frame as f64 / frames_per_bucket) as usize).min(cols - 1);
            if value < min[b] {
                min[b] = value;
            }
            if value > max[b] {
                max[b] = value;
            }
        };

        match spec.sample_format {
            hound::SampleFormat::Int => {
                // The recorder seals 16-bit, always. Anything else that has
                // found its way onto the shelf is still read honestly.
                let scale = match spec.bits_per_sample {
                    8 => i8::MAX as f32,
                    16 => i16::MAX as f32,
                    24 => 8_388_607f32,
                    _ => i32::MAX as f32,
                };
                for (i, s) in reader.samples::<i32>().enumerate() {
                    let s = s.map_err(|e| format!("the take broke mid-read: {e}"))?;
                    fold(i, (s as f32 / scale).clamp(-1.0, 1.0));
                }
            }
            hound::SampleFormat::Float => {
                for (i, s) in reader.samples::<f32>().enumerate() {
                    let s = s.map_err(|e| format!("the take broke mid-read: {e}"))?;
                    fold(i, s.clamp(-1.0, 1.0));
                }
            }
        }

        Ok(TakeShape {
            min,
            max,
            seconds,
            sample_rate: spec.sample_rate,
            channels,
            columns: cols,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// The take's own bytes, raw.
///
/// THE FALLBACK ROAD, and it is here on purpose. Playback goes through the
/// asset protocol (`convertFileSrc`), which streams and seeks properly and is
/// what a five-minute take deserves. But an asset scope is configuration, and
/// configuration fails QUIETLY — Fathom's rule from the Compass. If the audio
/// element cannot open the asset URL, the window falls back to this: the bytes
/// come over the IPC as raw binary (never base64 — `Response` carries them
/// whole) and become a blob the element can play. Slower and heavier, and
/// still better than a musician tapping play on their own take and hearing
/// nothing while nobody says why.
#[tauri::command]
pub async fn read_take_bytes(
    app_handle: tauri::AppHandle,
    file_name: String,
) -> Result<Response, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = take_path_guarded(&app_handle, &file_name)?;
        let bytes = std::fs::read(&path).map_err(|e| format!("the take would not open: {e}"))?;
        Ok(Response::new(bytes))
    })
    .await
    .map_err(|e| e.to_string())?
}
