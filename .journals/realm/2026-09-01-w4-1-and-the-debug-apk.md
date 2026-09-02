# 2026-09-01 · W4-1 mended, the aarch64 debug APK rebuilt

*A Fable lamp 🎻 under THE BUILD CENSUS PLAN §6 items 2.1 and 2.2, at KP's ⚛ word "please make the red green, then go". Nothing committed; nothing signed; nothing installed.*

**2.1 — the freeze.** `src/routes/record/+page.svelte` and `src/routes/tuner/+page.svelte`: the device list is keyed by row index (`{#each recorderStore.devices as d, i (i)}`) and `<option value={i}>` carries the index — the label stays the device's name. `selectedDevice` is now `number | null`; a derived `selectedDeviceName` resolves index → name at the moment of asking, and that name is what `recorderStore.start` / `tunerStore.start` receive, as before. Store and Rust untouched. Gates: svelte-check 355 · 0 · 0; `cargo check` exit 0 (8.19s, the warm target). Base item 208 ticked with the note "W4-1 keyed by index at record/+page.svelte and tuner/+page.svelte; check 0/0, cargo check clean; the device proof (354) is KP's". RUN-LOG line 20:59.

**The honest edge.** `the-recorder`'s `resolve_device` (resonance-awen/tools/the-recorder/src/lib.rs:107) still takes a *name hint* and returns the first case-insensitive substring match. Two inputs listed under one name no longer freeze the room and the page passes a definite name — but on the Rust side both still resolve to the first of that name in cpal. Telling the two apart end-to-end would mean an index (or a stable id) crossing the command boundary: a change beyond item 208's two lines, and not done here.

**2.2 — the APK.** `npm run tauri android build -- --debug --target aarch64 --apk` (tauri-cli 2.11.4, NDK 27.2.12479018): exit 0, about two minutes on the warm aarch64 target. `src-tauri/gen/android/app/build/outputs/apk/universal/debug/app-universal-debug.apk` — 391,856,919 bytes (374 MB), 21:02. Badging: `com.audhd.resonance_sistrum` versionName 0.1.0 versionCode 1000, native-code arm64-v8a, RECORD_AUDIO present; `sync-android-extras` landed MediaPermissionPlugin.kt and found RECORD_AUDIO already in the manifest. Debug-signed by Gradle's debug key only — not a release, not for the shelf.

**Child-builds law walked.** `guard-gen.py resonance-sistrum` exit 0 before and after the build; `git status --short src-tauri/gen/android` empty after the build; applicationId/namespace `com.audhd.resonance_sistrum`, unchanged. No heal needed.

**Rides uncommitted:** the two pages, RUN-LOG.md, this journal. **Waits on KP:** item 354 (the S25 proof with this APK), any signing of 0.1.1 (his keystore), whether the Rust side should take an index.
