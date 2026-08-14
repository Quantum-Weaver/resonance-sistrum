import { browser } from '$app/environment';

// THE ONE PREFERENCE THE MARKS RAIL HOLDS — and, like the record room's, it is
// an autonomy choice rather than a setting.
//
// KP's ⚛ ruling, verbatim (2026-08-13): "moment marks should be able to trigger
// a new mood event when a mark is created. a quick log of emoji in the moment
// is the capture."
//
// So the link is ON by default and the pinning gesture is the whole of it: the
// emoji an artist pins at a moment IS the quick log, and asking them to say the
// same face a second time in a second form is exactly the friction the ruling
// removes.
//
// The switch exists because the trigger must stay SOVEREIGN. A hand that wants
// to mark a moment without adding a row to the emotion log says so once, on the
// rail itself, and the rail remembers. Nothing nags them about it afterward.
//
// Phase 3 Wave 3 (2026-08-13, an **Opus** hand). The storage key wears this
// house's name, per Phase 1's rebrand law — a key that still names another app
// is a small lie two apps could trip over on one machine.

const LOGS_FEELING_KEY = 'resonance-sistrum-mark-logs-feeling';

// Default ON, per the ruling. ONLY an explicit 'false' on disk turns it off: an
// absent key is someone who has never opened this, and they get the ruling's
// own behavior rather than a silent opt-out.
let logsFeeling = $state(true);

export const markPrefs = {
	get logsFeeling() {
		return logsFeeling;
	},
	load() {
		if (!browser) return;
		logsFeeling = localStorage.getItem(LOGS_FEELING_KEY) !== 'false';
	},
	setLogsFeeling(next: boolean) {
		logsFeeling = next;
		if (browser) localStorage.setItem(LOGS_FEELING_KEY, next ? 'true' : 'false');
	}
};
