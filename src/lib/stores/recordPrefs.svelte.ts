// 'hold' — a take may be held open and the mic stays open while held. 'bounded' — every take runs to a cap enforced in Rust, never by a timer here.

import { browser } from '$app/environment';

export type HoldMode = 'hold' | 'bounded';

const MODE_KEY = 'resonance-sistrum-record-hold-mode';
const MAX_KEY = 'resonance-sistrum-record-max-secs';

/** Offered lengths, in seconds. */
export const MAX_CHOICES = [15, 30, 45, 60, 120, 300] as const;

const DEFAULT_MAX = 45;

let mode = $state<HoldMode>('hold');
let maxSecs = $state<number>(DEFAULT_MAX);

function isHoldMode(value: string | null): value is HoldMode {
	return value === 'hold' || value === 'bounded';
}

export function fmtMax(secs: number): string {
	if (secs < 60) return `${secs} seconds`;
	const m = secs / 60;
	return m === 1 ? '1 minute' : `${m} minutes`;
}

export const recordPrefs = {
	get mode() {
		return mode;
	},
	get maxSecs() {
		return maxSecs;
	},
	/** The cap to start a take with: none while holding is allowed, the chosen
	 *  length when it is not. */
	get capSecs(): number | null {
		return mode === 'bounded' ? maxSecs : null;
	},
	load() {
		if (!browser) return;
		const savedMode = localStorage.getItem(MODE_KEY);
		if (isHoldMode(savedMode)) mode = savedMode;
		const savedMax = Number(localStorage.getItem(MAX_KEY));
		if (Number.isFinite(savedMax) && savedMax > 0) maxSecs = savedMax;
	},
	setMode(next: HoldMode) {
		mode = next;
		if (browser) localStorage.setItem(MODE_KEY, next);
	},
	setMaxSecs(next: number) {
		maxSecs = next;
		if (browser) localStorage.setItem(MAX_KEY, String(next));
	}
};
