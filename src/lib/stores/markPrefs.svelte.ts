import { browser } from '$app/environment';


const LOGS_FEELING_KEY = 'resonance-sistrum-mark-logs-feeling';

// Default ON: only an explicit 'false' on disk turns it off.
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
