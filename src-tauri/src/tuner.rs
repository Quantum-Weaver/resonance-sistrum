// tuner.rs — pitch heard honestly, in the body.
//
// Phase 3 Wave 2 (2026-08-13, an **Opus** hand), the first movement:
// `the-tuner` consumed. The spring lives at
// `resonance-awen/tools/the-tuner` and IT WAS NOT EDITED — it is consumed as
// a path crate, the road Compass walked at the standalone-waters season and
// the road Wave 1 walked with `the-recorder`. Standalone always, combined
// freely.
//
// WHAT CROSSED AND WHAT DID NOT. The MATH crossed whole and unmodified —
// `the_tuner::yin` (de Cheveigné & Kawahara 2002: difference function →
// cumulative-mean normalization → threshold → parabolic refinement) and
// `the_tuner::note_for` (nearest equal-temperament note, A4 = 440, signed
// cents) are called, never copied. `meter_line` did NOT cross: it draws an
// ASCII bar for a terminal, and this body has a screen — the position is
// drawn in Svelte instead, from the same signed cents.
//
// THE CAPTURE IS THIS HARNESS'S OWN, and it has to be. Neither water offers a
// listen-without-keeping session: `the-tuner`'s capture lives in its CLI's
// `main.rs`, and `the-recorder`'s session exists to SEAL A FILE. The tuner
// keeps nothing, so it opens its own stream with cpal — the same shape the
// recorder proved (a dedicated thread owns the stream, because a cpal
// `Stream` is not `Send`), written fresh here rather than borrowed from a
// private function.
//
// THE LAWS, none of them softened:
//   · OPT-IN ALWAYS — nothing listens until `start_tuner` is called, and
//     `start_tuner` is only ever called from the user's own press.
//   · NOTHING RECORDED, NOTHING KEPT. There is no path in this file. No
//     buffer outlives the window it is analyzed in; the ring holds a fraction
//     of a second and is overwritten forever. There is no command here that
//     writes anything anywhere.
//   · A POSITION, NEVER A VERDICT — this file reports frequency and signed
//     cents. It has no opinion, no threshold of "good", and no word for
//     "wrong". What the screen does with a position is the screen's business,
//     and the screen does not judge either.
//   · HONEST SILENCE — too quiet or unpitched comes back as None. The spring
//     gates on RMS and so does the report; nothing is guessed.
//
// THE PERMANENT ROAD RULE: the two commands that open or close a device are
// `async` with their bodies in `spawn_blocking`. Opening an input can take a
// long moment on a phone, and Tauri delivers replies on the main thread —
// that is the freeze this road has already paid for three times.
// `tuner_reading` is sync ON PURPOSE and is not an exception: it touches no
// filesystem and no device. It loads three atomics and returns.

use serde::Serialize;
use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Arc;
use std::sync::Mutex;

use cpal::traits::{DeviceTrait, HostTrait, StreamTrait};
use the_tuner::{note_for, yin};

/// The analysis window, in frames. The spring's own `WIN` — 4096 at 48 kHz is
/// ~85 ms, long enough for YIN to reach below a guitar's low E and short
/// enough that a turning peg is felt as it turns.
const WIN: usize = 4096;

/// How often the listening thread reads a window. Fast enough to feel live,
/// slow enough that YIN's O(n²) difference function is nothing to a modern
/// core — and it runs on the tuner's OWN thread, never on the main one.
const ANALYSIS_INTERVAL_MS: u64 = 80;

/// What the listening thread publishes and the window reads. Atomics rather
/// than a lock: the reader is the main thread, and the main thread is exactly
/// the thread that must never wait for anything.
pub struct Heard {
    /// f32 bits of the pitch in Hz. Zero means nothing pitched right now —
    /// which is an answer, not a failure.
    freq_bits: AtomicU32,
    /// f32 bits of the window's RMS, 0..1. How much sound is arriving at all.
    rms_bits: AtomicU32,
    /// Pitched readings since listening began. Never resets while listening.
    readings: AtomicU64,
}

impl Heard {
    fn new() -> Self {
        Heard {
            freq_bits: AtomicU32::new(0),
            rms_bits: AtomicU32::new(0),
            readings: AtomicU64::new(0),
        }
    }

    fn publish(&self, freq: Option<f32>, rms: f32) {
        self.rms_bits.store(rms.to_bits(), Ordering::Relaxed);
        match freq {
            Some(f) => {
                self.freq_bits.store(f.to_bits(), Ordering::Relaxed);
                self.readings.fetch_add(1, Ordering::Relaxed);
            }
            // Honest silence: the pitch goes away rather than lingering at
            // whatever was last heard. A tuner that keeps showing a note after
            // the string has stopped ringing is lying quietly.
            None => self.freq_bits.store(0f32.to_bits(), Ordering::Relaxed),
        }
    }

    fn freq(&self) -> Option<f32> {
        let f = f32::from_bits(self.freq_bits.load(Ordering::Relaxed));
        (f > 0.0).then_some(f)
    }

    fn rms(&self) -> f32 {
        f32::from_bits(self.rms_bits.load(Ordering::Relaxed))
    }

    fn readings(&self) -> u64 {
        self.readings.load(Ordering::Relaxed)
    }
}

#[derive(Clone)]
pub struct ListenInfo {
    pub device: String,
    pub sample_rate: u32,
}

/// A live listening. The thread owns the cpal stream (streams are not `Send`);
/// this handle carries only the channel, the join, and the shared reading.
pub struct ListenSession {
    stop_tx: std::sync::mpsc::Sender<()>,
    join: std::thread::JoinHandle<()>,
    heard: Arc<Heard>,
    info: ListenInfo,
}

#[derive(Default)]
pub struct TunerState {
    session: Mutex<Option<ListenSession>>,
}

#[derive(Serialize)]
pub struct TunerStatus {
    pub listening: bool,
    pub device: Option<String>,
    pub sample_rate: Option<u32>,
    /// The pitch heard right now, in Hz. `None` when nothing pitched is
    /// arriving — silence and noise both report as nothing heard, never as a
    /// guessed note.
    pub freq: Option<f32>,
    /// The nearest equal-temperament note name, A4 = 440 Hz.
    pub note: Option<String>,
    pub octave: Option<i32>,
    /// Signed cents from that note's center, −50..+50. THIS IS A POSITION.
    /// Nothing in this file calls a sign good or bad.
    pub cents: Option<f32>,
    /// The window's loudness, 0..1 — how much sound there is to hear at all.
    pub rms: f32,
    /// Pitched readings since this listening began.
    pub readings: u64,
}

impl TunerStatus {
    fn silent() -> Self {
        TunerStatus {
            listening: false,
            device: None,
            sample_rate: None,
            freq: None,
            note: None,
            octave: None,
            cents: None,
            rms: 0.0,
            readings: 0,
        }
    }

    fn from(session: &ListenSession) -> Self {
        let freq = session.heard.freq();
        let reading = freq.map(note_for);
        TunerStatus {
            listening: true,
            device: Some(session.info.device.clone()),
            sample_rate: Some(session.info.sample_rate),
            freq,
            note: reading.as_ref().map(|r| r.name.to_string()),
            octave: reading.as_ref().map(|r| r.octave),
            cents: reading.as_ref().map(|r| r.cents),
            rms: session.heard.rms(),
            readings: session.heard.readings(),
        }
    }
}

/// The device door. The recorder's `resolve_device` is private to its own
/// crate, so the same shape is written here rather than reached into — the
/// standalone law cuts both ways, and a substring match on a name the user
/// picked from our own list is the whole of it.
fn resolve_device(hint: Option<&str>) -> Result<cpal::Device, String> {
    let host = cpal::default_host();
    match hint {
        None => host
            .default_input_device()
            .ok_or_else(|| "no microphone stands on this machine — the tuner waits for one".into()),
        Some(name) => {
            let wanted = name.to_lowercase();
            host.input_devices()
                .map_err(|e| format!("the input doors did not open: {e}"))?
                .find(|d| {
                    d.name()
                        .map(|n| n.to_lowercase().contains(&wanted))
                        .unwrap_or(false)
                })
                .ok_or_else(|| format!("no input device matches '{name}'"))
        }
    }
}

/// Open the ear and start reading it. Blocking — the caller runs this in
/// `spawn_blocking`, because opening an input device is slow on a phone and
/// this waits for the thread to say it is ready.
fn start_listening(hint: Option<&str>) -> Result<ListenSession, String> {
    let hint = hint.map(str::to_string);
    let (stop_tx, stop_rx) = std::sync::mpsc::channel::<()>();
    let (ready_tx, ready_rx) = std::sync::mpsc::channel::<Result<ListenInfo, String>>();
    let heard = Arc::new(Heard::new());
    let heard_for_thread = Arc::clone(&heard);

    let join = std::thread::spawn(move || {
        let opened = (|| {
            let device = resolve_device(hint.as_deref())?;
            let name = device.name().unwrap_or_else(|_| "(unnamed)".into());
            let config = device
                .default_input_config()
                .map_err(|e| format!("the device would not describe itself: {e}"))?;
            let sample_rate = config.sample_rate().0;
            let channels = config.channels() as usize;

            // THE RING IS THE WHOLE MEMORY OF THIS TOOL. It holds a couple of
            // analysis windows and is trimmed on every callback; nothing here
            // grows, nothing here is written anywhere, and when the stream is
            // dropped it is simply gone.
            let ring: Arc<Mutex<Vec<f32>>> = Arc::new(Mutex::new(Vec::new()));
            let ring_in = Arc::clone(&ring);
            let err_fn = |e| eprintln!("[tuner] the stream stumbled (listening continues): {e}");

            // Channels fold to mono on the way in — the spring's own shape,
            // and pitch has no side.
            macro_rules! build {
                ($t:ty, $to_f32:expr) => {{
                    let ring_in = Arc::clone(&ring_in);
                    device
                        .build_input_stream(
                            &config.clone().into(),
                            move |data: &[$t], _| {
                                let mut r = ring_in.lock().unwrap();
                                for frame in data.chunks(channels.max(1)) {
                                    let s: f32 = frame.iter().map(|&x| $to_f32(x)).sum::<f32>()
                                        / channels.max(1) as f32;
                                    r.push(s);
                                }
                                let len = r.len();
                                if len > WIN * 4 {
                                    r.drain(0..len - WIN * 2);
                                }
                            },
                            err_fn,
                            None,
                        )
                        .map_err(|e| format!("the stream would not open: {e}"))?
                }};
            }

            let stream = match config.sample_format() {
                cpal::SampleFormat::F32 => build!(f32, |s: f32| s),
                cpal::SampleFormat::I16 => build!(i16, |s: i16| s as f32 / i16::MAX as f32),
                cpal::SampleFormat::U16 => build!(u16, |s: u16| (s as f32 - 32768.0) / 32768.0),
                other => return Err(format!("sample format {other:?} is not yet spoken here")),
            };
            stream
                .play()
                .map_err(|e| format!("the stream would not start: {e}"))?;

            Ok::<_, String>((
                stream,
                ring,
                ListenInfo {
                    device: name,
                    sample_rate,
                },
            ))
        })();

        match opened {
            Err(e) => {
                let _ = ready_tx.send(Err(e));
            }
            Ok((stream, ring, info)) => {
                let sample_rate = info.sample_rate;
                let _ = ready_tx.send(Ok(info));
                // The analysis loop lives HERE, on the tuner's own thread. The
                // window never runs YIN and never holds a sample; it reads
                // three atomics and draws.
                loop {
                    match stop_rx
                        .recv_timeout(std::time::Duration::from_millis(ANALYSIS_INTERVAL_MS))
                    {
                        Ok(()) | Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => break,
                        Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
                    }
                    let window: Option<Vec<f32>> = {
                        let r = ring.lock().unwrap();
                        (r.len() >= WIN).then(|| r[r.len() - WIN..].to_vec())
                    };
                    if let Some(w) = window {
                        let rms = (w.iter().map(|s| s * s).sum::<f32>() / w.len() as f32).sqrt();
                        // The spring's own gate decides whether anything was
                        // heard. This harness does not second-guess it.
                        heard_for_thread.publish(yin(&w, sample_rate), rms);
                    }
                }
                // The listening ends exactly here, and nothing survives it.
                drop(stream);
            }
        }
    });

    match ready_rx.recv() {
        Ok(Ok(info)) => Ok(ListenSession {
            stop_tx,
            join,
            heard,
            info,
        }),
        Ok(Err(e)) => {
            let _ = join.join();
            Err(e)
        }
        Err(_) => Err("the listening thread ended before it was ready".into()),
    }
}

/// Open the ear. ONLY EVER FROM A PRESS — there is no other caller and there
/// must never be one. Refuses rather than replaces, so a double tap cannot
/// leave an orphaned stream holding the microphone.
#[tauri::command]
pub async fn start_tuner(
    state: tauri::State<'_, TunerState>,
    device: Option<String>,
) -> Result<TunerStatus, String> {
    {
        let slot = state.session.lock().map_err(|e| e.to_string())?;
        if slot.is_some() {
            return Err("the tuner is already listening".into());
        }
    }

    let session = tauri::async_runtime::spawn_blocking(move || start_listening(device.as_deref()))
        .await
        .map_err(|e| e.to_string())??;

    let status = TunerStatus::from(&session);
    {
        let mut slot = state.session.lock().map_err(|e| e.to_string())?;
        if slot.is_some() {
            // A second start slipped in while ours was opening. Theirs holds
            // the ear; ours closes quietly rather than leaking a device.
            drop(slot);
            let _ = session.stop_tx.send(());
            let _ = session.join.join();
            return Err("the tuner is already listening".into());
        }
        *slot = Some(session);
    }
    Ok(status)
}

/// Close the ear. Async with the join in `spawn_blocking`: dropping an input
/// stream is the slow half, and it is exactly what froze the record room on
/// the S25 when it happened on the main thread.
#[tauri::command]
pub async fn stop_tuner(state: tauri::State<'_, TunerState>) -> Result<(), String> {
    let session = state.session.lock().map_err(|e| e.to_string())?.take();
    let Some(session) = session else {
        // Not listening is not an error — stopping a stopped tuner is a hand
        // being careful, and being careful should never produce a red box.
        return Ok(());
    };
    tauri::async_runtime::spawn_blocking(move || {
        let _ = session.stop_tx.send(());
        let _ = session.join.join();
    })
    .await
    .map_err(|e| e.to_string())
}

/// What is being heard right now. Sync ON PURPOSE, and not an exception to the
/// road rule: no filesystem, no device, no allocation beyond the reply — three
/// atomic loads and a note lookup.
#[tauri::command]
pub fn tuner_reading(state: tauri::State<TunerState>) -> Result<TunerStatus, String> {
    let slot = state.session.lock().map_err(|e| e.to_string())?;
    Ok(match slot.as_ref() {
        Some(session) => TunerStatus::from(session),
        None => TunerStatus::silent(),
    })
}
