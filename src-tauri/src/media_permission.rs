// media_permission.rs — the runtime microphone-permission bridge (Android).
//
// Wraps the app-local Kotlin MediaPermissionPlugin (android-extras/, synced
// into gen/ by scripts/sync-android-extras.mjs on every build). No Tauri plugin
// in our dependency set exposes Android runtime permissions, so this tiny
// inline plugin fills the gap. Desktop has no permission model for a local
// input — the platform asks on its own if it asks at all — so desktop never
// reaches this module.
//
// Carried from resonance-compass/src-tauri/src/media_permission.rs (the v3
// Phase 2 mic spike, proven on the S25) in the Android microphone wave,
// 2026-08-20. ONE alias here where Compass carries three: this body scans no
// library and its takes live in app storage, so RECORD_AUDIO is the only
// permission a recorder needs. The load-bearing half is nativeInitNdkContext —
// without it cpal's oboe backend does not error on Android, it PANICS.

#[cfg(target_os = "android")]
pub use android::*;

#[cfg(target_os = "android")]
mod android {
    use serde::Deserialize;
    use tauri::{
        plugin::{Builder, PluginHandle, TauriPlugin},
        AppHandle, Manager, Runtime,
    };

    struct MediaPermission<R: Runtime>(PluginHandle<R>);

    #[derive(Deserialize)]
    struct PermissionResponse {
        granted: bool,
    }

    pub fn init<R: Runtime>() -> TauriPlugin<R> {
        Builder::new("media-permission")
            .setup(|app, api| {
                let handle = api.register_android_plugin(
                    "com.audhd.resonance_sistrum.plugin",
                    "MediaPermissionPlugin",
                )?;
                app.manage(MediaPermission(handle));
                Ok(())
            })
            .build()
    }

    /// RECORD_AUDIO — is the microphone already granted? Never prompts.
    #[allow(dead_code)]
    pub fn mic_check<R: Runtime>(app: &AppHandle<R>) -> Result<bool, String> {
        app.state::<MediaPermission<R>>()
            .0
            .run_mobile_plugin::<PermissionResponse>("checkMicPermission", ())
            .map(|r| r.granted)
            .map_err(|e| e.to_string())
    }

    /// RECORD_AUDIO — ask the vessel. Blocks until the system dialog is
    /// answered, so callers keep it off the async runtime's core threads.
    pub fn mic_request<R: Runtime>(app: &AppHandle<R>) -> Result<bool, String> {
        app.state::<MediaPermission<R>>()
            .0
            .run_mobile_plugin::<PermissionResponse>("requestMicPermission", ())
            .map(|r| r.granted)
            .map_err(|e| e.to_string())
    }

    /// Called once from MediaPermissionPlugin's init block (Kotlin). cpal's
    /// oboe backend reads the JNI context via the ndk-context crate, but
    /// nothing in the tauri/wry/tao stack initializes it — without this every
    /// input stream open panics ("android context was not initialized") and
    /// the microphone is permanently unavailable on Android.
    ///
    /// The symbol name is the JNI mangling of
    /// com.audhd.resonance_sistrum.plugin.MediaPermissionPlugin.nativeInitNdkContext
    /// — an underscore in a package segment mangles to `_1`.
    #[no_mangle]
    pub extern "system" fn Java_com_audhd_resonance_1sistrum_plugin_MediaPermissionPlugin_nativeInitNdkContext(
        env: jni::JNIEnv,
        _this: jni::objects::JObject,
        context: jni::objects::JObject,
    ) {
        use std::sync::atomic::{AtomicBool, Ordering};
        static INITIALIZED: AtomicBool = AtomicBool::new(false);
        // ndk-context asserts on double-init — guard hard.
        if INITIALIZED.swap(true, Ordering::SeqCst) {
            return;
        }
        let Ok(vm) = env.get_java_vm() else { return };
        let Ok(global) = env.new_global_ref(&context) else { return };
        let context_ptr = global.as_raw();
        // The global ref must outlive the process — cpal reads it at any time.
        std::mem::forget(global);
        unsafe {
            ndk_context::initialize_android_context(
                vm.get_java_vm_pointer().cast(),
                context_ptr.cast(),
            );
        }
    }
}
